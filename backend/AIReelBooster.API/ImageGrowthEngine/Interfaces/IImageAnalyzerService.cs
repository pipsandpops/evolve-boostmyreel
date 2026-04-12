using AIReelBooster.API.ImageGrowthEngine.Models;

namespace AIReelBooster.API.ImageGrowthEngine.Interfaces;

/// <summary>
/// Semantic image understanding via Claude Vision.
/// Returns structured scene/object/quality data.
/// </summary>
public interface IImageAnalyzerService
{
    /// <summary>
    /// Send image to Claude Vision and parse structured semantic analysis.
    /// </summary>
    Task<SemanticAnalysis> AnalyzeAsync(
        string imagePath,
        CancellationToken ct = default);
}
