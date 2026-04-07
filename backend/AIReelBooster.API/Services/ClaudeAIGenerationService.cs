using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using AIReelBooster.API.Configuration;
using AIReelBooster.API.Models.Domain;
using AIReelBooster.API.Services.Interfaces;
using Microsoft.Extensions.Options;

namespace AIReelBooster.API.Services;

public class ClaudeAIGenerationService : IAIGenerationService
{
    private readonly HttpClient _http;
    private readonly ClaudeSettings _settings;
    private readonly ILogger<ClaudeAIGenerationService> _logger;

    public ClaudeAIGenerationService(
        HttpClient http,
        IOptions<AppSettings> options,
        ILogger<ClaudeAIGenerationService> logger)
    {
        _http = http;
        _settings = options.Value.Claude;
        _logger = logger;

        _http.DefaultRequestHeaders.Add("x-api-key", _settings.ApiKey);
        _http.DefaultRequestHeaders.Add("anthropic-version", "2023-06-01");
    }

    public async Task<(string Hook, string Caption, List<string> Hashtags)> GenerateAsync(
        string transcript, CancellationToken ct = default)
    {
        _logger.LogInformation("Generating AI content with Claude");

        var prompt = $$"""
            You are a viral social media content expert specializing in short-form video.

            Given the following video transcript, generate content to maximize engagement.

            TRANSCRIPT:
            {{transcript}}

            Return ONLY valid JSON (no markdown, no explanation) in this exact format:
            {
              "hook": "A punchy, curiosity-driven first-3-seconds text overlay (max 12 words)",
              "caption": "An engaging Instagram/Reels caption (max 150 characters, no hashtags here)",
              "hashtags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8", "tag9", "tag10"]
            }

            Rules:
            - Hook must be scroll-stopping and create FOMO or curiosity
            - Caption should have a call-to-action
            - Include 10-12 highly relevant hashtags without the # symbol
            """;

        var requestBody = new
        {
            model = _settings.Model,
            max_tokens = 512,
            messages = new[]
            {
                new { role = "user", content = prompt }
            }
        };

        var json = JsonSerializer.Serialize(requestBody);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        var response = await _http.PostAsync(_settings.Endpoint, content, ct);
        if (!response.IsSuccessStatusCode)
        {
            var errBody = await response.Content.ReadAsStringAsync(ct);
            _logger.LogError("Claude API error {Status}: {Body}", (int)response.StatusCode, errBody);
            throw new HttpRequestException(
                $"Claude returned {(int)response.StatusCode}: {errBody}", null, response.StatusCode);
        }

        var responseJson = await response.Content.ReadAsStringAsync(ct);
        return ParseClaudeResponse(responseJson);
    }

    // Evergreen high-volume hashtags that consistently trend on Reels/TikTok.
    // Appended after Claude's niche tags to add a reach-boosting layer.
    // Deduplicated so Claude can't accidentally double-add them.
    private static readonly string[] EvergreenHashtags =
    [
        "reels", "viral", "explore", "trending", "fyp",
    ];

    private static (string Hook, string Caption, List<string> Hashtags) ParseClaudeResponse(string responseJson)
    {
        var doc = JsonDocument.Parse(responseJson);
        var text = doc.RootElement
            .GetProperty("content")[0]
            .GetProperty("text")
            .GetString() ?? "{}";

        text = text.Trim();
        if (text.StartsWith("```")) text = text.Split('\n', 2)[1];
        if (text.EndsWith("```")) text = text[..text.LastIndexOf("```")];
        text = text.Trim();

        var result = JsonDocument.Parse(text).RootElement;

        var hook    = result.GetProperty("hook").GetString()    ?? "Watch this now!";
        var caption = result.GetProperty("caption").GetString() ?? "Check this out!";

        var hashtags = result.GetProperty("hashtags")
            .EnumerateArray()
            .Select(h => h.GetString() ?? "")
            .Where(h => !string.IsNullOrWhiteSpace(h))
            .ToList();

        // Append evergreen boosters that aren't already in Claude's list
        var existing = hashtags.ToHashSet(StringComparer.OrdinalIgnoreCase);
        foreach (var tag in EvergreenHashtags)
            if (!existing.Contains(tag))
                hashtags.Add(tag);

        return (hook, caption, hashtags);
    }

