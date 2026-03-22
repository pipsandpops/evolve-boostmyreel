using Microsoft.AspNetCore.Mvc;
using AIReelBooster.API.ImageGrowthEngine.Infrastructure;
using AIReelBooster.API.ImageGrowthEngine.Models;
using AIReelBooster.API.Configuration;
using Microsoft.Extensions.Options;

namespace AIReelBooster.API.ImageGrowthEngine.Controllers;

// ── Request / response contracts ─────────────────────────────────────────────

public record AnalyzeImageResponse(string JobId, string Status, DateTime SubmittedAt, int ImageCount);

public record ImageJobStatusResponse(
    string JobId,
    string Status,
    int ProgressPercent,
    string? Message,
    DateTime CreatedAt);

// ── Controller ────────────────────────────────────────────────────────────────

/// <summary>
/// ImageGrowthEngine REST API.
///
/// POST /api/image/analyze   — Upload 1-20 images, get jobId back immediately
/// GET  /api/image/{jobId}/status  — Poll until Complete
/// GET  /api/image/{jobId}/result  — Fetch full analysis
/// </summary>
[ApiController]
[Route("api/image")]
public class ImageGrowthController : ControllerBase
{
    private static readonly string[] AllowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];
    private const int MaxImages      = 20;
    private const long MaxFileBytes  = 20 * 1024 * 1024; // 20 MB per file

    private readonly ImageJobStore        _store;
    private readonly ImageProcessingQueue _queue;
    private readonly StorageSettings      _storage;
    private readonly ILogger<ImageGrowthController> _logger;

    public ImageGrowthController(
        ImageJobStore        store,
        ImageProcessingQueue queue,
        IOptions<AppSettings> opts,
        ILogger<ImageGrowthController> logger)
    {
        _store   = store;
        _queue   = queue;
        _storage = opts.Value.Storage;
        _logger  = logger;
    }

    // ── POST /api/image/analyze ───────────────────────────────────────────────

    /// <summary>
    /// Upload one or more images for analysis.
    /// Form fields:
    ///   images[]  — 1 to 20 image files (jpg/png/webp, max 20 MB each)
    ///   caption   — optional user caption draft
    ///   tone      — "Viral" | "Educational" | "Storytelling" | "Sales"  (default: Viral)
    /// </summary>
    [HttpPost("analyze")]
    [RequestSizeLimit(420_000_000)]  // 20 images × 20 MB + headroom
    public async Task<IActionResult> Analyze(
        [FromForm] IFormFileCollection images,
        [FromForm] string? caption,
        [FromForm] string? tone,
        CancellationToken ct)
    {
        if (images.Count == 0)
            return BadRequest(new { error = "At least one image is required." });

        if (images.Count > MaxImages)
            return BadRequest(new { error = $"Maximum {MaxImages} images per request." });

        // ── Validate each file ────────────────────────────────────────────────
        foreach (var file in images)
        {
            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!AllowedExtensions.Contains(ext))
                return BadRequest(new { error = $"Unsupported file type: {ext}. Accepted: jpg, png, webp." });

            if (file.Length > MaxFileBytes)
                return BadRequest(new { error = $"File '{file.FileName}' exceeds the 20 MB limit." });
        }

        var captionTone = Enum.TryParse<CaptionTone>(tone, ignoreCase: true, out var parsed)
            ? parsed : CaptionTone.Viral;

        // ── Persist images to temp storage ────────────────────────────────────
        var jobId   = Guid.NewGuid().ToString("N");
        var jobDir  = Path.Combine(_storage.TempPath, "img", jobId);
        Directory.CreateDirectory(jobDir);

        var savedPaths = new List<string>();
        for (int i = 0; i < images.Count; i++)
        {
            var file     = images[i];
            var ext      = Path.GetExtension(file.FileName).ToLowerInvariant();
            var destPath = Path.Combine(jobDir, $"slide_{i:D3}{ext}");

            await using var dest = System.IO.File.Create(destPath);
            await file.CopyToAsync(dest, ct);
            savedPaths.Add(destPath);
        }

        // ── Create job + enqueue ──────────────────────────────────────────────
        var job = new ImageJob
        {
            JobId          = jobId,
            ImageFilePaths = savedPaths,
            UserCaption    = caption,
            Tone           = captionTone,
        };

        _store.Add(job);
        await _queue.EnqueueAsync(jobId, ct);

        _logger.LogInformation("Image job {JobId} queued — {Count} image(s), tone={Tone}",
            jobId, savedPaths.Count, captionTone);

        return Accepted(new AnalyzeImageResponse(
            jobId,
            job.Status.ToString(),
            job.CreatedAt,
            savedPaths.Count));
    }

    // ── GET /api/image/{jobId}/status ─────────────────────────────────────────

    [HttpGet("{jobId}/status")]
    public IActionResult GetStatus(string jobId)
    {
        var job = _store.Get(jobId);
        if (job is null) return NotFound(new { error = "Job not found." });

        return Ok(new ImageJobStatusResponse(
            job.JobId,
            job.Status.ToString(),
            job.ProgressPercent,
            job.ErrorMessage,
            job.CreatedAt));
    }

    // ── GET /api/image/{jobId}/result ─────────────────────────────────────────

    [HttpGet("{jobId}/result")]
    public IActionResult GetResult(string jobId)
    {
        var job = _store.Get(jobId);
        if (job is null) return NotFound(new { error = "Job not found." });

        if (job.Status == ImageJobStatus.Failed)
            return UnprocessableEntity(new { error = job.ErrorMessage ?? "Analysis failed." });

        if (job.Status != ImageJobStatus.Complete)
            return Conflict(new { error = $"Job not complete yet. Current status: {job.Status}." });

        return Ok(job.Result);
    }
}
