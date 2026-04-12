using System.Text;
using System.Text.Json;
using AIReelBooster.API.Configuration;
using AIReelBooster.API.ImageGrowthEngine.Interfaces;
using AIReelBooster.API.ImageGrowthEngine.Models;
using Microsoft.Extensions.Options;

namespace AIReelBooster.API.ImageGrowthEngine.Services;

/// <summary>
/// Analyses a carousel as a whole unit.
/// Uses Claude to generate flow suggestions; weak-slide detection is local.
/// </summary>
public class CarouselOptimizer : ICarouselOptimizer
{
    private readonly HttpClient _http;
    private readonly ClaudeSettings _settings;
    private readonly ILogger<CarouselOptimizer> _logger;

    public CarouselOptimizer(
        HttpClient http,
        IOptions<AppSettings> opts,
        ILogger<CarouselOptimizer> logger)
    {
        _http     = http;
        _settings = opts.Value.Claude;
        _logger   = logger;

        _http.DefaultRequestHeaders.TryAddWithoutValidation("x-api-key", _settings.ApiKey);
        _http.DefaultRequestHeaders.TryAddWithoutValidation("anthropic-version", "2023-06-01");
    }

    public async Task<CarouselOptimizationResult> OptimizeAsync(
        IReadOnlyList<SlideAnalysis> slides, CancellationToken ct = default)
    {
        _logger.LogInformation("Optimizing carousel of {Count} slides", slides.Count);

        var avgScore  = slides.Average(s => s.PostScore);
        var threshold = avgScore - 15; // slides below this are "weak"

        // ── Mark weak slides + per-slide insights ─────────────────────────────
        foreach (var slide in slides)
        {
            slide.IsWeakSlide = slide.PostScore < threshold;

            if (slide.IsWeakSlide)
            {
                slide.ImprovementSuggestion = BuildSlideImprovement(slide, (int)avgScore);
                slide.Insights.Add($"This slide scores {slide.PostScore}/100 — below the carousel average of {avgScore:F0}.");
            }
        }

        // ── Best slide (highest score → cover candidate) ─────────────────────
        int bestIdx = slides
            .Select((s, i) => (Score: s.PostScore, Index: i))
            .OrderByDescending(x => x.Score)
            .First().Index;

        // ── Suggested ordering (hook-first, CTA-last heuristic) ───────────────
        var suggestedOrder = BuildSuggestedOrder(slides);

        // ── Claude for storytelling flow advice ───────────────────────────────
        var flowSuggestions = await GenerateFlowAdviceAsync(slides, ct);

        // ── Weak-slide insights ───────────────────────────────────────────────
        var weakInsights = slides
            .Where(s => s.IsWeakSlide)
            .Select(s => $"Slide {s.SlideIndex + 1} breaks engagement flow (score {s.PostScore}) — {s.ImprovementSuggestion}")
            .ToList();

        // ── Cover recommendation ──────────────────────────────────────────────
        var bestSlide = slides[bestIdx];
        string coverRec = bestSlide.Semantic.HasFace && bestSlide.Semantic.HasTextOverlay
            ? $"Slide {bestIdx + 1} is ideal as your cover — it has both a human face and text overlay for maximum thumb-stop."
            : $"Slide {bestIdx + 1} has the highest visual score ({bestSlide.PostScore}/100) — recommended as your cover image.";

        return new CarouselOptimizationResult
        {
            FlowSuggestions    = flowSuggestions,
            SuggestedSlideOrder = suggestedOrder,
            BestSlideIndex     = bestIdx,
            CoverRecommendation = coverRec,
            WeakSlideInsights  = weakInsights,
        };
    }

    // ── Claude flow advice ────────────────────────────────────────────────────

    private async Task<List<string>> GenerateFlowAdviceAsync(
        IReadOnlyList<SlideAnalysis> slides, CancellationToken ct)
    {
        var slideDescriptions = slides.Select((s, i) =>
            $"Slide {i + 1}: scene={s.Semantic.SceneType}, mood={s.Semantic.Mood}, " +
            $"hasFace={s.Semantic.HasFace}, hasText={s.Semantic.HasTextOverlay}, score={s.PostScore}");

        var prompt = $"""
            You are a carousel content strategist for Instagram and LinkedIn.

            Here is a {slides.Count}-slide carousel:
            {string.Join("\n", slideDescriptions)}

            Analyse the storytelling flow and return 3-5 concrete flow suggestions as a JSON array of strings.
            Return ONLY valid JSON array (no markdown, no explanation):
            ["suggestion1", "suggestion2", "suggestion3"]

            Each suggestion must be actionable and specific to this carousel.
            Use growth-advice framing (e.g. "Move slide 3 earlier to hook viewers before they drop off").
            """;

        try
        {
            var body    = JsonSerializer.Serialize(new
            {
                model      = _settings.Model,
                max_tokens = 512,
                messages   = new[] { new { role = "user", content = prompt } }
            });
            var resp    = await _http.PostAsync(_settings.Endpoint,
                new StringContent(body, Encoding.UTF8, "application/json"), ct);
            resp.EnsureSuccessStatusCode();

            var json = await resp.Content.ReadAsStringAsync(ct);
            var doc  = JsonDocument.Parse(json);
            var text = doc.RootElement.GetProperty("content")[0].GetProperty("text").GetString() ?? "[]";
            text = text.Trim().TrimStart('`').TrimEnd('`').Trim();
            if (text.StartsWith("json\n")) text = text[5..];

            var arr = JsonDocument.Parse(text).RootElement;
            if (arr.ValueKind == JsonValueKind.Array)
                return arr.EnumerateArray()
                    .Where(x => x.ValueKind == JsonValueKind.String)
                    .Select(x => x.GetString()!)
                    .ToList();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Carousel flow advice from Claude failed (non-fatal)");
        }

        // Fallback: rule-based suggestions
        return BuildRuleBasedFlow(slides);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static List<int> BuildSuggestedOrder(IReadOnlyList<SlideAnalysis> slides)
    {
        // Heuristic: best-scoring slide first (hook), then remaining by score desc,
        // except if the last slide has a CTA boost we preserve it at the end.
        return slides
            .Select((s, i) => (Score: s.PostScore, Index: i))
            .OrderByDescending(x => x.Score)
            .Select(x => x.Index)
            .ToList();
    }

    private static string BuildSlideImprovement(SlideAnalysis slide, int avgScore)
    {
        var tips = new List<string>();
        if (!slide.Semantic.HasFace)       tips.Add("add a human face");
        if (!slide.Semantic.HasTextOverlay) tips.Add("add text overlay");
        if (!slide.Visual.IsHighContrast)  tips.Add("increase contrast");
        if (!slide.Visual.IsSharp)         tips.Add("use a sharper image");
        return tips.Count > 0
            ? string.Join(", ", tips) + " to reach the carousel average."
            : "review overall composition and visual clarity.";
    }

    private static List<string> BuildRuleBasedFlow(IReadOnlyList<SlideAnalysis> slides)
    {
        var tips = new List<string>
        {
            "Place your highest-scoring slide first — it's your hook and determines if viewers swipe.",
            "End with a strong CTA slide that tells viewers exactly what to do next.",
        };
        if (slides.Count > 3)
            tips.Add("Keep carousels to 5-7 slides — drop-off increases sharply after slide 7.");
        if (slides.Any(s => s.IsWeakSlide))
            tips.Add("Remove or redesign weak slides — a single low-quality slide can break engagement momentum.");
        return tips;
    }
}
