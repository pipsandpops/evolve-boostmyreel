using AIReelBooster.API.AutoReelGenerator.Infrastructure;
using AIReelBooster.API.AutoReelGenerator.Interfaces;
using AIReelBooster.API.AutoReelGenerator.Models;
using AIReelBooster.API.Configuration;
using AIReelBooster.API.Infrastructure;
using AIReelBooster.API.Services.Interfaces;
using Microsoft.Extensions.Options;

namespace AIReelBooster.API.AutoReelGenerator.Workers;

/// <summary>
/// Background service that processes reel generation jobs one at a time.
///
/// Pipeline per job:
///   1. Detect scene-change boundaries (FFmpeg showinfo)
///   2. Rank candidate segments (motion + speech + keyword + duration)
///   3. Extract raw clips from the source video
///   4. Convert each clip to 9:16 vertical format (crop + zoom + subtitles)
///   5. Optionally generate AI titles via Claude (uses the transcript hook)
/// </summary>
public class ReelGenerationWorker : BackgroundService
{
    private readonly ReelProcessingQueue _queue;
    private readonly ReelJobStore        _reelJobStore;
    private readonly JobStore            _videoJobStore;
    private readonly IServiceProvider    _services;
    private readonly AutoReelSettings    _settings;
    private readonly StorageSettings     _storage;
    private readonly ILogger<ReelGenerationWorker> _logger;

    public ReelGenerationWorker(
        ReelProcessingQueue              queue,
        ReelJobStore                     reelJobStore,
        JobStore                         videoJobStore,
        IServiceProvider                 services,
        IOptions<AppSettings>            opts,
        ILogger<ReelGenerationWorker>    logger)
    {
        _queue         = queue;
        _reelJobStore  = reelJobStore;
        _videoJobStore = videoJobStore;
        _services      = services;
        _settings      = opts.Value.AutoReel;
        _storage       = opts.Value.Storage;
        _logger        = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("ReelGenerationWorker started");

        await foreach (var reelJobId in _queue.ReadAllAsync(stoppingToken))
        {
            await ProcessJobAsync(reelJobId, stoppingToken);
        }
    }

    // ── Per-job orchestration ─────────────────────────────────────────────────

