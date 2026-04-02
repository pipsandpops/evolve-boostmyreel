namespace AIReelBooster.API.Models.Domain;

// ── Page view tracking ────────────────────────────────────────────────────────

public class BattlePageView
{
    public int      Id           { get; set; }
    public string   BattleId     { get; set; } = string.Empty;
    public string   VisitorToken { get; set; } = string.Empty;  // anonymous device fingerprint
    public DateTime ViewedAt     { get; set; } = DateTime.UtcNow;
}

// ── Analytics response records ────────────────────────────────────────────────

public record BrandRoiAnalytics(
    string  BattleId,
    string? BattleTitle,
    string? ThemeHashtag,
    string  Status,
    DateTime StartedAt,
    DateTime EndsAt,

    // Reach
    long TotalPageViews,
    long UniqueVisitors,
    long InstagramReach,
    long YouTubeReach,
    long TotalReach,

    // Engagement
    long TotalVotes,
    long TotalBoostsPurchased,
    decimal TotalBoostRevenue,
    long TotalShares,
    long TotalLikes,
    long TotalComments,

    // Brand
    long   HashtagUsageEstimate,
    decimal EstimatedEMV,
    decimal CostPerEngagement,
    decimal PrizePoolSpend,
    string  EngagementRate,

    // Benchmark
    BenchmarkComparison Benchmark
);

public record BenchmarkComparison(
    string Industry,
    string AvgEngagementRate,
    string YourEngagementRate,
    double Multiplier,
    string Verdict,        // e.g. "3.2x more engagement than average"
    string Badge           // "🏆" / "✅" / "📈"
);

// ── Industry benchmarks (FMCG defaults) ──────────────────────────────────────

public static class IndustryBenchmarks
{
    public const string DefaultIndustry    = "FMCG";
    public const double AvgEngagementRate  = 2.1;   // %
    public const decimal AvgCPE            = 45m;   // ₹ per engagement
    public const double EMVMultiplier      = 3.5;   // EMV per ₹1 of prize pool
    public const decimal CPMRate           = 150m;  // ₹ per 1000 views (earned media)

    // Engagement value weights
    public const decimal ValuePerView     = 0.15m;
    public const decimal ValuePerLike     = 2m;
    public const decimal ValuePerComment  = 5m;
    public const decimal ValuePerShare    = 8m;
    public const decimal ValuePerVote     = 3m;
}
