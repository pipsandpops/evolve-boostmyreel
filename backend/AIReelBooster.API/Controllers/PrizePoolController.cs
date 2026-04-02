using AIReelBooster.API.Models.Domain;
using AIReelBooster.API.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace AIReelBooster.API.Controllers;

[ApiController]
[Route("api/prize-pool")]
public class PrizePoolController : ControllerBase
{
    private readonly IPrizePoolService _prizes;
    private readonly ILogger<PrizePoolController> _logger;

    public PrizePoolController(IPrizePoolService prizes, ILogger<PrizePoolController> logger)
    {
        _prizes = prizes;
        _logger = logger;
    }

    // ── POST /api/prize-pool ─────────────────────────────────────────────────
    // Brand sets up a prize pool for their challenge before or after challenge creation.

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreatePrizePoolRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.ChallengeId))
            return BadRequest(new { error = "challengeId is required." });
        if (string.IsNullOrWhiteSpace(req.BrandUserId))
            return BadRequest(new { error = "brandUserId is required." });
        if (req.Amount <= 0 && req.Tier == PrizePoolTier.Custom)
            return BadRequest(new { error = "amount is required for Custom tier." });

        try
        {
            var pool = await _prizes.CreatePrizePoolAsync(new(
                req.ChallengeId, req.BrandUserId, req.Tier,
                req.Amount, req.Currency ?? "INR", req.NonCashPrizes), ct);

            return Ok(new
            {
                prizePoolId   = pool.Id,
                tier          = pool.Tier.ToString(),
                amount        = pool.Amount,
                currency      = pool.Currency,
                status        = pool.Status.ToString(),
                nonCashPrizes = pool.NonCashPrizes,
                split = new
                {
                    winner   = $"{PrizePoolTiers.WinnerPct * 100:0}% — {pool.Currency} {Math.Round(pool.Amount * PrizePoolTiers.WinnerPct, 2)}",
                    runnerUp = $"{PrizePoolTiers.RunnerUpPct * 100:0}% — {pool.Currency} {Math.Round(pool.Amount * PrizePoolTiers.RunnerUpPct, 2)}",
                    voters   = $"{PrizePoolTiers.VoterPct * 100:0}% split among top {PrizePoolTiers.MaxVoters} voters",
                    platform = $"{PrizePoolTiers.PlatformPct * 100:0}% — BoostMyReel",
                },
            });
        }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Create prize pool failed");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    // ── POST /api/prize-pool/{id}/pay ────────────────────────────────────────
    // Creates a Razorpay order for the brand to pay the prize pool deposit.

    [HttpPost("{id}/pay")]
    public async Task<IActionResult> Pay(string id, CancellationToken ct)
    {
        try
        {
            var (orderId, amount) = await _prizes.CreatePaymentOrderAsync(id, ct);
            return Ok(new { orderId, amount, prizePoolId = id });
        }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Prize pool payment order failed");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    // ── POST /api/prize-pool/{id}/confirm ────────────────────────────────────
    // Frontend calls this after Razorpay checkout completes to confirm escrow.

    [HttpPost("{id}/confirm")]
    public async Task<IActionResult> Confirm(string id, [FromBody] ConfirmPrizePaymentRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.PaymentId) || string.IsNullOrWhiteSpace(req.Signature))
            return BadRequest(new { error = "paymentId and signature are required." });

        try
        {
            var pool = await _prizes.ConfirmPaymentAsync(id, req.PaymentId, req.Signature, ct);
            return Ok(new
            {
                prizePoolId = pool.Id,
                status      = pool.Status.ToString(),
                paidAt      = pool.PaidAt,
                message     = $"💰 {pool.Currency} {pool.Amount:N0} held in escrow. Prize pool is live!",
            });
        }
        catch (UnauthorizedAccessException) { return Unauthorized(new { error = "Invalid payment signature." }); }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Prize pool confirm failed");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    // ── GET /api/prize-pool/battle/{battleOrChallengeId} ─────────────────────
    // Public endpoint — shows prize pool on the battle page.

    [HttpGet("battle/{id}")]
    public async Task<IActionResult> GetSummary(string id, CancellationToken ct)
    {
        var summary = await _prizes.GetSummaryAsync(id, ct);
        if (summary is null) return Ok(new { hasPrizePool = false });

        return Ok(new
        {
            hasPrizePool  = true,
            prizePoolId   = summary.PrizePoolId,
            totalAmount   = summary.TotalAmount,
            currency      = summary.Currency,
            status        = summary.Status.ToString(),
            tier          = summary.Tier.ToString(),
            nonCashPrizes = summary.NonCashPrizes,
            split = new
            {
                winner   = summary.WinnerAmount,
                runnerUp = summary.RunnerUpAmount,
                voters   = summary.VoterPoolAmount,
                platform = summary.PlatformAmount,
            },
            distributions = summary.Distributions,
        });
    }

    // ── POST /api/prize-pool/{id}/refund ─────────────────────────────────────
    // Admin / system: refund if challenge was never accepted.

    [HttpPost("{id}/refund")]
    public async Task<IActionResult> Refund(string id, CancellationToken ct)
    {
        try
        {
            await _prizes.RefundAsync(id, ct);
            return Ok(new { message = "Prize pool refunded." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Refund failed");
            return StatusCode(500, new { error = ex.Message });
        }
    }
}

// ── Request models ────────────────────────────────────────────────────────────

public record CreatePrizePoolRequest(
    string ChallengeId,
    string BrandUserId,
    PrizePoolTier Tier,
    decimal Amount,
    string? Currency,
    string? NonCashPrizes
);

public record ConfirmPrizePaymentRequest(string PaymentId, string Signature);
