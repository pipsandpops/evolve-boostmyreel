using AIReelBooster.API.Infrastructure;
using AIReelBooster.API.Models.Domain;
using AIReelBooster.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace AIReelBooster.API.Services;

public class BattleService : IBattleService
{
    private readonly AppDbContext _db;
    private readonly ILogger<BattleService> _logger;
    private readonly ContentValidationService _validator;

    // Submission deadline multiplier: battle_hours / divisor = deadline hours
    private static readonly Dictionary<int, int> SubmissionDeadlineHours = new()
    {
        { 24,  2 },
        { 48,  4 },
        { 168, 12 },
    };

    // ── Scoring formula (per spec) ────────────────────────────────────────────
    // Instagram & YouTube: Views → 25pts/1000  |  Likes → 10pts  |  Comments → 15pts
    // Instagram only:      Saves → 20pts        |  Shares → 20pts
    // YouTube only:        Shares → 20pts
    // Both platform battle: each platform score weighted at 50% each
    // Audience boost: 5pts per boost vote
    private const double PtsPerThousandViews = 25.0;
    private const double PtsPerLike          = 10.0;
    private const double PtsPerComment       = 15.0;
    private const double PtsPerSave          = 20.0;   // IG only
    private const double PtsPerShare         = 20.0;
    private const double PlatformWeight      = 0.5;    // each platform in "Both" battles
    private const double VoteMul             = 5.0;    // audience boost pts

    // Anti-cheat: deltas above this multiplier of baseline are capped
    private const double AnticheatCapMultiplier = 3.0;

    public BattleService(AppDbContext db, ContentValidationService validator, ILogger<BattleService> logger)
    {
        _db        = db;
        _validator = validator;
        _logger = logger;
    }

    // ── Challenge ─────────────────────────────────────────────────────────────

    public async Task<BattleChallenge> CreateChallengeAsync(
        CreateChallengeInput input, CancellationToken ct = default)
    {
        var handle    = input.OpponentHandle.TrimStart('@').ToLowerInvariant();
        var trashTalk = input.TrashTalkMsg?.Length > 100 ? input.TrashTalkMsg[..100] : input.TrashTalkMsg;
        var prize     = input.PrizeDescription?.Trim() is { Length: > 100 } p ? p[..100] : input.PrizeDescription?.Trim();
        var duration  = input.DurationHours is 24 or 48 or 168 ? input.DurationHours : 24;
        var platform  = Enum.TryParse<BattlePlatform>(input.Platform, ignoreCase: true, out var pl) ? pl : BattlePlatform.Instagram;

        var challenge = new BattleChallenge
        {
            ChallengerId      = input.ChallengerId,
            OpponentHandle    = handle,
            OpponentEmail     = input.OpponentEmail?.Trim().ToLowerInvariant(),
            BattleTitle       = input.BattleTitle?.Trim(),
            DurationHours     = duration,
            Platform          = platform,
            ThemeHashtag      = input.ThemeHashtag?.Trim().TrimStart('#'),
            PrizePoolAmount   = input.PrizePoolAmount,
            PrizeCurrency     = input.PrizeCurrency ?? "INR",
            ContentGuidelines = input.ContentGuidelines?.Trim(),
            TrashTalkMsg      = trashTalk,
            PrizeDescription  = prize,
            ExpiresAt         = DateTime.UtcNow.AddHours(48), // 48h accept window
        };

        _db.BattleChallenges.Add(challenge);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("ContentClash challenge {Id} created by {User} vs @{Opponent} — {Duration}h on {Platform}",
            challenge.Id, input.ChallengerId, handle, duration, platform);

        return challenge;
    }

    public async Task<Battle> AcceptChallengeAsync(
        string challengeId, string opponentUserId, CancellationToken ct = default)
    {
        var challenge = await _db.BattleChallenges.FindAsync([challengeId], ct)
            ?? throw new InvalidOperationException("Challenge not found.");

        if (challenge.Status != ChallengeStatus.Pending)
            throw new InvalidOperationException($"Challenge is {challenge.Status}, cannot accept.");

        if (DateTime.UtcNow > challenge.ExpiresAt)
        {
            challenge.Status = ChallengeStatus.Expired;
            await _db.SaveChangesAsync(ct);
            throw new InvalidOperationException("Challenge has expired.");
        }

        var deadlineHrs = SubmissionDeadlineHours.GetValueOrDefault(challenge.DurationHours, 2);
        var battle = new Battle
        {
            ChallengeId          = challengeId,
            ChallengerUserId     = challenge.ChallengerId,
            OpponentUserId       = opponentUserId,
            StartedAt            = DateTime.UtcNow,
            EndsAt               = DateTime.UtcNow.AddHours(challenge.DurationHours),
            SubmissionDeadlineAt = DateTime.UtcNow.AddHours(deadlineHrs),
            BattleTitle          = challenge.BattleTitle,
            Platform             = challenge.Platform,
            ThemeHashtag         = challenge.ThemeHashtag,
            PrizePoolAmount      = challenge.PrizePoolAmount,
            PrizeCurrency        = challenge.PrizeCurrency,
            ContentGuidelines    = challenge.ContentGuidelines,
        };

        challenge.Status   = ChallengeStatus.Accepted;
        challenge.BattleId = battle.Id;

        _db.Battles.Add(battle);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Battle {BattleId} started from challenge {ChallengeId}", battle.Id, challengeId);
        return battle;
    }

