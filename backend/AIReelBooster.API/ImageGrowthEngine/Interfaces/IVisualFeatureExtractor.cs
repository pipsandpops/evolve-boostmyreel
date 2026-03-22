using AIReelBooster.API.ImageGrowthEngine.Models;

namespace AIReelBooster.API.ImageGrowthEngine.Interfaces;

/// <summary>
/// Extracts pixel-level metrics from an image using ImageSharp.
/// No external API calls — fully local, fast, and free.
/// </summary>
public interface IVisualFeatureExtractor
{
    /// <summary>
    /// Analyse the image stream and return quantitative visual features.
    /// </summary>
    Task<VisualFeatures> ExtractAsync(Stream imageStream, CancellationToken ct = default);
}