    public async Task<ViralScoreResult> AnalyzeViralScoreAsync(
        string hook, string caption, string transcript, CancellationToken ct = default)
    {
        _logger.LogInformation("Analyzing viral score with Claude");

        var prompt = $$"""
            You are an expert in viral Instagram reels and short-form content growth.

            Your job is to analyze the following reel content and calculate a "Viral Score" from 0 to 100.

            Scoring is based on these weighted factors:
            1. Hook Strength (30%) - grabs attention in first 3 seconds, creates curiosity
            2. Emotional Trigger (20%) - triggers curiosity, shock, excitement, or fear
            3. Clarity & Simplicity (15%) - easy to understand quickly, concise
            4. Trend Alignment (15%) - aligns with current social media trends
            5. Engagement Potential (20%) - will users like, comment, share, or watch till end

            INPUT:
            Hook: {{hook}}
            Caption: {{caption}}
            Transcript: {{transcript}}

            Return ONLY valid JSON (no markdown, no explanation):
            {
              "hook_score": number,
              "emotion_score": number,
              "clarity_score": number,
              "trend_score": number,
              "engagement_score": number,
              "viral_score": number,
              "problem": "short explanation under 1 sentence",
              "improved_hook": "short viral hook max 10 words"
            }

            RULES:
            - viral_score = (hook_score*0.30) + (emotion_score*0.20) + (clarity_score*0.15) + (trend_score*0.15) + (engagement_score*0.20)
            - Round viral_score to nearest integer
            - Be realistic, not overly optimistic
            """;

        var requestBody = new
        {
            model = _settings.Model,
            max_tokens = 512,
            messages = new[] { new { role = "user", content = prompt } }
        };

        var json = JsonSerializer.Serialize(requestBody);
        var content = new StringContent(json, Encoding.UTF8, "application/json");
        var response = await _http.PostAsync(_settings.Endpoint, content, ct);
        if (!response.IsSuccessStatusCode)
        {
            var errBody = await response.Content.ReadAsStringAsync(ct);
            _logger.LogError("Claude API error {Status}: {Body}", (int)response.StatusCode, errBody);
            throw new HttpRequestException(
                $"Claude returned {(int)response.StatusCode}: {errBody}", null, response.StatusCode);
        }

        var responseJson = await response.Content.ReadAsStringAsync(ct);
        return ParseViralScoreResponse(responseJson);
    }

    public async Task<HashSet<string>> ExtractViralKeywordsAsync(string fullTranscript, CancellationToken ct = default)
    {
        _logger.LogInformation("Extracting viral keywords from transcript via Claude");

        // Truncate to avoid token waste — first 3000 chars is enough to understand the niche
        var excerpt = fullTranscript.Length > 3000 ? fullTranscript[..3000] : fullTranscript;

        var prompt = $"""
            You are a viral short-form content expert.

            Analyse this video transcript and return the 25 most engagement-triggering words or
            short phrases that are SPECIFIC to this video's topic and audience niche.
            These should be words that, when spoken in a segment, signal a high-value or
            emotionally compelling moment (hooks, reveals, warnings, surprises, tips, mistakes).

            Transcript excerpt:
            {excerpt}

            Return ONLY a comma-separated list of lowercase words/phrases. No explanation, no numbering.
            Example format: secret,never do this,shocking,biggest mistake,wait for it
            """;

        var requestBody = new
        {
            model = _settings.Model,
            max_tokens = 256,
            messages = new[] { new { role = "user", content = prompt } }
        };

        var json     = JsonSerializer.Serialize(requestBody);
        var content  = new StringContent(json, Encoding.UTF8, "application/json");
        var response = await _http.PostAsync(_settings.Endpoint, content, ct);
        if (!response.IsSuccessStatusCode)
        {
            var errBody = await response.Content.ReadAsStringAsync(ct);
            _logger.LogError("Claude API error {Status}: {Body}", (int)response.StatusCode, errBody);
            throw new HttpRequestException(
                $"Claude returned {(int)response.StatusCode}: {errBody}", null, response.StatusCode);
        }

        var responseJson = await response.Content.ReadAsStringAsync(ct);

        var doc  = JsonDocument.Parse(responseJson);
        var text = doc.RootElement
            .GetProperty("content")[0]
            .GetProperty("text")
            .GetString() ?? string.Empty;

        return text
            .Split(',', StringSplitOptions.RemoveEmptyEntries)
            .Select(w => w.Trim().ToLowerInvariant())
            .Where(w => !string.IsNullOrWhiteSpace(w))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
    }

    private static ViralScoreResult ParseViralScoreResponse(string responseJson)
    {
        var doc = JsonDocument.Parse(responseJson);
        var text = doc.RootElement.GetProperty("content")[0].GetProperty("text").GetString() ?? "{}";

        text = text.Trim();
        if (text.StartsWith("```")) text = text.Split('\n', 2)[1];
        if (text.EndsWith("```")) text = text[..text.LastIndexOf("```")];
        text = text.Trim();

        var r = JsonDocument.Parse(text).RootElement;
        return new ViralScoreResult
        {
            HookScore       = r.GetProperty("hook_score").GetInt32(),
            EmotionScore    = r.GetProperty("emotion_score").GetInt32(),
            ClarityScore    = r.GetProperty("clarity_score").GetInt32(),
            TrendScore      = r.GetProperty("trend_score").GetInt32(),
            EngagementScore = r.GetProperty("engagement_score").GetInt32(),
            ViralScore      = r.GetProperty("viral_score").GetInt32(),
            Problem         = r.GetProperty("problem").GetString() ?? "",
            ImprovedHook    = r.GetProperty("improved_hook").GetString() ?? "",
        };
    }
}
