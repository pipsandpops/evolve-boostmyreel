using System.Text;
using System.Text.Json;
using AIReelBooster.API.Configuration;
using AIReelBooster.API.Infrastructure;
using AIReelBooster.API.Models.Requests;
using AIReelBooster.API.Models.Responses;
using AIReelBooster.API.Services.Interfaces;
using Microsoft.Extensions.Options;

namespace AIReelBooster.API.Services;

public class ClaudeAgentService : IAgentService
{
    private readonly HttpClient _http;
    private readonly ClaudeSettings _settings;
    private readonly JobStore _jobStore;
    private readonly IAIGenerationService _aiGeneration;
    private readonly ILogger<ClaudeAgentService> _logger;

    private const int MaxLoopIterations = 3;

    private const string SystemPrompt = """
        You are the BoostMyReel AI assistant — a friendly, expert social media growth coach
        embedded in the BoostMyReel app. You help creators optimize their Instagram Reels and
        short-form videos for maximum reach and engagement.

        You have access to tools that let you check job status, retrieve analysis results,
        generate captions, and calculate viral scores. Use them whenever a user references
        a specific video job or asks for content generation.

        Keep responses concise (2–4 sentences unless more detail is needed). Be actionable
        and encouraging. When you use a tool, summarise the result clearly for the user.
        """;

    // Tool definitions sent to Claude on every request
    private static readonly object[] ToolDefinitions =
    [
        new
        {
            name = "get_job_status",
            description = "Check the current status and progress of a video processing job.",
            input_schema = new
            {
                type = "object",
                properties = new
                {
                    jobId = new { type = "string", description = "The video job ID to look up." }
                },
                required = new[] { "jobId" }
            }
        },
        new
        {
            name = "get_analysis_result",
            description = "Retrieve the full AI analysis result for a completed video job: hook, caption, hashtags, viral score.",
            input_schema = new
            {
                type = "object",
                properties = new
                {
                    jobId = new { type = "string", description = "The completed video job ID." }
                },
                required = new[] { "jobId" }
            }
        },
        new
        {
            name = "generate_captions",
            description = "Generate a viral hook, Instagram caption, and hashtags from a video transcript.",
            input_schema = new
            {
                type = "object",
                properties = new
                {
                    transcript = new { type = "string", description = "The video transcript text." }
                },
                required = new[] { "transcript" }
            }
        },
        new
        {
            name = "analyze_viral_score",
            description = "Calculate a viral score (0–100) and get improvement suggestions for given content.",
            input_schema = new
            {
                type = "object",
                properties = new
                {
                    hook       = new { type = "string", description = "The hook text." },
                    caption    = new { type = "string", description = "The caption text." },
                    transcript = new { type = "string", description = "The video transcript." }
                },
                required = new[] { "hook", "caption", "transcript" }
            }
        },
        new
        {
            name = "suggest_content_strategy",
            description = "Provide tailored content strategy advice for a creator's niche and goals. No tool execution needed — Claude answers in its reply.",
            input_schema = new
            {
                type = "object",
                properties = new
                {
                    niche = new { type = "string", description = "The creator's content niche (e.g. fitness, cooking, finance)." },
                    goals = new { type = "string", description = "What the creator wants to achieve (e.g. grow followers, increase saves)." }
                },
                required = new[] { "niche", "goals" }
            }
        }
    ];

    public ClaudeAgentService(
        HttpClient http,
        IOptions<AppSettings> options,
        JobStore jobStore,
        IAIGenerationService aiGeneration,
        ILogger<ClaudeAgentService> logger)
    {
        _http         = http;
        _settings     = options.Value.Claude;
        _jobStore     = jobStore;
        _aiGeneration = aiGeneration;
        _logger       = logger;

        _http.DefaultRequestHeaders.Add("x-api-key", _settings.ApiKey);
        _http.DefaultRequestHeaders.Add("anthropic-version", "2023-06-01");
    }

