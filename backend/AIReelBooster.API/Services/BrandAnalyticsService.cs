using AIReelBooster.API.Infrastructure;
using AIReelBooster.API.Models.Domain;
using AIReelBooster.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace AIReelBooster.API.Services;

public class BrandAnalyticsService : IBrandAnalyticsService
{
    private readonly AppDbContext _db;
    private readonly ILogger<BrandAnalyticsService> _logger;

    public BrandAnalyticsService(AppDbContext db, ILogger<BrandAnalyticsService> logger)
    {
        _db     = db;
        _logger = logger;
    }

    // ── Page view tracking ────────────────────────────────────────────────────

    public async Task TrackPageViewAsync(string battleId, string visitorToken, CancellationToken ct = default)
    {
        _db.BattlePageViews.Add(new BattlePageView
        {
            BattleId     = battleId,
            VisitorToken = visitorToken,
        });
        await _db.SaveChangesAsync(ct);
    }

    // ── ROI analytics ─────────────────────────────────────────────────────────

    public async Task<BrandRoiAnalytics?> GetRoiAsync(
        string battleId, string brandUserId, CancellationToken ct = default)
    {
        // Verify brand owns the prize pool for this battle
        var pool = await _db.PrizePools
            .FirstOrDefaultAsync(p => (p.BattleId == battleId || p.ChallengeId == battleId)
                                   && p.BrandUserId == brandUserId, ct);
        if (pool is null)
            return null;

        var battle = await _db.Battles.FindAsync([battleId], ct);
        if (battle is null) return null;

        var entries = await _db.BattleEntries
            .Where(e => e.BattleId == battleId)
            .ToListAsync(ct);

        // ── Reach ─────────────────────────────────────────────────────────────
        var pageViews = await _db.BattlePageViews
            .Where(v => v.BattleId == battleId)
            .ToListAsync(ct);
        var totalPageViews  = pageViews.Count;
        var uniqueVisitors  = pageViews.Select(v => v.VisitorToken).Distinct().Count();

        // Latest metric snapshots per entry for reach aggregation
        long igReach = 0, ytReach = 0;
        foreach (var entry in entries)
        {
            var latestIg = await _db.BattleMetricSnapshots
                .Where(s => s.EntryId == entry.Id && s.SnapshotPlatform == BattlePlatform.Instagram)
                .OrderByDescending(s => s.RecordedAt).FirstOrDefaultAsync(ct);

            var latestYt = await _db.BattleMetricSnapshots
                .Where(s => s.EntryId == entry.Id && s.SnapshotPlatform == BattlePlatform.YouTube)
                .OrderByDescending(s => s.RecordedAt).FirstOrDefaultAsync(ct);

            // Fallback for non-platform-tagged snapshots
            if (latestIg is null && latestYt is null)
            {
                var any = await _db.BattleMetricSnapshots
                    .Where(s => s.EntryId == entry.Id)
                    .OrderByDescending(s => s.RecordedAt).FirstOrDefaultAsync(ct);
                if (any is not null) igReach += Math.Max(0, any.Views - entry.BaselineViews);
            }
            else
            {
                if (latestIg is not null) igReach += Math.Max(0, latestIg.Views - entry.BaselineViews);
                if (latestYt is not null) ytReach += Math.Max(0, latestYt.Views - entry.YtBaselineViews);
            }
        }
        var totalReach = igReach + ytReach;

        // ── Engagement ────────────────────────────────────────────────────────
        var freeVotes = await _db.BattleVotes.CountAsync(v => v.BattleId == battleId, ct);
        var boostRows = await _db.VoteBoosts
            .Where(b => b.BattleId == battleId && b.Verified)
            .ToListAsync(ct);

        var paidBoosts   = boostRows.Where(b => b.AmountPaid > 0).ToList();
        var boostVotes   = boostRows.Sum(b => b.VoteCount);
        var totalVotes   = freeVotes + boostVotes;
        var boostRevenue = paidBoosts.Sum(b => b.AmountPaid);
        var shares       = boostRows.Count(b => b.BoostTier == "Referral");

        // Aggregate likes + comments across latest snapshots (delta from baseline)
        long totalLikes = 0, totalComments = 0;
        foreach (var entry in entries)
        {
            var snap = await _db.BattleMetricSnapshots
                .Where(s => s.EntryId == entry.Id)
                .OrderByDescending(s => s.RecordedAt).FirstOrDefaultAsync(ct);
            if (snap is null) continue;
            totalLikes    += Math.Max(0, snap.Likes    - entry.BaselineLikes);
            totalComments += Math.Max(0, snap.Comments - entry.BaselineComments);
        }

        // ── Brand metrics ─────────────────────────────────────────────────────
        // Hashtag usage: proxy from share count + page views / 10 (estimate)
        var hashtag          = battle.ThemeHashtag;
        long hashtagEstimate = shares + (totalPageViews / 10);

        // EMV = reach * CPM rate + engagements * value weights
        var totalEngagements = totalVotes + totalLikes + totalComments + shares;
        var emv = Math.Round(
            (totalReach    * IndustryBenchmarks.ValuePerView)
          + (totalLikes    * IndustryBenchmarks.ValuePerLike)
          + (totalComments * IndustryBenchmarks.ValuePerComment)
          + (shares        * (long)IndustryBenchmarks.ValuePerShare)
          + (totalVotes    * (long)IndustryBenchmarks.ValuePerVote), 2);

        var totalSpend = pool.Amount + boostRevenue;
        var cpe = totalEngagements > 0
            ? Math.Round(totalSpend / totalEngagements, 2)
            : 0m;

        var engagementRate = totalReach > 0
            ? Math.Round((double)totalEngagements / totalReach * 100, 2)
            : 0.0;

        // ── Benchmark comparison ──────────────────────────────────────────────
        var multiplier = IndustryBenchmarks.AvgEngagementRate > 0
            ? Math.Round(engagementRate / IndustryBenchmarks.AvgEngagementRate, 1)
            : 1.0;

        string verdict, badge;
        if (multiplier >= 2.0)      { verdict = $"Your battle generated {multiplier}x more engagement than average influencer campaigns in {IndustryBenchmarks.DefaultIndustry}";  badge = "🏆"; }
        else if (multiplier >= 1.0) { verdict = $"Your battle matched industry benchmarks ({multiplier}x vs avg)";                                                                badge = "✅"; }
        else                        { verdict = $"Your battle is below average ({multiplier}x vs avg) — try a bigger prize pool next time";                                       badge = "📈"; }

        var benchmark = new BenchmarkComparison(
            Industry:           IndustryBenchmarks.DefaultIndustry,
            AvgEngagementRate:  $"{IndustryBenchmarks.AvgEngagementRate:0.#}%",
            YourEngagementRate: $"{engagementRate:0.##}%",
            Multiplier:         multiplier,
            Verdict:            verdict,
            Badge:              badge
        );

        return new BrandRoiAnalytics(
            BattleId:              battleId,
            BattleTitle:           battle.BattleTitle,
            ThemeHashtag:          hashtag,
            Status:                battle.Status.ToString(),
            StartedAt:             battle.StartedAt,
            EndsAt:                battle.EndsAt,
            TotalPageViews:        totalPageViews,
            UniqueVisitors:        uniqueVisitors,
            InstagramReach:        igReach,
            YouTubeReach:          ytReach,
            TotalReach:            totalReach,
            TotalVotes:            totalVotes,
            TotalBoostsPurchased:  paidBoosts.Count,
            TotalBoostRevenue:     boostRevenue,
            TotalShares:           shares,
            TotalLikes:            totalLikes,
            TotalComments:         totalComments,
            HashtagUsageEstimate:  hashtagEstimate,
            EstimatedEMV:          emv,
            CostPerEngagement:     cpe,
            PrizePoolSpend:        pool.Amount,
            EngagementRate:        $"{engagementRate:0.##}%",
            Benchmark:             benchmark
        );
    }
}
