using AIReelBooster.API.Models.Domain;

namespace AIReelBooster.API.Services.Interfaces;

public interface IAIGenerationService
{
    Task<(string Hook, string Caption, List<string> Hashtags)> GenerateAsync(string transcript, CancellationToken ct = default);
    Task<ViralScoreResult> AnalyzeViralScoreAsync(string hook, string caption, string transcript, CancellationToken ct = default);

    /// <summary>
    /// Asks Claude to extract the top viral/engagement keywords specific to the
    /// video's niche. Falls back to an empty set on failure (caller uses the
    /// hardcoded fallback list in that case).
    /// </summary>
    Task<HashSet<string>> ExtractViralKeywordsAsync(string fullTranscript, CancellationToken ct = default);
}