    public async Task<AgentChatResponse> ChatAsync(List<AgentMessage> messages, CancellationToken ct = default)
    {
        _logger.LogInformation("Agent chat started with {Count} message(s)", messages.Count);

        // Build the mutable message list Claude will see (role/content pairs)
        var claudeMessages = messages
            .Select(m => (object)new { role = m.Role, content = m.Content })
            .ToList();

        var toolCallsLog = new List<AgentToolCall>();
        string finalReply = "Sorry, I couldn't generate a response. Please try again.";

        for (int i = 0; i < MaxLoopIterations; i++)
        {
            var requestBody = new
            {
                model      = _settings.Model,
                max_tokens = 1024,
                system     = SystemPrompt,
                tools      = ToolDefinitions,
                messages   = claudeMessages
            };

            var json     = JsonSerializer.Serialize(requestBody);
            var content  = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await _http.PostAsync(_settings.Endpoint, content, ct);
            response.EnsureSuccessStatusCode();

            var responseJson = await response.Content.ReadAsStringAsync(ct);
            var doc          = JsonDocument.Parse(responseJson);
            var root         = doc.RootElement;

            var stopReason   = root.GetProperty("stop_reason").GetString();
            var contentArray = root.GetProperty("content");

            if (stopReason == "end_turn")
            {
                // Extract text reply
                foreach (var block in contentArray.EnumerateArray())
                {
                    if (block.GetProperty("type").GetString() == "text")
                    {
                        finalReply = block.GetProperty("text").GetString() ?? finalReply;
                        break;
                    }
                }
                break;
            }

            if (stopReason == "tool_use")
            {
                // Add the assistant's response to message history
                claudeMessages.Add(new { role = "assistant", content = contentArray });

                // Execute each tool call and collect results
                var toolResults = new List<object>();
                foreach (var block in contentArray.EnumerateArray())
                {
                    if (block.GetProperty("type").GetString() != "tool_use") continue;

                    var toolUseId = block.GetProperty("id").GetString()!;
                    var toolName  = block.GetProperty("name").GetString()!;
                    var input     = block.GetProperty("input");

                    _logger.LogInformation("Executing agent tool: {Tool}", toolName);

                    var (toolOutput, outputObj) = await ExecuteToolAsync(toolName, input, ct);
                    toolCallsLog.Add(new AgentToolCall(toolName, null, outputObj));

                    toolResults.Add(new
                    {
                        type        = "tool_result",
                        tool_use_id = toolUseId,
                        content     = toolOutput
                    });
                }

                // Add tool results message to history
                claudeMessages.Add(new { role = "user", content = toolResults });
                continue;
            }

            // Unknown stop reason — break and return what we have
            _logger.LogWarning("Unexpected stop_reason: {Reason}", stopReason);
            break;
        }

        return new AgentChatResponse(finalReply, toolCallsLog.Count > 0 ? toolCallsLog : null);
    }

    private async Task<(string JsonOutput, object? ObjectOutput)> ExecuteToolAsync(
        string toolName, JsonElement input, CancellationToken ct)
    {
        try
        {
            switch (toolName)
            {
                case "get_job_status":
                {
                    var jobId = input.GetProperty("jobId").GetString()!;
                    var job   = _jobStore.Get(jobId);
                    if (job is null)
                        return ("""{"found":false,"reason":"Job not found or expired."}""", null);

                    var result = new
                    {
                        found           = true,
                        jobId           = job.JobId,
                        status          = job.Status.ToString(),
                        progressPercent = job.ProgressPercent,
                        errorMessage    = job.ErrorMessage
                    };
                    return (JsonSerializer.Serialize(result), result);
                }

                case "get_analysis_result":
                {
                    var jobId = input.GetProperty("jobId").GetString()!;
                    var job   = _jobStore.Get(jobId);
                    if (job?.AnalysisResult is null)
                        return ("""{"found":false,"reason":"Job not found, still processing, or expired."}""", null);

                    var r = job.AnalysisResult;
                    var result = new
                    {
                        found      = true,
                        hook       = r.Hook,
                        caption    = r.Caption,
                        hashtags   = r.Hashtags,
                        viralScore = r.ViralScore?.ViralScore
                    };
                    return (JsonSerializer.Serialize(result), result);
                }

                case "generate_captions":
                {
                    var transcript = input.GetProperty("transcript").GetString()!;
                    var (hook, caption, hashtags) = await _aiGeneration.GenerateAsync(transcript, ct);
                    var result = new { hook, caption, hashtags };
                    return (JsonSerializer.Serialize(result), result);
                }

                case "analyze_viral_score":
                {
                    var hook       = input.GetProperty("hook").GetString()!;
                    var caption    = input.GetProperty("caption").GetString()!;
                    var transcript = input.GetProperty("transcript").GetString()!;
                    var score      = await _aiGeneration.AnalyzeViralScoreAsync(hook, caption, transcript, ct);
                    var result     = new
                    {
                        viralScore   = score.ViralScore,
                        hookScore    = score.HookScore,
                        problem      = score.Problem,
                        improvedHook = score.ImprovedHook
                    };
                    return (JsonSerializer.Serialize(result), result);
                }

                case "suggest_content_strategy":
                    // Claude answers this in its text reply — return empty context
                    return ("""{"acknowledged":true}""", null);

                default:
                    return (JsonSerializer.Serialize(new { error = $"Unknown tool: {toolName}" }), null);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Tool execution failed for {Tool}", toolName);
            return (JsonSerializer.Serialize(new { error = ex.Message }), null);
        }
    }
}