    private async Task ProcessJobAsync(string reelJobId, CancellationToken ct)
    {
        var reelJob = _reelJobStore.Get(reelJobId);
        if (reelJob == null)
        {
            _logger.LogWarning("ReelJob {Id} not found in store — skipping", reelJobId);
            return;
        }

        var videoJob = _videoJobStore.Get(reelJob.SourceJobId);
        if (videoJob == null)
        {
            Fail(reelJob, $"Source job '{reelJob.SourceJobId}' no longer exists.");
            return;
        }

        _logger.LogInformation("ReelJob {Id}: processing source job {Src}", reelJobId, reelJob.SourceJobId);

        // Output directory: <TempPath>/<sourceJobId>/reels/
        var reelDir = Path.Combine(
            Path.GetFullPath(_storage.TempPath),
            reelJob.SourceJobId,
            "reels");
        Directory.CreateDirectory(reelDir);

        using var scope     = _services.CreateScope();
        var sceneDetector   = scope.ServiceProvider.GetRequiredService<ISceneDetectionService>();
        var ranker          = scope.ServiceProvider.GetRequiredService<ISegmentRankingService>();
        var videoProcessor  = scope.ServiceProvider.GetRequiredService<IReelVideoProcessor>();
        var aiGeneration    = scope.ServiceProvider.GetRequiredService<IAIGenerationService>();

        var subtitles       = videoJob.AnalysisResult?.Subtitles;
        var sourceVideo     = videoJob.OriginalFilePath!;

        try
        {
            // ── Step 1: Scene detection ────────────────────────────────────────
            SetStatus(reelJob, ReelJobStatus.Detecting, 5, "Detecting scenes…");

            var segments = await sceneDetector.DetectScenesAsync(
                sourceVideo,
                _settings.SceneDetectionThreshold,
                _settings.MinSegmentSeconds,
                _settings.MaxSegmentSeconds,
                ct);

            _logger.LogInformation("ReelJob {Id}: {Count} candidate segments", reelJobId, segments.Count);

            // ── Step 2: Ranking ────────────────────────────────────────────────
            SetStatus(reelJob, ReelJobStatus.Ranking, 15, "Ranking segments…");

            var ranked = ranker.RankAndSelect(segments, subtitles, _settings.MaxReels);
            _logger.LogInformation("ReelJob {Id}: {Count} segments selected", reelJobId, ranked.Count);

            if (ranked.Count == 0)
            {
                Fail(reelJob, "No suitable segments found in the video.");
                return;
            }

            // ── Steps 3 + 4: Extract & convert each clip ──────────────────────
            var total    = ranked.Count;
            var generatedReels = new List<GeneratedReel>(total);

            for (var i = 0; i < total; i++)
            {
                var seg     = ranked[i];
                var progress = 20 + (int)((double)i / total * 60);   // 20 → 80 %

                SetStatus(reelJob, ReelJobStatus.Extracting, progress,
                    $"Extracting clip {i + 1} of {total}…");

                var rawName  = $"clip_{i:D2}_raw.mp4";
                var reelName = $"reel_{i:D2}.mp4";

                // 3a. Cut the raw clip
                var rawPath = await videoProcessor.ExtractClipAsync(
                    sourceVideo,
                    seg.StartTime,
                    seg.EndTime,
                    reelDir,
                    rawName,
                    ct);

                SetStatus(reelJob, ReelJobStatus.Processing, progress + 5,
                    $"Converting clip {i + 1} to vertical…");

                // 3b. Convert to 9:16
                var reelPath = await videoProcessor.ConvertToVerticalAsync(
                    rawPath,
                    reelDir,
                    reelName,
                    _settings.EnableZoom,
                    _settings.EnableSubtitles ? subtitles : null,
                    seg.StartTime,
                    ct);

                // Clean up the intermediate raw clip
                TryDelete(rawPath);

                var fileSize = new FileInfo(reelPath).Length;

                generatedReels.Add(new GeneratedReel
                {
                    Index             = i,
                    Title             = $"Reel {i + 1}",    // placeholder; replaced by AI below
                    StartFormatted    = FormatTime(seg.StartTime),
                    EndFormatted      = FormatTime(seg.EndTime),
                    Start             = seg.StartTime,
                    End               = seg.EndTime,
                    FilePath          = reelPath,
                    RelativeUrl       = $"/api/auto-reel/{reelJobId}/download/{i}",
                    MotionScore       = seg.MotionScore,
                    EngagementScore   = seg.CompositeScore,
                    TranscriptSnippet = seg.TranscriptSnippet,
                    FileSizeBytes     = fileSize,
                });
            }

            // ── Step 5: AI titles (optional, non-fatal) ────────────────────────
            if (_settings.EnableAiTitles)
            {
                SetStatus(reelJob, ReelJobStatus.Processing, 85, "Generating reel titles…");
                await GenerateAiTitlesAsync(generatedReels, aiGeneration, ct);
            }

            // ── Complete ───────────────────────────────────────────────────────
            reelJob.GeneratedReels = generatedReels;
            reelJob.Status         = ReelJobStatus.Complete;
            reelJob.ProgressPercent = 100;
            reelJob.CurrentStep    = null;
            reelJob.CompletedAt    = DateTime.UtcNow;

            _logger.LogInformation("ReelJob {Id}: complete — {Count} reels generated", reelJobId, generatedReels.Count);
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("ReelJob {Id} cancelled", reelJobId);
            Fail(reelJob, "Generation was cancelled.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "ReelJob {Id} failed: {Message}", reelJobId, ex.Message);
            Fail(reelJob, $"Generation failed: {ex.Message}");
        }
    }

    // ── AI title generation ───────────────────────────────────────────────────

    private async Task GenerateAiTitlesAsync(
        List<GeneratedReel>  reels,
        IAIGenerationService aiGeneration,
        CancellationToken    ct)
    {
        for (var i = 0; i < reels.Count; i++)
        {
            var reel = reels[i];
            var snippet = reel.TranscriptSnippet;

            if (string.IsNullOrWhiteSpace(snippet))
            {
                reel.Title = $"Best Moment #{i + 1}";
                continue;
            }

            try
            {
                // GenerateAsync returns a hook that works well as a short reel title
                var (hook, _, _) = await aiGeneration.GenerateAsync(snippet, ct);
                // Trim to a single punchy line (the hook is already short)
                reel.Title = hook.Split('\n', StringSplitOptions.RemoveEmptyEntries)
                                 .FirstOrDefault(hook)
                                 .Trim();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "ReelJob AI title generation failed for reel {Index} — using fallback", i);
                reel.Title = $"Top Moment #{i + 1}";
            }
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static void SetStatus(
        ReelJob        job,
        ReelJobStatus  status,
        int            progress,
        string?        step)
    {
        job.Status          = status;
        job.ProgressPercent = progress;
        job.CurrentStep     = step;
    }

    private static void Fail(ReelJob job, string message)
    {
        job.Status          = ReelJobStatus.Failed;
        job.ProgressPercent = 0;
        job.ErrorMessage    = message;
        job.CurrentStep     = null;
    }

    private static string FormatTime(TimeSpan ts) =>
        $"{(int)ts.TotalHours:D2}:{ts.Minutes:D2}:{ts.Seconds:D2}";

    private static void TryDelete(string path)
    {
        try { File.Delete(path); }
        catch { /* non-fatal */ }
    }
}
