using AIReelBooster.API.Infrastructure;
using AIReelBooster.API.Models.Domain;
using AIReelBooster.API.Models.Responses;
using AIReelBooster.API.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace AIReelBooster.API.Controllers;

[ApiController]
[Route("api/analysis")]
public class AnalysisController : ControllerBase
{
    private readonly JobStore _jobStore;
    private readonly IVideoStorageService _storage;
    private readonly IVideoProcessingService _videoProcessing;
    private readonly BackgroundProcessingQueue _queue;
    private readonly ILogger<AnalysisController> _logger;

    public AnalysisController(
        JobStore jobStore,
        IVideoStorageService storage,
        IVideoProcessingService videoProcessing,
        BackgroundProcessingQueue queue,
        ILogger<AnalysisController> logger)
    {
        _jobStore = jobStore;
        _storage = storage;
        _videoProcessing = videoProcessing;
        _queue = queue;
        _logger = logger;
    }

    [HttpGet("{jobId}")]
    public IActionResult GetAnalysis(string jobId)
    {
        var job = _jobStore.Get(jobId);
        if (job == null) return NotFound(new { error = "Job not found." });

        if (job.Status != JobStatus.Complete)
            return Conflict(new { error = $"Job is not complete. Current status: {job.Status}" });

        var result = job.AnalysisResult!;
        return Ok(new AnalysisResultResponse(
            job.JobId,
            result.Hook,
            result.Caption,
            result.Hashtags,
            result.Subtitles.Select(s => new SubtitleEntryDto(
                s.Index,
                FormatTime(s.Start),
                FormatTime(s.End),
                s.Text
            )).ToList(),
            new VideoMetadataDto(job.DurationSeconds, job.Width, job.Height, job.FrameRate),
            result.ViralScore == null ? null : new ViralScoreDto(
                result.ViralScore.HookScore,
                result.ViralScore.EmotionScore,
                result.ViralScore.ClarityScore,
                result.ViralScore.TrendScore,
                result.ViralScore.EngagementScore,
                result.ViralScore.ViralScore,
                result.ViralScore.Problem,
                result.ViralScore.ImprovedHook
            )
        ));
    }

    [HttpGet("{jobId}/subtitles/srt")]
    public IActionResult DownloadSrt(string jobId)
    {
        var job = _jobStore.Get(jobId);
        if (job == null || job.SrtFilePath == null)
            return NotFound(new { error = "SRT not found." });

        if (!System.IO.File.Exists(job.SrtFilePath))
            return NotFound(new { error = "SRT file missing." });

        var stream = _storage.OpenFileStream(job.SrtFilePath);
        return File(stream, "text/plain", $"subtitles-{jobId}.srt");
    }

    [HttpPost("{jobId}/subtitles/burn")]
    public async Task<IActionResult> BurnSubtitles(string jobId, CancellationToken ct)
    {
        var job = _jobStore.Get(jobId);
        if (job == null) return NotFound(new { error = "Job not found." });
        if (job.Status != JobStatus.Complete) return Conflict(new { error = "Job not complete yet." });
        if (job.OriginalFilePath == null || job.SrtFilePath == null)
            return BadRequest(new { error = "Missing video or subtitle file." });

        // If already burned, return existing
        if (job.BurnedVideoFilePath != null && System.IO.File.Exists(job.BurnedVideoFilePath))
            return Ok(new BurnSubtitlesResponse(jobId, $"/api/analysis/{jobId}/burned-video"));

        job.Status = JobStatus.RenderingSubtitles;
        job.ProgressPercent = 85;

        try
        {
            var outputDir = _storage.GetJobDirectory(jobId);
            var burnedPath = await _videoProcessing.BurnSubtitlesAsync(
                job.OriginalFilePath, job.SrtFilePath, outputDir, ct);

            job.BurnedVideoFilePath = burnedPath;
            job.Status = JobStatus.Complete;
            job.ProgressPercent = 100;

            return Ok(new BurnSubtitlesResponse(jobId, $"/api/analysis/{jobId}/burned-video"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Burn subtitles failed for job {JobId}", jobId);
            job.Status = JobStatus.Complete; // Revert to complete so other features still work
            job.ProgressPercent = 100;
            return StatusCode(500, new { error = "Failed to burn subtitles." });
        }
    }

    [HttpGet("{jobId}/burned-video")]
    public IActionResult StreamBurnedVideo(string jobId)
    {
        var job = _jobStore.Get(jobId);
        if (job == null || job.BurnedVideoFilePath == null)
            return NotFound(new { error = "Burned video not found." });

        if (!System.IO.File.Exists(job.BurnedVideoFilePath))
            return NotFound(new { error = "Burned video file missing." });

        var stream = _storage.OpenFileStream(job.BurnedVideoFilePath);
        return File(stream, "video/mp4", enableRangeProcessing: true);
    }

    private static string FormatTime(TimeSpan ts) =>
        $"{(int)ts.TotalHours:D2}:{ts.Minutes:D2}:{ts.Seconds:D2},{ts.Milliseconds:D3}";
}
