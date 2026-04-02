using AIReelBooster.API.Models.Domain;

namespace AIReelBooster.API.Services.Interfaces;

public interface IPrizePoolService
{
    // Brand sets up & pays prize pool
    Task<PrizePool> CreatePrizePoolAsync(CreatePrizePoolInput input, CancellationToken ct = default);
    Task<(string OrderId, decimal Amount)> CreatePaymentOrderAsync(string prizePoolId, CancellationToken ct = default);
    Task<PrizePool> ConfirmPaymentAsync(string prizePoolId, string razorpayPaymentId, string razorpaySignature, CancellationToken ct = default);

    // Query
    Task<PrizePool?> GetByBattleAsync(string battleId, CancellationToken ct = default);
    Task<PrizePool?> GetByChallengeAsync(string challengeId, CancellationToken ct = default);
    Task<List<PrizeDistribution>> GetDistributionsAsync(string prizePoolId, CancellationToken ct = default);
    Task<PrizePoolSummary?> GetSummaryAsync(string battleOrChallengeId, CancellationToken ct = default);

    // Called by BattleExpiryWorker after battle ends
    Task DistributeAsync(string battleId, CancellationToken ct = default);

    // Called by BattleExpiryWorker: distributes all Held pools whose battles just completed
    Task DistributeAllPendingAsync(CancellationToken ct = default);

    // Refund if battle never started
    Task RefundAsync(string challengeId, CancellationToken ct = default);
}

// ── Value objects ─────────────────────────────────────────────────────────────

public record CreatePrizePoolInput(
    string ChallengeId,
    string BrandUserId,
    PrizePoolTier Tier,
    decimal Amount,
    string Currency,
    string? NonCashPrizes
);

public record PrizePoolSummary(
    string PrizePoolId,
    decimal TotalAmount,
    string Currency,
    PrizePoolStatus Status,
    PrizePoolTier Tier,
    string? NonCashPrizes,
    // Split breakdown
    decimal WinnerAmount,
    decimal RunnerUpAmount,
    decimal VoterPoolAmount,
    decimal PlatformAmount,
    List<DistributionRow> Distributions
);

public record DistributionRow(
    string RecipientType,
    string? UserId,
    decimal Amount,
    string Status
);

// Tier definitions
public static class PrizePoolTiers
{
    public static readonly Dictionary<PrizePoolTier, decimal> Amounts = new()
    {
        { PrizePoolTier.Starter,  10_000m },
        { PrizePoolTier.Pro,      50_000m },
        { PrizePoolTier.Premium, 1_00_000m },
    };

    // Split ratios
    public const decimal WinnerPct   = 0.40m;
    public const decimal RunnerUpPct = 0.10m;
    public const decimal VoterPct    = 0.30m;
    public const decimal PlatformPct = 0.20m;
    public const int     MaxVoters   = 10;
}
