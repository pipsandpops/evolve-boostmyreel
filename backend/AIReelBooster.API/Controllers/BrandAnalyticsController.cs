using AIReelBooster.API.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace AIReelBooster.API.Controllers;

[ApiController]
[Route("api/analytics")]
public class BrandAnalyticsController : ControllerBase
{
    private readonly IBrandAnalyticsService _analytics;
    private readonly ILogger<BrandAnalyticsController> _logger;

    public BrandAnalyticsController(IBrandAnalyticsService analytics, ILogger<BrandAnalyticsController> logger)
    {
        _analytics = analytics;
        _logger    = logger;
    }

    // ── POST /api/analytics/battle/{battleId}/view ────────────────────────────
    // Called by frontend on page mount to record a visit (fire-and-forget style).

    [HttpPost("battle/{battleId}/view")]
    public async Task<IActionResult> TrackView(string battleId, [FromBody] TrackViewRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.VisitorToken))
            return BadRequest(new { error = "visitorToken is required." });
        try
        {
            await _analytics.TrackPageViewAsync(battleId, req.VisitorToken, ct);
            return Ok(new { tracked = true });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "TrackView failed for battle {BattleId}", battleId);
            return StatusCode(500, new { error = ex.Message });
        }
    }

    // ── GET /api/analytics/battle/{battleId}/roi ──────────────────────────────
    // Private: returns full ROI analytics. Requires brandUserId to match the pool owner.

    [HttpGet("battle/{battleId}/roi")]
    public async Task<IActionResult> GetRoi(string battleId, [FromQuery] string brandUserId, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(brandUserId))
            return BadRequest(new { error = "brandUserId is required." });

        try
        {
            var roi = await _analytics.GetRoiAsync(battleId, brandUserId, ct);
            if (roi is null)
                return NotFound(new { error = "Analytics not found or you are not the sponsor of this battle." });

            return Ok(roi);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "GetRoi failed for battle {BattleId}", battleId);
            return StatusCode(500, new { error = ex.Message });
        }
    }
}

public record TrackViewRequest(string VisitorToken);
