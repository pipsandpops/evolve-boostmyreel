namespace AIReelBooster.API.Models.Domain;

// ── Pre-acceptance challenge ──────────────────────────────────────────────────

public enum ChallengeStatus { Pending, Accepted, Declined, Expired }

public enum BattlePlatform { Instagram, YouTube, Both }

public enum ContentValidationStatus { Skipped, Pending, Approved, Rejected }

public class BattleChallenge
{
    public string Id               { get; set; } = Guid.NewGuid().ToString("N");
    public string ChallengerId     { get; set; } = string.Empty;   // bmr userId
    public string OpponentHandle   { get; set; } = string.Empty;   // @instagram / @youtube
    public string? OpponentEmail   { get; set; }

    // ContentClash fields
    public string? BattleTitle       { get; set; }                  // e.g. "Pepsi vs @BeingIndian — Who Rules Summer?"
    public int     DurationHours     { get; set; } = 24;            // 24 / 48 / 168 (7 days)
    public BattlePlatform Platform   { get; set; } = BattlePlatform.Instagram;
    public string? ThemeHashtag      { get; set; }                  // e.g. #PepsiClash
    public decimal? PrizePoolAmount  { get; set; }                  // numeric prize set by brand
    public string? PrizeCurrency     { get; set; } = "INR";
    public string? ContentGuidelines { get; set; }                  // e.g. "Reel must feature product in first 3 seconds"
    public string? TrashTalkMsg      { get; set; }                  // max 100 chars
    public string? PrizeDescription  { get; set; }                  // free-text prize (Option C)

    public ChallengeStatus Status  { get; set; } = ChallengeStatus.Pending;
    public string? BattleId        { get; set; }                    // set on Accept
    public DateTime CreatedAt      { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt      { get; set; } = DateTime.UtcNow.AddHours(48); // 48h accept window
}

// ── Live battle ───────────────────────────────────────────────────────────────

public enum BattleStatus { Active, Completed, Cancelled }

public class Battle
{
    public string Id                 { get; set; } = Guid.NewGuid().ToString("N");
    public string ChallengeId        { get; set; } = string.Empty;
    public string ChallengerUserId   { get; set; } = string.Empty;
    public string OpponentUserId     { get; set; } = string.Empty;
    public BattleStatus Status       { get; set; } = BattleStatus.Active;
    public DateTime StartedAt        { get; set; } = DateTime.UtcNow;
    public DateTime EndsAt           { get; set; } = DateTime.UtcNow.AddHours(24); // overridden by DurationHours
    public DateTime SubmissionDeadlineAt { get; set; } = DateTime.UtcNow.AddHours(2); // 2hr / 4hr / 12hr
    public string? WinnerUserId      { get; set; }
    public DateTime CreatedAt        { get; set; } = DateTime.UtcNow;

    // Denormalised from challenge for quick access
    public string? BattleTitle       { get; set; }
    public BattlePlatform Platform   { get; set; } = BattlePlatform.Instagram;
    public string? ThemeHashtag      { get; set; }
    public decimal? PrizePoolAmount  { get; set; }
    public string? PrizeCurrency     { get; set; }
    public string? ContentGuidelines { get; set; }

    // ── Score freeze & fraud audit ────────────────────────────────────────────
    public DateTime? ScoresFrozenAt    { get; set; }   // set at EndsAt
    public bool      AnomalyFlagged    { get; set; } = false;
    public string?   AnomalyReason     { get; set; }
    public DateTime? WinnerAnnouncedAt { get; set; }   // = ScoresFrozenAt + 1hr if anomaly
}

// ── Creator's reel entry ──────────────────────────────────────────────────────

public class BattleEntry
{
    public string Id                  { get; set; } = Guid.NewGuid().ToString("N");
    public string BattleId            { get; set; } = string.Empty;
    public string UserId              { get; set; } = string.Empty;

    // Platform & URLs
    public BattlePlatform SubmittedPlatform { get; set; } = BattlePlatform.Instagram;
    public string InstagramHandle     { get; set; } = string.Empty;
    public string ReelUrl             { get; set; } = string.Empty;  // Instagram URL
    public string? ReelPostId         { get; set; }
    public string? YouTubeUrl         { get; set; }                  // YouTube Shorts URL
    public string? YouTubeHandle      { get; set; }                  // @youtube handle

    // AI content validation
    public ContentValidationStatus ValidationStatus { get; set; } = ContentValidationStatus.Skipped;
    public string? ValidationNotes    { get; set; }

    // Baseline metrics — Instagram
    public long BaselineViews         { get; set; }
    public long BaselineLikes         { get; set; }
    public long BaselineComments      { get; set; }
    public long BaselineSaves         { get; set; }
    public long BaselineShares        { get; set; }
    public long BaselineFollowers     { get; set; }

