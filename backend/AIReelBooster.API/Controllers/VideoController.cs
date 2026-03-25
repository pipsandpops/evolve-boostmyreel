using AIReelBooster.API.Configuration;
using AIReelBooster.API.Infrastructure;
using AIReelBooster.API.Models.Domain;
using AIReelBooster.API.Models.Responses;
using AIReelBooster.API.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace AIReelBooster.API.Controllers;

[ApiController]
[Route("api/video")]
public class VideoController : ControllerBase
{
    private static readonly string[] AllowedExtensions = [".mp4", ".mov", ".webm", ".avi", ".mkv"];

    private const int FreeUserDailyLimit = 1;

    private readonly JobStore _jobStore;
    private readonly BackgroundProcessingQueue _queue;
    private readonly IVideoStorageService _storage;
    private readonly DailyUsageLimiter _limiter;
    private readonly AppDbContext _db;
    private readonly long _maxFileSize;
    private readonly string _tempPath;
    private readonly ILogger<VideoController> _logger;

    public VideoController(
        JobStore jobStore,
        BackgroundProcessingQueue queue,
        IVideoStorageService storage,
        DailyUsageLimiter limiter,
        AppDbContext db,
        IOptions<AppSettings> options,
        ILogger<VideoController> logger)
    {
        _jobStore    = jobStore;
        _queue       = queue;
        _storage     = storage;
        _limiter     = limiter;
        _db          = db;
        _maxFileSize = options.Value.Storage.MaxFileSizeBytes;
        _tempPath    = Path.GetFullPath(options.Value.Storage.TempPath);
        _logger      = logger;
    }

    /// <summary>
    /// Returns true when the user is allowed to start a new video job.
    /// Paid users are always allowed. Free users get 1/day; referred users get 2 on their first day.
    /// A null/empty userId is treated as a new anonymous free user.
    /// </summary>
    private async Task<bool> IsWithinDailyLimitAsync(string? userId)
    {
        if (string.IsNullOrWhiteSpace(userId)) userId = "anon";

        // Paid users have no limit
        var plan = await _db.UserPlans.FindAsync(userId);
        if (plan?.IsPaid == true) return true;

        // Referred users get 2 videos on their first day as a welcome bonus
        int limit = FreeUserDailyLimit;
        var referral = await _db.UserReferrals.FindAsync(userId);
        if (referral != null && referral.CreatedAt.Date == DateTime.UtcNow.Date)
            limit = 2;

        return _limiter.TryConsume(userId, limit);
    }

    [HttpPost("upload")]
    [RequestSizeLimit(600_000_000)]
    [RequestFormLimits(MultipartBodyLengthLimit = 600_000_000)]
    public async Task<IActionResult> Upload(IFormFile file, [FromForm] string? userId, CancellationToken ct)
    {
        if (!await IsWithinDailyLimitAsync(userId))
            return StatusCode(429, new { error = "Free plan limit reached. You can analyse 1 video per day. Upgrade to Pro for unlimited access." });

        if (file == null || file.Length == 0)
            return BadRequest(new { error = "No file uploaded." });

        if (file.Length > _maxFileSize)
            return BadRequest(new { error = $"File exceeds maximum size of {_maxFileSize / 1024 / 1024} MB." });

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedExtensions.Contains(ext))
            return BadRequest(new { error = $"Unsupported file type '{ext}'. Allowed: {string.Join(", ", AllowedExtensions)}" });

        var job = _jobStore.CreateJob();
        job.Status = JobStatus.Uploading;
        job.ProgressPercent = 5;

