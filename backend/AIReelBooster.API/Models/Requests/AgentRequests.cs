namespace AIReelBooster.API.Models.Requests;

public record AgentMessage(string Role, string Content);

public record AgentChatRequest(
    List<AgentMessage> Messages,
    string? UserId);
