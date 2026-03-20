using AIReelBooster.API.Models.Domain;

namespace AIReelBooster.API.Services.Interfaces;

public interface ITranscriptionService
{
    Task<List<SubtitleEntry>> TranscribeAsync(string audioFilePath, CancellationToken ct = default);
}
