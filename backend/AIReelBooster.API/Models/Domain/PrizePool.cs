namespace AIReelBooster.API.Models.Domain;

// ── Prize pool tiers ──────────────────────────────────────────────────────────

public enum PrizePoolTier
{
    Starter  = 1,   // ₹10,000
    Pro      = 2,   // ₹50,000
    Premium  = 3,   // ₹1,00,000
    Custom   = 4,   // any amount
}

public enum PrizePoolStatus
{
    Pending,        // created, awaiting brand payment
    Held,           // payment received — funds in escrow
    Distributing,   // battle ended, payouts being processed
    Distributed,    // all payouts sent
    Refunded,       // battle cancelled / opponent never accepted
}

// ── Distribution recipient types ──────────────────────────────────────────────

public enum RecipientType
{
    Winner,         // 40% of pool
    RunnerUp,       // 10% of pool
    Voter,          // 30% shared equally among top 10 voters
    Platform,       // 20% — BoostMyReel revenue
}

public enum DistributionStatus
{
    Pending,
    Sent,
    Failed,
}

// ── Prize Pool ────────────────────────────────────────────────────────────────

public class PrizePool
{
    public string Id                  { get; set; } = Guid.NewGuid().ToString("N");
    public string ChallengeId         { get; set; } = string.Empty;
    public string? BattleId           { get; set; }         // set once challenge is accepted
    public string BrandUserId         { get; set; } = string.Empty;

    // Amount
    public PrizePoolTier Tier         { get; set; } = PrizePoolTier.Custom;
    public decimal Amount             { get; set; }
    public string Currency            { get; set; } = "INR";

    // Non-cash prizes (free text, one per line)
    public string? NonCashPrizes      { get; set; }         // e.g. "Brand hamper\nAmbassador deal"

    // Payment
    public PrizePoolStatus Status     { get; set; } = PrizePoolStatus.Pending;
    public string? RazorpayOrderId    { get; set; }
    public string? RazorpayPaymentId  { get; set; }
    public DateTime? PaidAt           { get; set; }
    public DateTime? DistributedAt    { get; set; }

    public DateTime CreatedAt         { get; set; } = DateTime.UtcNow;
}

// ── Individual payout record ──────────────────────────────────────────────────

public class PrizeDistribution
{
    public int Id                     { get; set; }
    public string PrizePoolId         { get; set; } = string.Empty;
    public string BattleId            { get; set; } = string.Empty;
    public RecipientType RecipientType { get; set; }
    public string? RecipientUserId    { get; set; }     // null for Platform share
    public decimal Amount             { get; set; }
    public DistributionStatus Status  { get; set; } = DistributionStatus.Pending;
    public string? UpiHandle          { get; set; }     // collected at payout time
    public string? RazorpayPayoutId   { get; set; }
    public DateTime CreatedAt         { get; set; } = DateTime.UtcNow;
    public DateTime? SentAt           { get; set; }
}