    public async Task DeclineChallengeAsync(string challengeId, CancellationToken ct = default)
    {
        var challenge = await _db.BattleChallenges.FindAsync([challengeId], ct)
            ?? throw new InvalidOperationException("Challenge not found.");

        challenge.Status = ChallengeStatus.Declined;
        await _db.SaveChangesAsync(ct);
    }

    public async Task<BattleChallenge?> GetChallengeAsync(string challengeId, CancellationToken ct = default)
        => await _db.BattleChallenges.FindAsync([challengeId], ct);

    // ── Battle ────────────────────────────────────────────────────────────────

    public async Task<Battle?> GetBattleAsync(string battleId, CancellationToken ct = default)
        => await _db.Battles.FindAsync([battleId], ct);

    public async Task<BattleEntry> SubmitEntryAsync(
        string battleId, string userId, SubmitEntryInput input,
        CancellationToken ct = default)
    {
        var battle = await _db.Battles.FindAsync([battleId], ct)
            ?? throw new InvalidOperationException("Battle not found.");

        if (battle.Status != BattleStatus.Active)
            throw new InvalidOperationException("Battle is not active.");

        if (userId != battle.ChallengerUserId && userId != battle.OpponentUserId)
            throw new InvalidOperationException("User is not a participant in this battle.");

        // ── Submission deadline check ─────────────────────────────────────────
        // For existing battles created before this feature, SubmissionDeadlineAt may be default
        var hasDeadline = battle.SubmissionDeadlineAt > battle.StartedAt;
        if (hasDeadline && DateTime.UtcNow > battle.SubmissionDeadlineAt)
        {
            var deadlineHrs = SubmissionDeadlineHours.GetValueOrDefault((int)(battle.EndsAt - battle.StartedAt).TotalHours, 2);
            throw new InvalidOperationException(
                $"Submission deadline has passed ({deadlineHrs}h window). This entry is an automatic forfeit.");
        }

        // ── Platform URL validation ───────────────────────────────────────────
        if (input.Platform == BattlePlatform.Instagram && string.IsNullOrWhiteSpace(input.InstagramUrl))
            throw new InvalidOperationException("Instagram URL is required.");
        if (input.Platform == BattlePlatform.YouTube && string.IsNullOrWhiteSpace(input.YouTubeUrl))
            throw new InvalidOperationException("YouTube URL is required.");
        if (input.Platform == BattlePlatform.Both)
        {
            if (string.IsNullOrWhiteSpace(input.InstagramUrl))
                throw new InvalidOperationException("Instagram URL is required for Both-platform submission.");
            if (string.IsNullOrWhiteSpace(input.YouTubeUrl))
                throw new InvalidOperationException("YouTube URL is required for Both-platform submission.");
        }

        // Remove existing entry if re-submitting (before deadline)
        var existing = await _db.BattleEntries
            .FirstOrDefaultAsync(e => e.BattleId == battleId && e.UserId == userId, ct);
        if (existing != null) _db.BattleEntries.Remove(existing);

        var entry = new BattleEntry
        {
            BattleId          = battleId,
            UserId            = userId,
            SubmittedPlatform = input.Platform,
            InstagramHandle   = input.InstagramHandle.TrimStart('@').ToLowerInvariant(),
            ReelUrl           = input.InstagramUrl.Trim(),
            YouTubeUrl        = input.YouTubeUrl?.Trim(),
            YouTubeHandle     = input.YouTubeHandle?.TrimStart('@').ToLowerInvariant(),
            SubmittedAt       = DateTime.UtcNow,
            ValidationStatus  = ContentValidationStatus.Pending,
        };

        _db.BattleEntries.Add(entry);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Entry {EntryId} submitted for battle {BattleId} — platform {Platform}",
            entry.Id, battleId, input.Platform);

