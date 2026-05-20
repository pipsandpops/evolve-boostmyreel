using AIReelBooster.API.Infrastructure;
using AIReelBooster.API.Models.Domain;
using AIReelBooster.API.Services.Interfaces;

namespace AIReelBooster.API.Workers;

public class VideoProcessingWorker : BackgroundService
{
    private readonly BackgroundProcessingQueue _queue;
    private readonly JobStore _jobStore;
    private readonly IServiceProvider _services;
    private readonly ILogger<VideoProcessingWorker> _logger;

    public VideoProcessingWorker(
        BackgroundProcessingQueue queue,
        JobStore jobStore,
        IServiceProvider services,
        ILogger<VideoProcessingWorker> logger)
    {
        _queue    = queue;
        _jobStore = jobStore;
        _services = services;
        _logger   = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("VideoProcessingWorker started");
        await foreach (var jobId in _queue.ReadAllAsync(stoppingToken))
            await ProcessJobAsync(jobId, stoppingToken);
    }

    private async Task ProcessJobAsync(string jobId, CancellationToken ct)
    {
        var job = _jobStore.Get(jobId);
        if (job == null)
        {
            _logger.LogWarning("Job {JobId} not found in store", jobId);
            return;
        }

        _logger.LogInformation("Processing job {JobId} (source: {Source})",
            jobId, job.SourceUrl ?? job.OriginalFilePath ?? "unknown");

        using var scope = _services.CreateScope();
        var videoProcessing = scope.ServiceProvider.GetRequiredService<IVideoProcessingService>();
        var transcription   = scope.ServiceProvider.GetRequiredService<ITranscriptionService>();
        var aiGeneration    = scope.ServiceProvider.GetRequiredService<IAIGenerationService>();
        var storage         = scope.ServiceProvider.GetRequiredService<IVideoStorageService>();
        var urlDownload     = scope.ServiceProvider.GetRequiredService<IUrlDownloadService>();

        try
        {
            var outputDir = storage.GetJobDirectory(jobId);
            List<SubtitleEntry> subtitles;

            // ── Branch: URL job vs uploaded-file job ─────────────────────────
            if (!string.IsNullOrEmpty(job.SourceUrl))
            {
                // Step 0: download audio from URL (YouTube / Instagram / Facebook)
                SetStatus(job, JobStatus.Pending, 10, $"Downloading from {job.SourcePlatform}…");
                var audioPath = await urlDownload.DownloadAudioAsync(job.SourceUrl, outputDir, ct);
                job.AudioFilePath = audioPath;
                job.HasAudio      = true;

                // Step 1: transcribe
                SetStatus(job, JobStatus.Transcribing, 40, "Transcribing audio…");
                subtitles = await transcription.TranscribeAsync(audioPath, ct);
                _logger.LogInformation("Job {JobId}: Transcribed {Count} segments", jobId, subtitles.Count);

                var srtPath = storage.GetFilePath(jobId, "subtitles.srt");
                await SrtWriter.WriteAsync(srtPath, subtitles, ct);
                job.SrtFilePath = srtPath;
            }
            else
            {
                // Step 1: probe video metadata
                SetStatus(job, JobStatus.Pending, 15, "Analyzing video…");
                var (duration, width, height, fps) =
                    await videoProcessing.ProbeVideoAsync(job.OriginalFilePath!, ct);
                job.DurationSeconds = duration;
                job.Width           = width;
                job.Height          = height;
                job.FrameRate       = fps;
                _logger.LogInformation("Job {JobId}: {W}x{H} @ {FPS}fps, {Dur:F1}s",
                    jobId, width, height, fps, duration);

                // Step 2: check for audio
                SetStatus(job, JobStatus.Transcribing, 20, "Checking audio…");
                var hasAudio = await videoProcessing.HasAudioStreamAsync(job.OriginalFilePath!, ct);
                job.HasAudio = hasAudio;

                if (hasAudio)
                {
                    SetStatus(job, JobStatus.Transcribing, 25, "Extracting audio…");
                    var audioPath = await videoProcessing.ExtractAudioAsync(job.OriginalFilePath!, outputDir, ct);
                    job.AudioFilePath = audioPath;

                    try
                    {
                        var thumbPath = await videoProcessing.ExtractThumbnailAsync(job.OriginalFilePath!, outputDir, ct);
                        job.ThumbnailFilePath = thumbPath;
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Job {JobId}: Thumbnail extraction failed (non-fatal)", jobId);
                    }

                    SetStatus(job, JobStatus.Transcribing, 40, "Transcribing…");
                    subtitles = await transcription.TranscribeAsync(audioPath, ct);
                    _logger.LogInformation("Job {JobId}: Transcribed {Count} segments", jobId, subtitles.Count);

                    var srtPath = storage.GetFilePath(jobId, "subtitles.srt");
                    await SrtWriter.WriteAsync(srtPath, subtitles, ct);
                    job.SrtFilePath = srtPath;
                }
                else
                {
                    _logger.LogWarning("Job {JobId}: No audio stream — skipping transcription", jobId);
                    job.Insights.Add("Your reel has no audio — adding voiceover or background music can significantly boost engagement.");
                    subtitles = [];

                    try
                    {
                        var thumbPath = await videoProcessing.ExtractThumbnailAsync(job.OriginalFilePath!, outputDir, ct);
                        job.ThumbnailFilePath = thumbPath;
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Job {JobId}: Thumbnail extraction failed (non-fatal)", jobId);
                    }
                }
            }

            // ── Common: AI content generation ────────────────────────────────
            SetStatus(job, JobStatus.GeneratingAI, 70, "Generating AI content…");
            var transcript = string.Join(" ", subtitles.Select(s => s.Text));
            if (string.IsNullOrWhiteSpace(transcript))
                transcript = "[No speech detected in video]";
            job.Transcript = transcript;

            var (hook, caption, hashtags) = await aiGeneration.GenerateAsync(transcript, ct);

            // ── Viral score ──────────────────────────────────────────────────
            SetStatus(job, JobStatus.GeneratingAI, 88, "Calculating viral score…");
            ViralScoreResult? viralScore = null;
            try
            {
                viralScore = await aiGeneration.AnalyzeViralScoreAsync(hook, caption, transcript, ct);
                _logger.LogInformation("Job {JobId}: Viral score = {Score}", jobId, viralScore.ViralScore);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Job {JobId}: Viral score analysis failed (non-fatal)", jobId);
            }

            // ── Complete ─────────────────────────────────────────────────────
            job.AnalysisResult = new AnalysisResult
            {
                Hook       = hook,
                Caption    = caption,
                Hashtags   = hashtags,
                Subtitles  = subtitles,
                ViralScore = viralScore,
                HasAudio   = job.HasAudio,
                Insights   = job.Insights,
            };

            SetStatus(job, JobStatus.Complete, 100, null);
            job.CompletedAt = DateTime.UtcNow;
            _logger.LogInformation("Job {JobId} completed successfully", jobId);
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("Job {JobId} cancelled", jobId);
            SetStatus(job, JobStatus.Failed, 0, "Processing was cancelled.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Job {JobId} failed: {Message}", jobId, ex.Message);
            SetStatus(job, JobStatus.Failed, 0, ex.Message);
        }
    }

    private static void SetStatus(VideoJob job, JobStatus status, int progress, string? message)
    {
        job.Status          = status;
        job.ProgressPercent = progress;
        if (message != null) job.ErrorMessage = message;
    }
}
