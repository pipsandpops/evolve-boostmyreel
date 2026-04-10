using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using AIReelBooster.API.Configuration;
using AIReelBooster.API.Infrastructure;
using AIReelBooster.API.Models.Domain;
using AIReelBooster.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace AIReelBooster.API.Services;

public class VoteBoostService : IVoteBoostService
{
    private readonly AppDbContext _db;
    private readonly RazorpaySettings _rz;
    private readonly string _frontendBase;
    private readonly HttpClient _http;
    private readonly ILogger<VoteBoostService> _logger;

    public VoteBoostService(
        AppDbContext db,
        IOptions<AppSettings> opts,
        HttpClient http,
        ILogger<VoteBoostService> logger)
    {
        _db           = db;
        _rz           = opts.Value.Razorpay;
        _frontendBase = opts.Value.Instagram.FrontendBaseUrl.TrimEnd('/');
        _http         = http;
        _logger       = logger;
    }

    // ── Create Razorpay order for a boost tier ────────────────────────────────

    public async Task<CreateBoostOrderResult> CreateBoostOrderAsync(
        string battleId, string entryId, string voterToken, string tier,
        CancellationToken ct = default)
    {
        var tierDef = VoteBoostTiers.Get(tier)
            ?? throw new InvalidOperationException($"Unknown boost tier '{tier}'. Valid: Starter, Power, Mega.");

        var battle = await _db.Battles.FindAsync([battleId], ct)
            ?? throw new InvalidOperationException("Battle not found.");

        if (battle.Status != BattleStatus.Active)
            throw new InvalidOperationException("Battle is not active.");

        var amountPaise = (long)(tierDef.AmountINR * 100);

        var payload = new
        {
            amount   = amountPaise,
            currency = "INR",
            receipt  = $"boost_{battleId[..8]}_{voterToken[..6]}",
            notes    = new { battleId, entryId, voterToken, tier },
        };

        var req = new HttpRequestMessage(HttpMethod.Post, "https://api.razorpay.com/v1/orders")
        {
            Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json"),
        };
        req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue(
            "Basic", Convert.ToBase64String(Encoding.UTF8.GetBytes($"{_rz.KeyId}:{_rz.KeySecret}")));

        var res  = await _http.SendAsync(req, ct);
        var body = await res.Content.ReadAsStringAsync(ct);
        if (!res.IsSuccessStatusCode)
            throw new InvalidOperationException($"Razorpay order failed: {body}");

        using var doc   = JsonDocument.Parse(body);
        var orderId     = doc.RootElement.GetProperty("id").GetString()!;

        // Store a pending (unverified) VoteBoost row
        _db.VoteBoosts.Add(new VoteBoost
        {
            BattleId        = battleId,
            EntryId         = entryId,
            VoterToken      = voterToken,
            VoteCount       = tierDef.Votes,
            AmountPaid      = tierDef.AmountINR,
            BoostTier       = tierDef.Key,
            RazorpayOrderId = orderId,
            Verified        = false,
        });
        await _db.SaveChangesAsync(ct);

        return new CreateBoostOrderResult(orderId, tierDef.AmountINR, "INR", tierDef.Label, _rz.KeyId, tierDef.Votes);
    }

    // ── Verify Razorpay payment and activate the boost ────────────────────────

