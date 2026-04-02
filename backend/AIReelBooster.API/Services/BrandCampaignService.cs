using AIReelBooster.API.Infrastructure;
using AIReelBooster.API.Models.Domain;
using AIReelBooster.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace AIReelBooster.API.Services;

public class BrandCampaignService : IBrandCampaignService
{
    private readonly AppDbContext _db;
    private readonly ILogger<BrandCampaignService> _logger;

    public BrandCampaignService(AppDbContext db, ILogger<BrandCampaignService> logger)
    {
        _db     = db;
        _logger = logger;
    }

    // ── Create ────────────────────────────────────────────────────────────────

    public async Task<BrandCampaign> CreateAsync(CreateCampaignRequest req, CancellationToken ct = default)
    {
        var campaign = new BrandCampaign
        {
            BrandUserId       = req.BrandUserId,
            BrandName         = req.BrandName,
            Title             = req.Title,
            Description       = req.Description,
            ThemeHashtag      = req.ThemeHashtag,
            ContentGuidelines = req.ContentGuidelines,
            PrizeAmount       = req.PrizeAmount,
            PrizeCurrency     = req.PrizeCurrency,
            PrizeDescription  = req.PrizeDescription,
            MaxEntries        = 20,
            JoinCode          = GenerateJoinCode(),
            Status            = CampaignStatus.Active,
            StartsAt          = DateTime.UtcNow,
            EndsAt            = DateTime.UtcNow.AddHours(req.DurationHours),
        };

        _db.BrandCampaigns.Add(campaign);
        await _db.SaveChangesAsync(ct);
        return campaign;
    }

    // ── Get by ID ─────────────────────────────────────────────────────────────

    public async Task<CampaignDetail?> GetAsync(string campaignId, CancellationToken ct = default)
    {
        var c = await _db.BrandCampaigns.FindAsync([campaignId], ct);
        if (c is null) return null;
        return await BuildDetailAsync(c, ct);
    }

    public async Task<CampaignDetail?> GetByJoinCodeAsync(string joinCode, CancellationToken ct = default)
    {
        var c = await _db.BrandCampaigns
            .FirstOrDefaultAsync(x => x.JoinCode == joinCode.ToUpperInvariant(), ct);
        if (c is null) return null;
        return await BuildDetailAsync(c, ct);
    }

    // ── Brand's campaign list ─────────────────────────────────────────────────

    public async Task<List<CampaignSummary>> GetByBrandAsync(string brandUserId, CancellationToken ct = default)
    {
        var campaigns = await _db.BrandCampaigns
            .Where(c => c.BrandUserId == brandUserId)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync(ct);

        var result = new List<CampaignSummary>();
        foreach (var c in campaigns)
        {
            var entryCount  = await _db.BrandCampaignEntries.CountAsync(e => e.CampaignId == c.Id, ct);
            var totalVotes  = await _db.BattleVotes.CountAsync(v => v.BattleId == c.Id, ct);
            var boostVotes  = await _db.VoteBoosts.Where(b => b.BattleId == c.Id && b.Verified)
                                       .SumAsync(b => (int?)b.VoteCount, ct) ?? 0;
            result.Add(new CampaignSummary(
                Id:           c.Id,
                Title:        c.Title,
                ThemeHashtag: c.ThemeHashtag,
                PrizeAmount:  c.PrizeAmount,
                PrizeCurrency:c.PrizeCurrency,
                JoinCode:     c.JoinCode,
                Status:       c.Status.ToString(),
                EndsAt:       c.EndsAt,
                EntryCount:   entryCount,
                TotalVotes:   totalVotes + boostVotes
            ));
        }
        return result;
    }

    // ── Join (creator submits entry) ──────────────────────────────────────────

    public async Task<BrandCampaignEntry?> JoinAsync(
        string campaignId, JoinCampaignRequest req, CancellationToken ct = default)
    {
        var campaign = await _db.BrandCampaigns.FindAsync([campaignId], ct);
        if (campaign is null || campaign.Status != CampaignStatus.Active) return null;

        var entryCount = await _db.BrandCampaignEntries.CountAsync(e => e.CampaignId == campaignId, ct);
        if (entryCount >= campaign.MaxEntries) return null;   // cap at 20

        // One entry per creator per campaign
        var existing = await _db.BrandCampaignEntries
            .FirstOrDefaultAsync(e => e.CampaignId == campaignId && e.CreatorUserId == req.CreatorUserId, ct);
        if (existing is not null) return existing;

        var entry = new BrandCampaignEntry
        {
            CampaignId    = campaignId,
            CreatorUserId = req.CreatorUserId,
            CreatorHandle = req.CreatorHandle,
            ReelUrl       = req.ReelUrl,
            Platform      = req.Platform,
            PaymentHandle = req.PaymentHandle,
        };

        _db.BrandCampaignEntries.Add(entry);
        await _db.SaveChangesAsync(ct);
        return entry;
    }

    // ── Vote ──────────────────────────────────────────────────────────────────

    public async Task<bool> VoteAsync(
        string campaignId, CampaignVoteRequest req, CancellationToken ct = default)
    {
        var campaign = await _db.BrandCampaigns.FindAsync([campaignId], ct);
        if (campaign is null || campaign.Status != CampaignStatus.Active) return false;

        // One free vote per voter token per campaign
        var already = await _db.BattleVotes
            .AnyAsync(v => v.BattleId == campaignId && v.VoterToken == req.VoterToken, ct);
        if (already) return false;

        _db.BattleVotes.Add(new BattleVote
        {
            BattleId   = campaignId,
            EntryId    = req.EntryId,
            VoterToken = req.VoterToken,
            VoterIp    = req.VoterIp,
        });
        await _db.SaveChangesAsync(ct);
        return true;
    }

