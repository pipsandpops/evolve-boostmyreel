namespace AIReelBooster.API.Models.Responses;

public record AgentChatResponse(
    string Reply,
    List<AgentToolCall>? ToolCalls);

public record AgentToolCall(string ToolName, object? Input, object? Output);
