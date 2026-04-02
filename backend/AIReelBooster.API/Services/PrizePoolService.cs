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

public class PrizePoolService : IPrizePoolService
{
    private readonly AppDbContext    _db;
    private readonly RazorpaySettings _rz;
    private readonly HttpClient      _http;
    private readonly ILogger<PrizePoolService> _logger;

    public PrizePoolService(
        AppDbContext db,
        IOptions<AppSettings> opts,
        HttpClient http,
        ILogger<PrizePoolService> logger)
    {
        _db     = db;
        _rz     = opts.Value.Razorpay;
        _http   = http;
        _logger = logger;
    }

    // ── Create ────────────────────────────────────────────────────────────────

    public async Task<PrizePool> CreatePrizePoolAsync(CreatePrizePoolInput input, CancellationToken ct = default)
    {
        // For non-custom tiers, enforce the preset amount
        var amount = input.Tier == PrizePoolTier.Custom
            ? input.Amount
            : PrizePoolTiers.Amounts[input.Tier];

        if (amount < 100)
            throw new InvalidOperationException("Minimum prize pool is ₹100.");

        var pool = new PrizePool
        {
            ChallengeId   = input.ChallengeId,
            BrandUserId   = input.BrandUserId,
            Tier          = input.Tier,
            Amount        = amount,
            Currency      = input.Currency,
            NonCashPrizes = input.NonCashPrizes?.Trim(),
        };

        _db.PrizePools.Add(pool);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("PrizePool {Id} created for challenge {ChallengeId} — {Currency} {Amount}",
            pool.Id, input.ChallengeId, pool.Currency, pool.Amount);

        return pool;
    }

    // ── Razorpay order (brand pays into escrow) ───────────────────────────────

    public async Task<(string OrderId, decimal Amount)> CreatePaymentOrderAsync(
        string prizePoolId, CancellationToken ct = default)
    {
        var pool = await _db.PrizePools.FindAsync([prizePoolId], ct)
            ?? throw new InvalidOperationException("Prize pool not found.");

        if (pool.Status != PrizePoolStatus.Pending)
            throw new InvalidOperationException($"Prize pool is already {pool.Status}.");

        var amountPaise = (long)(pool.Amount * 100);  // Razorpay uses paise

        var payload = new
        {
            amount   = amountPaise,
            currency = pool.Currency,
            receipt  = $"pp_{pool.Id[..12]}",
            notes    = new { prizePoolId = pool.Id, type = "prize_pool_escrow" },
        };

        var req = new HttpRequestMessage(HttpMethod.Post, "https://api.razorpay.com/v1/orders")
        {
            Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json"),
        };
        req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue(
            "Basic", Convert.ToBase64String(Encoding.UTF8.GetBytes($"{_rz.KeyId}:{_rz.KeySecret}")));

        var res = await _http.SendAsync(req, ct);
        var body = await res.Content.ReadAsStringAsync(ct);
        if (!res.IsSuccessStatusCode)
            throw new InvalidOperationException($"Razorpay order creation failed: {body}");

        using var doc   = JsonDocument.Parse(body);
        var orderId     = doc.RootElement.GetProperty("id").GetString()!;

        pool.RazorpayOrderId = orderId;
        await _db.SaveChangesAsync(ct);

        return (orderId, pool.Amount);
    }

    // ── Confirm payment (webhook / frontend verify) ───────────────────────────