        try
        {
            var filePath = await _storage.SaveUploadedFileAsync(file, job.JobId, ct);
            job.OriginalFilePath = filePath;
            job.Status = JobStatus.Pending;
            job.ProgressPercent = 10;

            await _queue.EnqueueAsync(job.JobId, ct);
            _logger.LogInformation("Job {JobId} enqueued for processing", job.JobId);

            return Accepted(new UploadVideoResponse(job.JobId, job.Status.ToString(), job.CreatedAt));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Upload failed for job {JobId}", job.JobId);
            job.Status = JobStatus.Failed;
            job.ErrorMessage = "Upload failed.";
            return StatusCode(500, new { error = "Upload failed." });
        }
    }

    // ── Chunked upload ────────────────────────────────────────────────────────
    //
    // Mobile clients split large files into 4 MB slices and POST each slice
    // here.  Once all slices arrive, POST /finalize assembles them into a job.
    // This sidesteps Railway's ~100 s proxy timeout on slow connections.

    [HttpPost("chunk")]
    [RequestSizeLimit(6_000_000)]
    [RequestFormLimits(MultipartBodyLengthLimit = 6_000_000)]
    public async Task<IActionResult> UploadChunk(
        [FromForm] string uploadId,
        [FromForm] int chunkIndex,
        [FromForm] int totalChunks,
        IFormFile chunk,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(uploadId) || chunk == null || chunk.Length == 0)
            return BadRequest(new { error = "uploadId and chunk are required." });

        // Reject uploadIds that could escape the chunk directory
        if (uploadId.Any(c => !char.IsLetterOrDigit(c) && c != '-'))
            return BadRequest(new { error = "Invalid uploadId." });

        if (chunkIndex < 0 || totalChunks < 1 || chunkIndex >= totalChunks)
            return BadRequest(new { error = "Invalid chunk index or totalChunks." });

        var chunkDir = Path.Combine(_tempPath, "_chunks", uploadId);
        Directory.CreateDirectory(chunkDir);

        var chunkPath = Path.Combine(chunkDir, $"chunk_{chunkIndex:D5}");
        await using var fs = System.IO.File.Create(chunkPath);
        await chunk.CopyToAsync(fs, ct);

        return Ok(new { chunkIndex, received = true });
    }

    [HttpPost("finalize")]
    public async Task<IActionResult> FinalizeUpload(
        [FromBody] FinalizeUploadRequest req,
        CancellationToken ct)
    {
        if (!await IsWithinDailyLimitAsync(req.UserId))
            return StatusCode(429, new { error = "Free plan limit reached. You can analyse 1 video per day. Upgrade to Pro for unlimited access." });

        if (string.IsNullOrWhiteSpace(req.UploadId))
            return BadRequest(new { error = "uploadId is required." });

        if (req.UploadId.Any(c => !char.IsLetterOrDigit(c) && c != '-'))
            return BadRequest(new { error = "Invalid uploadId." });

        var chunkDir = Path.Combine(_tempPath, "_chunks", req.UploadId);
        if (!Directory.Exists(chunkDir))
            return BadRequest(new { error = "Upload session not found or expired." });

        var chunkFiles = Directory.GetFiles(chunkDir, "chunk_*")
            .OrderBy(f => f)
            .ToArray();

        if (chunkFiles.Length != req.TotalChunks)
            return BadRequest(new { error = $"Expected {req.TotalChunks} chunks, received {chunkFiles.Length}." });

        var ext = Path.GetExtension(req.FileName ?? string.Empty).ToLowerInvariant();
        if (!AllowedExtensions.Contains(ext))
            return BadRequest(new { error = $"Unsupported file type. Allowed: {string.Join(", ", AllowedExtensions)}" });

        var job     = _jobStore.CreateJob();
        var jobDir  = _storage.GetJobDirectory(job.JobId);
        Directory.CreateDirectory(jobDir);
        var finalPath = Path.Combine(jobDir, $"original{ext}");

        try
        {
            await using (var output = System.IO.File.Create(finalPath))
            {
                foreach (var chunkFile in chunkFiles)
                {
                    await using var input = System.IO.File.OpenRead(chunkFile);
                    await input.CopyToAsync(output, ct);
                }
            }

            if (new FileInfo(finalPath).Length > _maxFileSize)
            {
                System.IO.File.Delete(finalPath);
                return BadRequest(new { error = $"File exceeds maximum size of {_maxFileSize / 1024 / 1024} MB." });
            }
        }
        finally
        {
            try { Directory.Delete(chunkDir, recursive: true); } catch { /* best-effort */ }
        }

        job.OriginalFilePath = finalPath;
        job.Status           = JobStatus.Pending;
        job.ProgressPercent  = 10;
        await _queue.EnqueueAsync(job.JobId, ct);

        // Award referral credits if this is the referred user's first upload
        if (!string.IsNullOrWhiteSpace(req.UserId))
        {
            var referralCtrl = HttpContext.RequestServices.GetRequiredService<ReferralController>();
            await referralCtrl.TryAwardReferralCreditAsync(req.UserId);
        }

        _logger.LogInformation("Job {JobId} created via chunked upload ({Chunks} chunks)", job.JobId, req.TotalChunks);
        return Accepted(new UploadVideoResponse(job.JobId, job.Status.ToString(), job.CreatedAt));
    }

    [HttpGet("{jobId}/status")]
    public IActionResult GetStatus(string jobId)
    {
        var job = _jobStore.Get(jobId);
        if (job == null) return NotFound(new { error = "Job not found." });

        return Ok(new JobStatusResponse(
            job.JobId,
            job.Status.ToString(),
            job.ProgressPercent,
            job.ErrorMessage,
            job.CreatedAt
        ));
    }

    [HttpGet("{jobId}/stream")]
    public IActionResult StreamVideo(string jobId)
    {
        var job = _jobStore.Get(jobId);
        if (job == null || job.OriginalFilePath == null)
            return NotFound(new { error = "Video not found." });

        if (!System.IO.File.Exists(job.OriginalFilePath))
            return NotFound(new { error = "Video file missing." });

        var stream = _storage.OpenFileStream(job.OriginalFilePath);
        return File(stream, "video/mp4", enableRangeProcessing: true);
    }

    [HttpDelete("{jobId}")]
    public async Task<IActionResult> Delete(string jobId)
    {
        var job = _jobStore.Get(jobId);
        if (job == null) return NotFound(new { error = "Job not found." });

        await _storage.DeleteJobFilesAsync(jobId);
        _jobStore.Remove(jobId);
        return NoContent();
    }
}

public record FinalizeUploadRequest(string UploadId, int TotalChunks, string FileName, string? UserId);
