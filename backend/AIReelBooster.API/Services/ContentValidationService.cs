using System.Text;
using System.Text.Json;
using AIReelBooster.API.Configuration;
using AIReelBooster.API.Infrastructure;
using AIReelBooster.API.Models.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace AIReelBooster.API.Services;

/// <summary>
/// Validates submitted content URLs against battle guidelines using rule-based
/// checks + Claude AI for guideline analysis.
/// Called fire-and-forget from BattleService after entry is saved.
/// </summary>
public class ContentValidationService
{
    private readonly AppDbContext _db;
    private readonly ClaudeSettings _claude;
    private readonly HttpClient _http;
    private readonly ILogger<ContentValidationService> _logger;

    public ContentValidationService(
        AppDbContext db,
        IOptions<AppSettings> opts,
        HttpClient http,
        ILogger<ContentValidationService> logger)
    {
        _db     = db;
        _claude = opts.Value.Claude;
        _http   = http;
        _logger = logger;
    }

    /// <summary>
    /// Validates an entry against the battle's content requirements.
    /// Updates BattleEntry.ValidationStatus + ValidationNotes in DB.
    /// </summary>
    public async Task ValidateAsync(string entryId, CancellationToken ct = default)
    {
        var entry = await _db.BattleEntries.FindAsync([entryId], ct);
        if (entry is null) return;

        var battle = await _db.Battles.FindAsync([entry.BattleId], ct);
        if (battle is null) return;

        // No guidelines and no hashtag → auto-approve
        if (string.IsNullOrWhiteSpace(battle.ContentGuidelines) && string.IsNullOrWhiteSpace(battle.ThemeHashtag))
        {
            entry.ValidationStatus = ContentValidationStatus.Approved;
            entry.ValidationNotes  = "No content requirements specified — auto-approved.";
            await _db.SaveChangesAsync(ct);
            return;
        }

        try
        {
            var (status, notes) = await RunValidationAsync(entry, battle, ct);
            entry.ValidationStatus = status;
            entry.ValidationNotes  = notes;
            await _db.SaveChangesAsync(ct);

            _logger.LogInformation("Entry {EntryId} validation: {Status} — {Notes}", entryId, status, notes);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Content validation failed for entry {EntryId}", entryId);
            entry.ValidationStatus = ContentValidationStatus.Pending;
            entry.ValidationNotes  = "Auto-validation encountered an error — awaiting manual review.";
            await _db.SaveChangesAsync(ct);
        }
    }

    private async Task<(ContentValidationStatus, string)> RunValidationAsync(
        BattleEntry entry, Battle battle, CancellationToken ct)
    {
        var issues = new List<string>();

        // ── 1. Platform URL check ─────────────────────────────────────────────
        if (!string.IsNullOrEmpty(entry.ReelUrl))
        {
            var igOk = entry.ReelUrl.Contains("instagram.com") || entry.ReelUrl.Contains("instagr.am");
            if (!igOk && (battle.Platform == BattlePlatform.Instagram || battle.Platform == BattlePlatform.Both))
                issues.Add("Instagram URL does not appear to link to instagram.com.");
        }

        if (!string.IsNullOrEmpty(entry.YouTubeUrl))
        {
            var ytOk = entry.YouTubeUrl.Contains("youtube.com") || entry.YouTubeUrl.Contains("youtu.be");
            if (!ytOk && (battle.Platform == BattlePlatform.YouTube || battle.Platform == BattlePlatform.Both))
                issues.Add("YouTube URL does not appear to link to youtube.com.");
        }

        // ── 2. Required platform URL presence check ───────────────────────────
        if (battle.Platform == BattlePlatform.Instagram && string.IsNullOrEmpty(entry.ReelUrl))
            issues.Add("Instagram URL is required for this battle.");
        if (battle.Platform == BattlePlatform.YouTube && string.IsNullOrEmpty(entry.YouTubeUrl))
            issues.Add("YouTube URL is required for this battle.");
        if (battle.Platform == BattlePlatform.Both)
        {
            if (string.IsNullOrEmpty(entry.ReelUrl))    issues.Add("Instagram URL is required (Both platforms battle).");
            if (string.IsNullOrEmpty(entry.YouTubeUrl)) issues.Add("YouTube URL is required (Both platforms battle).");
        }

        if (issues.Count > 0)
            return (ContentValidationStatus.Rejected, string.Join(" ", issues));

        // ── 3. Claude-based guideline check (if guidelines are set) ──────────
        if (!string.IsNullOrWhiteSpace(battle.ContentGuidelines) || !string.IsNullOrWhiteSpace(battle.ThemeHashtag))
        {
            var prompt = BuildValidationPrompt(entry, battle);
            var claudeNotes = await CallClaudeAsync(prompt, ct);
            return (ContentValidationStatus.Pending, claudeNotes);
        }

        return (ContentValidationStatus.Approved, "URL validation passed.");
    }

    private static string BuildValidationPrompt(BattleEntry entry, Battle battle)
    {
        var sb = new StringBuilder();
        sb.AppendLine("You are reviewing a ContentClash battle entry. Analyze the submission against the requirements and give a short, actionable review note (max 100 words).");
        sb.AppendLine();
        sb.AppendLine($"Battle theme hashtag: {(string.IsNullOrWhiteSpace(battle.ThemeHashtag) ? "None" : "#" + battle.ThemeHashtag)}");
        sb.AppendLine($"Content guidelines: {(string.IsNullOrWhiteSpace(battle.ContentGuidelines) ? "None" : battle.ContentGuidelines)}");
        sb.AppendLine();
        sb.AppendLine("Submitted content:");
        if (!string.IsNullOrEmpty(entry.ReelUrl))
            sb.AppendLine($"- Instagram: {entry.ReelUrl}");
        if (!string.IsNullOrEmpty(entry.YouTubeUrl))
            sb.AppendLine($"- YouTube: {entry.YouTubeUrl}");
        sb.AppendLine();
        sb.AppendLine("Note: You cannot access the video directly. Based on the URL and guidelines provided, tell the reviewer what to specifically check for when they manually review this content. Mark it as 'Pending manual review' and list the key checklist items.");
        return sb.ToString();
    }

    private async Task<string> CallClaudeAsync(string prompt, CancellationToken ct)
    {
        var payload = new
        {
            model      = _claude.Model,
            max_tokens = 200,
            messages   = new[] { new { role = "user", content = prompt } },
        };

        var req = new HttpRequestMessage(HttpMethod.Post, _claude.Endpoint)
        {
            Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json"),
        };
        req.Headers.Add("x-api-key", _claude.ApiKey);
        req.Headers.Add("anthropic-version", "2023-06-01");

        var res  = await _http.SendAsync(req, ct);
        var body = await res.Content.ReadAsStringAsync(ct);

        if (!res.IsSuccessStatusCode) return "Pending manual review — AI check unavailable.";

        using var doc  = JsonDocument.Parse(body);
        var content    = doc.RootElement.GetProperty("content")[0].GetProperty("text").GetString() ?? "";
        return $"Pending manual review — {content.Trim()}";
    }
}