        // Fire-and-forget AI content validation
        _ = Task.Run(async () =>
        {
            try { await _validator.ValidateAsync(entry.Id); }
            catch (Exception ex) { _logger.LogError(ex, "Validation fire-and-forget failed for {EntryId}", entry.Id); }
        });

        return entry;
    }

    // ── Scores ────────────────────────────────────────────────────────────────

    public async Task<BattleScoreResult> GetScoresAsync(string battleId, CancellationToken ct = default)
    {
        var battle = await _db.Battles.FindAsync([battleId], ct)
            ?? throw new InvalidOperationException("Battle not found.");

        var entries = await _db.BattleEntries
            .Where(e => e.BattleId == battleId)
            .ToListAsync(ct);

        var votes = await _db.BattleVotes
            .Where(v => v.BattleId == battleId)
            .GroupBy(v => v.EntryId)
            .Select(g => new { EntryId = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        var challengerEntry = entries.FirstOrDefault(e => e.UserId == battle.ChallengerUserId);
        var opponentEntry   = entries.FirstOrDefault(e => e.UserId == battle.OpponentUserId);

        var challengerVotes = votes.FirstOrDefault(v => v.EntryId == (challengerEntry?.Id ?? ""))?.Count ?? 0;
        var opponentVotes   = votes.FirstOrDefault(v => v.EntryId == (opponentEntry?.Id   ?? ""))?.Count ?? 0;

        var challengerScore = challengerEntry is null ? null
            : await BuildCreatorScoreAsync(challengerEntry, challengerVotes, ct);
        var opponentScore   = opponentEntry   is null ? null
            : await BuildCreatorScoreAsync(opponentEntry,   opponentVotes,   ct);

        var timeLeft = Math.Max(0, (int)(battle.EndsAt - DateTime.UtcNow).TotalSeconds);

        var cScore = (challengerScore ?? EmptyScore(battle.ChallengerUserId)).Score;
        var oScore = (opponentScore   ?? EmptyScore(battle.OpponentUserId)).Score;
        var scoreGap = Math.Abs(cScore - oScore);

        string? leader        = null;
        string? momentumAlert = null;

        if (challengerScore is not null || opponentScore is not null)
        {
            var cHandle = (challengerScore ?? EmptyScore(battle.ChallengerUserId)).Handle;
            var oHandle = (opponentScore   ?? EmptyScore(battle.OpponentUserId)).Handle;

            if (scoreGap > 0)
                leader = cScore >= oScore ? cHandle : oHandle;

            // Momentum: if leader's score gap grew >20% since last snapshot window
            // (use a lightweight heuristic: score gap > 100 pts is "gaining fast")
            if (scoreGap >= 100 && leader is not null)
                momentumAlert = $"@{leader} is gaining fast! ⚡";
        }

        return new BattleScoreResult(
            BattleId:             battleId,
            Status:               battle.Status.ToString(),
            EndsAt:               battle.EndsAt,
            SubmissionDeadlineAt: battle.SubmissionDeadlineAt,
            TimeLeftSeconds:      timeLeft,
            Platform:             battle.Platform.ToString(),
            Challenger:           challengerScore ?? EmptyScore(battle.ChallengerUserId),
            Opponent:             opponentScore   ?? EmptyScore(battle.OpponentUserId),
            AudienceVotes:        new AudienceVoteTally(
                challengerEntry?.Id ?? "", challengerVotes,
                opponentEntry?.Id   ?? "", opponentVotes),
            ScoreGap:             Math.Round(scoreGap, 2),
            Leader:               leader,
            MomentumAlert:        momentumAlert
        );
    }

    private async Task<CreatorScore> BuildCreatorScoreAsync(
        BattleEntry entry, int voteCount, CancellationToken ct)
    {
        var handle = string.IsNullOrEmpty(entry.InstagramHandle) ? entry.YouTubeHandle ?? "" : entry.InstagramHandle;

        // ── Instagram metrics ─────────────────────────────────────────────────
        var latestIg = await _db.BattleMetricSnapshots
            .Where(s => s.EntryId == entry.Id && s.SnapshotPlatform == BattlePlatform.Instagram)
            .OrderByDescending(s => s.RecordedAt)
            .FirstOrDefaultAsync(ct);

        // ── YouTube metrics (only for Both-platform entries) ──────────────────
        var latestYt = entry.SubmittedPlatform == BattlePlatform.Both
            ? await _db.BattleMetricSnapshots
                .Where(s => s.EntryId == entry.Id && s.SnapshotPlatform == BattlePlatform.YouTube)
                .OrderByDescending(s => s.RecordedAt)
                .FirstOrDefaultAsync(ct)
            : null;

        // Fall back to non-platform-tagged snapshots for backward compatibility
        if (latestIg is null && latestYt is null)
        {
            var latestAny = await _db.BattleMetricSnapshots
                .Where(s => s.EntryId == entry.Id)
                .OrderByDescending(s => s.RecordedAt)
                .FirstOrDefaultAsync(ct);
            if (latestAny is null) return EmptyScore(entry.UserId, handle);
            latestIg = latestAny;
        }

        // ── Instagram score (25pts/1000 views, 10 likes, 15 comments, 20 saves, 20 shares)
        double igScore = 0; long dViews = 0, dLikes = 0, dComments = 0, dSaves = 0, dShares = 0, dFollowers = 0;
        string metricSource = "none";

        if (latestIg is not null)
        {
            dViews    = ApplyAnticheat(latestIg.Views    - entry.BaselineViews,    entry.BaselineViews);
            dLikes    = ApplyAnticheat(latestIg.Likes    - entry.BaselineLikes,    entry.BaselineLikes);
            dComments = ApplyAnticheat(latestIg.Comments - entry.BaselineComments, entry.BaselineComments);
            dSaves    = ApplyAnticheat(latestIg.Saves    - entry.BaselineSaves,    entry.BaselineSaves);
            dShares   = ApplyAnticheat(latestIg.Shares   - entry.BaselineShares,   entry.BaselineShares);
            dFollowers = ApplyAnticheat(latestIg.Followers - entry.BaselineFollowers, entry.BaselineFollowers);
            igScore   = (dViews / 1000.0 * PtsPerThousandViews)
                      + (dLikes    * PtsPerLike)
                      + (dComments * PtsPerComment)
                      + (dSaves    * PtsPerSave)
                      + (dShares   * PtsPerShare);
            metricSource = latestIg.Source.ToString();
        }

        // ── YouTube score (25pts/1000 views, 10 likes, 15 comments, 20 shares — no saves)
        double ytScore = 0;
        if (latestYt is not null)
        {
            var ytViews    = ApplyAnticheat(latestYt.Views    - entry.YtBaselineViews,    entry.YtBaselineViews);
            var ytLikes    = ApplyAnticheat(latestYt.Likes    - entry.YtBaselineLikes,    entry.YtBaselineLikes);
            var ytComments = ApplyAnticheat(latestYt.Comments - entry.YtBaselineComments, entry.YtBaselineComments);
            var ytShares   = ApplyAnticheat(latestYt.Shares   - 0, 0); // YouTube shares tracked separately
            ytScore = (ytViews / 1000.0 * PtsPerThousandViews)
                    + (ytLikes    * PtsPerLike)
                    + (ytComments * PtsPerComment)
                    + (ytShares   * PtsPerShare);
        }

        // Both-platform: each platform weighted 50%; single platform: full score
        var platformScore = entry.SubmittedPlatform == BattlePlatform.Both
            ? (igScore * PlatformWeight) + (ytScore * PlatformWeight)
            : igScore + ytScore;

        var combined = platformScore + (voteCount * VoteMul);

        return new CreatorScore(
            UserId:           entry.UserId,
            Handle:           handle,
            Score:            Math.Round(combined, 2),
            DeltaViews:       dViews,
            DeltaLikes:       dLikes,
            DeltaComments:    dComments,
            DeltaSaves:       dSaves,
            DeltaShares:      dShares,
            DeltaFollowers:   dFollowers,
            MetricSource:     metricSource,
            InstagramScore:   latestIg is not null ? Math.Round(igScore, 2) : null,
            YouTubeScore:     latestYt is not null ? Math.Round(ytScore, 2) : null,
            SubmittedPlatform: entry.SubmittedPlatform.ToString(),
            ValidationStatus:  entry.ValidationStatus.ToString()
        );
    }

    private static long ApplyAnticheat(long delta, long baseline)
    {
        if (delta <= 0) return 0;
        var cap = (long)(Math.Max(baseline, 100) * AnticheatCapMultiplier);
        return Math.Min(delta, cap);
    }

    private static CreatorScore EmptyScore(string userId, string handle = "") =>
        new(userId, handle, 0, 0, 0, 0, 0, 0, 0, "none", null, null, "Instagram", "Skipped");

    // ── Manual metrics ────────────────────────────────────────────────────────

    public async Task RecordManualMetricsAsync(
        string entryId, string userId, MetricInput m, BattlePlatform platform,
        CancellationToken ct = default)
    {
        var entry = await _db.BattleEntries.FindAsync([entryId], ct)
            ?? throw new InvalidOperationException("Entry not found.");

        if (entry.UserId != userId)
            throw new UnauthorizedAccessException("Not your entry.");

        // Rate limit: max 2 manual updates per platform per 4h window
        var recentCount = await _db.BattleMetricSnapshots
            .CountAsync(s => s.EntryId == entryId && s.Source == MetricSource.Manual
                          && s.SnapshotPlatform == platform
                          && s.RecordedAt > DateTime.UtcNow.AddHours(-4), ct);

        if (recentCount >= 2)
            throw new InvalidOperationException($"Rate limit: max 2 manual updates per 4 hours for {platform}.");

        var snapshot = new BattleMetricSnapshot
        {
            EntryId         = entryId,
            BattleId        = entry.BattleId,
            Views           = m.Views,
            Likes           = m.Likes,
            Comments        = m.Comments,
            Saves           = m.Saves,
            Shares          = m.Shares,
            Followers       = m.Followers,
            Source          = MetricSource.Manual,
            SnapshotPlatform = platform,
            RecordedAt      = DateTime.UtcNow,
        };

        _db.BattleMetricSnapshots.Add(snapshot);
        await _db.SaveChangesAsync(ct);
    }

    // ── Voting ────────────────────────────────────────────────────────────────

    public async Task<VoteResult> VoteAsync(
        string battleId, string entryId, string voterToken, string? voterIp,
        CancellationToken ct = default)
    {
        // One vote per battle per device
        var exists = await _db.BattleVotes
            .AnyAsync(v => v.BattleId == battleId && v.VoterToken == voterToken, ct);

        if (exists)
            return new VoteResult(false, "You have already voted in this battle.", 0);

        var battle = await _db.Battles.FindAsync([battleId], ct);
        if (battle is null || battle.Status != BattleStatus.Active)
            return new VoteResult(false, "Battle is not active.", 0);

        _db.BattleVotes.Add(new BattleVote
        {
            BattleId   = battleId,
            EntryId    = entryId,
            VoterToken = voterToken,
            VoterIp    = voterIp,
        });

        await _db.SaveChangesAsync(ct);

        var newTotal = await _db.BattleVotes
            .CountAsync(v => v.EntryId == entryId, ct);

        return new VoteResult(true, "Vote recorded!", newTotal);
    }

    // ── Leaderboard ───────────────────────────────────────────────────────────

    public async Task<List<BattleSummary>> GetLeaderboardAsync(int limit = 10, CancellationToken ct = default)
    {
        var battles = await _db.Battles
            .Where(b => b.Status == BattleStatus.Active)
            .OrderByDescending(b => b.StartedAt)
            .Take(limit)
            .ToListAsync(ct);

        var summaries = new List<BattleSummary>();
        foreach (var b in battles)
        {
            var scores = await GetScoresAsync(b.Id, ct);
            summaries.Add(new BattleSummary(
                b.Id,
                scores.Challenger.Handle,
                scores.Opponent.Handle,
                scores.Challenger.Score,
                scores.Opponent.Score,
                b.Status.ToString(),
                b.EndsAt
            ));
        }
        return summaries;
    }

    // ── Worker methods ────────────────────────────────────────────────────────

    public async Task ExpireStaleItemsAsync(CancellationToken ct = default)
    {
        // Expire pending challenges
        var staleChallenges = await _db.BattleChallenges
            .Where(c => c.Status == ChallengeStatus.Pending && c.ExpiresAt < DateTime.UtcNow)
            .ToListAsync(ct);

        foreach (var c in staleChallenges)
            c.Status = ChallengeStatus.Expired;

        // Complete battles past end time
        var expiredBattles = await _db.Battles
            .Where(b => b.Status == BattleStatus.Active && b.EndsAt < DateTime.UtcNow)
            .ToListAsync(ct);

        foreach (var battle in expiredBattles)
        {
            battle.Status = BattleStatus.Completed;

            // Determine winner by score
            var scores = await GetScoresAsync(battle.Id, ct);
            battle.WinnerUserId = scores.Challenger.Score >= scores.Opponent.Score
                ? battle.ChallengerUserId
                : battle.OpponentUserId;

            _logger.LogInformation("Battle {Id} completed. Winner: {Winner}", battle.Id, battle.WinnerUserId);
        }

        if (staleChallenges.Count + expiredBattles.Count > 0)
            await _db.SaveChangesAsync(ct);
    }

    public async Task<List<string>> GetActiveBattleIdsAsync(CancellationToken ct = default)
        => await _db.Battles
            .Where(b => b.Status == BattleStatus.Active)
            .Select(b => b.Id)
            .ToListAsync(ct);
}
