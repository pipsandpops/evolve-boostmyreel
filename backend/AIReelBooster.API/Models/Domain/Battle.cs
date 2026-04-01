namespace AIReelBooster.API.Models.Domain;

// ── Pre-acceptance challenge ──────────────────────────────────────────────────

public enum ChallengeStatus { Pending, Accepted, Declined, Expired }

public class BattleChallenge
{
    public string Id               { get; set; } = Guid.NewGuid().ToString("N");
    public string ChallengerId     { get; set; } = string.Empty;   // bmr userId
    public string OpponentHandle   { get; set; } = string.Empty;   // @instagram
    public string? OpponentEmail   { get; set; }
    public string? TrashTalkMsg    { get; set; }                    // max 100 chars
    public string? PrizeDescription { get; set; }                   // e.g. "₹500 via UPI" — max 100 chars
    public ChallengeStatus Status  { get; set; } = ChallengeStatus.Pending;
    public string? BattleId        { get; set; }                    // set on Accept
    public DateTime CreatedAt      { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt      { get; set; } = DateTime.UtcNow.AddHours(24);
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
    public DateTime EndsAt           { get; set; } = DateTime.UtcNow.AddHours(24);
    public string? WinnerUserId      { get; set; }
    public DateTime CreatedAt        { get; set; } = DateTime.UtcNow;
}

// ── Creator's reel entry ──────────────────────────────────────────────────────

public class BattleEntry
{
    public string Id                  { get; set; } = Guid.NewGuid().ToString("N");
    public string BattleId            { get; set; } = string.Empty;
    public string UserId              { get; set; } = string.Empty;
    public string InstagramHandle     { get; set; } = string.Empty;
    public string ReelUrl             { get; set; } = string.Empty;
    public string? ReelPostId         { get; set; }
    // Baseline metrics captured at battle start
    public long BaselineViews         { get; set; }
    public long BaselineLikes         { get; set; }
    public long BaselineComments      { get; set; }
    public long BaselineSaves         { get; set; }
    public long BaselineShares        { get; set; }
    public long BaselineFollowers     { get; set; }
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
