namespace AIReelBooster.API.ImageGrowthEngine.Models;

/// <summary>
/// Per-slide analysis within a carousel.
/// </summary>
public class SlideAnalysis
{
    public int SlideIndex { get; set; }      // 0-based
    public int PostScore { get; set; }
    public VisualFeatures Visual { get; set; } = new();
    public SemanticAnalysis Semantic { get; set; } = new();
    public EngagementPrediction Engagement { get; set; } = new();
    public List<string> Insights { get; set; } = [];

    /// <summary>True if this slide scores significantly below the carousel average.</summary>
    public bool IsWeakSlide { get; set; }

    /// <summary>Suggested improvement for this specific slide.</summary>
    public string? ImprovementSuggestion { get; set; }
}
