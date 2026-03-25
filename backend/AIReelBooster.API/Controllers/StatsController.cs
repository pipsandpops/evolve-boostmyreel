using AIReelBooster.API.Infrastructure;
using Microsoft.AspNetCore.Mvc;

namespace AIReelBooster.API.Controllers;

[ApiController]
[Route("api/stats")]
public class StatsController : ControllerBase
{
    private readonly AppDbContext _db;

    public StatsController(AppDbContext db) => _db = db;

    // GET /api/stats
    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var stat = await _db.SiteStats.FindAsync("visitor_count");
        return Ok(new { visitorCount = stat?.Value ?? 10000 });
    }

    // POST /api/stats/visit
    [HttpPost("visit")]
    public async Task<IActionResult> Visit()
    {
        var stat = await _db.SiteStats.FindAsync("visitor_count");
        if (stat == null)
        {
            stat = new Models.Domain.SiteStat { Key = "visitor_count", Value = 10001 };
            _db.SiteStats.Add(stat);
        }
        else
        {
            stat.Value += 1;
        }
        await _db.SaveChangesAsync();
        return Ok(new { visitorCount = stat.Value });
    }
}
