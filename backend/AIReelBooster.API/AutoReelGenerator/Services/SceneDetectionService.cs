using System.Diagnostics;
using System.Text.RegularExpressions;
using AIReelBooster.API.AutoReelGenerator.Interfaces;
using AIReelBooster.API.AutoReelGenerator.Models;
using AIReelBooster.API.Configuration;
using Microsoft.Extensions.Options;
using Xabe.FFmpeg;
using Xabe.FFmpeg.Downloader;

namespace AIReelBooster.API.AutoReelGenerator.Services;

/// <summary>
/// Detects scene changes using FFmpeg's select+showinfo filter pipeline.
///
/// Strategy:
///   1. Scale down to 480px wide for fast processing (scene detection doesn't need full res).
///   2. Apply select filter with the configured threshold.
///   3. Feed matching frames through showinfo to extract pts_time values from stderr.
///   4. Build candidate windows between consecutive scene-change timestamps.
///   5. Compute motion density per window (change events per second).
///   6. Filter out windows outside the configured duration range.
///
/// Edge-case handling:
///   • Zero scenes detected  → split video into equal chunks.
///   • Video shorter than MinSegmentSeconds → return the whole video as one segment.
///   • Consecutive scene changes less than 1 s apart → merge them.
/// </summary>
public partial class SceneDetectionService : ISceneDetectionService
{
    [GeneratedRegex(@"pts_time:(?<t>[0-9.]+)", RegexOptions.Compiled)]
    private static partial Regex PtsTimeRegex();

    private readonly FFmpegSettings _ffmpegSettings;
    private readonly ILogger<SceneDetectionService> _logger;

    private static bool   _ffmpegReady;
    private static readonly SemaphoreSlim _ffmpegLock = new(1, 1);

    public SceneDetectionService(
        IOptions<AppSettings>              opts,
        ILogger<SceneDetectionService>     logger)
    {
        _ffmpegSettings = opts.Value.FFmpeg;
        _logger         = logger;
    }

    // ── Public API ────────────────────────────────────────────────────────────

    public async Task<List<SceneSegment>> DetectScenesAsync(
        string            videoPath,
        double            threshold  = 0.35,
        double            minSeconds = 5.0,
        double            maxSeconds = 30.0,
        CancellationToken ct         = default)
    {
        await EnsureFFmpegAsync(ct);

        // ── 1. Probe total duration ───────────────────────────────────────────
        double totalSeconds = await ProbeDurationAsync(videoPath, ct);
        _logger.LogInformation("Scene detection started: {Path} ({Duration:F1}s, threshold={Threshold})",
            Path.GetFileName(videoPath), totalSeconds, threshold);

        // Edge case: very short video
        if (totalSeconds < minSeconds)
        {
            _logger.LogInformation("Video shorter than min segment ({MinS}s) — returning full video as single segment", minSeconds);
            return [new SceneSegment { Index = 0, StartTime = TimeSpan.Zero, EndTime = TimeSpan.FromSeconds(totalSeconds), MotionDensity = 0.5 }];
        }

        // ── 2. Run FFmpeg scene detection ─────────────────────────────────────
        var sceneTimestamps = await RunSceneDetectionAsync(videoPath, threshold, ct);

        _logger.LogInformation("Scene detection found {Count} change points", sceneTimestamps.Count);

        // ── 3. Build initial boundary list ────────────────────────────────────
        var boundaries = new List<double> { 0.0 };
        foreach (var t in sceneTimestamps.Where(t => t > 0.5))   // ignore spurious changes at t=0
            boundaries.Add(t);
        boundaries.Add(totalSeconds);
        boundaries = boundaries.Distinct().OrderBy(x => x).ToList();

        // ── 4. Merge very close boundaries (< 1 s apart) ──────────────────────
        boundaries = MergeCloseBoundaries(boundaries, minGapSeconds: 1.0);

        // ── 5. Convert boundaries → segments ──────────────────────────────────
        var allSegments = new List<SceneSegment>();
        for (var i = 0; i < boundaries.Count - 1; i++)
        {
            var start    = boundaries[i];
            var end      = boundaries[i + 1];
            var duration = end - start;

            // Split segments that are too long at the midpoint
            if (duration > maxSeconds)
            {
                var mid = start + duration / 2.0;
                AddSegment(allSegments, start, mid, sceneTimestamps);
                AddSegment(allSegments, mid, end, sceneTimestamps);
            }
            else
            {
                AddSegment(allSegments, start, end, sceneTimestamps);
            }
        }

        // ── 6. Filter by duration ─────────────────────────────────────────────
        var valid = allSegments
            .Where(s => s.Duration.TotalSeconds >= minSeconds && s.Duration.TotalSeconds <= maxSeconds)
            .ToList();

        // Edge case: no valid segments after filtering
        if (valid.Count == 0)
        {
            _logger.LogWarning("No valid segments after filtering — falling back to equal splits");
            valid = EqualSplitFallback(totalSeconds, minSeconds, maxSeconds);
        }

        // Re-index
        for (var i = 0; i < valid.Count; i++)
            valid[i].Index = i;

        _logger.LogInformation("Scene detection complete: {Count} candidate segments", valid.Count);
        return valid;
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private async Task<List<double>> RunSceneDetectionAsync(
        string videoPath, double threshold, CancellationToken ct)
    {
        var ffmpegExe = BuildFFmpegPath();
        // Scale to 480px wide for speed; showinfo writes frame data to stderr
        var args = $"-i \"{videoPath}\" "
                 + $"-vf \"scale=480:-1,select='gt(scene,{threshold.ToString("F3", System.Globalization.CultureInfo.InvariantCulture)})',showinfo\" "
                 + "-an -vsync 0 -f null -";

        var (_, stderr) = await RunProcessAsync(ffmpegExe, args, ct);

        var timestamps = new List<double>();
        foreach (Match m in PtsTimeRegex().Matches(stderr))
        {
            if (double.TryParse(m.Groups["t"].Value,
                    System.Globalization.NumberStyles.Float,
                    System.Globalization.CultureInfo.InvariantCulture,
                    out var t))
            {
                timestamps.Add(t);
            }
        }

        return timestamps.OrderBy(t => t).ToList();
    }

    private async Task<double> ProbeDurationAsync(string videoPath, CancellationToken ct)
    {
        try
        {
            var ffprobeBin = OperatingSystem.IsWindows() ? "ffprobe.exe" : "ffprobe";
            var ffprobeExe = Path.Combine(FFmpeg.ExecutablesPath ?? _ffmpegSettings.BinaryPath, ffprobeBin);
            var args = $"-v quiet -print_format compact "
                     + $"-show_entries format=duration \"{videoPath}\"";

            var (stdout, _) = await RunProcessAsync(ffprobeExe, args, ct);

            // format|duration=123.456
            var match = Regex.Match(stdout, @"duration=([0-9.]+)");
            if (match.Success && double.TryParse(match.Groups[1].Value,
                    System.Globalization.NumberStyles.Float,
                    System.Globalization.CultureInfo.InvariantCulture, out var d))
                return d;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "ffprobe duration probe failed; falling back to Xabe");
        }

        // Fallback: Xabe probe
        var mediaInfo = await FFmpeg.GetMediaInfo(videoPath, ct);
        return mediaInfo.Duration.TotalSeconds;
    }

