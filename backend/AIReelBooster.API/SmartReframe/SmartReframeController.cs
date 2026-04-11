using AIReelBooster.API.Configuration;
using AIReelBooster.API.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace AIReelBooster.API.SmartReframe;

/// <summary>
/// POST /api/video/smart-reframe
///
/// Accepts a completed video-analysis job ID and runs Smart Reframe.
///
/// Routing (config-driven, no API change):
///   Features.EnableDynamicReframe = false (default)
///     → SmartReframeService  (Phase 1 — static median crop)
///   Features.EnableDynamicReframe = true
///     → DynamicReframeService (v2 — per-frame tracking + sendcmd crop)
/// </summary>
[ApiController]
[Route("api/video")]
public class SmartReframeController : ControllerBase
{
    private readonly ISmartReframeService  _staticService;
    private readonly IDynamicReframeService _dynamicService;
    private readonly JobStore              _jobStore;
    private readonly StorageSettings       _storage;
    private readonly FeatureFlags          _features;
    private readonly ILogger<SmartReframeController> _logger;

    public SmartReframeController(
        ISmartReframeService             staticService,
        IDynamicReframeService           dynamicService,
        JobStore                         jobStore,
        IOptions<AppSettings>            opts,
        ILogger<SmartReframeController>  logger)
    {
        _staticService  = staticService;
        _dynamicService = dynamicService;
        _jobStore       = jobStore;
        _storage        = opts.Value.Storage;
        _features       = opts.Value.Features;
        _logger         = logger;
    }

    // ── POST /api/video/smart-reframe ─────────────────────────────────────────
    //
    // Request:  { "jobId": "<completed video job id>" }
    // Response: { "reframeJobId": "...", "status": "processed", "outputUrl": "..." }
    //           (unchanged — no API contract change)

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

        var jobDir     = Path.GetFullPath(Path.Combine(_storage.TempPath, request.JobId));
        Directory.CreateDirectory(jobDir);
        var outputPath = Path.Combine(jobDir, "reframed.mp4");
        var reframeId  = Guid.NewGuid().ToString("N")[..12];

        var mode = _features.EnableDynamicReframe ? "dynamic-v2" : "static-v1";
        _logger.LogInformation(
            "SmartReframe: job={Job} reframeId={RId} mode={Mode} input={In}",
            request.JobId, reframeId, mode, videoJob.OriginalFilePath);

        try
        {
            bool   faceDetected;
            int    framesWithFace, framesAnalysed, cropX;

            if (_features.EnableDynamicReframe)
            {
                var result = await _dynamicService.ReframeAsync(
                    videoJob.OriginalFilePath, outputPath, ct);

                faceDetected   = result.FaceDetected;
                framesWithFace = result.FramesWithFace;
                framesAnalysed = result.FramesAnalysed;
                cropX          = result.CropX;
            }
            else
            {
                var result = await _staticService.ReframeAsync(
                    videoJob.OriginalFilePath, outputPath, ct);

                faceDetected   = result.FaceDetected;
                framesWithFace = result.FramesWithFace;
                framesAnalysed = result.FramesAnalysed;
                cropX          = result.CropX;
            }

            _logger.LogInformation(
                "SmartReframe: done mode={Mode} faceDetected={F} frames={FW}/{FA} cropX={X}",
                mode, faceDetected, framesWithFace, framesAnalysed, cropX);

            return Ok(new SmartReframeResponse(
                ReframeJobId: reframeId,
                Status:       "processed",
                OutputUrl:    $"/api/video/smart-reframe/{request.JobId}/download"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "SmartReframe: failed for job {Job} mode={Mode}", request.JobId, mode);
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
