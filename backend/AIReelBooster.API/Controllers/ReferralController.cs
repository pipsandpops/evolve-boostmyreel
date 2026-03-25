using AIReelBooster.API.Infrastructure;
using AIReelBooster.API.Models.Domain;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AIReelBooster.API.Controllers;

public record RegisterReferralRequest(string UserId, string ReferralCode);

[ApiController]
[Route("api/referral")]
public class ReferralController : ControllerBase
{
    private const int ReferralCreditReward = 5;
    private const string BaseUrl = "https://boostmyreel.com";

    private readonly AppDbContext _db;
    private readonly ILogger<ReferralController> _logger;

    public ReferralController(AppDbContext db, ILogger<ReferralController> logger)
    {
        _db     = db;
        _logger = logger;
    }

    // ── GET /api/referral/my-link?userId=xxx ─────────────────────────────────
    // Returns (or lazily creates) the caller's referral code + shareable URL + credit balance.

    [HttpGet("my-link")]
    public async Task<IActionResult> GetMyLink([FromQuery] string? userId)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return BadRequest(new { error = "userId is required." });

        // Look up existing code or create one
        var existing = await _db.UserReferralCodes.FirstOrDefaultAsync(r => r.UserId == userId);
        string code;

        if (existing != null)
        {
            code = existing.Code;
        }
        else
        {
            code = GenerateCode(userId);

            // Handle unlikely collision — keep regenerating until unique
            while (await _db.UserReferralCodes.AnyAsync(r => r.Code == code))
                code = GenerateCode(Guid.NewGuid().ToString());

            _db.UserReferralCodes.Add(new UserReferralCode { Code = code, UserId = userId });
            await _db.SaveChangesAsync();
        }

        var credits = await _db.UserCredits.FindAsync(userId);
        var stats   = await GetStatsAsync(userId);

        return Ok(new
        {
            referralCode = userId,                            // full userId is the canonical ref param
            referralUrl  = $"{BaseUrl}/?ref={userId}",
            credits      = credits?.Balance ?? 0,
            stats,
        });
    }

    // ── POST /api/referral/register ──────────────────────────────────────────
    // Called by the frontend when a new user lands via ?ref=<referrerId>.
    // ReferralCode is the referrer's full userId (new links) or 8-char short
    // code (old links — resolved via UserReferralCodes lookup).

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterReferralRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.UserId) || string.IsNullOrWhiteSpace(req.ReferralCode))
            return BadRequest(new { error = "userId and referralCode are required." });

        // Idempotent — ignore if already registered
        if (await _db.UserReferrals.AnyAsync(r => r.UserId == req.UserId))
            return Ok(new { alreadyRegistered = true });

        // Resolve referrerId: new links use full userId directly;
        // old 8-char short codes fall back to the lookup table.
        string referrerId;
        if (req.ReferralCode.Length > 12)
        {
            // Treat as full userId
            referrerId = req.ReferralCode;
        }
        else
        {
            var codeRecord = await _db.UserReferralCodes.FindAsync(req.ReferralCode);
            if (codeRecord == null)
                return Ok(new { unknownCode = true });
            referrerId = codeRecord.UserId;
        }

        // Prevent self-referral
        if (referrerId == req.UserId)
            return Ok(new { selfReferral = true });

        _db.UserReferrals.Add(new UserReferral
        {
            UserId     = req.UserId,
            ReferrerId = referrerId,
        });

        await _db.SaveChangesAsync();
        _logger.LogInformation("User {UserId} registered via referral from {ReferrerId}", req.UserId, referrerId);

        return Ok(new { success = true });
    }

    // ── GET /api/referral/stats?userId=xxx ───────────────────────────────────

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats([FromQuery] string? userId)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return BadRequest(new { error = "userId is required." });

        var stats   = await GetStatsAsync(userId);
        var credits = await _db.UserCredits.FindAsync(userId);

        return Ok(new { stats, credits = credits?.Balance ?? 0 });
    }

    // ── Internal ─────────────────────────────────────────────────────────────

    /// <summary>
    /// Called by VideoController after a referred user's first successful upload.
    /// Awards 5 credits to the referrer.
    /// </summary>
    public async Task TryAwardReferralCreditAsync(string userId)
    {
        var referral = await _db.UserReferrals.FindAsync(userId);
        if (referral == null || referral.HasUploaded || referral.CreditAwarded) return;

        referral.HasUploaded   = true;
        referral.CreditAwarded = true;

        var credit = await _db.UserCredits.FindAsync(referral.ReferrerId);
        if (credit == null)
        {
            _db.UserCredits.Add(new UserCredit
            {
                UserId  = referral.ReferrerId,
                Balance = ReferralCreditReward,
            });
        }
        else
        {
            credit.Balance   += ReferralCreditReward;
            credit.UpdatedAt  = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
        _logger.LogInformation(
            "Awarded {Credits} credits to referrer {ReferrerId} for referred user {UserId}",
            ReferralCreditReward, referral.ReferrerId, userId);
    }

    private async Task<object> GetStatsAsync(string userId)
    {
        var referrals = await _db.UserReferrals
            .Where(r => r.ReferrerId == userId)
            .ToListAsync();

        return new
        {
            total      = referrals.Count,
            pending    = referrals.Count(r => !r.HasUploaded),
            successful = referrals.Count(r => r.HasUploaded),
        };
    }

    private static string GenerateCode(string userId)
    {
        // Take first 8 alphanumeric chars from the userId (strip hyphens)
        var stripped = userId.Replace("-", "").ToLower();
        return stripped.Length >= 8 ? stripped[..8] : stripped.PadRight(8, '0');
    }
}
