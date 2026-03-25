using AIReelBooster.API.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AIReelBooster.API.Controllers;

[ApiController]
[Route("api/admin")]
public class AdminController : ControllerBase
{
    private readonly AppDbContext _db;

    public AdminController(AppDbContext db) => _db = db;

    private bool IsAuthorized(string? token)
    {
        var adminToken = Environment.GetEnvironmentVariable("ADMIN_TOKEN");
        if (string.IsNullOrWhiteSpace(adminToken)) return false;
        return token == adminToken;
    }

    // GET /api/admin/users?token=xxx
    [HttpGet("users")]
    public async Task<IActionResult> GetUsers([FromQuery] string? token)
    {
        if (!IsAuthorized(token))
            return Unauthorized(new { error = "Invalid token." });

        var paidUsers = await _db.UserPlans
            .Where(u => u.IsPaid)
            .OrderByDescending(u => u.UpdatedAt)
            .Select(u => new
            {
                userId    = u.UserId,
                plan      = u.Plan,
                paymentId = u.PaymentId,
                orderId   = u.OrderId,
                paidAt    = u.UpdatedAt,
                expiresAt = u.ExpiryDate,
                isExpired = u.ExpiryDate.HasValue && u.ExpiryDate < DateTime.UtcNow,
            })
            .ToListAsync();

        var visitorStat = await _db.SiteStats.FindAsync("visitor_count");
        var totalReferrals = await _db.UserReferrals.CountAsync();
        var successfulReferrals = await _db.UserReferrals.CountAsync(r => r.HasUploaded);

        return Ok(new
        {
            paidUsers,
            stats = new
            {
                totalPaid       = paidUsers.Count,
                totalVisitors   = visitorStat?.Value ?? 0,
                totalReferrals,
                successfulReferrals,
            }
        });
    }
}
