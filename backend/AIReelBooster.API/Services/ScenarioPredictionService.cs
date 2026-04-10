using AIReelBooster.API.Configuration;
using AIReelBooster.API.Models.Domain;
using AIReelBooster.API.Services.Interfaces;
using Microsoft.Extensions.Options;

namespace AIReelBooster.API.Services;

/// <summary>
/// Pure, deterministic service — no I/O, no randomness.
/// Produces follower-tier view scenarios from viral analysis scores.
/// </summary>
public class ScenarioPredictionService : IScenarioPredictionService
{
    private readonly PredictionSettings   _multipliers;
    private readonly FollowerTierSettings _tiers;

    public ScenarioPredictionService(IOptions<AppSettings> opts)
    {
        _multipliers = opts.Value.Prediction;
        _tiers       = opts.Value.FollowerTiers;
    }

    public ViewPredictionResult GenerateScenarios(int viralScore, int engagementScore, int hookScore)
    {
        // Weighted composite — viral score is primary driver.
        // hookScore ≈ retention proxy (strong hook = people watch to the end).
        var composite = viralScore * 0.60 + engagementScore * 0.25 + hookScore * 0.15;

        var (multiplier, tierLabel) = composite switch
        {
            >= 70 => (_multipliers.High,   "High"),
            >= 40 => (_multipliers.Medium, "Medium"),
            _     => (_multipliers.Low,    "Low"),
        };

        var scenarios = new List<ViewScenario>(_tiers.Tiers.Length);

        for (var i = 0; i < _tiers.Tiers.Length; i++)
        {
            var followers = _tiers.Tiers[i];
            var scale     = _tiers.ScalingFactors[i];

            var viewMin = (long)(followers * multiplier.Min * scale);
            var viewMax = (long)(followers * multiplier.Max * scale);

            // Ensure min ≥ 1, max > min
            viewMin = Math.Max(viewMin, 1);
            viewMax = Math.Max(viewMax, viewMin + 1);

            scenarios.Add(new ViewScenario
            {
                Followers = FormatNumber(followers),
                Views     = $"{FormatNumber(viewMin)}–{FormatNumber(viewMax)}",
                Tier      = tierLabel,
            });
        }

        return new ViewPredictionResult
        {
            PredictionType = "scenario",
            ViralTier      = tierLabel,
            Scenarios      = scenarios,
            Note           = "Estimates are based on content quality signals — not follower count",
        };
    }

    // ── Formatting helpers ────────────────────────────────────────────────────

    private static string FormatNumber(long n) => n switch
    {
        >= 1_000_000 => $"{n / 1_000_000.0:G3}M",
        >= 1_000     => $"{n / 1_000.0:G3}K",
        _            => n.ToString(),
    };
}
