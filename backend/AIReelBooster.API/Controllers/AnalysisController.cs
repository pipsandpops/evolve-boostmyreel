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
    private readonly IAIGenerationService _aiGeneration;
    private readonly IScenarioPredictionService _scenarioPrediction;
    private readonly BackgroundProcessingQueue _queue;
    private readonly ILogger<AnalysisController> _logger;

    public AnalysisController(
        JobStore jobStore,
        IVideoStorageService storage,
        IVideoProcessingService videoProcessing,
        IAIGenerationService aiGeneration,
        IScenarioPredictionService scenarioPrediction,
        BackgroundProcessingQueue queue,
        ILogger<AnalysisController> logger)
    {
        _jobStore           = jobStore;
        _storage            = storage;
        _videoProcessing    = videoProcessing;
        _aiGeneration       = aiGeneration;
        _scenarioPrediction = scenarioPrediction;
        _queue              = queue;
        _logger             = logger;
    }

    [HttpGet("{jobId}")]
    public IActionResult GetAnalysis(string jobId)
    {
        var job = _jobStore.Get(jobId);
        if (job == null) return NotFound(new { error = "Job not found." });

        if (job.Status != JobStatus.Complete)
            return Conflict(new { error = $"Job is not complete. Current status: {job.Status}" });

        var result = job.AnalysisResult!;

        // Compute scenario-based view prediction from viral score factors
        ViewPredictionDto? viewPrediction = null;
        if (result.ViralScore != null)
        {
            var vp = _scenarioPrediction.GenerateScenarios(
                result.ViralScore.ViralScore,
                result.ViralScore.EngagementScore,
                result.ViralScore.HookScore);

            viewPrediction = new ViewPredictionDto(
                vp.PredictionType,
                vp.ViralTier,
                vp.Scenarios.Select(s => new ViewScenarioDto(s.Followers, s.Views, s.Tier)).ToList(),
                vp.Note,
                vp.Followers,
                vp.AvgViews,
                vp.PredictedRange,
                vp.Confidence,
                vp.BasedOn);
        }

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
            ),
            result.HasAudio,
            result.Insights,
            viewPrediction
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

    [HttpPost("{jobId}/roast")]
    public async Task<IActionResult> RoastReel(string jobId, CancellationToken ct)
    {
        var job = _jobStore.Get(jobId);
        if (job == null) return NotFound(new { error = "Job not found." });
        if (job.Status != JobStatus.Complete) return Conflict(new { error = "Job not complete yet." });
        if (job.AnalysisResult == null) return BadRequest(new { error = "No analysis result available." });

        var result     = job.AnalysisResult;
        var transcript = job.Transcript ?? "[No speech detected]";
        var viralScore = result.ViralScore?.ViralScore ?? 0;

        try
        {
            var roast = await _aiGeneration.GenerateRoastAsync(
                result.Hook, result.Caption, result.Hashtags, viralScore, transcript, ct);

            return Ok(new RoastResponse(roast.Roast, roast.GlowUp));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Roast generation failed for job {JobId}", jobId);
            return StatusCode(500, new { error = "Failed to generate roast." });
        }
    }

    [HttpPost("{jobId}/cinematic")]
    public async Task<IActionResult> GenerateCinematic(string jobId, CancellationToken ct)
    {
        var job = _jobStore.Get(jobId);
        if (job == null) return NotFound(new { error = "Job not found." });
        if (job.Status != JobStatus.Complete) return Conflict(new { error = "Job not complete yet." });
        if (job.OriginalFilePath == null)
            return BadRequest(new { error = "Missing source video file." });

        // Return cached result if already generated
        if (job.CinematicVideoFilePath != null && System.IO.File.Exists(job.CinematicVideoFilePath))
            return Ok(new CinematicVideoResponse(jobId, $"/api/analysis/{jobId}/cinematic-video"));

        try
        {
            var outputDir      = _storage.GetJobDirectory(jobId);
            var durationSecs   = job.DurationSeconds ?? 30.0;
            var cinematicPath  = await _videoProcessing.GenerateCinematicVideoAsync(
                job.OriginalFilePath, outputDir, durationSecs, ct);

            job.CinematicVideoFilePath = cinematicPath;
            return Ok(new CinematicVideoResponse(jobId, $"/api/analysis/{jobId}/cinematic-video"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Cinematic generation failed for job {JobId}", jobId);
            return StatusCode(500, new { error = "Failed to generate cinematic video." });
        }
    }

    [HttpGet("{jobId}/cinematic-video")]
    public IActionResult StreamCinematicVideo(string jobId)
    {
        var job = _jobStore.Get(jobId);
        if (job == null || job.CinematicVideoFilePath == null)
            return NotFound(new { error = "Cinematic video not found." });

        if (!System.IO.File.Exists(job.CinematicVideoFilePath))
            return NotFound(new { error = "Cinematic video file missing." });

        var stream = _storage.OpenFileStream(job.CinematicVideoFilePath);
        return File(stream, "video/mp4", enableRangeProcessing: true);
    }

    [HttpPost("{jobId}/improve")]
    public async Task<IActionResult> ImproveReel(
        string jobId,
        [FromBody] ImproveReelRequest request,
        CancellationToken ct)
    {
        var job = _jobStore.Get(jobId);
        if (job == null) return NotFound(new { error = "Job not found." });
        if (job.Status != JobStatus.Complete) return Conflict(new { error = "Job not complete yet." });
        if (job.AnalysisResult == null) return BadRequest(new { error = "No analysis result available." });

        var transcript = job.Transcript ?? "[No speech detected in video]";
        var caption    = job.AnalysisResult.Caption;

        try
        {
            var viralScore = await _aiGeneration.AnalyzeViralScoreAsync(
                request.ImprovedHook, caption, transcript, ct);

            return Ok(new ImproveReelResponse(new ViralScoreDto(
                viralScore.HookScore,
                viralScore.EmotionScore,
                viralScore.ClarityScore,
                viralScore.TrendScore,
                viralScore.EngagementScore,
                viralScore.ViralScore,
                viralScore.Problem,
                viralScore.ImprovedHook
            )));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Improve reel failed for job {JobId}", jobId);
            return StatusCode(500, new { error = "Failed to analyze reel." });
        }
    }

    private static string FormatTime(TimeSpan ts) =>
        $"{(int)ts.TotalHours:D2}:{ts.Minutes:D2}:{ts.Seconds:D2},{ts.Milliseconds:D3}";
}
