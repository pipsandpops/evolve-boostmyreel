using AIReelBooster.API.ImageGrowthEngine.Models;

namespace AIReelBooster.API.ImageGrowthEngine.Interfaces;

public class CarouselOptimizationResult
{
    public List<string> FlowSuggestions { get; set; } = [];
    public List<int> SuggestedSlideOrder { get; set; } = [];
    public int BestSlideIndex { get; set; }
    public string? CoverRecommendation { get; set; }
    public List<string> WeakSlideInsights { get; set; } = [];
}

/// <summary>
/// Analyses a carousel as a whole unit — story arc, slide order, and weak-slide detection.
/// </summary>
public interface ICarouselOptimizer
{
    Task<CarouselOptimizationResult> OptimizeAsync(
        IReadOnlyList<SlideAnalysis> slides,
        CancellationToken ct = default);
}
