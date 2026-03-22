namespace AIReelBooster.API.ImageGrowthEngine.Models;

/// <summary>
/// Top-level result returned to the client.
/// </summary>
public class ImageAnalysisResult
{
    // ── Meta ─────────────────────────────────────────────────────────────────
    public string Type { get; set; } = string.Empty;   // "image" | "carousel"
    public bool IsCarousel => Type == "carousel";

    // ── Primary score ─────────────────────────────────────────────────────────
    public int PostScore { get; set; }

    // ── Key signals ───────────────────────────────────────────────────────────
    public bool HasFace { get; set; }
    public bool HasTextOverlay { get; set; }

    // ── Actionable insights ───────────────────────────────────────────────────
    /// <summary>Human-readable improvement tips (growth-advice style, not raw analysis).</summary>
    public List<string> Insights { get; set; } = [];

    /// <summary>Elements that are absent and hurting performance.</summary>
    public List<string> MissingElements { get; set; } = [];

    // ── Detailed predictions ──────────────────────────────────────────────────
    public EngagementPrediction Engagement { get; set; } = new();
    public VisualFeatures? PrimaryVisualFeatures { get; set; }

    // ── Caption ───────────────────────────────────────────────────────────────
    public CaptionSuggestion Caption { get; set; } = new();

    // ── Carousel-only ─────────────────────────────────────────────────────────
    public List<SlideAnalysis> SlideBreakdown { get; set; } = [];
    public int? BestSlideIndex { get; set; }
    public List<string> CarouselFlowSuggestions { get; set; } = [];
    public List<int>? SuggestedSlideOrder { get; set; }

    // ── Cover / thumbnail ─────────────────────────────────────────────────────
    public string? CoverRecommendation { get; set; }

    // ── Monetization ─────────────────────────────────────────────────────────
    public bool IsPremiumResult { get; set; }
}
