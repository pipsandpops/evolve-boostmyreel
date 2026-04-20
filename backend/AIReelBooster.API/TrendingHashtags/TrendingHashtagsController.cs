using Microsoft.AspNetCore.Mvc;
using AIReelBooster.API.TrendingHashtags;

namespace AIReelBooster.API.TrendingHashtags;

public record TrendingHashtag(
    string Tag,
    string Description,
    string Idea,
    int    ViralityScore,
    string Category);

public record TrendingHashtagsResponse(
    string               Date,
    TrendingHashtag[]    Hashtags);

[ApiController]
[Route("api/trending")]
public class TrendingHashtagsController : ControllerBase
{
    private readonly ClaudeTrendingService _service;
    private readonly ILogger<TrendingHashtagsController> _logger;

    public TrendingHashtagsController(
        ClaudeTrendingService service,
        ILogger<TrendingHashtagsController> logger)
    {
        _service = service;
        _logger  = logger;
    }

    /// <summary>
    /// GET /api/trending/hashtags
    /// Returns top 5 trending hashtags for Instagram Reels / YouTube Shorts
    /// (Indian creator focus). Results are cached in-memory for 6 hours.
    /// </summary>
    [HttpGet("hashtags")]
    public async Task<IActionResult> GetTrending(CancellationToken ct)
    {
        try
        {
            var result = await _service.GetTrendingHashtagsAsync(ct);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch trending hashtags");
            return StatusCode(500, new { error = $"Failed to fetch trending hashtags: {ex.Message}" });
        }
    }
}