    public async Task<ConfirmBoostResult> ConfirmBoostAsync(
        string battleId, string orderId, string paymentId, string signature,
        CancellationToken ct = default)
    {
        var boost = await _db.VoteBoosts
            .FirstOrDefaultAsync(b => b.RazorpayOrderId == orderId && b.BattleId == battleId, ct);

        if (boost is null)
            return new ConfirmBoostResult(false, "Boost order not found.", 0);

        if (boost.Verified)
            return new ConfirmBoostResult(true, "Already verified.", boost.VoteCount);

        // HMAC-SHA256 verification (same as PrizePoolService)
        var message  = $"{orderId}|{paymentId}";
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_rz.KeySecret));
        var computed = Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(message))).ToLowerInvariant();

        if (computed != signature.ToLowerInvariant())
            return new ConfirmBoostResult(false, "Payment signature invalid.", 0);

        boost.Verified          = true;
        boost.RazorpayPaymentId = paymentId;
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("VoteBoost {Id} confirmed — {Votes} votes for entry {EntryId} in battle {BattleId}",
            boost.Id, boost.VoteCount, boost.EntryId, boost.BattleId);

        return new ConfirmBoostResult(true, $"{boost.VoteCount} votes added! 🔥", boost.VoteCount);
    }

    // ── Award 5 referral bonus votes (idempotent) ─────────────────────────────

    public async Task<AwardReferralResult> AwardReferralBonusAsync(
        string battleId, string entryId, string voterToken,
        CancellationToken ct = default)
    {
        // One referral bonus per voter per battle
        var alreadyAwarded = await _db.VoteBoosts
            .AnyAsync(b => b.BattleId == battleId && b.VoterToken == voterToken
                        && b.BoostTier == "Referral", ct);

        var battle = await _db.Battles.FindAsync([battleId], ct);
        var battleLink = $"{_frontendBase}/battle/{battleId}";

        // Build share card regardless of whether bonus was awarded
        var entry = await _db.BattleEntries
            .FirstOrDefaultAsync(e => e.Id == entryId, ct);

        var handle   = entry?.InstagramHandle ?? entry?.YouTubeHandle ?? "this creator";
        var hashtag  = battle?.ThemeHashtag is { Length: > 0 } h ? $"#{h} " : "";
        var cardText = $"I'm backing @{handle} in the {hashtag}Battle! Join me & win → {battleLink}";

        if (alreadyAwarded)
            return new AwardReferralResult(false, 0, new ShareCard(cardText, battleLink));

        _db.VoteBoosts.Add(new VoteBoost
        {
            BattleId   = battleId,
            EntryId    = entryId,
            VoterToken = voterToken,
            VoteCount  = VoteBoostTiers.ReferralBonusVotes,
            AmountPaid = 0m,
            BoostTier  = "Referral",
            Verified   = true,  // free, no payment needed
        });
        await _db.SaveChangesAsync(ct);

        return new AwardReferralResult(true, VoteBoostTiers.ReferralBonusVotes, new ShareCard(cardText, battleLink));
    }

    // ── Top N boosters by total votes (free + paid + referral) ───────────────

    public async Task<List<BoosterRow>> GetTopBoostersAsync(
        string battleId, int limit = 10, CancellationToken ct = default)
    {
        // Free votes from BattleVotes
        var freeVotes = await _db.BattleVotes
            .Where(v => v.BattleId == battleId)
            .GroupBy(v => v.VoterToken)
            .Select(g => new { Token = g.Key, Votes = g.Count(), Spent = 0m })
            .ToListAsync(ct);

        // Paid + referral from VoteBoosts
        var paidVotes = await _db.VoteBoosts
            .Where(b => b.BattleId == battleId && b.Verified)
            .GroupBy(b => b.VoterToken)
            .Select(g => new { Token = g.Key, Votes = (int)g.Sum(b => b.VoteCount), Spent = g.Sum(b => b.AmountPaid) })
            .ToListAsync(ct);

        // Merge in memory
        var merged = freeVotes
            .Concat(paidVotes)
            .GroupBy(x => x.Token)
            .Select(g => new { Token = g.Key, Votes = g.Sum(x => x.Votes), Spent = g.Sum(x => x.Spent) })
            .OrderByDescending(x => x.Votes)
            .Take(limit)
            .ToList();

        return merged.Select((x, i) => new BoosterRow(i + 1, x.Token, x.Votes, x.Spent)).ToList();
    }

    // ── Total votes per entry (for scoring) ──────────────────────────────────

    public async Task<Dictionary<string, int>> GetTotalVotesByEntryAsync(
        string battleId, CancellationToken ct = default)
    {
        var freeVotes = await _db.BattleVotes
            .Where(v => v.BattleId == battleId)
            .GroupBy(v => v.EntryId)
            .Select(g => new { EntryId = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        var paidVotes = await _db.VoteBoosts
            .Where(b => b.BattleId == battleId && b.Verified)
            .GroupBy(b => b.EntryId)
            .Select(g => new { EntryId = g.Key, Count = (int)g.Sum(b => b.VoteCount) })
            .ToListAsync(ct);

        var result = new Dictionary<string, int>();
        foreach (var v in freeVotes.Concat(paidVotes))
            result[v.EntryId] = result.GetValueOrDefault(v.EntryId) + v.Count;

        return result;
    }
}
