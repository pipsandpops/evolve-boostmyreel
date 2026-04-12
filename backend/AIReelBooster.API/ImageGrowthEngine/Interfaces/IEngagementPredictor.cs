using AIReelBooster.API.ImageGrowthEngine.Models;

namespace AIReelBooster.API.ImageGrowthEngine.Interfaces;

/// <summary>
/// Deterministic scoring engine — combines visual metrics and semantic signals
/// into a normalized 0-100 post score and engagement-level predictions.
/// Pure computation, no I/O.
/// </summary>
public interface IEngagementPredictor
{
    EngagementPrediction Predict(VisualFeatures visual, SemanticAnalysis semantic);

    /// <summary>
    /// Convert raw score + semantic data into human-readable growth insights.
    /// Uses growth-advice framing ("Adding X can increase engagement by Y%").
    /// </summary>
    List<string> BuildInsights(VisualFeatures visual, SemanticAnalysis semantic, int postScore);

    /// <summary>
    /// Identify structural missing elements (face, text, contrast, etc.).
    /// </summary>
    List<string> IdentifyMissingElements(VisualFeatures visual, SemanticAnalysis semantic);
}
