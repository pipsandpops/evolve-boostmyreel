using AIReelBooster.API.Models.Domain;

namespace AIReelBooster.API.Services.Interfaces;

public interface IBattleService
{
    // Challenge lifecycle
    Task<BattleChallenge> CreateChallengeAsync(CreateChallengeInput input, CancellationToken ct = default);
    Task<Battle> AcceptChallengeAsync(string challengeId, string opponentUserId, CancellationToken ct = default);
    Task DeclineChallengeAsync(string challengeId, CancellationToken ct = default);
    Task<BattleChallenge?> GetChallengeAsync(string challengeId, CancellationToken ct = default);

    // Battle lifecycle
    Task<Battle?> GetBattleAsync(string battleId, CancellationToken ct = default);
    Task<BattleEntry> SubmitEntryAsync(string battleId, string userId, SubmitEntryInput input, CancellationToken ct = default);
    Task<BattleScoreResult> GetScoresAsync(string battleId, CancellationToken ct = default);

    // Metrics
    Task RecordManualMetricsAsync(string entryId, string userId, MetricInput metrics, BattlePlatform platform, CancellationToken ct = default);

    // Score freeze & audit (called by BattleExpiryWorker at deadline)
    Task FreezeScoresAsync(string battleId, CancellationToken ct = default);

    // Audience
    Task<VoteResult> VoteAsync(string battleId, string entryId, string voterToken, string? voterIp, CancellationToken ct = default);

    // Leaderboard
    Task<List<BattleSummary>> GetLeaderboardAsync(int limit = 10, CancellationToken ct = default);
    Task<List<BoosterRow>> GetBoosterLeaderboardAsync(string battleId, int limit = 10, CancellationToken ct = default);

    // Worker methods
    Task ExpireStaleItemsAsync(CancellationToken ct = default);
    Task<List<string>> GetActiveBattleIdsAsync(CancellationToken ct = default);
}

// ── Value objects ─────────────────────────────────────────────────────────────

public record CreateChallengeInput(
    string ChallengerId,
    string OpponentHandle,
    string? BattleTitle,
    int DurationHours,          // 24 | 48 | 168
    string Platform,            // "Instagram" | "YouTube" | "Both"
    string? ThemeHashtag,
    decimal? PrizePoolAmount,
    string? PrizeCurrency,
    string? ContentGuidelines,
    string? TrashTalkMsg,
    string? PrizeDescription,
    string? OpponentEmail
);

public record SubmitEntryInput(
    string InstagramUrl,
    string? YouTubeUrl,
    string InstagramHandle,
    string? YouTubeHandle,
    BattlePlatform Platform
);

public record MetricInput(long Views, long Likes, long Comments, long Saves, long Shares, long Followers);

public record BattleScoreResult(
    string BattleId,
    string Status,
    DateTime EndsAt,
    DateTime SubmissionDeadlineAt,
    int TimeLeftSeconds,
    string Platform,
    CreatorScore Challenger,
    CreatorScore Opponent,
    AudienceVoteTally AudienceVotes,
    // Live insight fields
    double ScoreGap,
    string? Leader,
    string? MomentumAlert,
    // Transparency & freeze
    string   ScoringFormula,       // published formula text
    bool     IsFrozen,             // scores hard-locked at deadline
    DateTime? ScoresFrozenAt,
    bool     AnomalyFlagged,
    string?  AnomalyReason,
    DateTime? WinnerAnnouncedAt    // delayed 1hr after freeze if anomaly
);

public record CreatorScore(
    string UserId,
    string Handle,
    double Score,
    long DeltaViews,
    long DeltaLikes,
    long DeltaComments,
    long DeltaSaves,
    long DeltaShares,
    long DeltaFollowers,
    string MetricSource,
    // Multi-platform breakdown
    double? InstagramScore = null,
    double? YouTubeScore = null,
    string SubmittedPlatform = "Instagram",
    string ValidationStatus = "Skipped",
    DateTime? LastUpdatedAt = null,   // when latest snapshot was taken
    bool SpikeDetected = false        // anomaly flag for this entry
);

public record AudienceVoteTally(string ChallengerEntryId, int ChallengerVotes, string OpponentEntryId, int OpponentVotes);

public record VoteResult(bool Success, string Message, int NewTotalForEntry);

public record BattleSummary(
    string BattleId,
    string ChallengerHandle,
    string OpponentHandle,
    double ChallengerScore,
    double OpponentScore,
    string Status,
    DateTime EndsAt
);
