using System.Text;
using System.Text.Json;
using AIReelBooster.API.Configuration;
using AIReelBooster.API.ImageGrowthEngine.Interfaces;
using AIReelBooster.API.ImageGrowthEngine.Models;
using Microsoft.Extensions.Options;

namespace AIReelBooster.API.ImageGrowthEngine.Services;

/// <summary>
/// Sends images to Claude Vision (claude-sonnet-4-6) for semantic understanding.
/// Returns structured JSON parsed into <see cref="SemanticAnalysis"/>.
/// </summary>
public class ClaudeImageAnalyzerService : IImageAnalyzerService
{
    private static readonly string[] SupportedExtensions = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

    private readonly HttpClient _http;
    private readonly ClaudeSettings _settings;
    private readonly ILogger<ClaudeImageAnalyzerService> _logger;

    public ClaudeImageAnalyzerService(
        HttpClient http,
        IOptions<AppSettings> options,
        ILogger<ClaudeImageAnalyzerService> logger)
    {
        _http     = http;
        _settings = options.Value.Claude;
        _logger   = logger;

        _http.DefaultRequestHeaders.TryAddWithoutValidation("x-api-key", _settings.ApiKey);
        _http.DefaultRequestHeaders.TryAddWithoutValidation("anthropic-version", "2023-06-01");
    }

    public async Task<SemanticAnalysis> AnalyzeAsync(string imagePath, CancellationToken ct = default)
    {
        _logger.LogInformation("Sending image to Claude Vision: {Path}", Path.GetFileName(imagePath));

        var (base64, mediaType) = await ReadImageAsync(imagePath, ct);

        var requestBody = new
        {
            model      = _settings.Model,
            max_tokens = 1024,
            messages   = new[]
            {
                new
                {
                    role    = "user",
                    content = new object[]
                    {
                        new
                        {
                            type   = "image",
                            source = new
                            {
                                type       = "base64",
                                media_type = mediaType,
                                data       = base64,
                            }
                        },
                        new
                        {
                            type = "text",
                            text = AnalysisPrompt,
                        }
                    }
                }
            }
        };

        var json    = JsonSerializer.Serialize(requestBody);
        var content = new StringContent(json, Encoding.UTF8, "application/json");
        var resp    = await _http.PostAsync(_settings.Endpoint, content, ct);
        resp.EnsureSuccessStatusCode();

        var responseJson = await resp.Content.ReadAsStringAsync(ct);
        return ParseResponse(responseJson);
    }

    // ── Prompt ────────────────────────────────────────────────────────────────

    private const string AnalysisPrompt = """
        You are an expert social media growth analyst with deep knowledge of Instagram, TikTok, and LinkedIn content performance.

        Analyze this image for social media optimization. Return ONLY valid JSON (no markdown, no explanation):
        {
          "has_face": bool,
          "face_count": int,
          "has_text_overlay": bool,
          "text_content": "extracted text or null",
          "dominant_objects": ["object1", "object2"],
          "scene_type": "indoor|outdoor|product|person|food|nature|technology|abstract",
          "mood": "energetic|calm|professional|playful|inspiring|dramatic",
          "quality_issues": ["blurry"|"overexposed"|"underexposed"|"noisy"|"cluttered"|"poor_composition"],
          "engagement_boosters": ["what helps engagement in this image"],
          "engagement_killers": ["what hurts engagement in this image"],
          "estimated_post_score": int
        }

        Rules:
        - estimated_post_score: 0-100, be realistic not optimistic
        - quality_issues: only include genuinely present issues
        - engagement_boosters/killers: max 4 each, concrete and specific
        - dominant_objects: top 3-5 objects/elements visible
        """;

    // ── Parsing ───────────────────────────────────────────────────────────────

    private static SemanticAnalysis ParseResponse(string responseJson)
    {
        var doc  = JsonDocument.Parse(responseJson);
        var text = doc.RootElement
            .GetProperty("content")[0]
            .GetProperty("text")
            .GetString() ?? "{}";

        text = StripMarkdownFence(text);
        var r = JsonDocument.Parse(text).RootElement;

        return new SemanticAnalysis
        {
            HasFace            = r.TryGet("has_face",         false),
            FaceCount          = r.TryGet("face_count",       0),
            HasTextOverlay     = r.TryGet("has_text_overlay", false),
            TextContent        = r.TryGetString("text_content"),
            DominantObjects    = r.TryGetStringList("dominant_objects"),
            SceneType          = r.TryGetString("scene_type") ?? "unknown",
            Mood               = r.TryGetString("mood")       ?? "neutral",
            QualityIssues      = r.TryGetStringList("quality_issues"),
            EngagementBoosters = r.TryGetStringList("engagement_boosters"),
            EngagementKillers  = r.TryGetStringList("engagement_killers"),
            ClaudePostScore    = r.TryGet("estimated_post_score", 50),
        };
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static async Task<(string Base64, string MediaType)> ReadImageAsync(
        string path, CancellationToken ct)
    {
        var ext       = Path.GetExtension(path).ToLowerInvariant();
        var mediaType = ext switch
        {
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png"            => "image/png",
            ".webp"           => "image/webp",
            ".gif"            => "image/gif",
            _                 => "image/jpeg",
        };

        var bytes  = await File.ReadAllBytesAsync(path, ct);
        var base64 = Convert.ToBase64String(bytes);
        return (base64, mediaType);
    }

    private static string StripMarkdownFence(string text)
    {
        text = text.Trim();
        if (text.StartsWith("```"))
        {
            var lines = text.Split('\n');
            text = string.Join('\n', lines.Skip(1));
        }
        if (text.EndsWith("```"))
            text = text[..text.LastIndexOf("```")];
        return text.Trim();
    }
}

// ── Extension helpers for safe JSON reading ───────────────────────────────────

file static class JsonElementExtensions
{
    public static bool TryGet(this JsonElement el, string name, bool fallback)
        => el.TryGetProperty(name, out var p) && p.ValueKind == JsonValueKind.True || fallback;

    public static int TryGet(this JsonElement el, string name, int fallback)
        => el.TryGetProperty(name, out var p) && p.TryGetInt32(out var v) ? v : fallback;

    public static string? TryGetString(this JsonElement el, string name)
        => el.TryGetProperty(name, out var p) && p.ValueKind == JsonValueKind.String
            ? p.GetString()
            : null;

    public static List<string> TryGetStringList(this JsonElement el, string name)
    {
        if (!el.TryGetProperty(name, out var arr) || arr.ValueKind != JsonValueKind.Array)
            return [];
        return arr.EnumerateArray()
            .Where(x => x.ValueKind == JsonValueKind.String)
            .Select(x => x.GetString()!)
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .ToList();
    }
}