    // ── Mark prize paid ───────────────────────────────────────────────────────

    public async Task<bool> MarkPaidAsync(string campaignId, string brandUserId, CancellationToken ct = default)
    {
        var campaign = await _db.BrandCampaigns.FindAsync([campaignId], ct);
        if (campaign is null || campaign.BrandUserId != brandUserId) return false;

        // Determine winner (highest vote count)
        var winnerEntryId = await GetWinnerEntryIdAsync(campaignId, ct);
        campaign.WinnerEntryId = winnerEntryId;
        campaign.PrizePaid     = true;
        campaign.Status        = CampaignStatus.PaidOut;

        await _db.SaveChangesAsync(ct);
        return true;
    }

    // ── Expire ended campaigns ────────────────────────────────────────────────

    public async Task ExpireEndedCampaignsAsync(CancellationToken ct = default)
    {
        var expired = await _db.BrandCampaigns
            .Where(c => c.Status == CampaignStatus.Active && c.EndsAt <= DateTime.UtcNow)
            .ToListAsync(ct);

        foreach (var c in expired)
        {
            c.Status        = CampaignStatus.Ended;
            c.WinnerEntryId = await GetWinnerEntryIdAsync(c.Id, ct);
        }

        if (expired.Count > 0)
            await _db.SaveChangesAsync(ct);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private async Task<CampaignDetail> BuildDetailAsync(BrandCampaign c, CancellationToken ct)
    {
        var entries = await _db.BrandCampaignEntries
            .Where(e => e.CampaignId == c.Id)
            .OrderBy(e => e.SubmittedAt)
            .ToListAsync(ct);

        // Aggregate votes per entry (free + boost)
        var freeVotes  = await _db.BattleVotes
            .Where(v => v.BattleId == c.Id)
            .GroupBy(v => v.EntryId)
            .Select(g => new { EntryId = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        var boostVotes = await _db.VoteBoosts
            .Where(b => b.BattleId == c.Id && b.Verified)
            .GroupBy(b => b.EntryId)
            .Select(g => new { EntryId = g.Key, Count = g.Sum(b => b.VoteCount) })
            .ToListAsync(ct);

        var votesDict = new Dictionary<string, int>();
        foreach (var v in freeVotes)  votesDict[v.EntryId] = votesDict.GetValueOrDefault(v.EntryId) + v.Count;
        foreach (var b in boostVotes) votesDict[b.EntryId] = votesDict.GetValueOrDefault(b.EntryId) + b.Count;

        var ranked = entries
            .Select(e => (entry: e, votes: votesDict.GetValueOrDefault(e.Id, 0)))
            .OrderByDescending(x => x.votes)
            .Select((x, i) => new CampaignLeaderboardEntry(
                Rank:          i + 1,
                EntryId:       x.entry.Id,
                CreatorHandle: x.entry.CreatorHandle,
                ReelUrl:       x.entry.ReelUrl,
                Platform:      x.entry.Platform,
                Votes:         x.votes,
                IsWinner:      c.WinnerEntryId == x.entry.Id
            ))
            .ToList();

        return new CampaignDetail(
            Id:               c.Id,
            BrandUserId:      c.BrandUserId,
            BrandName:        c.BrandName,
            Title:            c.Title,
            Description:      c.Description,
            ThemeHashtag:     c.ThemeHashtag,
            ContentGuidelines:c.ContentGuidelines,
            PrizeAmount:      c.PrizeAmount,
            PrizeCurrency:    c.PrizeCurrency,
            PrizeDescription: c.PrizeDescription,
            MaxEntries:       c.MaxEntries,
            EntryCount:       entries.Count,
            JoinCode:         c.JoinCode,
            Status:           c.Status.ToString(),
            StartsAt:         c.StartsAt,
            EndsAt:           c.EndsAt,
            PrizePaid:        c.PrizePaid,
            WinnerEntryId:    c.WinnerEntryId,
            Entries:          ranked
        );
    }

    private async Task<string?> GetWinnerEntryIdAsync(string campaignId, CancellationToken ct)
    {
        var entries = await _db.BrandCampaignEntries
            .Where(e => e.CampaignId == campaignId)
            .Select(e => e.Id)
            .ToListAsync(ct);
        if (entries.Count == 0) return null;

        var freeVotes = await _db.BattleVotes
            .Where(v => v.BattleId == campaignId)
            .GroupBy(v => v.EntryId)
            .Select(g => new { EntryId = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        var boostVotes = await _db.VoteBoosts
            .Where(b => b.BattleId == campaignId && b.Verified)
            .GroupBy(b => b.EntryId)
            .Select(g => new { EntryId = g.Key, Count = g.Sum(b => b.VoteCount) })
            .ToListAsync(ct);

        var totals = new Dictionary<string, int>();
        foreach (var v in freeVotes)  totals[v.EntryId] = totals.GetValueOrDefault(v.EntryId) + v.Count;
        foreach (var b in boostVotes) totals[b.EntryId] = totals.GetValueOrDefault(b.EntryId) + b.Count;

        return entries
            .OrderByDescending(id => totals.GetValueOrDefault(id, 0))
            .FirstOrDefault();
    }

    private static string GenerateJoinCode()
    {
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
        var rng = new Random();
        return new string(Enumerable.Range(0, 8).Select(_ => chars[rng.Next(chars.Length)]).ToArray());
    }
}
