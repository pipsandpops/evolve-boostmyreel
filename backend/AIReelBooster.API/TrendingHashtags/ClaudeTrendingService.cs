using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using AIReelBooster.API.Configuration;
using Microsoft.Extensions.Options;

namespace AIReelBooster.API.TrendingHashtags;

/// <summary>
/// Calls Claude with a trend-analyst prompt and returns the top 5 trending
/// hashtags for Instagram Reels / YouTube Shorts (Indian creator focus).
///
/// Results are cached in-memory for 6 hours to avoid hammering the Claude API
/// on every page load.
/// </summary>
public class ClaudeTrendingService
{
    private readonly HttpClient     _http;
    private readonly ClaudeSettings _settings;
    private readonly ILogger<ClaudeTrendingService> _logger;

    // ── In-memory 6-hour cache ────────────────────────────────────────────────
    private TrendingHashtagsResponse? _cache;
    private DateTime                  _cacheExpiry = DateTime.MinValue;
    private readonly SemaphoreSlim    _lock = new(1, 1);

    public ClaudeTrendingService(
        HttpClient http,
        IOptions<AppSettings> opts,
        ILogger<ClaudeTrendingService> logger)
    {
        _http     = http;
        _settings = opts.Value.Claude;
        _logger   = logger;

        _http.DefaultRequestHeaders.Add("x-api-key", _settings.ApiKey);
        _http.DefaultRequestHeaders.Add("anthropic-version", "2023-06-01");
    }

    public async Task<TrendingHashtagsResponse> GetTrendingHashtagsAsync(CancellationToken ct)
    {
        await _lock.WaitAsync(ct);
        try
        {
            if (_cache is not null && DateTime.UtcNow < _cacheExpiry)
            {
                _logger.LogDebug("TrendingHashtags: returning cached result (expires {Expiry})", _cacheExpiry);
                return _cache;
            }

            _logger.LogInformation("TrendingHashtags: fetching fresh data from Claude");
            var result = await FetchFromClaudeAsync(ct);
            _cache       = result;
            _cacheExpiry = DateTime.UtcNow.AddHours(6);
            return result;
        }
        finally
        {
            _lock.Release();
        }
    }

    // ── Claude call ───────────────────────────────────────────────────────────

    private async Task<TrendingHashtagsResponse> FetchFromClaudeAsync(CancellationToken ct)
    {
        var today = DateTime.UtcNow.ToString("yyyy-MM-dd");

        var systemPrompt = """
            You are an AI social media trend analyst.

            Your task is to identify the TOP 5 TRENDING HASHTAGS of the day specifically for short-form video platforms like YouTube Shorts and Instagram Reels.

            Context:
            - Target audience: Indian creators (but include global trends if highly relevant)
            - Platform focus: Instagram Reels and YouTube Shorts
            - Category: General trending + viral content opportunities

            Instructions:
            1. Analyze current trends based on:
               - Viral content patterns
               - Recent popular topics
               - Seasonal or event-based trends
               - Creator economy patterns

            2. Return EXACTLY 5 hashtags that:
               - Have high viral potential today
               - Are actionable for content creation
               - Are not generic (avoid #love, #fun, etc.)
               - Are currently trending or emerging

            3. For EACH hashtag, provide:
               - Hashtag name
               - Short description (1 line)
               - Suggested content idea (1-2 lines)
               - Estimated virality score (0-100)
               - Content category (e.g., Motivation, Comedy, Tech, Finance, Lifestyle)

            4. Output ONLY valid JSON (no markdown, no explanation) in this exact format:
            {
              "date": "YYYY-MM-DD",
              "hashtags": [
                {
                  "tag": "#example",
                  "description": "",
                  "idea": "",
                  "virality_score": 0,
                  "category": ""
                }
              ]
            }

            5. Keep the output concise, practical, and creator-focused.

            Important:
            - Prioritize trends that can realistically be created TODAY.
            - Avoid outdated or saturated hashtags.
            - Focus on reels/shorts style content.
            """;

        var requestBody = new
        {
            model      = _settings.Model,
            max_tokens = 1024,
            system     = systemPrompt,
            messages   = new[]
            {
                new { role = "user", content = $"Today is {today}. Give me the top 5 trending hashtags for Indian creators on Instagram Reels and YouTube Shorts." }
            }
        };

        var json    = JsonSerializer.Serialize(requestBody);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        var response = await _http.PostAsync(_settings.Endpoint, content, ct);
        var body     = await response.Content.ReadAsStringAsync(ct);

        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"Claude API error {(int)response.StatusCode}: {body}");

        // ── Parse Claude response ─────────────────────────────────────────────
        using var doc      = JsonDocument.Parse(body);
        var rawText        = doc.RootElement
                               .GetProperty("content")[0]
                               .GetProperty("text")
                               .GetString() ?? string.Empty;

        // Strip any accidental markdown fences
        var cleanJson = rawText.Trim();
        if (cleanJson.StartsWith("```")) cleanJson = cleanJson.Split('\n', 2)[1];
        if (cleanJson.EndsWith("```"))  cleanJson = cleanJson[..cleanJson.LastIndexOf("```")];

        using var resultDoc = JsonDocument.Parse(cleanJson.Trim());
        var root            = resultDoc.RootElement;

        var date     = root.GetProperty("date").GetString() ?? today;
        var tags     = root.GetProperty("hashtags");

        var hashtags = new List<TrendingHashtag>();
        foreach (var t in tags.EnumerateArray())
        {
            hashtags.Add(new TrendingHashtag(
                Tag:           t.GetProperty("tag").GetString() ?? "",
                Description:   t.GetProperty("description").GetString() ?? "",
                Idea:          t.GetProperty("idea").GetString() ?? "",
                ViralityScore: t.GetProperty("virality_score").GetInt32(),
                Category:      t.GetProperty("category").GetString() ?? ""
            ));
        }

        _logger.LogInformation("TrendingHashtags: received {Count} tags for {Date}", hashtags.Count, date);
        return new TrendingHashtagsResponse(date, hashtags.ToArray());
    }
}
