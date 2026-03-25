using AIReelBooster.API.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AIReelBooster.API.Controllers;

[ApiController]
[Route("api/stats")]
public class StatsController : ControllerBase
{
    private readonly AppDbContext _db;

    public StatsController(AppDbContext db) => _db = db;

    // GET /api/stats — returns current visitor count (no increment)
    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var row = await _db.Database
            .SqlQueryRaw<long>("SELECT Value FROM SiteStats WHERE Key = 'visitor_count'")
            .FirstOrDefaultAsync();
        return Ok(new { visitorCount = row });
    }

    // POST /api/stats/visit — atomically increments and returns new count
    [HttpPost("visit")]
    public async Task<IActionResult> Visit()
    {
        await _db.Database.ExecuteSqlRawAsync(
            "UPDATE SiteStats SET Value = Value + 1 WHERE Key = 'visitor_count'");

        var row = await _db.Database
            .SqlQueryRaw<long>("SELECT Value FROM SiteStats WHERE Key = 'visitor_count'")
            .FirstOrDefaultAsync();
        return Ok(new { visitorCount = row });
    }
}
