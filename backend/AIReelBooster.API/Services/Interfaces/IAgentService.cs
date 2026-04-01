using AIReelBooster.API.Models.Requests;
using AIReelBooster.API.Models.Responses;

namespace AIReelBooster.API.Services.Interfaces;

public interface IAgentService
{
    Task<AgentChatResponse> ChatAsync(List<AgentMessage> messages, CancellationToken ct = default);
}
