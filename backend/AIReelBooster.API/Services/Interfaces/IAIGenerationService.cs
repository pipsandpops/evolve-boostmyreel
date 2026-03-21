using AIReelBooster.API.Models.Domain;

namespace AIReelBooster.API.Services.Interfaces;

public interface IAIGenerationService
{
    Task<(string Hook, string Caption, List<string> Hashtags)> GenerateAsync(string transcript, CancellationToken ct = default);
    Task<ViralScoreResult> AnalyzeViralScoreAsync(string hook, string caption, string transcript, CancellationToken ct = default);
}
