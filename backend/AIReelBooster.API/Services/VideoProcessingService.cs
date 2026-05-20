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

            // Use system ffmpeg if available, otherwise download automatically
            var systemFfmpeg = File.Exists("/usr/local/bin/ffmpeg") ? "/usr/local/bin"
                             : File.Exists("/usr/bin/ffmpeg")       ? "/usr/bin"
                             : null;
            if (systemFfmpeg != null)
            {
                FFmpeg.SetExecutablesPath(systemFfmpeg);
                _logger.LogInformation("Using system FFmpeg at {Path}", systemFfmpeg);
            }
            else
            {
                var ffmpegPath = FFmpeg.ExecutablesPath ?? "./ffmpeg-bin";
                Directory.CreateDirectory(ffmpegPath);
                var ffmpegExe = Path.Combine(ffmpegPath, OperatingSystem.IsWindows() ? "ffmpeg.exe" : "ffmpeg");
                var ffprobeExe = Path.Combine(ffmpegPath, OperatingSystem.IsWindows() ? "ffprobe.exe" : "ffprobe");

                if (!File.Exists(ffmpegExe) || !File.Exists(ffprobeExe))
                {
                    _logger.LogInformation("FFmpeg not found — downloading automatically to {Path}", ffmpegPath);
                    await FFmpegDownloader.GetLatestVersion(FFmpegVersion.Official, ffmpegPath);
                    if (!OperatingSystem.IsWindows())
                    {
                        System.Diagnostics.Process.Start("chmod", $"+x {ffmpegExe} {ffprobeExe}")?.WaitForExit();
                    }
                    _logger.LogInformation("FFmpeg downloaded successfully");
                }
                FFmpeg.SetExecutablesPath(ffmpegPath);
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

    public async Task<bool> HasAudioStreamAsync(string filePath, CancellationToken ct = default)
    {
        await EnsureFFmpegAsync(ct);
        var ffprobeBin = OperatingSystem.IsWindows() ? "ffprobe.exe" : "ffprobe";
        var ffprobeExe = Path.Combine(FFmpeg.ExecutablesPath ?? "./ffmpeg-bin", ffprobeBin);
        var args = $"-v error -select_streams a:0 -show_entries stream=index -of csv=p=0 \"{filePath}\"";

        using var process = new System.Diagnostics.Process();
        process.StartInfo = new System.Diagnostics.ProcessStartInfo
        {
            FileName = ffprobeExe,
            Arguments = args,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true
        };
        process.Start();
        var stdout = await process.StandardOutput.ReadToEndAsync(ct);
        await process.WaitForExitAsync(ct);
        return !string.IsNullOrWhiteSpace(stdout);
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

    public async Task<string> GenerateCinematicVideoAsync(
        string videoPath, string outputDir, double durationSeconds, CancellationToken ct = default)
    {
        await EnsureFFmpegAsync(ct);
        _logger.LogInformation("Generating cinematic video from: {VideoPath}", videoPath);

        var outputPath = Path.Combine(outputDir, "cinematic.mp4");
        var ffmpegBin  = OperatingSystem.IsWindows() ? "ffmpeg.exe" : "ffmpeg";
        var ffmpegExe  = Path.Combine(FFmpeg.ExecutablesPath ?? "./ffmpeg-bin", ffmpegBin);

        // 1. Scale up 15% to create zoom/pan headroom
        // 2. Slowly sweep the crop window left→right using a cosine ramp over the video's duration
        // 3. Cinematic colour grade: mild saturation + contrast lift, slight darken
        // 4. Vignette for depth
        var dur    = Math.Max(durationSeconds, 1.0).ToString("F2", System.Globalization.CultureInfo.InvariantCulture);
        var filter = $"scale=trunc(iw*1.15/2)*2:trunc(ih*1.15/2)*2," +
                     $"crop=iw/1.15:ih/1.15:" +
                     $"(iw-iw/1.15)*0.5*(1-cos(2*PI*t/{dur})):" +
                     $"(ih-ih/1.15)*0.5," +
                     $"eq=saturation=1.2:contrast=1.05:brightness=-0.02," +
                     $"vignette=PI/4";

        var args = $"-y -i \"{videoPath}\" -vf \"{filter}\" -c:a copy -movflags +faststart \"{outputPath}\"";

        using var process = new System.Diagnostics.Process();
        process.StartInfo = new System.Diagnostics.ProcessStartInfo
        {
            FileName               = ffmpegExe,
            Arguments              = args,
            RedirectStandardError  = true,
            UseShellExecute        = false,
            CreateNoWindow         = true
        };
        process.Start();
        var stderr = await process.StandardError.ReadToEndAsync(ct);
        await process.WaitForExitAsync(ct);

        if (process.ExitCode != 0)
            throw new InvalidOperationException(
                $"FFmpeg cinematic failed (exit {process.ExitCode}): {stderr[..Math.Min(600, stderr.Length)]}");

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
