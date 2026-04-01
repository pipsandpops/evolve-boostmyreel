using AIReelBooster.API.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace AIReelBooster.API.Controllers;

[ApiController]
[Route("api/battle")]
public class BattleController : ControllerBase
{
    private readonly IBattleService _battles;
    private readonly ILogger<BattleController> _logger;

    public BattleController(IBattleService battles, ILogger<BattleController> logger)
    {
        _battles = battles;
        _logger  = logger;
    }

    // ── POST /api/battle/challenge ────────────────────────────────────────────

    [HttpPost("challenge")]
    public async Task<IActionResult> CreateChallenge([FromBody] CreateChallengeRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.ChallengerId))
            return BadRequest(new { error = "challengerId is required." });
        if (string.IsNullOrWhiteSpace(req.OpponentHandle))
            return BadRequest(new { error = "opponentHandle is required." });

        try
        {
            var challenge = await _battles.CreateChallengeAsync(
                req.ChallengerId, req.OpponentHandle, req.TrashTalkMsg, req.OpponentEmail, ct);

            var baseUrl    = $"{Request.Scheme}://{Request.Host}";
            var battleLink = $"{baseUrl}/battle/{challenge.Id}";
            var waText     = Uri.EscapeDataString(
                $"⚔️ You've been challenged to a 24hr Reel Battle! Accept or forfeit 😏\n{battleLink}");

            return Ok(new
            {
                challengeId   = challenge.Id,
                battleLink,
                whatsappLink  = $"https://wa.me/?text={waText}",
                instagramDmLink = $"https://ig.me/m/{req.OpponentHandle.TrimStart('@')}",
                expiresAt     = challenge.ExpiresAt,
                trashTalkMsg  = challenge.TrashTalkMsg,
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
                type          = "challenge",
                challengeId   = challenge.Id,
                battleId      = challenge.BattleId,
                opponentHandle = challenge.OpponentHandle,
                trashTalkMsg  = challenge.TrashTalkMsg,
                status        = challenge.Status.ToString(),
                expiresAt     = challenge.ExpiresAt,
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
            return StatusCode(500, new { error = ex.Message });
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
        if (string.IsNullOrWhiteSpace(req.UserId) || string.IsNullOrWhiteSpace(req.ReelUrl))
            return BadRequest(new { error = "userId and reelUrl are required." });

        try
        {
            var entry = await _battles.SubmitEntryAsync(battleId, req.UserId, req.InstagramHandle ?? "", req.ReelUrl, ct);
            return Ok(new { entryId = entry.Id, message = "Reel submitted! Enter your baseline metrics." });
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

        try
        {
            await _battles.RecordManualMetricsAsync(req.EntryId, req.UserId,
                new MetricInput(req.Views, req.Likes, req.Comments, req.Saves, req.Shares, req.Followers), ct);
            return Ok(new { message = "Metrics recorded." });
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

public record CreateChallengeRequest(string ChallengerId, string OpponentHandle, string? TrashTalkMsg, string? OpponentEmail);
public record AcceptChallengeRequest(string OpponentUserId);
public record SubmitEntryRequest(string UserId, string ReelUrl, string? InstagramHandle);
public record ManualMetricRequest(string UserId, string EntryId, long Views, long Likes, long Comments, long Saves, long Shares, long Followers);
public record VoteRequest(string EntryId, string VoterToken);