    private static void AddSegment(
        List<SceneSegment> list,
        double startSec,
        double endSec,
        List<double> allChanges)
    {
        var start = TimeSpan.FromSeconds(startSec);
        var end   = TimeSpan.FromSeconds(endSec);
        var dur   = endSec - startSec;

        // Motion density = how many scene changes occurred per second in this window
        var changesInWindow = allChanges.Count(t => t >= startSec && t < endSec);
        var motionDensity   = dur > 0 ? Math.Min(changesInWindow / dur / 2.0, 1.0) : 0.0;  // 2 changes/s = max

        list.Add(new SceneSegment
        {
            StartTime     = start,
            EndTime       = end,
            MotionDensity = motionDensity,
        });
    }

    private static List<double> MergeCloseBoundaries(List<double> sorted, double minGapSeconds)
    {
        var result = new List<double> { sorted[0] };
        for (var i = 1; i < sorted.Count - 1; i++)  // Keep first and last
        {
            if (sorted[i] - result[^1] >= minGapSeconds)
                result.Add(sorted[i]);
        }
        result.Add(sorted[^1]);
        return result;
    }

    private static List<SceneSegment> EqualSplitFallback(
        double totalSeconds, double minSec, double maxSec)
    {
        var targetDuration = Math.Clamp((totalSeconds / 5.0), minSec, maxSec);
        var segments = new List<SceneSegment>();
        var t = 0.0;
        var i = 0;

        while (t + minSec < totalSeconds)
        {
            var end = Math.Min(t + targetDuration, totalSeconds);
            segments.Add(new SceneSegment
            {
                Index         = i++,
                StartTime     = TimeSpan.FromSeconds(t),
                EndTime       = TimeSpan.FromSeconds(end),
                MotionDensity = 0.3,  // Neutral score for unknown motion
            });
            t = end;
        }

        return segments;
    }

    // ── Process runner ────────────────────────────────────────────────────────

    private static async Task<(string stdout, string stderr)> RunProcessAsync(
        string exe, string args, CancellationToken ct)
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

        var stdoutTask = proc.StandardOutput.ReadToEndAsync(ct);
        var stderrTask = proc.StandardError.ReadToEndAsync(ct);

        await Task.WhenAll(stdoutTask, stderrTask);
        await proc.WaitForExitAsync(ct);

        return (await stdoutTask, await stderrTask);
    }

    // ── FFmpeg binary management (same pattern as VideoProcessingService) ─────

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

            if (OperatingSystem.IsLinux())
            {
                FFmpeg.SetExecutablesPath("/usr/bin");
            }
            else
            {
                var path = Path.GetFullPath(_ffmpegSettings.BinaryPath);
                Directory.CreateDirectory(path);
                FFmpeg.SetExecutablesPath(path);

                var ffmpegExe  = Path.Combine(path, "ffmpeg.exe");
                var ffprobeExe = Path.Combine(path, "ffprobe.exe");

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
}
