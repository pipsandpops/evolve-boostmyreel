using AIReelBooster.API.ImageGrowthEngine.Models;

namespace AIReelBooster.API.ImageGrowthEngine.Interfaces;

/// <summary>
/// Generates hook, caption, CTA, and hashtags tailored to the image content.
/// </summary>
public interface ICaptionGeneratorService
{
    Task<CaptionSuggestion> GenerateAsync(
        SemanticAnalysis semantic,
        VisualFeatures visual,
        string? userCaption,
        CaptionTone tone,
        CancellationToken ct = default);
}