    public async Task<PrizePool> ConfirmPaymentAsync(
        string prizePoolId, string razorpayPaymentId, string razorpaySignature,
        CancellationToken ct = default)
    {
        var pool = await _db.PrizePools.FindAsync([prizePoolId], ct)
            ?? throw new InvalidOperationException("Prize pool not found.");

        // Verify HMAC signature
        var message = $"{pool.RazorpayOrderId}|{razorpayPaymentId}";
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_rz.KeySecret));
        var computed = Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(message))).ToLowerInvariant();

        if (computed != razorpaySignature.ToLowerInvariant())
            throw new UnauthorizedAccessException("Payment signature verification failed.");

        pool.Status            = PrizePoolStatus.Held;
        pool.RazorpayPaymentId = razorpayPaymentId;
        pool.PaidAt            = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("PrizePool {Id} funded — {Currency} {Amount} held in escrow",
            pool.Id, pool.Currency, pool.Amount);

        return pool;
    }

    // ── Query ─────────────────────────────────────────────────────────────────

    public async Task<PrizePool?> GetByChallengeAsync(string challengeId, CancellationToken ct = default)
        => await _db.PrizePools.FirstOrDefaultAsync(p => p.ChallengeId == challengeId, ct);

    public async Task<PrizePool?> GetByBattleAsync(string battleId, CancellationToken ct = default)
        => await _db.PrizePools.FirstOrDefaultAsync(p => p.BattleId == battleId, ct);

    public async Task<List<PrizeDistribution>> GetDistributionsAsync(string prizePoolId, CancellationToken ct = default)
        => await _db.PrizeDistributions.Where(d => d.PrizePoolId == prizePoolId).ToListAsync(ct);

    public async Task<PrizePoolSummary?> GetSummaryAsync(string id, CancellationToken ct = default)
    {
        var pool = await _db.PrizePools
            .FirstOrDefaultAsync(p => p.ChallengeId == id || p.BattleId == id, ct);
        if (pool is null) return null;

        var dists = await _db.PrizeDistributions.Where(d => d.PrizePoolId == pool.Id).ToListAsync(ct);

        return new PrizePoolSummary(
            PrizePoolId:      pool.Id,
            TotalAmount:      pool.Amount,
            Currency:         pool.Currency,
            Status:           pool.Status,
            Tier:             pool.Tier,
            NonCashPrizes:    pool.NonCashPrizes,
            WinnerAmount:     Math.Round(pool.Amount * PrizePoolTiers.WinnerPct,   2),
            RunnerUpAmount:   Math.Round(pool.Amount * PrizePoolTiers.RunnerUpPct, 2),
            VoterPoolAmount:  Math.Round(pool.Amount * PrizePoolTiers.VoterPct,    2),
            PlatformAmount:   Math.Round(pool.Amount * PrizePoolTiers.PlatformPct, 2),
            Distributions:    dists.Select(d => new DistributionRow(
                d.RecipientType.ToString(), d.RecipientUserId, d.Amount, d.Status.ToString()
            )).ToList()
        );
    }

    // ── Distribution (called by BattleExpiryWorker) ───────────────────────────

    public async Task DistributeAsync(string battleId, CancellationToken ct = default)
    {
        var pool = await _db.PrizePools.FirstOrDefaultAsync(p => p.BattleId == battleId, ct);
        if (pool is null || pool.Status != PrizePoolStatus.Held) return;

        var battle = await _db.Battles.FindAsync([battleId], ct);
        if (battle is null || battle.WinnerUserId is null) return;

        pool.Status = PrizePoolStatus.Distributing;
        await _db.SaveChangesAsync(ct);

        var runnerUpId = battle.WinnerUserId == battle.ChallengerUserId
            ? battle.OpponentUserId
            : battle.ChallengerUserId;

        // Top boosters for the winning entry — ranked by total votes (free + paid + referral)
        var winnerEntry = await _db.BattleEntries
            .FirstOrDefaultAsync(e => e.BattleId == battleId && e.UserId == battle.WinnerUserId, ct);

        List<string> topVoterTokens = [];
        if (winnerEntry is not null)
        {
            var freeVotes = await _db.BattleVotes
                .Where(v => v.EntryId == winnerEntry.Id)
                .GroupBy(v => v.VoterToken)
                .Select(g => new { Token = g.Key, Votes = g.Count() })
                .ToListAsync(ct);

            var paidVotes = await _db.VoteBoosts
                .Where(b => b.EntryId == winnerEntry.Id && b.Verified)
                .GroupBy(b => b.VoterToken)
                .Select(g => new { Token = g.Key, Votes = (int)g.Sum(b => b.VoteCount) })
                .ToListAsync(ct);

            topVoterTokens = freeVotes
                .Concat(paidVotes)
                .GroupBy(x => x.Token)
                .Select(g => new { Token = g.Key, Votes = g.Sum(x => x.Votes) })
                .OrderByDescending(x => x.Votes)
                .Take(PrizePoolTiers.MaxVoters)
                .Select(x => x.Token)
                .ToList();
        }

        var winnerAmt   = Math.Round(pool.Amount * PrizePoolTiers.WinnerPct,   2);
        var runnerUpAmt = Math.Round(pool.Amount * PrizePoolTiers.RunnerUpPct, 2);
        var platformAmt = Math.Round(pool.Amount * PrizePoolTiers.PlatformPct, 2);
        var voterPool   = Math.Round(pool.Amount * PrizePoolTiers.VoterPct,    2);
        var perVoter    = topVoterTokens.Count > 0
            ? Math.Round(voterPool / topVoterTokens.Count, 2)
            : 0;

        var rows = new List<PrizeDistribution>
        {
            new() { PrizePoolId = pool.Id, BattleId = battleId, RecipientType = RecipientType.Winner,    RecipientUserId = battle.WinnerUserId, Amount = winnerAmt },
            new() { PrizePoolId = pool.Id, BattleId = battleId, RecipientType = RecipientType.RunnerUp,  RecipientUserId = runnerUpId,           Amount = runnerUpAmt },
            new() { PrizePoolId = pool.Id, BattleId = battleId, RecipientType = RecipientType.Platform,  RecipientUserId = null,                  Amount = platformAmt },
        };

        foreach (var token in topVoterTokens)
            rows.Add(new() { PrizePoolId = pool.Id, BattleId = battleId, RecipientType = RecipientType.Voter, RecipientUserId = token, Amount = perVoter });

        _db.PrizeDistributions.AddRange(rows);

        // ── Actual payout via Razorpay X (requires Razorpay X account) ────────
        // In the current setup we create distribution records (Status = Pending)
        // and trigger payouts via the /api/prize-pool/{id}/payout admin endpoint.
        // For creators who have linked UPI, payouts fire automatically.

        pool.Status        = PrizePoolStatus.Distributed;
        pool.DistributedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);

        _logger.LogInformation(
            "PrizePool {Id} distributed — Winner {Winner} gets {Currency} {WinAmt}, RunnerUp {RunnerUpAmt}, {VoterCount} voters get {PerVoter} each",
            pool.Id, battle.WinnerUserId, pool.Currency, winnerAmt, runnerUpAmt, topVoterTokens.Count, perVoter);
    }

    // ── Distribute all pending (called by BattleExpiryWorker) ────────────────

    public async Task DistributeAllPendingAsync(CancellationToken ct = default)
    {
        // Find all Held pools whose associated battle is now Completed
        var pendingPools = await _db.PrizePools
            .Where(p => p.Status == PrizePoolStatus.Held && p.BattleId != null)
            .ToListAsync(ct);

        foreach (var pool in pendingPools)
        {
            var battle = await _db.Battles.FindAsync([pool.BattleId!], ct);
            if (battle?.Status == BattleStatus.Completed)
                await DistributeAsync(pool.BattleId!, ct);
        }
    }

    // ── Refund ────────────────────────────────────────────────────────────────

    public async Task RefundAsync(string challengeId, CancellationToken ct = default)
    {
        var pool = await _db.PrizePools.FirstOrDefaultAsync(p => p.ChallengeId == challengeId, ct);
        if (pool is null || pool.Status != PrizePoolStatus.Held) return;

        // Razorpay refund API
        if (!string.IsNullOrEmpty(pool.RazorpayPaymentId))
        {
            try
            {
                var req = new HttpRequestMessage(
                    HttpMethod.Post,
                    $"https://api.razorpay.com/v1/payments/{pool.RazorpayPaymentId}/refund");
                req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue(
                    "Basic", Convert.ToBase64String(Encoding.UTF8.GetBytes($"{_rz.KeyId}:{_rz.KeySecret}")));
                req.Content = new StringContent(
                    JsonSerializer.Serialize(new { amount = (long)(pool.Amount * 100) }),
                    Encoding.UTF8, "application/json");

                await _http.SendAsync(req, ct);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Razorpay refund failed for PrizePool {Id}", pool.Id);
            }
        }

        pool.Status = PrizePoolStatus.Refunded;
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("PrizePool {Id} refunded for challenge {ChallengeId}", pool.Id, challengeId);
    }
}
