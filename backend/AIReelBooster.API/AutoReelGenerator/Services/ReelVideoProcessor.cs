using System.Diagnostics;
using System.Text;
using AIReelBooster.API.AutoReelGenerator.Interfaces;
using AIReelBooster.API.Configuration;
using AIReelBooster.API.Models.Domain;
using Microsoft.Extensions.Options;
using Xabe.FFmpeg;
using Xabe.FFmpeg.Downloader;

namespace AIReelBooster.API.AutoReelGenerator.Services;

/// <summary>
/// Handles all FFmpeg operations for the reel generator pipeline.
///
/// ExtractClipAsync  — precise-seek re-encode so subtitle offsets are correct.
/// ConvertToVerticalAsync — crop centre to 9:16, scale to 720×1280, optional
///                          zoompan, optional subtitle burn-in.
/// </summary>
public class ReelVideoProcessor : IReelVideoProcessor
{
    private readonly AutoReelSettings _settings;
    private readonly FFmpegSettings   _ffmpegSettings;
    private readonly ILogger<ReelVideoProcessor> _logger;

    private static bool _ffmpegReady;
    private static readonly SemaphoreSlim _ffmpegLock = new(1, 1);

    public ReelVideoProcessor(
        IOptions<AppSettings>            opts,
        ILogger<ReelVideoProcessor>      logger)
    {
        _settings       = opts.Value.AutoReel;
        _ffmpegSettings = opts.Value.FFmpeg;
        _logger         = logger;
    }

    // ── Extract clip ──────────────────────────────────────────────────────────

    public async Task<string> ExtractClipAsync(
        string            sourceVideoPath,
        TimeSpan          start,
        TimeSpan          end,
        string            outputDir,
        string            fileName,
        CancellationToken ct = default)
    {
        await EnsureFFmpegAsync(ct);

        var outputPath = Path.Combine(outputDir, fileName);
        var duration   = end - start;
        var ffmpegExe  = BuildFFmpegPath();

        // Re-encode (not stream-copy) so the SRT subtitle timings in the next
        // step are frame-accurate relative to the clip start.
        var args = $"-y -ss {start.TotalSeconds.ToString("F3", System.Globalization.CultureInfo.InvariantCulture)} "
                 + $"-i \"{sourceVideoPath}\" "
                 + $"-t {duration.TotalSeconds.ToString("F3", System.Globalization.CultureInfo.InvariantCulture)} "
                 + $"-c:v libx264 -preset {_settings.OutputPreset} -crf {_settings.OutputCrf} "
                 + "-c:a aac -b:a 128k "
                 + "-threads 2 "
                 + $"\"{outputPath}\"";

        _logger.LogDebug("ExtractClip: {Args}", args);
        await RunAndCheckAsync(ffmpegExe, args, ct);
        return outputPath;
    }

    // ── Convert to vertical (9:16) ────────────────────────────────────────────

    public async Task<string> ConvertToVerticalAsync(
        string                        clipPath,
        string                        outputDir,
        string                        fileName,
        bool                          enableZoom,
        IReadOnlyList<SubtitleEntry>? subtitles,
        TimeSpan                      clipStartOffset,
        CancellationToken             ct = default)
    {
        await EnsureFFmpegAsync(ct);

        var outputPath = Path.Combine(outputDir, fileName);
        var ffmpegExe  = BuildFFmpegPath();
        var w          = _settings.OutputWidth;
        var h          = _settings.OutputHeight;

        // Step 1 — centre-crop the widest 9:16 strip, then scale
        //   crop width  = ih * 9/16
        //   crop x-offset centres it: (iw - ih*9/16) / 2
        var cropFilter = $"crop=ih*9/16:ih:(iw-ih*9/16)/2:0,scale={w}:{h}";

        // Step 2 — optional gentle zoom-pan (1.00× → 1.08× over the clip)
        var videoFilter = enableZoom
            ? $"{cropFilter},zoompan=z='min(zoom+0.0008,1.08)':d=1:fps=30:s={w}x{h}"
            : cropFilter;

        // Step 3 — optional subtitle burn-in
        string? tempSrt = null;
        if (subtitles is { Count: > 0 })
        {
            tempSrt = await WriteTempSrtAsync(outputDir, subtitles, clipStartOffset, ct);

            // FFmpeg subtitles filter requires forward-slashes and escaped colons on Windows
            var escapedSrt = tempSrt
                .Replace("\\", "/")
                .Replace(":", "\\:");

            videoFilter += $",subtitles='{escapedSrt}':force_style="
                         + "'FontName=Arial,FontSize=18,"
                         + "PrimaryColour=&H00FFFFFF,"
                         + "OutlineColour=&H00000000,"
                         + "Outline=2,Alignment=2'";
        }

        var args = $"-y -i \"{clipPath}\" "
                 + $"-vf \"{videoFilter}\" "
                 + $"-c:v libx264 -preset {_settings.OutputPreset} -crf {_settings.OutputCrf} "
                 + "-c:a aac -b:a 128k "
                 + "-threads 2 "
                 + $"-r 30 \"{outputPath}\"";

        _logger.LogDebug("ConvertToVertical: {Args}", args);

        try
        {
            await RunAndCheckAsync(ffmpegExe, args, ct);
        }
        finally
        {
            if (tempSrt != null) TryDelete(tempSrt);
        }

        return outputPath;
    }

