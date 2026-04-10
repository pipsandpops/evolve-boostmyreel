using AIReelBooster.API.Infrastructure;
using AIReelBooster.API.Models.Domain;
using AIReelBooster.API.Services.Interfaces;

namespace AIReelBooster.API.Services;

/// <summary>
/// Combines the user's real Instagram performance history with their content's
/// viral score to produce a personalised view prediction.
///
/// Formula:
///   composite      = viralScore / 50.0         (1.0 = perfectly average)
///   predictedViews = avgViews × composite
///   range          = [predictedViews × 0.70, predictedViews × 1.30]   (±30%)
///
/// If viral score ≥ 70 we widen the upside range (viral boost multiplier).
/// Falls back to scenario-based if Instagram is not connected or insights unavailable.
/// </summary>
public class PersonalizedPredictionService : IPersonalizedPredictionService
{
    private readonly IScenarioPredictionService _scenario;
    private readonly IInstagramAnalyticsService _analytics;
    private readonly IInstagramAuthService      _auth;
    private readonly ILogger<PersonalizedPredictionService> _logger;

    public PersonalizedPredictionService(
        IScenarioPredictionService             scenario,
        IInstagramAnalyticsService             analytics,
        IInstagramAuthService                  auth,
        ILogger<PersonalizedPredictionService> logger)
    {
        _scenario  = scenario;
        _analytics = analytics;
        _auth      = auth;
        _logger    = logger;
    }

    public async Task<ViewPredictionResult> PredictAsync(
        string userId,
        int    viralScore,
        int    engagementScore,
        int    hookScore,
        CancellationToken ct = default)
    {
        // ── 1. Try personalised path ─────────────────────────────────────────
        try
        {
            var token = await _auth.GetTokenAsync(userId, ct);

            if (token == null)
                return _scenario.GenerateScenarios(viralScore, engagementScore, hookScore);

            // Refresh analytics if last sync > 6 hours ago
            var needsRefresh = (DateTime.UtcNow - token.LastSyncAt).TotalHours > 6;
            long avgViews = token.AvgReelViews;

            if (needsRefresh || avgViews < 0)
            {
                var analytics = await _analytics.GetAnalyticsAsync(token.AccessToken, token.IgUserId, ct);

                // Update cached metrics
                token.FollowerCount  = analytics.FollowerCount;
                token.MediaCount     = analytics.MediaCount;
                token.EngagementRate = analytics.EngagementRate;
                token.LastSyncAt     = DateTime.UtcNow;

                if (analytics.InsightsEnabled && analytics.AvgReelViews > 0)
                    token.AvgReelViews = analytics.AvgReelViews;

                avgViews = token.AvgReelViews;
            }

            // If insights are still unavailable, fall back
            if (avgViews <= 0)
            {
                _logger.LogInformation(
                    "Instagram insights unavailable for user {UserId}; using scenario prediction", userId);
                return _scenario.GenerateScenarios(viralScore, engagementScore, hookScore);
            }

            // ── 2. Compute personalised range ────────────────────────────────
            var composite = viralScore / 50.0;   // 0.0–2.0+ (1.0 = average)

            var predicted = (long)(avgViews * composite);
            predicted = Math.Max(predicted, 100);

            // ±30% range; widen upside if content is high-viral
            var rangeMin = (long)(predicted * 0.70);
            var rangeMax = viralScore >= 70
                ? (long)(predicted * 1.60)   // viral boost upside
                : (long)(predicted * 1.30);

            var confidence = viralScore >= 70 ? "High"
                           : viralScore >= 40 ? "Medium"
                           : "Low";

            return new ViewPredictionResult
            {
                PredictionType = "personalized",
                ViralTier      = confidence,
                Scenarios      = [],   // Not used for personalised mode
                Note           = $"Based on your last {token.MediaCount} posts on @{token.IgUsername}",
                Followers      = token.FollowerCount,
                AvgViews       = avgViews,
                PredictedRange = $"{FormatNumber(rangeMin)}–{FormatNumber(rangeMax)}",
                Confidence     = confidence,
                BasedOn        = "your past reel performance",
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "PersonalizedPrediction failed for user {UserId}; falling back to scenario", userId);
            return _scenario.GenerateScenarios(viralScore, engagementScore, hookScore);
        }
    }

    private static string FormatNumber(long n) => n switch
    {
        >= 1_000_000 => $"{n / 1_000_000.0:G3}M",
        >= 1_000     => $"{n / 1_000.0:G3}K",
        _            => n.ToString(),
    };
}