    // Baseline metrics — YouTube (only when SubmittedPlatform == Both)
    public long YtBaselineViews       { get; set; }
    public long YtBaselineLikes       { get; set; }
    public long YtBaselineComments    { get; set; }
    public long YtBaselineFollowers   { get; set; }

    public DateTime SubmittedAt       { get; set; } = DateTime.UtcNow;
}

// ── Metric snapshot (polled every 30 min) ────────────────────────────────────

public enum MetricSource { Api, Manual, Estimated }

public class BattleMetricSnapshot
{
    public int Id           { get; set; }
    public string EntryId   { get; set; } = string.Empty;
    public string BattleId  { get; set; } = string.Empty;
    public long Views       { get; set; }
    public long Likes       { get; set; }
    public long Comments    { get; set; }
    public long Saves       { get; set; }
    public long Shares      { get; set; }
    public long Followers   { get; set; }
    public double Score     { get; set; }           // computed weighted score
    public MetricSource Source { get; set; } = MetricSource.Manual;
    public BattlePlatform SnapshotPlatform { get; set; } = BattlePlatform.Instagram;
    public DateTime RecordedAt { get; set; } = DateTime.UtcNow;
}

// ── Audience vote ─────────────────────────────────────────────────────────────

public class BattleVote
{
    public int Id            { get; set; }
    public string BattleId   { get; set; } = string.Empty;
    public string EntryId    { get; set; } = string.Empty;   // who they voted for
    public string VoterToken { get; set; } = string.Empty;   // device fingerprint
    public string? VoterIp   { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

// ── Paid vote boost (Razorpay) ────────────────────────────────────────────────

public class VoteBoost
{
    public int     Id                 { get; set; }
    public string  BattleId           { get; set; } = string.Empty;
    public string  EntryId            { get; set; } = string.Empty;   // who this boost supports
    public string  VoterToken         { get; set; } = string.Empty;   // buyer's device fingerprint
    public string? VoterIp            { get; set; }
    public int     VoteCount          { get; set; }                    // 10 / 50 / 100
    public decimal AmountPaid         { get; set; }
    public string  BoostTier          { get; set; } = string.Empty;   // "Starter" | "Power" | "Mega" | "Referral"
    public string? RazorpayOrderId    { get; set; }
    public string? RazorpayPaymentId  { get; set; }
    public bool    Verified           { get; set; } = false;
    public DateTime CreatedAt         { get; set; } = DateTime.UtcNow;
}

// ── Score audit log (freeze + spike detection) ────────────────────────────────

public class BattleScoreAuditLog
{
    public int      Id               { get; set; }
    public string   BattleId         { get; set; } = string.Empty;
    public string   EntryId          { get; set; } = string.Empty;
    public string   Platform         { get; set; } = "Instagram";
    // Raw delta metrics at snapshot time
    public long     Views            { get; set; }
    public long     Likes            { get; set; }
    public long     Comments         { get; set; }
    public long     Shares           { get; set; }
    public double   OrganicScore     { get; set; }
    // Fraud / anomaly flags
    public bool     SpikeDetected    { get; set; } = false;
    public string?  SpikeReason      { get; set; }
    public bool     IsFinalFreeze    { get; set; } = false;   // true = score locked snapshot
    public DateTime RecordedAt       { get; set; } = DateTime.UtcNow;
}

// ── Published scoring formula (single source of truth) ───────────────────────

public static class ScoringFormula
{
    public const double ViewsWeight    = 0.40;
    public const double LikesWeight    = 0.30;
    public const double CommentsWeight = 0.20;
    public const double SharesWeight   = 0.10;

    // Spike detection threshold: >5x growth in one snapshot window = anomaly
    public const double SpikeThreshold = 5.0;

    public const string Description =
        "Final Score = (Views × 0.40) + (Likes × 0.30) + (Comments × 0.20) + (Shares × 0.10)";

    public static double Calculate(long views, long likes, long comments, long shares)
        => (views * ViewsWeight) + (likes * LikesWeight) + (comments * CommentsWeight) + (shares * SharesWeight);
}

// ── Boost tier definitions ────────────────────────────────────────────────────

public static class VoteBoostTiers
{
    public record TierDef(string Key, int Votes, decimal AmountINR, string Label, string Emoji);

    public static readonly TierDef Starter   = new("Starter",  10,  29m,  "Starter Boost",  "🔥");
    public static readonly TierDef Power     = new("Power",    50,  99m,  "Power Boost",    "💥");
    public static readonly TierDef Mega      = new("Mega",    100, 179m,  "Mega Boost",     "⚡");
    public const int ReferralBonusVotes = 5;

    public static TierDef? Get(string key) => key.ToLowerInvariant() switch
    {
        "starter" => Starter,
        "power"   => Power,
        "mega"    => Mega,
        _         => null,
    };
}
