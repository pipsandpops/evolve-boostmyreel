using AIReelBooster.API.Models.Domain;

namespace AIReelBooster.API.Services.Interfaces;

public interface IVideoProcessingService
{
    Task<(double DurationSeconds, int Width, int Height, double FrameRate)> ProbeVideoAsync(string filePath, CancellationToken ct = default);
    Task<string> ExtractAudioAsync(string videoPath, string outputDir, CancellationToken ct = default);
    Task<string> ExtractThumbnailAsync(string videoPath, string outputDir, CancellationToken ct = default);
    Task<string> BurnSubtitlesAsync(string videoPath, string srtPath, string outputDir, CancellationToken ct = default);
}
