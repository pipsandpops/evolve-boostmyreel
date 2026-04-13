using AIReelBooster.API.AutoReelGenerator.Interfaces;
using AIReelBooster.API.AutoReelGenerator.Models;
using AIReelBooster.API.Configuration;
using AIReelBooster.API.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace AIReelBooster.API.AutoReelGenerator.Controllers;

[ApiController]
[Route("api/auto-reel")]
public class AutoReelController : ControllerBase
{
    private readonly IAutoReelService  _autoReelService;
    private readonly AppDbContext      _db;
    private readonly ReelPlanLimits    _planLimits;
    private readonly ILogger<AutoReelController> _logger;

    public AutoReelController(
        IAutoReelService             autoReelService,
        AppDbContext                 db,
        IOptions<AppSettings>        opts,
        ILogger<AutoReelController>  logger)
    {
        _autoReelService = autoReelService;
        _db              = db;
        _planLimits      = opts.Value.ReelPlanLimits;
        _logger          = logger;
    }

    // ── POST /api/auto-reel/generate ──────────────────────────────────────────

    [HttpPost("generate")]
    public async Task<IActionResult> Generate(
        [FromBody] GenerateReelRequest request,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.SourceJobId))
            return BadRequest(new { error = "sourceJobId is required." });

        try
        {
            var reelJobId = await _autoReelService.StartGenerationAsync(
                request.SourceJobId,
                request.UserId,
                request.EnableSmartReframe,
                ct);

            _logger.LogInformation("ReelJob {Id} created for source {Src} (user {User})",
                reelJobId, request.SourceJobId, request.UserId ?? "anonymous");

            return Ok(new { reelJobId });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    // ── GET /api/auto-reel/{id}/status ────────────────────────────────────────

    [HttpGet("{reelJobId}/status")]
    public IActionResult GetStatus(string reelJobId)
    {
        var job = _autoReelService.GetJob(reelJobId);
        if (job == null) return NotFound(new { error = "Reel job not found." });

        return Ok(new
        {
            reelJobId       = job.ReelJobId,
            status          = job.Status.ToString(),
            progressPercent = job.ProgressPercent,
            currentStep     = job.CurrentStep,
            errorMessage    = job.ErrorMessage,
            reelCount       = job.GeneratedReels.Count,
            createdAt       = job.CreatedAt,
            completedAt     = job.CompletedAt,
        });
    }

    // ── GET /api/auto-reel/{id}/result ────────────────────────────────────────
    //
    // Returns the full result with per-reel `locked` and `watermarked` flags.
    //
    // Response shape:
    //   {
    //     "isPremium": false,
    //     "unlockedCount": 1,
    //     "reels": [
    //       { "locked": false, "watermarked": true, ... },
    //       { "locked": true,  "watermarked": false, ... }
    //     ]
    //   }

    [HttpGet("{reelJobId}/result")]
    public async Task<IActionResult> GetResult(string reelJobId, CancellationToken ct)
    {
        var job = _autoReelService.GetJob(reelJobId);
        if (job == null) return NotFound(new { error = "Reel job not found." });

        if (job.Status == ReelJobStatus.Failed)
            return UnprocessableEntity(new { error = job.ErrorMessage ?? "Reel generation failed." });

        if (job.Status != ReelJobStatus.Complete)
            return Accepted(new
            {
                message         = "Reel generation is still in progress.",
                status          = job.Status.ToString(),
                progressPercent = job.ProgressPercent,
            });

        // ── Resolve plan entitlements ─────────────────────────────────────────
        var unlockedCount = await GetUnlockedCountAsync(job.UserId, ct);
        var isPremium     = unlockedCount > _planLimits.Free;

        var reels = job.GeneratedReels.Select((r, i) => new
        {
            index             = r.Index,
            title             = r.Title,
            startFormatted    = r.StartFormatted,
            endFormatted      = r.EndFormatted,
            downloadUrl       = r.RelativeUrl,
            motionScore       = Math.Round(r.MotionScore, 1),
            engagementScore   = Math.Round(r.EngagementScore, 1),
            transcriptSnippet = r.TranscriptSnippet,
            fileSizeBytes     = r.FileSizeBytes,
            // ── Monetisation fields ──────────────────────────────────────────
            locked      = i >= unlockedCount,
            watermarked = !isPremium && i < unlockedCount,  // free reel gets watermark badge
        });

        return Ok(new
        {
            reelJobId     = job.ReelJobId,
            sourceJobId   = job.SourceJobId,
            reelCount     = job.GeneratedReels.Count,
            completedAt   = job.CompletedAt,
            isPremium,
            unlockedCount,
            reels,
        });
    }

    // ── GET /api/auto-reel/{id}/download/{index} ──────────────────────────────
    //
    // Returns 403 if the requesting user's plan does not cover this reel index.

    [HttpGet("{reelJobId}/download/{index:int}")]
    public async Task<IActionResult> Download(
        string reelJobId, int index, CancellationToken ct)
    {
        var job = _autoReelService.GetJob(reelJobId);
        if (job == null) return NotFound(new { error = "Reel job not found." });

        if (job.Status != ReelJobStatus.Complete)
            return BadRequest(new { error = "Reels are not ready yet." });

        if (index < 0 || index >= job.GeneratedReels.Count)
            return NotFound(new { error = $"Reel index {index} is out of range." });

        // ── Enforce plan access ───────────────────────────────────────────────
        var unlockedCount = await GetUnlockedCountAsync(job.UserId, ct);
        if (index >= unlockedCount)
        {
            _logger.LogInformation(
                "Download blocked: ReelJob {Id} index {Index} requires premium (user {User}, unlocked {N})",
                reelJobId, index, job.UserId ?? "anonymous", unlockedCount);

            return StatusCode(403, new
            {
                error         = "This reel is locked. Upgrade to Pro to unlock all reels.",
                upgradeRequired = true,
                unlockedCount,
            });
        }

        var reel = job.GeneratedReels[index];

        if (!System.IO.File.Exists(reel.FilePath))
            return NotFound(new { error = "Reel file no longer exists on disk." });

        var fileName = $"reel_{index + 1}_{job.ReelJobId}.mp4";
        return PhysicalFile(reel.FilePath, "video/mp4", fileName);
    }

    // ── Plan helpers ──────────────────────────────────────────────────────────

    /// <summary>
    /// Looks up the user's active plan in the database and returns the number
    /// of reels they are allowed to access.  Anonymous/expired users get the
    /// free tier.
    /// </summary>
    private async Task<int> GetUnlockedCountAsync(string? userId, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(userId))
            return _planLimits.Free;

        var user = await _db.UserPlans.FindAsync([userId], ct);

        if (user is null || !user.IsPaid)
            return _planLimits.Free;

        // Treat expired subscriptions as free
        if (user.ExpiryDate.HasValue && user.ExpiryDate < DateTime.UtcNow)
            return _planLimits.Free;

        return user.Plan switch
        {
            "starter" => _planLimits.Starter,
            "creator" => _planLimits.Creator,
            "pro"     => _planLimits.Pro,
            _         => _planLimits.Free,
        };
    }
}

// ── Request models ────────────────────────────────────────────────────────────

public record GenerateReelRequest(
    string SourceJobId,
    string? UserId,
    bool EnableSmartReframe = false);
