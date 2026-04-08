using AIReelBooster.API.Configuration;
using AIReelBooster.API.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace AIReelBooster.API.SmartReframe;

/// <summary>
/// POST /api/video/smart-reframe
///
/// Accepts a completed video-analysis job ID, runs Smart Reframe Phase 1
/// (OpenCV Haar Cascade face detection + FFmpeg 9:16 crop), and returns
/// a download URL for the reframed video.
/// </summary>
[ApiController]
[Route("api/video")]
public class SmartReframeController : ControllerBase
{
    private readonly ISmartReframeService _reframeService;
    private readonly JobStore             _jobStore;
    private readonly StorageSettings      _storage;
    private readonly ILogger<SmartReframeController> _logger;

    public SmartReframeController(
        ISmartReframeService             reframeService,
        JobStore                         jobStore,
        IOptions<AppSettings>            opts,
        ILogger<SmartReframeController>  logger)
    {
        _reframeService = reframeService;
        _jobStore       = jobStore;
        _storage        = opts.Value.Storage;
        _logger         = logger;
    }

    // ── POST /api/video/smart-reframe ─────────────────────────────────────────
    //
    // Request:  { "jobId": "<completed video job id>" }
    // Response: { "reframeJobId": "...", "status": "processed", "outputUrl": "..." }

    [HttpPost("smart-reframe")]
    public async Task<IActionResult> SmartReframe(
        [FromBody] SmartReframeRequest request,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.JobId))
            return BadRequest(new { error = "jobId is required." });

        var videoJob = _jobStore.Get(request.JobId);
        if (videoJob == null)
            return NotFound(new { error = $"Job '{request.JobId}' not found." });

        if (videoJob.Status != Models.Domain.JobStatus.Complete)
            return BadRequest(new { error = $"Job '{request.JobId}' is not complete yet (status: {videoJob.Status})." });

        if (string.IsNullOrEmpty(videoJob.OriginalFilePath) || !System.IO.File.Exists(videoJob.OriginalFilePath))
            return BadRequest(new { error = "Source video file is no longer available." });

        // Output path: same job temp directory, suffixed _reframed.mp4
        var jobDir     = Path.GetFullPath(Path.Combine(_storage.TempPath, request.JobId));
        Directory.CreateDirectory(jobDir);
        var outputPath = Path.Combine(jobDir, "reframed.mp4");
        var reframeId  = Guid.NewGuid().ToString("N")[..12];

        _logger.LogInformation(
            "SmartReframe: job={Job} reframeId={RId} input={In} output={Out}",
            request.JobId, reframeId, videoJob.OriginalFilePath, outputPath);

        try
        {
            var result = await _reframeService.ReframeAsync(
                videoJob.OriginalFilePath,
                outputPath,
                ct);

            _logger.LogInformation(
                "SmartReframe: done — faceDetected={F} framesWithFace={FW}/{FA} cropX={X}",
                result.FaceDetected, result.FramesWithFace, result.FramesAnalysed, result.CropX);

            var outputUrl = $"/api/video/smart-reframe/{request.JobId}/download";

            return Ok(new SmartReframeResponse(
                ReframeJobId: reframeId,
                Status:       "processed",
                OutputUrl:    outputUrl));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "SmartReframe: failed for job {Job}", request.JobId);
            return StatusCode(500, new { error = $"Reframe failed: {ex.Message}" });
        }
    }

    // ── GET /api/video/smart-reframe/{jobId}/download ─────────────────────────

    [HttpGet("smart-reframe/{jobId}/download")]
    public IActionResult Download(string jobId)
    {
        var outputPath = Path.GetFullPath(
            Path.Combine(_storage.TempPath, jobId, "reframed.mp4"));

        if (!System.IO.File.Exists(outputPath))
            return NotFound(new { error = "Reframed video not found. Please run smart-reframe first." });

        var fileName = $"reframed_{jobId}.mp4";
        return PhysicalFile(outputPath, "video/mp4", fileName);
    }
}
