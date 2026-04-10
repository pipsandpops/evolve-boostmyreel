using AIReelBooster.API.Models.Domain;

namespace AIReelBooster.API.Services.Interfaces;

/// <summary>
/// Generates follower-tier scenario predictions from viral analysis scores.
/// Used for free users (no Instagram connected).
/// </summary>
public interface IScenarioPredictionService
{
    /// <summary>
    /// Produces view-range estimates for each configured follower tier.
    /// </summary>
    /// <param name="viralScore">0–100 overall viral score (primary driver).</param>
    /// <param name="engagementScore">0–100 engagement potential factor.</param>
    /// <param name="hookScore">0–100 hook strength (proxy for watch-through / retention).</param>
    ViewPredictionResult GenerateScenarios(int viralScore, int engagementScore, int hookScore);
}
