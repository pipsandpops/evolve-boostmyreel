using AIReelBooster.API.AutoReelGenerator.Interfaces;
using AIReelBooster.API.AutoReelGenerator.Models;
using Microsoft.AspNetCore.Mvc;

namespace AIReelBooster.API.AutoReelGenerator.Controllers;

[ApiController]
[Route("api/auto-reel")]
public class AutoReelController : ControllerBase
{
    private readonly IAutoReelService _autoReelService;
    private readonly ILogger<AutoReelController> _logger;

    public AutoReelController(
        IAutoReelService             autoReelService,
        ILogger<AutoReelController>  logger)
    {
        _autoReelService = autoReelService;
        _logger          = logger;
    }

    // ── POST /api/auto-reel/generate ──────────────────────────────────────────

    /// <summary>
    /// Starts reel generation from a completed video analysis job.
    /// Returns the new <c>reelJobId</c> immediately; poll /status for progress.
    /// </summary>
    [HttpPost("generate")]
    public async Task<IActionResult> Generate(
        [FromBody] GenerateReelRequest request,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.SourceJobId))
            return BadRequest(new { error = "sourceJobId is required." });

        try
        {
            var reelJobId = await _autoReelService.StartGenerationAsync(
                request.SourceJobId,
                request.UserId,
                ct);

            _logger.LogInformation("ReelJob {Id} created for source job {Src}",
                reelJobId, request.SourceJobId);

            return Ok(new { reelJobId });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    // ── GET /api/auto-reel/{id}/status ────────────────────────────────────────

    /// <summary>
    /// Returns the current processing status and progress of a reel job.
    /// Poll this until <c>status</c> is <c>Complete</c> or <c>Failed</c>.
    /// </summary>
    [HttpGet("{reelJobId}/status")]
    public IActionResult GetStatus(string reelJobId)
    {
        var job = _autoReelService.GetJob(reelJobId);
        if (job == null) return NotFound(new { error = "Reel job not found." });

        return Ok(new
        {
            reelJobId       = job.ReelJobId,
            status          = job.Status.ToString(),
            progressPercent = job.ProgressPercent,
            currentStep     = job.CurrentStep,
            errorMessage    = job.ErrorMessage,
            reelCount       = job.GeneratedReels.Count,
            createdAt       = job.CreatedAt,
            completedAt     = job.CompletedAt,
        });
    }

    // ── GET /api/auto-reel/{id}/result ────────────────────────────────────────

    /// <summary>
    /// Returns the full result once a reel job is complete.
    /// Each reel includes a download URL, title, timestamps, and scores.
    /// </summary>
    [HttpGet("{reelJobId}/result")]
    public IActionResult GetResult(string reelJobId)
    {
        var job = _autoReelService.GetJob(reelJobId);
        if (job == null) return NotFound(new { error = "Reel job not found." });

        if (job.Status == ReelJobStatus.Failed)
            return UnprocessableEntity(new { error = job.ErrorMessage ?? "Reel generation failed." });

        if (job.Status != ReelJobStatus.Complete)
            return Accepted(new
            {
                message         = "Reel generation is still in progress.",
                status          = job.Status.ToString(),
                progressPercent = job.ProgressPercent,
            });

        var reels = job.GeneratedReels.Select(r => new
        {
            index             = r.Index,
            title             = r.Title,
            startFormatted    = r.StartFormatted,
            endFormatted      = r.EndFormatted,
            downloadUrl       = r.RelativeUrl,
            motionScore       = Math.Round(r.MotionScore, 1),
            engagementScore   = Math.Round(r.EngagementScore, 1),
            transcriptSnippet = r.TranscriptSnippet,
            fileSizeBytes     = r.FileSizeBytes,
        });

        return Ok(new
        {
            reelJobId   = job.ReelJobId,
            sourceJobId = job.SourceJobId,
            reelCount   = job.GeneratedReels.Count,
            completedAt = job.CompletedAt,
            reels,
        });
    }

    // ── GET /api/auto-reel/{id}/download/{index} ──────────────────────────────

    /// <summary>
    /// Streams the generated MP4 file to the client as a file download.
    /// </summary>
    [HttpGet("{reelJobId}/download/{index:int}")]
    public IActionResult Download(string reelJobId, int index)
    {
        var job = _autoReelService.GetJob(reelJobId);
        if (job == null) return NotFound(new { error = "Reel job not found." });

        if (job.Status != ReelJobStatus.Complete)
            return BadRequest(new { error = "Reels are not ready yet." });

        if (index < 0 || index >= job.GeneratedReels.Count)
            return NotFound(new { error = $"Reel index {index} is out of range." });

        var reel = job.GeneratedReels[index];

        if (!System.IO.File.Exists(reel.FilePath))
            return NotFound(new { error = "Reel file no longer exists on disk." });

        var fileName = $"reel_{index + 1}_{job.ReelJobId}.mp4";
        return PhysicalFile(reel.FilePath, "video/mp4", fileName);
    }
}

// ── Request models ────────────────────────────────────────────────────────────

public record GenerateReelRequest(string SourceJobId, string? UserId);
