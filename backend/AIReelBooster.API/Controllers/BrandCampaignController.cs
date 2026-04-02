using AIReelBooster.API.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace AIReelBooster.API.Controllers;

[ApiController]
[Route("api/campaign")]
public class BrandCampaignController : ControllerBase
{
    private readonly IBrandCampaignService _svc;
    private readonly ILogger<BrandCampaignController> _logger;

    public BrandCampaignController(IBrandCampaignService svc, ILogger<BrandCampaignController> logger)
    {
        _svc    = svc;
        _logger = logger;
    }

    // ── POST /api/campaign  (brand creates campaign) ──────────────────────────

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCampaignRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.BrandUserId) || string.IsNullOrWhiteSpace(req.Title))
            return BadRequest(new { error = "brandUserId and title are required." });
        if (req.DurationHours < 1 || req.DurationHours > 720)
            return BadRequest(new { error = "durationHours must be between 1 and 720." });

        try
        {
            var campaign = await _svc.CreateAsync(req, ct);
            return Ok(new
            {
                campaignId = campaign.Id,
                joinCode   = campaign.JoinCode,
                joinUrl    = $"/campaign/{campaign.JoinCode}",
                endsAt     = campaign.EndsAt,
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Create campaign failed");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    // ── GET /api/campaign/my?brandUserId=  (brand dashboard list) ────────────

    [HttpGet("my")]
    public async Task<IActionResult> GetMyCampaigns([FromQuery] string brandUserId, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(brandUserId))
            return BadRequest(new { error = "brandUserId is required." });

        try
        {
            var list = await _svc.GetByBrandAsync(brandUserId, ct);
            return Ok(list);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "GetMyCampaigns failed");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    // ── GET /api/campaign/{id}  (by campaign ID) ─────────────────────────────

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(string id, CancellationToken ct)
    {
        try
        {
            var detail = await _svc.GetAsync(id, ct);
            return detail is null ? NotFound(new { error = "Campaign not found." }) : Ok(detail);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Get campaign {Id} failed", id);
            return StatusCode(500, new { error = ex.Message });
        }
    }

    // ── GET /api/campaign/join/{joinCode}  (public join page lookup) ──────────

    [HttpGet("join/{joinCode}")]
    public async Task<IActionResult> GetByJoinCode(string joinCode, CancellationToken ct)
    {
        try
        {
            var detail = await _svc.GetByJoinCodeAsync(joinCode, ct);
            return detail is null ? NotFound(new { error = "Campaign not found." }) : Ok(detail);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "GetByJoinCode {JoinCode} failed", joinCode);
            return StatusCode(500, new { error = ex.Message });
        }
    }

    // ── POST /api/campaign/{id}/join  (creator submits entry) ────────────────

    [HttpPost("{id}/join")]
    public async Task<IActionResult> Join(string id, [FromBody] JoinCampaignRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.CreatorHandle) || string.IsNullOrWhiteSpace(req.ReelUrl))
            return BadRequest(new { error = "creatorHandle and reelUrl are required." });

        try
        {
            var entry = await _svc.JoinAsync(id, req, ct);
            if (entry is null)
                return Conflict(new { error = "Campaign is full, ended, or you have already submitted." });

            return Ok(new { entryId = entry.Id, message = "Entry submitted successfully!" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Join campaign {Id} failed", id);
            return StatusCode(500, new { error = ex.Message });
        }
    }

    // ── POST /api/campaign/{id}/vote  (audience votes) ───────────────────────

    [HttpPost("{id}/vote")]
    public async Task<IActionResult> Vote(string id, [FromBody] CampaignVoteRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.VoterToken) || string.IsNullOrWhiteSpace(req.EntryId))
            return BadRequest(new { error = "voterToken and entryId are required." });

        try
        {
            var voted = await _svc.VoteAsync(id, req, ct);
            return voted
                ? Ok(new { voted = true })
                : Conflict(new { voted = false, error = "You have already voted in this campaign." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Vote campaign {Id} failed", id);
            return StatusCode(500, new { error = ex.Message });
        }
    }

    // ── POST /api/campaign/{id}/mark-paid  (brand marks prize paid) ───────────

    [HttpPost("{id}/mark-paid")]
    public async Task<IActionResult> MarkPaid(string id, [FromBody] MarkPaidRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.BrandUserId))
            return BadRequest(new { error = "brandUserId is required." });

        try
        {
            var ok = await _svc.MarkPaidAsync(id, req.BrandUserId, ct);
            return ok ? Ok(new { paid = true }) : Forbid();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "MarkPaid campaign {Id} failed", id);
            return StatusCode(500, new { error = ex.Message });
        }
    }
}

public record MarkPaidRequest(string BrandUserId);
