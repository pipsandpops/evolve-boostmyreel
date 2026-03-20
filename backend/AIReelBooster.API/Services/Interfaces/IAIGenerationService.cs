namespace AIReelBooster.API.Services.Interfaces;

public interface IAIGenerationService
{
    Task<(string Hook, string Caption, List<string> Hashtags)> GenerateAsync(string transcript, CancellationToken ct = default);
}
