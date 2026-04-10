using AIReelBooster.API.Configuration;
using AIReelBooster.API.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace AIReelBooster.API.Controllers;

// ── Request / Response models ─────────────────────────────────────────────────

public record InstagramPredictionRequest(string UserId, int ViralScore, int EngagementScore, int HookScore);

// ── Controller ────────────────────────────────────────────────────────────────

/// <summary>
/// Handles Instagram OAuth, profile status, and personalised predictions.
///
/// Endpoints:
///   GET  /api/instagram/auth-url?userId={id}           → returns Meta OAuth URL
///   GET  /api/instagram/callback?code={c}&state={uid}  → Meta redirects here; we redirect to frontend
///   GET  /api/instagram/status?userId={id}             → returns connection status + profile
///   POST /api/instagram/prediction                     → personalised view prediction
///   GET  /api/instagram/analytics?userId={id}          → raw analytics (Pro only)
///   DELETE /api/instagram/disconnect?userId={id}       → remove stored token
/// </summary>
[ApiController]
[Route("api/instagram")]
public class InstagramController : ControllerBase
{
    private readonly IInstagramAuthService         _auth;
    private readonly IInstagramAnalyticsService    _analytics;
    private readonly IPersonalizedPredictionService _prediction;
    private readonly InstagramSettings             _igSettings;
    private readonly ILogger<InstagramController>  _logger;

    public InstagramController(
        IInstagramAuthService          auth,
        IInstagramAnalyticsService     analytics,
        IPersonalizedPredictionService prediction,
        IOptions<AppSettings>          opts,
        ILogger<InstagramController>   logger)
    {
        _auth       = auth;
        _analytics  = analytics;
        _prediction = prediction;
        _igSettings = opts.Value.Instagram;
        _logger     = logger;
    }

    // GET /api/instagram/auth-url?userId=xxx
    [HttpGet("auth-url")]
    public IActionResult GetAuthUrl([FromQuery] string? userId)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return BadRequest(new { error = "userId is required" });

        if (string.IsNullOrWhiteSpace(_igSettings.AppId))
            return StatusCode(503, new { error = "Instagram integration is not configured on this server." });

        return Ok(new { authUrl = _auth.GetOAuthUrl(userId) });
    }

    // GET /api/instagram/callback?code=xxx&state=userId
    // Meta redirects the user here after authorizing.
    // We exchange the code, persist the token, then redirect back to the frontend.
    [HttpGet("callback")]
    public async Task<IActionResult> Callback(
        [FromQuery] string? code,
        [FromQuery] string? state,       // userId passed via OAuth state parameter
        [FromQuery] string? error,
        [FromQuery] string? error_reason,
        CancellationToken ct)
    {
        var frontendBase = _igSettings.FrontendBaseUrl.TrimEnd('/');

        // User denied authorization
        if (!string.IsNullOrEmpty(error))
        {
            _logger.LogWarning("Instagram OAuth denied: {Error} — {Reason}", error, error_reason);
            return Redirect($"{frontendBase}?ig_result=denied");
        }

        if (string.IsNullOrEmpty(code) || string.IsNullOrEmpty(state))
            return Redirect($"{frontendBase}?ig_result=error&ig_msg=missing_params");

        var result = await _auth.HandleCallbackAsync(code, state, ct);

        if (!result.Success)
        {
            var encoded = Uri.EscapeDataString(result.Error ?? "unknown_error");
            return Redirect($"{frontendBase}?ig_result=error&ig_msg={encoded}");
        }

        var username = Uri.EscapeDataString(result.Username);
        return Redirect($"{frontendBase}?ig_result=success&ig_user={username}&ig_followers={result.Followers}");
    }

    // GET /api/instagram/status?userId=xxx
    [HttpGet("status")]
    public async Task<IActionResult> GetStatus([FromQuery] string? userId, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return Ok(new { connected = false });

        var token = await _auth.GetTokenAsync(userId, ct);
        if (token == null)
            return Ok(new { connected = false });

        // Token expiry check
        if (token.TokenExpiry < DateTime.UtcNow)
        {
            await _auth.DisconnectAsync(userId, ct);
            return Ok(new { connected = false, expired = true });
        }

        return Ok(new
        {
            connected     = true,
            username      = token.IgUsername,
            followers     = token.FollowerCount,
            avgViews      = token.AvgReelViews >= 0 ? (long?)token.AvgReelViews : null,
            engagementRate = Math.Round(token.EngagementRate, 2),
            connectedAt   = token.ConnectedAt,
            lastSyncAt    = token.LastSyncAt,
        });
    }

    // POST /api/instagram/prediction
    [HttpPost("prediction")]
    public async Task<IActionResult> GetPersonalizedPrediction(
        [FromBody] InstagramPredictionRequest req,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.UserId))
            return BadRequest(new { error = "userId is required" });

        try
        {
            var prediction = await _prediction.PredictAsync(
                req.UserId,
                req.ViralScore,
                req.EngagementScore,
                req.HookScore,
                ct);

            return Ok(prediction);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Prediction failed for user {UserId}", req.UserId);
            return StatusCode(500, new { error = "Prediction failed. Please try again." });
        }
    }

    // GET /api/instagram/analytics?userId=xxx
    // Returns raw analytics — useful for debugging and future dashboard features.
    [HttpGet("analytics")]
    public async Task<IActionResult> GetAnalytics([FromQuery] string? userId, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return BadRequest(new { error = "userId is required" });

        var token = await _auth.GetTokenAsync(userId, ct);
        if (token == null)
            return NotFound(new { error = "Instagram not connected for this user." });

        if (token.TokenExpiry < DateTime.UtcNow)
        {
            await _auth.DisconnectAsync(userId, ct);
            return Unauthorized(new { error = "Instagram token has expired. Please reconnect." });
        }

        try
        {
            var analytics = await _analytics.GetAnalyticsAsync(token.AccessToken, token.IgUserId, ct);
            return Ok(analytics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Analytics fetch failed for user {UserId}", userId);
            return StatusCode(500, new { error = "Failed to fetch Instagram analytics." });
        }
    }

    // DELETE /api/instagram/disconnect?userId=xxx
    [HttpDelete("disconnect")]
    public async Task<IActionResult> Disconnect([FromQuery] string? userId, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return BadRequest(new { error = "userId is required" });

        await _auth.DisconnectAsync(userId, ct);
        return Ok(new { success = true });
    }
}
