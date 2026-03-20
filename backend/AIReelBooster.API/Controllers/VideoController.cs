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

    private readonly JobStore _jobStore;
    private readonly BackgroundProcessingQueue _queue;
    private readonly IVideoStorageService _storage;
    private readonly long _maxFileSize;
    private readonly ILogger<VideoController> _logger;

    public VideoController(
        JobStore jobStore,
        BackgroundProcessingQueue queue,
        IVideoStorageService storage,
        IOptions<AppSettings> options,
        ILogger<VideoController> logger)
    {
        _jobStore = jobStore;
        _queue = queue;
        _storage = storage;
        _maxFileSize = options.Value.Storage.MaxFileSizeBytes;
        _logger = logger;
    }

    [HttpPost("upload")]
    [RequestSizeLimit(600_000_000)]
    [RequestFormLimits(MultipartBodyLengthLimit = 600_000_000)]
    public async Task<IActionResult> Upload(IFormFile file, CancellationToken ct)
    {
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
