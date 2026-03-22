using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using AIReelBooster.API.Configuration;
using AIReelBooster.API.Infrastructure;
using AIReelBooster.API.Models.Domain;

namespace AIReelBooster.API.Controllers;

// ── Request models ────────────────────────────────────────────────────────────

public record CreateOrderRequest(string UserId, string Plan);

public record VerifyPaymentRequest(
    string UserId,
    string PaymentId,
    string OrderId,
    string Signature,
    string Plan);

// ── Payment controller ────────────────────────────────────────────────────────

[ApiController]
[Route("api/payment")]
public class PaymentController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly RazorpaySettings _rzp;
    private readonly IHttpClientFactory _http;
    private readonly ILogger<PaymentController> _logger;

    public PaymentController(
        AppDbContext db,
        IOptions<AppSettings> opts,
        IHttpClientFactory http,
        ILogger<PaymentController> logger)
    {
        _db     = db;
        _rzp    = opts.Value.Razorpay;
        _http   = http;
        _logger = logger;
    }

    // POST /api/payment/create-order
    [HttpPost("create-order")]
    public async Task<IActionResult> CreateOrder([FromBody] CreateOrderRequest req)
    {
        // Amount in paise (₹ × 100), GST-inclusive to match what the frontend shows.
        // Frontend adds 18% GST: starter ₹49+₹9=₹58, creator ₹199+₹36=₹235, pro ₹499+₹90=₹589
        var amount = req.Plan switch
        {
            "starter" => 5800,   // ₹49 + ₹9 GST  = ₹58
            "creator" => 23500,  // ₹199 + ₹36 GST = ₹235
            "pro"     => 58900,  // ₹499 + ₹90 GST = ₹589
            _         => 0
        };

        if (amount == 0)
            return BadRequest(new { error = "Invalid plan" });

        var client = _http.CreateClient();
        var creds  = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{_rzp.KeyId}:{_rzp.KeySecret}"));
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", creds);

        var body = JsonSerializer.Serialize(new
        {
            amount,
            currency = "INR",
            receipt  = $"rcpt_{req.UserId[..8]}_{DateTime.UtcNow.Ticks}",
        });

        try
        {
            var response = await client.PostAsync(
                "https://api.razorpay.com/v1/orders",
                new StringContent(body, Encoding.UTF8, "application/json"));

            var json = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Razorpay order creation failed: {Json}", json);
                return BadRequest(new { error = "Failed to create payment order" });
            }

            using var doc     = JsonDocument.Parse(json);
            var       orderId = doc.RootElement.GetProperty("id").GetString();

            return Ok(new { orderId, amount, currency = "INR", keyId = _rzp.KeyId });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Create order failed");
            return StatusCode(500, new { error = "Payment gateway unavailable" });
        }
    }

    // POST /api/payment/verify
    [HttpPost("verify")]
    public async Task<IActionResult> VerifyPayment([FromBody] VerifyPaymentRequest req)
    {
        // Verify HMAC-SHA256 signature
        var payload  = $"{req.OrderId}|{req.PaymentId}";
        using var hmac    = new HMACSHA256(Encoding.UTF8.GetBytes(_rzp.KeySecret));
        var hash     = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
        var computed = Convert.ToHexString(hash).ToLower();

        if (computed != req.Signature)
        {
            _logger.LogWarning("Payment signature mismatch for user {UserId}", req.UserId);
            return BadRequest(new { error = "Payment verification failed" });
        }

        // Subscription plans expire after 1 month; Starter is single-use (no expiry)
        DateTime? expiry = req.Plan switch
        {
            "creator" => DateTime.UtcNow.AddMonths(1),
            "pro"     => DateTime.UtcNow.AddMonths(1),
            _         => null
        };

        var existing = await _db.UserPlans.FindAsync(req.UserId);
        if (existing != null)
        {
            existing.Plan       = req.Plan;
            existing.IsPaid     = true;
            existing.PaymentId  = req.PaymentId;
            existing.OrderId    = req.OrderId;
            existing.ExpiryDate = expiry;
            existing.UpdatedAt  = DateTime.UtcNow;
        }
        else
        {
            _db.UserPlans.Add(new UserPlan
            {
                UserId     = req.UserId,
                Plan       = req.Plan,
                IsPaid     = true,
                PaymentId  = req.PaymentId,
                OrderId    = req.OrderId,
                ExpiryDate = expiry,
            });
        }

        await _db.SaveChangesAsync();
        _logger.LogInformation("Payment verified for user {UserId}, plan {Plan}", req.UserId, req.Plan);

        return Ok(new { success = true, plan = req.Plan });
    }
}

// ── User status controller ────────────────────────────────────────────────────

[ApiController]
[Route("api/user")]
public class UserController : ControllerBase
{
    private readonly AppDbContext _db;

    public UserController(AppDbContext db) => _db = db;

    // GET /api/user/status?userId=xxx
    [HttpGet("status")]
    public async Task<IActionResult> GetStatus([FromQuery] string? userId)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return Ok(new { isPaid = false, plan = "free" });

        var user = await _db.UserPlans.FindAsync(userId);

        if (user == null || !user.IsPaid)
            return Ok(new { isPaid = false, plan = "free" });

        // Check subscription expiry
        if (user.ExpiryDate.HasValue && user.ExpiryDate < DateTime.UtcNow)
            return Ok(new { isPaid = false, plan = "free", expired = true });

        return Ok(new { isPaid = true, plan = user.Plan });
    }
}
