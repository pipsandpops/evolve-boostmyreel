using AIReelBooster.API.Infrastructure;
using AIReelBooster.API.Models.Domain;
using AIReelBooster.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace AIReelBooster.API.Services;

public class BattleService : IBattleService
{
    private readonly AppDbContext _db;
    private readonly ILogger<BattleService> _logger;

    // ── Scoring weights ───────────────────────────────────────────────────────
    private const double W_Views     = 0.30;
    private const double W_Likes     = 0.25;
    private const double W_Comments  = 0.20;
    private const double W_Saves     = 0.15;
    private const double W_Shares    = 0.10;
    private const double FollowerMul = 50.0;   // 1 follower ≈ 50 engagements
    private const double VoteMul     = 10.0;

    // Anti-cheat: deltas above this multiplier of baseline are capped
    private const double AnticheatCapMultiplier = 3.0;

    public BattleService(AppDbContext db, ILogger<BattleService> logger)
    {
        _db     = db;
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

        var battle = new Battle
        {
            ChallengeId       = challengeId,
            ChallengerUserId  = challenge.ChallengerId,
            OpponentUserId    = opponentUserId,
            StartedAt         = DateTime.UtcNow,
            EndsAt            = DateTime.UtcNow.AddHours(challenge.DurationHours),
            BattleTitle       = challenge.BattleTitle,
            Platform          = challenge.Platform,
            ThemeHashtag      = challenge.ThemeHashtag,
            PrizePoolAmount   = challenge.PrizePoolAmount,
            PrizeCurrency     = challenge.PrizeCurrency,
            ContentGuidelines = challenge.ContentGuidelines,
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
        string battleId, string userId, string instagramHandle, string reelUrl,
        CancellationToken ct = default)
    {
        var battle = await _db.Battles.FindAsync([battleId], ct)
            ?? throw new InvalidOperationException("Battle not found.");

        if (battle.Status != BattleStatus.Active)
            throw new InvalidOperationException("Battle is not active.");

        if (userId != battle.ChallengerUserId && userId != battle.OpponentUserId)
            throw new InvalidOperationException("User is not a participant in this battle.");

        // Remove existing entry if re-submitting
        var existing = await _db.BattleEntries
            .FirstOrDefaultAsync(e => e.BattleId == battleId && e.UserId == userId, ct);
        if (existing != null) _db.BattleEntries.Remove(existing);

        var entry = new BattleEntry
        {
            BattleId        = battleId,
            UserId          = userId,
            InstagramHandle = instagramHandle.TrimStart('@').ToLowerInvariant(),
            ReelUrl         = reelUrl,
            SubmittedAt     = DateTime.UtcNow,
        };

        _db.BattleEntries.Add(entry);
        await _db.SaveChangesAsync(ct);
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

        return new BattleScoreResult(
            BattleId:      battleId,
            Status:        battle.Status.ToString(),
            EndsAt:        battle.EndsAt,
            TimeLeftSeconds: timeLeft,
            Challenger:    challengerScore ?? EmptyScore(battle.ChallengerUserId),
            Opponent:      opponentScore   ?? EmptyScore(battle.OpponentUserId),
            AudienceVotes: new AudienceVoteTally(
                challengerEntry?.Id ?? "", challengerVotes,
                opponentEntry?.Id   ?? "", opponentVotes)
        );
    }

    private async Task<CreatorScore> BuildCreatorScoreAsync(
        BattleEntry entry, int voteCount, CancellationToken ct)
    {
        var latest = await _db.BattleMetricSnapshots
            .Where(s => s.EntryId == entry.Id)
            .OrderByDescending(s => s.RecordedAt)
            .FirstOrDefaultAsync(ct);

        if (latest is null)
            return EmptyScore(entry.UserId, entry.InstagramHandle);

        var dViews    = ApplyAnticheat(latest.Views    - entry.BaselineViews,    entry.BaselineViews);
        var dLikes    = ApplyAnticheat(latest.Likes    - entry.BaselineLikes,    entry.BaselineLikes);
        var dComments = ApplyAnticheat(latest.Comments - entry.BaselineComments, entry.BaselineComments);
        var dSaves    = ApplyAnticheat(latest.Saves    - entry.BaselineSaves,    entry.BaselineSaves);
        var dShares   = ApplyAnticheat(latest.Shares   - entry.BaselineShares,   entry.BaselineShares);
        var dFollowers = ApplyAnticheat(latest.Followers - entry.BaselineFollowers, entry.BaselineFollowers);

        var score = (dViews    * W_Views)
                  + (dLikes    * W_Likes)
                  + (dComments * W_Comments)
                  + (dSaves    * W_Saves)
                  + (dShares   * W_Shares)
                  + (dFollowers * FollowerMul)
                  + (voteCount  * VoteMul);

        return new CreatorScore(
            UserId:        entry.UserId,
            Handle:        entry.InstagramHandle,
            Score:         Math.Round(score, 2),
            DeltaViews:    dViews,
            DeltaLikes:    dLikes,
            DeltaComments: dComments,
            DeltaSaves:    dSaves,
            DeltaShares:   dShares,
            DeltaFollowers: dFollowers,
            MetricSource:  latest.Source.ToString()
        );
    }

    private static long ApplyAnticheat(long delta, long baseline)
    {
        if (delta <= 0) return 0;
        var cap = (long)(Math.Max(baseline, 100) * AnticheatCapMultiplier);
        return Math.Min(delta, cap);
    }

    private static CreatorScore EmptyScore(string userId, string handle = "") =>
        new(userId, handle, 0, 0, 0, 0, 0, 0, 0, "none");

    // ── Manual metrics ────────────────────────────────────────────────────────

    public async Task RecordManualMetricsAsync(
        string entryId, string userId, MetricInput m, CancellationToken ct = default)
    {
        var entry = await _db.BattleEntries.FindAsync([entryId], ct)
            ?? throw new InvalidOperationException("Entry not found.");

        if (entry.UserId != userId)
            throw new UnauthorizedAccessException("Not your entry.");

        // Rate limit: max 6 manual updates per battle entry (every 4h)
        var recentCount = await _db.BattleMetricSnapshots
            .CountAsync(s => s.EntryId == entryId && s.Source == MetricSource.Manual
                          && s.RecordedAt > DateTime.UtcNow.AddHours(-4), ct);

        if (recentCount >= 2)
            throw new InvalidOperationException("Rate limit: max 2 manual updates per 4 hours.");

        var snapshot = new BattleMetricSnapshot
        {
            EntryId    = entryId,
            BattleId   = entry.BattleId,
            Views      = m.Views,
            Likes      = m.Likes,
            Comments   = m.Comments,
            Saves      = m.Saves,
            Shares     = m.Shares,
            Followers  = m.Followers,
            Source     = MetricSource.Manual,
            RecordedAt = DateTime.UtcNow,
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
