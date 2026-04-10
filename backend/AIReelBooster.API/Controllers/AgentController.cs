using AIReelBooster.API.Models.Requests;
using AIReelBooster.API.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace AIReelBooster.API.Controllers;

[ApiController]
[Route("api/agent")]
public class AgentController : ControllerBase
{
    private readonly IAgentService _agent;
    private readonly ILogger<AgentController> _logger;

    public AgentController(IAgentService agent, ILogger<AgentController> logger)
    {
        _agent  = agent;
        _logger = logger;
    }

    [HttpPost("chat")]
    public async Task<IActionResult> Chat([FromBody] AgentChatRequest request, CancellationToken ct)
    {
        if (request.Messages is not { Count: > 0 })
            return BadRequest(new { error = "messages are required." });

        try
        {
            var response = await _agent.ChatAsync(request.Messages, ct);
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Agent chat failed");
            return StatusCode(500, new { error = "Agent request failed. Please try again." });
        }
    }
}
