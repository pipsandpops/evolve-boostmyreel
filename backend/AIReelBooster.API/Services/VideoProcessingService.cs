using AIReelBooster.API.Configuration;
using AIReelBooster.API.Services.Interfaces;
using Microsoft.Extensions.Options;
using Xabe.FFmpeg;
using Xabe.FFmpeg.Downloader;

namespace AIReelBooster.API.Services;

public class VideoProcessingService : IVideoProcessingService
{
    private readonly ILogger<VideoProcessingService> _logger;
    private static bool _ffmpegReady = false;
    private static readonly SemaphoreSlim _downloadLock = new(1, 1);

    public VideoProcessingService(IOptions<AppSettings> options, ILogger<VideoProcessingService> logger)
    {
        _logger = logger;
        var ffmpegPath = Path.GetFullPath(options.Value.FFmpeg.BinaryPath);
        Directory.CreateDirectory(ffmpegPath);
        FFmpeg.SetExecutablesPath(ffmpegPath);
    }

    private async Task EnsureFFmpegAsync(CancellationToken ct)
    {
        if (_ffmpegReady) return;

        await _downloadLock.WaitAsync(ct);
        try
        {
            if (_ffmpegReady) return;

            // On Linux (Docker/Railway) ffmpeg is installed via apt — skip download
            var isLinux = !OperatingSystem.IsWindows();
            if (isLinux)
            {
                FFmpeg.SetExecutablesPath("/usr/bin");
                _logger.LogInformation("Using system FFmpeg at /usr/bin");
            }
            else
            {
                var ffmpegPath = FFmpeg.ExecutablesPath ?? "./ffmpeg-bin";
                var ffmpegExe = Path.Combine(ffmpegPath, "ffmpeg.exe");
                var ffprobeExe = Path.Combine(ffmpegPath, "ffprobe.exe");

                if (!File.Exists(ffmpegExe) || !File.Exists(ffprobeExe))
                {
                    _logger.LogInformation("FFmpeg not found — downloading automatically to {Path}", ffmpegPath);
                    await FFmpegDownloader.GetLatestVersion(FFmpegVersion.Official, ffmpegPath);
                    _logger.LogInformation("FFmpeg downloaded successfully");
                }
            }

            _ffmpegReady = true;
        }
        finally
        {
            _downloadLock.Release();
        }
    }

    public async Task<(double DurationSeconds, int Width, int Height, double FrameRate)> ProbeVideoAsync(
        string filePath, CancellationToken ct = default)
    {
        await EnsureFFmpegAsync(ct);
        _logger.LogInformation("Probing video: {FilePath}", filePath);
        var info = await FFmpeg.GetMediaInfo(filePath, ct);

        var video = info.VideoStreams.FirstOrDefault();
        if (video == null)
            throw new InvalidOperationException("No video stream found in the uploaded file.");

        return (info.Duration.TotalSeconds, video.Width, video.Height, video.Framerate);
    }

    public async Task<string> ExtractAudioAsync(string videoPath, string outputDir, CancellationToken ct = default)
    {
        await EnsureFFmpegAsync(ct);
        _logger.LogInformation("Extracting audio from: {VideoPath}", videoPath);
        var outputPath = Path.Combine(outputDir, "audio.wav");

        var info = await FFmpeg.GetMediaInfo(videoPath, ct);
        var audioStream = info.AudioStreams.FirstOrDefault()
            ?? throw new InvalidOperationException("No audio stream found in the uploaded file.");

        var conversion = FFmpeg.Conversions.New()
            .AddStream(audioStream)
            .SetOutput(outputPath)
            .AddParameter("-ar 16000 -ac 1");

        await conversion.Start(ct);
        return outputPath;
    }

    public async Task<string> ExtractThumbnailAsync(string videoPath, string outputDir, CancellationToken ct = default)
    {
        await EnsureFFmpegAsync(ct);
        _logger.LogInformation("Extracting thumbnail from: {VideoPath}", videoPath);
        var outputPath = Path.Combine(outputDir, "thumbnail.jpg");

        // Invoke FFmpeg directly to avoid Xabe adding conflicting -n/-y flags
        var ffmpegBin = OperatingSystem.IsWindows() ? "ffmpeg.exe" : "ffmpeg";
        var ffmpegExe = Path.Combine(FFmpeg.ExecutablesPath ?? "./ffmpeg-bin", ffmpegBin);
        var args = $"-y -ss 00:00:00.500 -i \"{videoPath}\" -vframes 1 -q:v 2 \"{outputPath}\"";

        using var process = new System.Diagnostics.Process();
        process.StartInfo = new System.Diagnostics.ProcessStartInfo
        {
            FileName = ffmpegExe,
            Arguments = args,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true
        };
        process.Start();
        var stderr = await process.StandardError.ReadToEndAsync(ct);
        await process.WaitForExitAsync(ct);

        if (process.ExitCode != 0)
            throw new InvalidOperationException($"FFmpeg thumbnail failed (exit {process.ExitCode}): {stderr}");

        return outputPath;
    }

    public async Task<string> BurnSubtitlesAsync(
        string videoPath, string srtPath, string outputDir, CancellationToken ct = default)
    {
        await EnsureFFmpegAsync(ct);
        _logger.LogInformation("Burning subtitles into: {VideoPath}", videoPath);
        var outputPath = Path.Combine(outputDir, "burned.mp4");

        // Escape backslashes and colons for FFmpeg filter on Windows
        var escapedSrt = srtPath.Replace("\\", "/").Replace(":", "\\:");

        var conversion = FFmpeg.Conversions.New()
            .AddParameter($"-i \"{videoPath}\"")
            .AddParameter($"-vf \"subtitles='{escapedSrt}':force_style='FontName=Arial,FontSize=18,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Outline=2,Bold=1'\"")
            .AddParameter("-c:a copy")
            .SetOutput(outputPath)
            .SetOverwriteOutput(true);

        await conversion.Start(ct);
        return outputPath;
    }
}
