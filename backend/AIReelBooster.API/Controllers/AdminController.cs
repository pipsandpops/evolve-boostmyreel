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

    // GET /api/admin/users
    [HttpGet("users")]
    public async Task<IActionResult> GetUsers()
    {
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

        var totalReferrals = await _db.UserReferrals.CountAsync();
        var successfulReferrals = await _db.UserReferrals.CountAsync(r => r.HasUploaded);

        return Ok(new
        {
            paidUsers,
            stats = new
            {
                totalPaid           = paidUsers.Count,
                totalReferrals,
                successfulReferrals,
            }
        });
    }
}