    // ── SRT helper ────────────────────────────────────────────────────────────

    /// <summary>
    /// Writes a temporary SRT file with timestamps adjusted to be relative to
    /// the clip (i.e. source subtitle time minus <paramref name="offset"/>).
    /// </summary>
    private static async Task<string> WriteTempSrtAsync(
        string                       dir,
        IReadOnlyList<SubtitleEntry> subtitles,
        TimeSpan                     offset,
        CancellationToken            ct)
    {
        var path = Path.Combine(dir, $"subs_{Guid.NewGuid():N}.srt");
        var sb   = new StringBuilder();
        var idx  = 1;

        foreach (var s in subtitles)
        {
            var relStart = s.Start - offset;
            var relEnd   = s.End   - offset;

            if (relEnd <= TimeSpan.Zero) continue;      // before clip window
            if (relStart < TimeSpan.Zero) relStart = TimeSpan.Zero;

            sb.AppendLine(idx++.ToString());
            sb.AppendLine($"{FormatSrtTime(relStart)} --> {FormatSrtTime(relEnd)}");
            sb.AppendLine(s.Text);
            sb.AppendLine();
        }

        await File.WriteAllTextAsync(path, sb.ToString(), ct);
        return path;
    }

    private static string FormatSrtTime(TimeSpan ts) =>
        $"{(int)ts.TotalHours:D2}:{ts.Minutes:D2}:{ts.Seconds:D2},{ts.Milliseconds:D3}";

    // ── Process runner ────────────────────────────────────────────────────────

    private static async Task RunAndCheckAsync(string exe, string args, CancellationToken ct)
    {
        using var proc = new Process();
        proc.StartInfo = new ProcessStartInfo
        {
            FileName               = exe,
            Arguments              = args,
            RedirectStandardOutput = true,
            RedirectStandardError  = true,
            UseShellExecute        = false,
            CreateNoWindow         = true,
        };
        proc.Start();

        // Read both streams concurrently to prevent deadlock on large stderr
        var stdoutTask = proc.StandardOutput.ReadToEndAsync(ct);
        var stderrTask = proc.StandardError.ReadToEndAsync(ct);
        await Task.WhenAll(stdoutTask, stderrTask);
        await proc.WaitForExitAsync(ct);

        if (proc.ExitCode != 0)
        {
            var stderr = await stderrTask;
            var preview = stderr.Length > 500 ? stderr[^500..] : stderr;
            throw new InvalidOperationException(
                $"FFmpeg exited with code {proc.ExitCode}. Last output: {preview}");
        }
    }

    // ── FFmpeg binary management ──────────────────────────────────────────────

    private string BuildFFmpegPath()
    {
        var bin = OperatingSystem.IsWindows() ? "ffmpeg.exe" : "ffmpeg";
        return Path.Combine(FFmpeg.ExecutablesPath ?? _ffmpegSettings.BinaryPath, bin);
    }

    private async Task EnsureFFmpegAsync(CancellationToken ct)
    {
        if (_ffmpegReady) return;

        await _ffmpegLock.WaitAsync(ct);
        try
        {
            if (_ffmpegReady) return;

            var sysPath = File.Exists("/usr/local/bin/ffmpeg") ? "/usr/local/bin"
                        : File.Exists("/usr/bin/ffmpeg")       ? "/usr/bin"
                        : null;
            if (sysPath != null)
            {
                FFmpeg.SetExecutablesPath(sysPath);
            }
            else
            {
                var path = Path.GetFullPath(_ffmpegSettings.BinaryPath);
                Directory.CreateDirectory(path);
                FFmpeg.SetExecutablesPath(path);

                var ffmpegExe  = Path.Combine(path, OperatingSystem.IsWindows() ? "ffmpeg.exe" : "ffmpeg");
                var ffprobeExe = Path.Combine(path, OperatingSystem.IsWindows() ? "ffprobe.exe" : "ffprobe");

                if (!File.Exists(ffmpegExe) || !File.Exists(ffprobeExe))
                {
                    _logger.LogInformation("Downloading FFmpeg binaries to {Path}...", path);
                    await FFmpegDownloader.GetLatestVersion(FFmpegVersion.Official, path);
                    _logger.LogInformation("FFmpeg download complete");
                }
            }

            _ffmpegReady = true;
        }
        finally
        {
            _ffmpegLock.Release();
        }
    }

    private static void TryDelete(string path)
    {
        try { File.Delete(path); }
        catch { /* non-fatal — temp file cleanup */ }
    }
}
