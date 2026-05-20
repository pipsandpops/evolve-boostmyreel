namespace AIReelBooster.API.Services.Interfaces;

public interface IUrlDownloadService
{
    /// <summary>Returns true if this URL is from a supported platform (YouTube, Instagram, Facebook).</summary>
    bool IsSupported(string url);

    /// <summary>Detects the platform name from a URL ("YouTube", "Instagram", "Facebook").</summary>
    string DetectPlatform(string url);

    /// <summary>Downloads audio-only from the URL into outputDir, returns the local file path.</summary>
    Task<string> DownloadAudioAsync(string url, string outputDir, CancellationToken ct = default);
}
