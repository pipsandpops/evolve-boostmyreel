using System.Net.Http.Json;
using System.Text.Json;
using AIReelBooster.API.Services.Interfaces;

namespace AIReelBooster.API.Services;

/// <summary>
/// Fetches Instagram profile metrics and recent reel performance from the Graph API.
///
/// Media types fetched: VIDEO (Reels) and IMAGE/CAROUSEL_ALBUM (Posts).
/// Insights (plays/reach) require instagram_manage_insights permission and a Business/Creator account.
/// If insights are unavailable, AvgReelViews is reported as –1 and we fall back to likes-based scoring.
/// </summary>
public class InstagramAnalyticsService : IInstagramAnalyticsService
{
    private const string GraphBase = "https://graph.facebook.com/v19.0";
    private const int    MediaLimit = 20;

    private readonly IHttpClientFactory _http;
    private readonly ILogger<InstagramAnalyticsService> _logger;

    public InstagramAnalyticsService(
        IHttpClientFactory                        http,
        ILogger<InstagramAnalyticsService> logger)
    {
        _http   = http;
        _logger = logger;
    }

    public async Task<InstagramAnalytics> GetAnalyticsAsync(
        string accessToken, string igUserId, CancellationToken ct = default)
    {
        var client  = _http.CreateClient();
        var result  = new InstagramAnalytics();

        // ── 1. Profile ────────────────────────────────────────────────────────
        var profileUrl  = $"{GraphBase}/{igUserId}?fields=followers_count,media_count&access_token={accessToken}";
        var profileResp = await client.GetAsync(profileUrl, ct);
        var profileJson = await profileResp.Content.ReadFromJsonAsync<JsonElement>(cancellationToken: ct);

        if (!profileResp.IsSuccessStatusCode)
        {
            _logger.LogWarning("Instagram profile fetch failed for {IgUserId}", igUserId);
            return result;
        }

        result.FollowerCount = profileJson.TryGetProperty("followers_count", out var fc) ? fc.GetInt64() : 0;
        result.MediaCount    = profileJson.TryGetProperty("media_count",     out var mc) ? mc.GetInt32() : 0;

        // ── 2. Recent media list ──────────────────────────────────────────────
        var mediaUrl  = $"{GraphBase}/{igUserId}/media"
                      + $"?fields=id,media_type,timestamp,like_count,comments_count"
                      + $"&limit={MediaLimit}&access_token={accessToken}";
        var mediaResp = await client.GetAsync(mediaUrl, ct);
        var mediaJson = await mediaResp.Content.ReadFromJsonAsync<JsonElement>(cancellationToken: ct);

        if (!mediaResp.IsSuccessStatusCode || !mediaJson.TryGetProperty("data", out var mediaData))
        {
            _logger.LogWarning("Instagram media list fetch failed for {IgUserId}", igUserId);
            return result;
        }

        var reels = new List<ReelMetric>();

        foreach (var item in mediaData.EnumerateArray())
        {
            var mediaId   = item.TryGetProperty("id",             out var idEl)   ? idEl.GetString() ?? "" : "";
            var timestamp = item.TryGetProperty("timestamp",      out var tsEl)
                            && DateTime.TryParse(tsEl.GetString(), out var dt)    ? dt : DateTime.UtcNow;
            var likes     = item.TryGetProperty("like_count",     out var lkEl)   ? lkEl.GetInt64() : 0;
            var comments  = item.TryGetProperty("comments_count", out var cmEl)   ? cmEl.GetInt64() : 0;

            reels.Add(new ReelMetric
            {
                MediaId   = mediaId,
                Timestamp = timestamp,
                Likes     = likes,
                Comments  = comments,
                Views     = 0,   // Filled in by insights call below
            });
        }

        // ── 3. Insights (plays/reach) — requires Business/Creator account ─────
        var insightsEnabled = false;
        var totalViews      = 0L;
        var viewedCount     = 0;

        foreach (var reel in reels)
        {
            if (string.IsNullOrEmpty(reel.MediaId)) continue;

            try
            {
                var insightUrl  = $"{GraphBase}/{reel.MediaId}/insights"
                                + $"?metric=plays,reach&access_token={accessToken}";
                var insightResp = await client.GetAsync(insightUrl, ct);
                var insightJson = await insightResp.Content.ReadFromJsonAsync<JsonElement>(cancellationToken: ct);

                if (!insightResp.IsSuccessStatusCode) continue;
                if (!insightJson.TryGetProperty("data", out var insightData)) continue;

                foreach (var metric in insightData.EnumerateArray())
                {
                    var name  = metric.TryGetProperty("name",  out var nEl) ? nEl.GetString() : null;
                    var value = metric.TryGetProperty("values", out var vEl) ? ReadFirstValue(vEl) : 0L;

                    if (name == "plays" && value > 0)
                    {
                        reel.Views      = value;
                        totalViews     += value;
                        viewedCount++;
                        insightsEnabled = true;
                    }
                    else if (name == "reach" && reel.Views == 0 && value > 0)
                    {
                        // Use reach as views proxy if plays is unavailable
                        reel.Views      = value;
                        totalViews     += value;
                        viewedCount++;
                        insightsEnabled = true;
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "Insights unavailable for media {MediaId}", reel.MediaId);
            }
        }

        result.InsightsEnabled = insightsEnabled;
        result.RecentReels     = reels;
        result.ReelsSampled    = reels.Count;

        if (insightsEnabled && viewedCount > 0)
        {
            result.AvgReelViews = totalViews / viewedCount;
            result.MaxReelViews = reels.Max(r => r.Views);
        }
        else
        {
            result.AvgReelViews = -1;   // Insights unavailable
        }

        // ── 4. Engagement rate ────────────────────────────────────────────────
        if (result.FollowerCount > 0 && reels.Count > 0)
        {
            var avgLikes    = reels.Average(r => (double)r.Likes);
            var avgComments = reels.Average(r => (double)r.Comments);
            result.EngagementRate = (avgLikes + avgComments) / result.FollowerCount * 100.0;
        }

        return result;
    }

    private static long ReadFirstValue(JsonElement valuesEl)
    {
        foreach (var v in valuesEl.EnumerateArray())
        {
            if (v.TryGetProperty("value", out var val))
                return val.ValueKind == JsonValueKind.Number ? val.GetInt64() : 0L;
        }
        return 0L;
    }
}
