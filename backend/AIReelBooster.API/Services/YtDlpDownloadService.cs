using System.Diagnostics;
using AIReelBooster.API.Configuration;
using AIReelBooster.API.Services.Interfaces;
using Microsoft.Extensions.Options;

namespace AIReelBooster.API.Services;

public class YtDlpDownloadService : IUrlDownloadService
{
    private readonly string _binary;
    private readonly ILogger<YtDlpDownloadService> _logger;

    public YtDlpDownloadService(IOptions<AppSettings> options, ILogger<YtDlpDownloadService> logger)
    {
        _binary = options.Value.YtDlp.BinaryPath;
        _logger = logger;
    }

    public bool IsSupported(string url) =>
        url.Contains("youtube.com",   StringComparison.OrdinalIgnoreCase) ||
        url.Contains("youtu.be",      StringComparison.OrdinalIgnoreCase) ||
        url.Contains("instagram.com", StringComparison.OrdinalIgnoreCase) ||
        url.Contains("facebook.com",  StringComparison.OrdinalIgnoreCase) ||
        url.Contains("fb.watch",      StringComparison.OrdinalIgnoreCase);

    public string DetectPlatform(string url)
    {
        if (url.Contains("youtube.com",   StringComparison.OrdinalIgnoreCase) ||
            url.Contains("youtu.be",      StringComparison.OrdinalIgnoreCase)) return "YouTube";
        if (url.Contains("instagram.com", StringComparison.OrdinalIgnoreCase)) return "Instagram";
        if (url.Contains("facebook.com",  StringComparison.OrdinalIgnoreCase) ||
            url.Contains("fb.watch",      StringComparison.OrdinalIgnoreCase)) return "Facebook";
        return "Unknown";
    }

    public async Task<string> DownloadAudioAsync(string url, string outputDir, CancellationToken ct = default)
    {
        Directory.CreateDirectory(outputDir);

        var platform = DetectPlatform(url);

        // Download the best audio-only stream in its native format (webm/m4a).
        // We intentionally skip yt-dlp's ffmpeg post-processing step (-x / --audio-format)
        // to avoid needing a separate ffmpeg installation inside yt-dlp.
        // OpenAI Whisper accepts webm, m4a, mp4, mp3, wav natively.
        var psi = new ProcessStartInfo
        {
            FileName              = _binary,
            RedirectStandardError  = true,
            RedirectStandardOutput = true,
            UseShellExecute        = false,
            CreateNoWindow         = true,
        };

        // Build argument list — ArgumentList handles paths with spaces correctly on Windows
        psi.ArgumentList.Add("--format");
        psi.ArgumentList.Add("bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio");
        psi.ArgumentList.Add("-o");
        psi.ArgumentList.Add(Path.Combine(outputDir, "source_audio.%(ext)s"));
        psi.ArgumentList.Add("--no-playlist");
        psi.ArgumentList.Add("--socket-timeout");
        psi.ArgumentList.Add("30");
        psi.ArgumentList.Add("--retries");
        psi.ArgumentList.Add("1");

        if (platform == "Instagram")
        {
            psi.ArgumentList.Add("--cookies-from-browser");
            psi.ArgumentList.Add("chrome");
        }

        psi.ArgumentList.Add(url);

        _logger.LogInformation("yt-dlp downloading best-audio from {Platform}", platform);

        using var process = Process.Start(psi)
            ?? throw new InvalidOperationException("Failed to start yt-dlp.");

        var stderrTask = process.StandardError.ReadToEndAsync(ct);
        var stdoutTask = process.StandardOutput.ReadToEndAsync(ct);

        await process.WaitForExitAsync(ct);
        var stderr = await stderrTask;
        var stdout = await stdoutTask;

        if (!string.IsNullOrWhiteSpace(stdout))
            _logger.LogInformation("yt-dlp stdout: {Stdout}", stdout);
        if (!string.IsNullOrWhiteSpace(stderr))
            _logger.LogWarning("yt-dlp stderr: {Stderr}", stderr);

        if (process.ExitCode != 0)
        {
            _logger.LogError("yt-dlp failed (exit {Code}) for {Platform}", process.ExitCode, platform);

            if (platform == "Instagram")
                throw new Exception(
                    "Couldn't download this Instagram reel. Instagram restricts public downloads — " +
                    "please upload the video file directly instead.");

            if (platform == "Facebook")
                throw new Exception(
                    "Couldn't download this Facebook reel. Try uploading the video file directly.");

            var detail = string.IsNullOrWhiteSpace(stderr) ? $"exit code {process.ExitCode}" : stderr.Trim();
            throw new Exception($"Download failed: {detail}");
        }

        // Find whatever file yt-dlp produced (webm, m4a, etc.)
        var audioFile = Directory.GetFiles(outputDir, "source_audio.*")
            .FirstOrDefault(f => !f.EndsWith(".part", StringComparison.OrdinalIgnoreCase));

        if (audioFile == null)
            throw new FileNotFoundException("yt-dlp succeeded but no audio file found in output directory.");

        _logger.LogInformation("yt-dlp download complete: {File}", audioFile);
        return audioFile;
    }
}
