using System.Net;
using System.Net.Mail;
using AIReelBooster.API.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AIReelBooster.API.Controllers;

[ApiController]
[Route("api/user")]
public class UserOtpController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ILogger<UserOtpController> _logger;

    public UserOtpController(AppDbContext db, ILogger<UserOtpController> logger)
    {
        _db = db;
        _logger = logger;
    }

    // POST /api/user/request-otp
    [HttpPost("request-otp")]
    public async Task<IActionResult> RequestOtp([FromBody] RequestOtpRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Email) || !req.Email.Contains('@'))
            return BadRequest(new { error = "Valid email required." });

        var email = req.Email.Trim().ToLower();

        // Check this email has a paid plan
        var plan = await _db.UserPlans
            .FirstOrDefaultAsync(u => u.Email != null && u.Email.ToLower() == email && u.IsPaid);

        if (plan == null)
            return NotFound(new { error = "No paid account found for this email." });

        // Generate 6-digit OTP
        var code = Random.Shared.Next(100000, 999999).ToString();
        var expiry = DateTime.UtcNow.AddMinutes(10);

        // Remove old OTPs for this email
        var old = _db.OtpCodes.Where(o => o.Email == email);
        _db.OtpCodes.RemoveRange(old);

        _db.OtpCodes.Add(new Models.Domain.OtpCode
        {
            Email     = email,
            Code      = code,
            ExpiresAt = expiry,
        });
        await _db.SaveChangesAsync();

        // Send email
        try
        {
            await SendOtpEmailAsync(email, code);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send OTP email to {Email}", email);
            return StatusCode(500, new { error = "Could not send OTP email. Check SMTP settings." });
        }

        return Ok(new { message = "OTP sent to your email." });
    }

    // POST /api/user/verify-otp
    [HttpPost("verify-otp")]
    public async Task<IActionResult> VerifyOtp([FromBody] VerifyOtpRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Code))
            return BadRequest(new { error = "Email and code required." });

        var email = req.Email.Trim().ToLower();

        var otp = await _db.OtpCodes
            .FirstOrDefaultAsync(o => o.Email == email && o.Code == req.Code);

        if (otp == null)
            return BadRequest(new { error = "Invalid OTP." });

        if (otp.ExpiresAt < DateTime.UtcNow)
        {
            _db.OtpCodes.Remove(otp);
            await _db.SaveChangesAsync();
            return BadRequest(new { error = "OTP expired. Please request a new one." });
        }

        var plan = await _db.UserPlans
            .FirstOrDefaultAsync(u => u.Email != null && u.Email.ToLower() == email && u.IsPaid);

        if (plan == null)
            return NotFound(new { error = "Account not found." });

        // Clean up used OTP
        _db.OtpCodes.Remove(otp);
        await _db.SaveChangesAsync();

        return Ok(new { userId = plan.UserId, plan = plan.Plan });
    }

    private static async Task SendOtpEmailAsync(string toEmail, string code)
    {
        var host    = Environment.GetEnvironmentVariable("SMTP_HOST")    ?? throw new InvalidOperationException("SMTP_HOST not set");
        var portStr = Environment.GetEnvironmentVariable("SMTP_PORT")    ?? "587";
        var user    = Environment.GetEnvironmentVariable("SMTP_USER")    ?? throw new InvalidOperationException("SMTP_USER not set");
        var pass    = Environment.GetEnvironmentVariable("SMTP_PASS")    ?? throw new InvalidOperationException("SMTP_PASS not set");
        var from    = Environment.GetEnvironmentVariable("SMTP_FROM")    ?? user;

        using var smtp = new SmtpClient(host, int.Parse(portStr))
        {
            Credentials = new NetworkCredential(user, pass),
            EnableSsl   = true,
        };

        var body = $@"
Hi there,

Your BoostMyReel access code is:

  {code}

This code expires in 10 minutes.

Enter this code on boostmyreel.com to restore your PRO access on this device.

– Team BoostMyReel
";
        var mail = new MailMessage(from, toEmail, "Your BoostMyReel Access Code", body);
        await smtp.SendMailAsync(mail);
    }
}

public record RequestOtpRequest(string Email);
public record VerifyOtpRequest(string Email, string Code);
