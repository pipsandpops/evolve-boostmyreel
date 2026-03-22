using System.Text;
using System.Text.Json;
using AIReelBooster.API.Configuration;
using AIReelBooster.API.ImageGrowthEngine.Interfaces;
using AIReelBooster.API.ImageGrowthEngine.Models;
using Microsoft.Extensions.Options;

namespace AIReelBooster.API.ImageGrowthEngine.Services;

/// <summary>
/// Generates hook, full caption, CTA, and hashtags via Claude.
/// Tone-aware: Viral / Educational / Storytelling / Sales.
/// </summary>
public class ClaudeCaptionGeneratorService : ICaptionGeneratorService
{
    private readonly HttpClient _http;
    private readonly ClaudeSettings _settings;
    private readonly ILogger<ClaudeCaptionGeneratorService> _logger;

    public ClaudeCaptionGeneratorService(
        HttpClient http,
        IOptions<AppSettings> options,
        ILogger<ClaudeCaptionGeneratorService> logger)
    {
        _http     = http;
        _settings = options.Value.Claude;
        _logger   = logger;

        _http.DefaultRequestHeaders.TryAddWithoutValidation("x-api-key", _settings.ApiKey);
        _http.DefaultRequestHeaders.TryAddWithoutValidation("anthropic-version", "2023-06-01");
    }

    public async Task<CaptionSuggestion> GenerateAsync(
        SemanticAnalysis semantic,
        VisualFeatures visual,
        string? userCaption,
        CaptionTone tone,
        CancellationToken ct = default)
    {
        _logger.LogInformation("Generating caption (tone={Tone})", tone);

        var prompt = BuildPrompt(semantic, visual, userCaption, tone);

        var requestBody = new
        {
            model      = _settings.Model,
            max_tokens = 768,
            messages   = new[] { new { role = "user", content = prompt } }
        };

        var json     = JsonSerializer.Serialize(requestBody);
        var content  = new StringContent(json, Encoding.UTF8, "application/json");
        var resp     = await _http.PostAsync(_settings.Endpoint, content, ct);
        resp.EnsureSuccessStatusCode();

        var responseJson = await resp.Content.ReadAsStringAsync(ct);
        return ParseResponse(responseJson, tone);
    }

    // ── Prompt builder ────────────────────────────────────────────────────────

    private static string BuildPrompt(
        SemanticAnalysis sem, VisualFeatures vis, string? userCaption, CaptionTone tone)
    {
        var toneDesc = tone switch
        {
            CaptionTone.Viral        => "VIRAL: pattern-interrupt, shocking or surprising angle, max curiosity",
            CaptionTone.Educational  => "EDUCATIONAL: clear takeaway, teach one thing, position as expert",
            CaptionTone.Storytelling => "STORYTELLING: narrative arc, relatable emotion, personal or brand story",
            CaptionTone.Sales        => "SALES: benefit-first, urgency, clear value proposition and CTA",
            _                        => "VIRAL",
        };

        var contextLines = new List<string>
        {
            $"Scene type: {sem.SceneType}",
            $"Mood: {sem.Mood}",
            $"Has face/person: {sem.HasFace}",
            $"Has text overlay: {sem.HasTextOverlay}",
        };

        if (sem.DominantObjects.Count > 0)
            contextLines.Add($"Key elements: {string.Join(", ", sem.DominantObjects.Take(3))}");
        if (!string.IsNullOrWhiteSpace(sem.TextContent))
            contextLines.Add($"Visible text: \"{sem.TextContent}\"");
        if (!string.IsNullOrWhiteSpace(userCaption))
            contextLines.Add($"User's draft caption: \"{userCaption}\"");

        contextLines.Add($"Aspect ratio: {vis.AspectRatio}, Colour temperature: {vis.ColorTemperature}");

        var context = string.Join("\n            ", contextLines);
        return $$"""
            You are an expert social media copywriter for Instagram, TikTok, and LinkedIn.
            Tone style: {{toneDesc}}

            IMAGE CONTEXT:
            {{context}}

            Generate a caption package. Return ONLY valid JSON (no markdown, no explanation):
            {
              "hook": "Scroll-stopping first sentence, max 12 words",
              "full_caption": "Engaging caption max 150 chars, no hashtags here",
              "cta": "Single clear call-to-action sentence",
              "hashtags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8", "tag9", "tag10"]
            }

            Rules:
            - Hook must create FOMO or intense curiosity given the image content
            - Full caption should feel natural, not salesy (unless Sales tone)
            - CTA should match the tone (e.g. "Save this for later" for Educational)
            - Hashtags: 10-12, highly relevant, mix of niche + broad, no # symbol
            """;
    }

    // ── Parsing ───────────────────────────────────────────────────────────────

    private static CaptionSuggestion ParseResponse(string responseJson, CaptionTone tone)
    {
        var doc  = JsonDocument.Parse(responseJson);
        var text = doc.RootElement
            .GetProperty("content")[0]
            .GetProperty("text")
            .GetString() ?? "{}";

        text = StripMarkdownFence(text);
        var r = JsonDocument.Parse(text).RootElement;

        return new CaptionSuggestion
        {
            Hook        = r.TryGetProperty("hook",         out var h) ? h.GetString() ?? "" : "",
            FullCaption = r.TryGetProperty("full_caption", out var fc) ? fc.GetString() ?? "" : "",
            Cta         = r.TryGetProperty("cta",          out var c) ? c.GetString() ?? "" : "",
            Hashtags    = r.TryGetProperty("hashtags",     out var ht) && ht.ValueKind == JsonValueKind.Array
                            ? ht.EnumerateArray()
                                .Where(x => x.ValueKind == JsonValueKind.String)
                                .Select(x => x.GetString()!)
                                .Where(s => !string.IsNullOrWhiteSpace(s))
                                .ToList()
                            : [],
            Tone        = tone.ToString(),
        };
    }

    private static string StripMarkdownFence(string text)
    {
        text = text.Trim();
        if (text.StartsWith("```"))
            text = string.Join('\n', text.Split('\n').Skip(1));
        if (text.EndsWith("```"))
            text = text[..text.LastIndexOf("```")];
        return text.Trim();
    }
}
