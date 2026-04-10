using System.Diagnostics;
using System.Text;
using AIReelBooster.API.AutoReelGenerator.Interfaces;
using AIReelBooster.API.AutoReelGenerator.Models;
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
        var args = new[]
        {
            "-y",
            "-ss", start.TotalSeconds.ToString("F3", System.Globalization.CultureInfo.InvariantCulture),
            "-i", sourceVideoPath,
            "-t", duration.TotalSeconds.ToString("F3", System.Globalization.CultureInfo.InvariantCulture),
            "-c:v", "libx264", "-preset", _settings.OutputPreset, "-crf", _settings.OutputCrf.ToString(),
            "-c:a", "aac", "-b:a", "128k",
            "-threads", "2",
            outputPath,
        };

        _logger.LogDebug("ExtractClip: {Args}", string.Join(" ", args));
        await RunAndCheckAsync(ffmpegExe, args, ct);
        return outputPath;
    }

    // ── Convert to vertical (9:16) ────────────────────────────────────────────

    public async Task<string> ConvertToVerticalAsync(
        string                          clipPath,
        string                          outputDir,
        string                          fileName,
        bool                            enableZoom,
        IReadOnlyList<SubtitleEntry>?   subtitles,
        TimeSpan                        clipStartOffset,
        IReadOnlyList<CropInstruction>? cropInstructions = null,
        CancellationToken               ct = default)
    {
        await EnsureFFmpegAsync(ct);

        var outputPath = Path.Combine(outputDir, fileName);
        var ffmpegExe  = BuildFFmpegPath();
        var w          = _settings.OutputWidth;
        var h          = _settings.OutputHeight;

        // Step 1 — crop to 9:16, then scale.
        // When Smart Reframe crop instructions are provided, build a dynamic
        // x-expression using FFmpeg's if(between(t,...)) chain so the camera
        // follows the detected subject. Otherwise fall back to centre crop.
        string cropFilter;
        if (cropInstructions is { Count: > 0 })
        {
            var xExpr = BuildDynamicXExpression(cropInstructions);
            // Width and height are taken from the first instruction (all equal).
            var ci = cropInstructions[0];
            cropFilter = $"crop={ci.Width}:{ci.Height}:{xExpr}:{ci.Y},scale={w}:{h}";
            _logger.LogInformation("ConvertToVertical: using SmartReframe crop ({Count} segments)", cropInstructions.Count);
        }
        else
        {
            // Static centre-crop: width = ih*9/16, x centres it
            cropFilter = $"crop=ih*9/16:ih:(iw-ih*9/16)/2:0,scale={w}:{h}";
        }

        // Step 2 — optional gentle zoom-pan (1.00× → 1.08× over the clip)
        var videoFilter = enableZoom
            ? $"{cropFilter},zoompan=z='min(zoom+0.0008,1.08)':d=1:fps=30:s={w}x{h}"
            : cropFilter;

        var args = new[]
        {
            "-y",
            "-i", clipPath,
            "-vf", videoFilter,
            "-c:v", "libx264", "-preset", _settings.OutputPreset, "-crf", _settings.OutputCrf.ToString(),
            "-c:a", "aac", "-b:a", "128k",
            "-threads", "2",
            "-r", "30",
            outputPath,
        };

        _logger.LogDebug("ConvertToVertical: {Args}", string.Join(" ", args));
        await RunAndCheckAsync(ffmpegExe, args, ct);

        return outputPath;
    }

    // ── Smart Reframe helpers ─────────────────────────────────────────────────

    /// <summary>
    /// Builds a nested FFmpeg <c>if(between(t,start,end),x,...)</c> expression
    /// that selects the correct crop x-offset for each time window.
    ///
    /// Example output (2 segments):
    ///   if(between(t,0,2),320,if(between(t,2,4),380,350))
    /// </summary>
    private static string BuildDynamicXExpression(IReadOnlyList<CropInstruction> instructions)
    {
        // Build right-to-left: innermost = last segment's X as fallback
        var ic = System.Globalization.CultureInfo.InvariantCulture;
        var expr = instructions[^1].X.ToString();

        for (var i = instructions.Count - 2; i >= 0; i--)
        {
            var ci = instructions[i];
            expr = $"if(between(t,{ci.StartTime.ToString("F3", ic)},{ci.EndTime.ToString("F3", ic)}),{ci.X},{expr})";
        }

        return expr;
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

    private static async Task RunAndCheckAsync(string exe, string[] args, CancellationToken ct)
    {
        using var proc = new Process();
        proc.StartInfo = new ProcessStartInfo
        {
            FileName               = exe,
            RedirectStandardOutput = true,
            RedirectStandardError  = true,
            UseShellExecute        = false,
            CreateNoWindow         = true,
        };
        foreach (var arg in args)
            proc.StartInfo.ArgumentList.Add(arg);
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
