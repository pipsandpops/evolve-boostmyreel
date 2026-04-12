using AIReelBooster.API.ImageGrowthEngine.Infrastructure;
using AIReelBooster.API.ImageGrowthEngine.Interfaces;
using AIReelBooster.API.ImageGrowthEngine.Models;

namespace AIReelBooster.API.ImageGrowthEngine.Workers;

/// <summary>
/// Background worker that processes image analysis jobs from the queue.
///
/// Pipeline (per job):
///   1. Extract visual features (ImageSharp — local, no API)
///   2. Semantic analysis via Claude Vision (per slide)
///   3. Engagement prediction (deterministic)
///   4. [Carousel] Carousel optimization + flow advice
///   5. Caption generation via Claude
///   6. Compose final ImageAnalysisResult
/// </summary>
public class ImageProcessingWorker : BackgroundService
{
    private readonly ImageProcessingQueue _queue;
    private readonly ImageJobStore        _store;
    private readonly IServiceProvider     _services;
    private readonly ILogger<ImageProcessingWorker> _logger;

    public ImageProcessingWorker(
        ImageProcessingQueue queue,
        ImageJobStore        store,
        IServiceProvider     services,
        ILogger<ImageProcessingWorker> logger)
    {
        _queue    = queue;
        _store    = store;
        _services = services;
        _logger   = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("ImageProcessingWorker started");
        await foreach (var jobId in _queue.ReadAllAsync(stoppingToken))
            await ProcessJobAsync(jobId, stoppingToken);
    }

    // ── Main pipeline ─────────────────────────────────────────────────────────

    private async Task ProcessJobAsync(string jobId, CancellationToken ct)
    {
        var job = _store.Get(jobId);
        if (job is null)
        {
            _logger.LogWarning("Image job {JobId} not found", jobId);
            return;
        }

        _logger.LogInformation("Processing image job {JobId} ({Count} image(s))", jobId, job.ImageFilePaths.Count);

        using var scope        = _services.CreateScope();
        var featureExtractor   = scope.ServiceProvider.GetRequiredService<IVisualFeatureExtractor>();
        var imageAnalyzer      = scope.ServiceProvider.GetRequiredService<IImageAnalyzerService>();
        var engagementPredictor = scope.ServiceProvider.GetRequiredService<IEngagementPredictor>();
        var captionGenerator   = scope.ServiceProvider.GetRequiredService<ICaptionGeneratorService>();
        var carouselOptimizer  = scope.ServiceProvider.GetRequiredService<ICarouselOptimizer>();

        try
        {
            SetStatus(job, ImageJobStatus.Analyzing, 10, "Extracting visual features...");

            // ── Step 1+2+3: Per-image analysis ───────────────────────────────
            var slideAnalyses = new List<SlideAnalysis>();
            int totalSlides   = job.ImageFilePaths.Count;

            for (int i = 0; i < totalSlides; i++)
            {
                var path   = job.ImageFilePaths[i];
                int baseProgress = 10 + (int)((double)i / totalSlides * 50);

                // 1. Visual features (ImageSharp — fast, local)
                SetStatus(job, ImageJobStatus.Analyzing, baseProgress,
                    $"Analysing slide {i + 1} of {totalSlides}...");

                VisualFeatures visual;
                await using (var fs = File.OpenRead(path))
                    visual = await featureExtractor.ExtractAsync(fs, ct);

                // 2. Semantic analysis (Claude Vision)
                var semantic   = await imageAnalyzer.AnalyzeAsync(path, ct);

                // 3. Engagement prediction
                var engagement = engagementPredictor.Predict(visual, semantic);
                var insights   = engagementPredictor.BuildInsights(visual, semantic, engagement.PostScore);

                slideAnalyses.Add(new SlideAnalysis
                {
                    SlideIndex  = i,
                    PostScore   = engagement.PostScore,
                    Visual      = visual,
                    Semantic    = semantic,
                    Engagement  = engagement,
                    Insights    = insights,
                });

                _logger.LogInformation("Slide {I}: score={S}", i, engagement.PostScore);
            }

            // ── Step 4: Caption generation ────────────────────────────────────
            SetStatus(job, ImageJobStatus.GeneratingCaptions, 65, "Generating captions...");

            var primarySlide  = slideAnalyses.OrderByDescending(s => s.PostScore).First();
            var captionSuggestion = await captionGenerator.GenerateAsync(
                primarySlide.Semantic,
                primarySlide.Visual,
                job.UserCaption,
                job.Tone,
                ct);

            // ── Step 5: Carousel optimization (multi-image only) ──────────────
            CarouselOptimizationResult? carouselResult = null;
            if (job.IsCarousel)
            {
                SetStatus(job, ImageJobStatus.GeneratingCaptions, 80, "Optimising carousel...");
                carouselResult = await carouselOptimizer.OptimizeAsync(slideAnalyses, ct);
            }

            // ── Step 6: Compose result ────────────────────────────────────────
            SetStatus(job, ImageJobStatus.GeneratingCaptions, 95, "Composing analysis...");

            var overallScore    = slideAnalyses.Count == 1
                ? slideAnalyses[0].PostScore
                : (int)Math.Round(slideAnalyses.Average(s => s.PostScore));

            var primarySemantic = primarySlide.Semantic;
            var primaryVisual   = primarySlide.Visual;
            var missingElements = engagementPredictor.IdentifyMissingElements(primaryVisual, primarySemantic);

            // Merge all per-slide insights (deduplicate)
            var allInsights = slideAnalyses
                .SelectMany(s => s.Insights)
                .Distinct()
                .Take(10)
                .ToList();

            job.Result = new ImageAnalysisResult
            {
                Type                   = job.IsCarousel ? "carousel" : "image",
                PostScore              = overallScore,
                HasFace                = primarySemantic.HasFace,
                HasTextOverlay         = primarySemantic.HasTextOverlay,
                Insights               = allInsights,
                MissingElements        = missingElements,
                Engagement             = primarySlide.Engagement,
                PrimaryVisualFeatures  = primaryVisual,
                Caption                = captionSuggestion,
                SlideBreakdown         = slideAnalyses,
                BestSlideIndex         = carouselResult?.BestSlideIndex,
                CarouselFlowSuggestions = carouselResult?.FlowSuggestions ?? [],
                SuggestedSlideOrder    = carouselResult?.SuggestedSlideOrder,
                CoverRecommendation    = carouselResult?.CoverRecommendation,
                IsPremiumResult        = true,   // caption + carousel = premium features
            };

            SetStatus(job, ImageJobStatus.Complete, 100, null);
            job.CompletedAt = DateTime.UtcNow;
            _logger.LogInformation("Image job {JobId} complete — score={Score}", jobId, overallScore);
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("Image job {JobId} cancelled", jobId);
            SetStatus(job, ImageJobStatus.Failed, 0, "Processing was cancelled.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Image job {JobId} failed: {Message}", jobId, ex.Message);
            SetStatus(job, ImageJobStatus.Failed, 0, $"Analysis failed: {ex.Message}");
        }
        finally
        {
            // NOTE: source images are intentionally kept so that Smart Reframe can
            // run after analysis completes. The JobCleanupWorker removes the whole
            // job directory when the job expires (60 min TTL).
        }
    }

    private static void SetStatus(ImageJob job, ImageJobStatus status, int progress, string? message)
    {
        job.Status          = status;
        job.ProgressPercent = progress;
        if (message != null) job.ErrorMessage = message;
    }
}
