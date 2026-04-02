using AIReelBooster.API.Configuration;
using AIReelBooster.API.Models.Domain;
using AIReelBooster.API.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace AIReelBooster.API.Controllers;

[ApiController]
[Route("api/battle")]
public class BattleController : ControllerBase
{
    private readonly IBattleService _battles;
    private readonly ILogger<BattleController> _logger;
    private readonly string _frontendBase;

    public BattleController(IBattleService battles, ILogger<BattleController> logger, IOptions<AppSettings> settings)
    {
        _battles      = battles;
        _logger       = logger;
        _frontendBase = settings.Value.Instagram.FrontendBaseUrl.TrimEnd('/');
    }

    // ── POST /api/battle/challenge ────────────────────────────────────────────

    [HttpPost("challenge")]
    public async Task<IActionResult> CreateChallenge([FromBody] CreateChallengeRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.ChallengerId))
            return BadRequest(new { error = "challengerId is required." });
        if (string.IsNullOrWhiteSpace(req.OpponentHandle))
            return BadRequest(new { error = "opponentHandle is required." });
        if (req.DurationHours is not (24 or 48 or 168))
            return BadRequest(new { error = "durationHours must be 24, 48, or 168." });

        try
        {
            var challenge = await _battles.CreateChallengeAsync(new CreateChallengeInput(
                req.ChallengerId, req.OpponentHandle, req.BattleTitle,
                req.DurationHours, req.Platform ?? "Instagram",
                req.ThemeHashtag, req.PrizePoolAmount, req.PrizeCurrency,
                req.ContentGuidelines, req.TrashTalkMsg, req.PrizeDescription,
                req.OpponentEmail), ct);

            var battleLink = $"{_frontendBase}/battle/{challenge.Id}";
            var waText     = Uri.EscapeDataString(
                $"⚔️ You've been challenged to a 24hr Reel Battle! Accept or forfeit 😏\n{battleLink}");

            var handle = req.OpponentHandle.TrimStart('@');
            return Ok(new
            {
                challengeId       = challenge.Id,
                battleLink,
                whatsappLink      = $"https://wa.me/?text={waText}",
                instagramDmLink   = $"https://ig.me/m/{handle}",
                youtubeDmLink     = challenge.Platform != BattlePlatform.Instagram
                                    ? $"https://youtube.com/@{handle}" : null,
                expiresAt         = challenge.ExpiresAt,
                battleTitle       = challenge.BattleTitle,
                durationHours     = challenge.DurationHours,
                platform          = challenge.Platform.ToString(),
                themeHashtag      = challenge.ThemeHashtag,
                prizePoolAmount   = challenge.PrizePoolAmount,
                prizeCurrency     = challenge.PrizeCurrency,
                contentGuidelines = challenge.ContentGuidelines,
                trashTalkMsg      = challenge.TrashTalkMsg,
                prizeDescription  = challenge.PrizeDescription,
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "CreateChallenge failed");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    // ── GET /api/battle/{id} ──────────────────────────────────────────────────

    [HttpGet("{id}")]
    public async Task<IActionResult> GetBattle(string id, CancellationToken ct)
    {
        // Try as challenge first, then as battle
        var challenge = await _battles.GetChallengeAsync(id, ct);
        if (challenge is not null)
        {
            return Ok(new
            {
                type           = "challenge",
                challengeId    = challenge.Id,
                battleId       = challenge.BattleId,
                opponentHandle = challenge.OpponentHandle,
                status         = challenge.Status.ToString(),
                expiresAt         = challenge.ExpiresAt,
                battleTitle       = challenge.BattleTitle,
                durationHours     = challenge.DurationHours,
                platform          = challenge.Platform.ToString(),
                themeHashtag      = challenge.ThemeHashtag,
                prizePoolAmount   = challenge.PrizePoolAmount,
                prizeCurrency     = challenge.PrizeCurrency,
                contentGuidelines = challenge.ContentGuidelines,
                trashTalkMsg      = challenge.TrashTalkMsg,
                prizeDescription  = challenge.PrizeDescription,
            });
        }

        var battle = await _battles.GetBattleAsync(id, ct);
        if (battle is not null)
        {
            var scores = await _battles.GetScoresAsync(id, ct);
            return Ok(new { type = "battle", battle = scores });
        }

        return NotFound(new { error = "Battle or challenge not found." });
    }

    // ── POST /api/battle/{id}/accept ──────────────────────────────────────────

    [HttpPost("{id}/accept")]
    public async Task<IActionResult> AcceptChallenge(string id, [FromBody] AcceptChallengeRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.OpponentUserId))
            return BadRequest(new { error = "opponentUserId is required." });

        try
        {
            var battle = await _battles.AcceptChallengeAsync(id, req.OpponentUserId, ct);
            return Ok(new { battleId = battle.Id, endsAt = battle.EndsAt, message = "Challenge accepted! Submit your Reel." });
        }
        catch (InvalidOperationException ex) { return Conflict(new { error = ex.Message }); }
        catch (Exception ex)
        {
            _logger.LogError(ex, "AcceptChallenge failed");
            return StatusCode(500, new { error = ex.Message, detail = ex.InnerException?.Message });
        }
    }

    // ── POST /api/battle/{id}/decline ─────────────────────────────────────────

    [HttpPost("{id}/decline")]
    public async Task<IActionResult> DeclineChallenge(string id, CancellationToken ct)
    {
        try
        {
            await _battles.DeclineChallengeAsync(id, ct);
            return Ok(new { message = "Challenge declined." });
        }
        catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
    }

    // ── POST /api/battle/{battleId}/entry ────────────────────────────────────

    [HttpPost("{battleId}/entry")]
    public async Task<IActionResult> SubmitEntry(string battleId, [FromBody] SubmitEntryRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.UserId))
            return BadRequest(new { error = "userId is required." });

        var platform = Enum.TryParse<BattlePlatform>(req.Platform ?? "Instagram", ignoreCase: true, out var pl)
            ? pl : BattlePlatform.Instagram;

        var input = new SubmitEntryInput(
            InstagramUrl:    req.InstagramUrl ?? req.ReelUrl ?? "",   // backward compat
            YouTubeUrl:      req.YouTubeUrl,
            InstagramHandle: req.InstagramHandle ?? "",
            YouTubeHandle:   req.YouTubeHandle,
            Platform:        platform
        );

        try
        {
            var entry = await _battles.SubmitEntryAsync(battleId, req.UserId, input, ct);
            return Ok(new
            {
                entryId          = entry.Id,
                submittedPlatform = entry.SubmittedPlatform.ToString(),
                validationStatus = entry.ValidationStatus.ToString(),
                message          = platform == BattlePlatform.Both
                    ? "Content submitted on both platforms! Enter your baseline metrics for each."
                    : $"Reel submitted on {platform}! Enter your baseline metrics.",
            });
        }
        catch (InvalidOperationException ex) { return Conflict(new { error = ex.Message }); }
        catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
    }

    // ── GET /api/battle/{battleId}/scores ────────────────────────────────────

    [HttpGet("{battleId}/scores")]
    public async Task<IActionResult> GetScores(string battleId, CancellationToken ct)
    {
        try
        {
            var scores = await _battles.GetScoresAsync(battleId, ct);
            return Ok(scores);
        }
        catch (InvalidOperationException ex) { return NotFound(new { error = ex.Message }); }
        catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
    }

    // ── POST /api/battle/{battleId}/metrics/manual ───────────────────────────

    [HttpPost("{battleId}/metrics/manual")]
    public async Task<IActionResult> RecordManualMetrics(
        string battleId, [FromBody] ManualMetricRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.UserId) || string.IsNullOrWhiteSpace(req.EntryId))
            return BadRequest(new { error = "userId and entryId are required." });

        var platform = Enum.TryParse<BattlePlatform>(req.Platform ?? "Instagram", ignoreCase: true, out var pl)
            ? pl : BattlePlatform.Instagram;

        try
        {
            await _battles.RecordManualMetricsAsync(req.EntryId, req.UserId,
                new MetricInput(req.Views, req.Likes, req.Comments, req.Saves, req.Shares, req.Followers),
                platform, ct);
            return Ok(new { message = $"{platform} metrics recorded." });
        }
        catch (InvalidOperationException ex) { return Conflict(new { error = ex.Message }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
    }

    // ── POST /api/battle/{battleId}/vote ─────────────────────────────────────

    [HttpPost("{battleId}/vote")]
    public async Task<IActionResult> Vote(string battleId, [FromBody] VoteRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.EntryId) || string.IsNullOrWhiteSpace(req.VoterToken))
            return BadRequest(new { error = "entryId and voterToken are required." });

        var voterIp = HttpContext.Connection.RemoteIpAddress?.ToString();

        try
        {
            var result = await _battles.VoteAsync(battleId, req.EntryId, req.VoterToken, voterIp, ct);
            return Ok(result);
        }
        catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
    }

    // ── GET /api/battle/leaderboard ───────────────────────────────────────────

    [HttpGet("leaderboard")]
    public async Task<IActionResult> Leaderboard([FromQuery] int limit = 10, CancellationToken ct = default)
    {
        var boards = await _battles.GetLeaderboardAsync(Math.Min(limit, 50), ct);
        return Ok(boards);
    }
}

// ── Request models ────────────────────────────────────────────────────────────

public record CreateChallengeRequest(
    string ChallengerId,
    string OpponentHandle,
    string? BattleTitle,
    int DurationHours,
    string Platform,
    string? ThemeHashtag,
    decimal? PrizePoolAmount,
    string? PrizeCurrency,
    string? ContentGuidelines,
    string? TrashTalkMsg,
    string? PrizeDescription,
    string? OpponentEmail
);
public record AcceptChallengeRequest(string OpponentUserId);

public record SubmitEntryRequest(
    string UserId,
    string? Platform,        // "Instagram" | "YouTube" | "Both"
    string? InstagramUrl,    // Instagram Reel URL
    string? YouTubeUrl,      // YouTube Shorts URL
    string? InstagramHandle,
    string? YouTubeHandle,
    string? ReelUrl          // backward-compat alias for InstagramUrl
);

public record ManualMetricRequest(
    string UserId,
    string EntryId,
    long Views, long Likes, long Comments, long Saves, long Shares, long Followers,
    string? Platform         // "Instagram" | "YouTube" — default Instagram
);

public record VoteRequest(string EntryId, string VoterToken);
