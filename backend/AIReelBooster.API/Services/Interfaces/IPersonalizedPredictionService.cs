using AIReelBooster.API.Models.Domain;

namespace AIReelBooster.API.Services.Interfaces;

/// <summary>
/// Combines a user's real Instagram performance history with their viral score
/// to produce a personalised view prediction (Pro feature).
/// </summary>
public interface IPersonalizedPredictionService
{
    /// <summary>
    /// Returns a personalised prediction if the user has Instagram connected,
    /// otherwise falls back to scenario-based prediction.
    /// </summary>
    /// <param name="userId">App user ID.</param>
    /// <param name="viralScore">0–100 viral score from the current reel analysis.</param>
    /// <param name="engagementScore">0–100 engagement factor score.</param>
    /// <param name="hookScore">0–100 hook strength score.</param>
    Task<ViewPredictionResult> PredictAsync(
        string userId,
        int    viralScore,
        int    engagementScore,
        int    hookScore,
        CancellationToken ct = default);
}
