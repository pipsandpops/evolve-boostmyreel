using System.Diagnostics;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using AIReelBooster.API.AutoReelGenerator.Interfaces;
using AIReelBooster.API.AutoReelGenerator.Models;
using AIReelBooster.API.Configuration;
using Microsoft.Extensions.Options;
using Xabe.FFmpeg;
using Xabe.FFmpeg.Downloader;

namespace AIReelBooster.API.AutoReelGenerator.Services;

/// <summary>
/// Smart Reframe: extracts frames from a clip using FFmpeg, sends each frame
/// to Claude Vision to locate the primary subject, applies exponential smoothing
/// to reduce jitter, and emits a list of time-windowed crop instructions.
///
/// Decision loop (per frame at 0.5 fps):
///   1. Extract JPEG frame via FFmpeg
///   2. POST base64-encoded image to Claude claude-sonnet-4-6 with a minimal prompt
///   3. Parse subject x-centre (0.0–1.0 fraction of frame width)
///   4. Smooth: smoothX = prevX × 0.8 + currentX × 0.2
///   5. Clamp crop window so it never exceeds frame bounds
///   6. Emit CropInstruction for [prevTime, currentTime]
/// </summary>
public class AutoReframeService : IAutoReframeService
{
    private readonly HttpClient      _http;
    private readonly ClaudeSettings  _claude;
    private readonly FFmpegSettings  _ffmpeg;
    private readonly ILogger<AutoReframeService> _logger;

    // Seconds between sampled frames — 2 s gives a smooth result without
    // hammering the Claude API too hard on short clips.
    private const double SampleIntervalSeconds = 2.0;

    // Max frames to analyse per clip (caps API cost on very long segments).
    private const int MaxFrames = 15;

    public AutoReframeService(
        HttpClient                    http,
        IOptions<AppSettings>         opts,
        ILogger<AutoReframeService>   logger)
    {
        _http   = http;
        _claude = opts.Value.Claude;
        _ffmpeg = opts.Value.FFmpeg;
        _logger = logger;
    }

    public async Task<List<CropInstruction>> AnalyzeAsync(
        string            videoPath,
        TimeSpan          clipStart,
        TimeSpan          clipEnd,
        CancellationToken ct = default)
    {
        var clipDuration = (clipEnd - clipStart).TotalSeconds;
        if (clipDuration <= 0)
            return [];

        // ── 1. Probe video dimensions ─────────────────────────────────────────
        var (inputWidth, inputHeight) = await ProbeVideoDimensionsAsync(videoPath, ct);
        if (inputWidth <= 0 || inputHeight <= 0)
        {
            _logger.LogWarning("SmartReframe: could not probe dimensions for {Path}", videoPath);
            return [];
        }

        var cropWidth  = (int)(inputHeight * 9.0 / 16.0);
        var cropHeight = inputHeight;

        // Guard: source video must be wider than a 9:16 strip to reframe
        if (cropWidth >= inputWidth)
        {
            _logger.LogInformation("SmartReframe: video is already portrait ({W}×{H}) — skipping", inputWidth, inputHeight);
            return [];
        }

        // ── 2. Extract frames ─────────────────────────────────────────────────
        var frameDir   = Path.Combine(Path.GetTempPath(), $"reframe_{Guid.NewGuid():N}");
        Directory.CreateDirectory(frameDir);

        try
        {
            var frameCount = (int)Math.Min(Math.Ceiling(clipDuration / SampleIntervalSeconds), MaxFrames);
            var fps        = frameCount / clipDuration;  // frames per second to get desired count

            await ExtractFramesAsync(videoPath, clipStart.TotalSeconds, clipDuration, fps, frameCount, frameDir, ct);

            var frameFiles = Directory.GetFiles(frameDir, "frame_*.jpg")
                                      .OrderBy(f => f)
                                      .ToList();

            if (frameFiles.Count == 0)
            {
                _logger.LogWarning("SmartReframe: no frames extracted from {Path}", videoPath);
                return [];
            }

            _logger.LogInformation("SmartReframe: analysing {Count} frames for clip [{Start}–{End}]",
                frameFiles.Count, clipStart, clipEnd);

            // ── 3. Analyse frames with Claude Vision ──────────────────────────
            // Collect all subject x readings, then take the median to produce
            // ONE stable crop for the entire clip.  Per-frame crops cause the
            // if(between(t,...)) expression to contain commas that FFmpeg's
            // filtergraph parser splits on, breaking the filter chain.
            var xReadings = new List<double>();

            for (var i = 0; i < frameFiles.Count; i++)
            {
                ct.ThrowIfCancellationRequested();

                double subjectCenterX = 0.5;  // fallback = centre
                try
                {
                    subjectCenterX = await AnalyzeFrameAsync(frameFiles[i], ct);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "SmartReframe: frame {I} analysis failed — using centre", i);
                }

                var rawX    = subjectCenterX * inputWidth - cropWidth / 2.0;
                var clampX  = Math.Max(0, Math.Min(rawX, inputWidth - cropWidth));
                xReadings.Add(clampX);

                _logger.LogDebug("SmartReframe: frame {I} subjectX={SX:F2} cropX={CX:F0}", i, subjectCenterX, clampX);
            }

            // Median crop-X — robust against outlier frames
            xReadings.Sort();
            var medianX = xReadings[xReadings.Count / 2];
            var finalCropX = (int)Math.Round(Math.Max(0, Math.Min(medianX, inputWidth - cropWidth)));

            _logger.LogInformation("SmartReframe: stable cropX={X} (median of {N} readings)", finalCropX, xReadings.Count);

            return
            [
                new CropInstruction
                {
                    StartTime = 0,
                    EndTime   = clipDuration,
                    X         = finalCropX,
                    Y         = 0,
                    Width     = cropWidth,
                    Height    = cropHeight,
                },
            ];
        }
        finally
        {
            TryDeleteDirectory(frameDir);
        }
    }

    // ── Frame extraction ──────────────────────────────────────────────────────

    private async Task ExtractFramesAsync(
        string            videoPath,
        double            startSeconds,
        double            durationSeconds,
        double            fps,
        int               maxFrames,
        string            outputDir,
        CancellationToken ct)
    {
        var ffmpegExe = await GetFFmpegPathAsync(ct);

        var args = new[]
        {
            "-y",
            "-ss",  startSeconds.ToString("F3", System.Globalization.CultureInfo.InvariantCulture),
            "-i",   videoPath,
            "-t",   durationSeconds.ToString("F3", System.Globalization.CultureInfo.InvariantCulture),
            "-vf",  $"fps={fps.ToString("F4", System.Globalization.CultureInfo.InvariantCulture)},scale=640:-1",
            "-frames:v", maxFrames.ToString(),
            "-q:v", "4",
            Path.Combine(outputDir, "frame_%03d.jpg"),
        };

        using var proc = new Process();
        proc.StartInfo = new ProcessStartInfo
        {
            FileName               = ffmpegExe,
            RedirectStandardOutput = true,
            RedirectStandardError  = true,
            UseShellExecute        = false,
            CreateNoWindow         = true,
        };
        foreach (var arg in args) proc.StartInfo.ArgumentList.Add(arg);
        proc.Start();

        await Task.WhenAll(
            proc.StandardOutput.ReadToEndAsync(ct),
            proc.StandardError.ReadToEndAsync(ct));
        await proc.WaitForExitAsync(ct);

        // Non-fatal: some clips may not yield all frames (short segments)
    }

    // ── Claude Vision analysis ────────────────────────────────────────────────

    /// <returns>Normalised subject x-centre (0.0 = left, 1.0 = right).</returns>
    private async Task<double> AnalyzeFrameAsync(string framePath, CancellationToken ct)
    {
        var imageBytes  = await File.ReadAllBytesAsync(framePath, ct);
        var base64Image = Convert.ToBase64String(imageBytes);

        var payload = new
        {
            model      = _claude.Model,
            max_tokens = 64,
            messages   = new[]
            {
                new
                {
                    role    = "user",
                    content = new object[]
                    {
                        new
                        {
                            type   = "image",
                            source = new
                            {
                                type       = "base64",
                                media_type = "image/jpeg",
                                data       = base64Image,
                            },
                        },
                        new
                        {
                            type = "text",
                            text = "Where is the main subject (face or speaker) in this image? "
                                 + "Reply ONLY with a JSON object like {\"x\":0.5} where x is the "
                                 + "horizontal center of the subject as a fraction (0=left edge, 1=right edge). "
                                 + "If no subject, reply {\"x\":0.5}.",
                        },
                    },
                },
            },
        };

        var json    = JsonSerializer.Serialize(payload);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        using var request = new HttpRequestMessage(HttpMethod.Post, _claude.Endpoint);
        request.Headers.Add("x-api-key", _claude.ApiKey);
        request.Headers.Add("anthropic-version", "2023-06-01");
        request.Content = content;

        using var response = await _http.SendAsync(request, ct);
        var responseBody   = await response.Content.ReadAsStringAsync(ct);

        using var doc = JsonDocument.Parse(responseBody);
        var text      = doc.RootElement
                           .GetProperty("content")[0]
                           .GetProperty("text")
                           .GetString() ?? "{\"x\":0.5}";

        // Parse {\"x\": 0.42} — tolerant extraction
        using var parsed = JsonDocument.Parse(ExtractJsonObject(text));
        if (parsed.RootElement.TryGetProperty("x", out var xProp) &&
            xProp.TryGetDouble(out var xVal))
        {
            return Math.Clamp(xVal, 0.0, 1.0);
        }

        return 0.5;
    }

    /// <summary>Extracts the first JSON object {...} from a string (Claude sometimes adds prose).</summary>
    private static string ExtractJsonObject(string text)
    {
        var start = text.IndexOf('{');
        var end   = text.LastIndexOf('}');
        if (start >= 0 && end > start)
            return text[start..(end + 1)];
        return "{\"x\":0.5}";
    }

    // ── Video probe ───────────────────────────────────────────────────────────

    private async Task<(int width, int height)> ProbeVideoDimensionsAsync(
        string videoPath, CancellationToken ct)
    {
        try
        {
            var info = await FFmpeg.GetMediaInfo(videoPath, ct);
            var video = info.VideoStreams.FirstOrDefault();
            if (video != null)
                return ((int)video.Width, (int)video.Height);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "SmartReframe: Xabe probe failed — falling back to ffprobe");
        }

        // Fallback: run ffprobe directly
        return await ProbeDimensionsViaFfprobeAsync(videoPath, ct);
    }

    private async Task<(int, int)> ProbeDimensionsViaFfprobeAsync(string videoPath, CancellationToken ct)
    {
        var bin       = OperatingSystem.IsWindows() ? "ffprobe.exe" : "ffprobe";
        var ffprobePath = Path.Combine(FFmpeg.ExecutablesPath ?? _ffmpeg.BinaryPath, bin);

        var args = new[]
        {
            "-v", "error",
            "-select_streams", "v:0",
            "-show_entries", "stream=width,height",
            "-of", "csv=s=x:p=0",
            videoPath,
        };

        using var proc = new Process();
        proc.StartInfo = new ProcessStartInfo
        {
            FileName               = ffprobePath,
            RedirectStandardOutput = true,
            RedirectStandardError  = true,
            UseShellExecute        = false,
            CreateNoWindow         = true,
        };
        foreach (var arg in args) proc.StartInfo.ArgumentList.Add(arg);
        proc.Start();

        var stdout = await proc.StandardOutput.ReadToEndAsync(ct);
        await proc.WaitForExitAsync(ct);

        // Output: "1920x1080"
        var parts = stdout.Trim().Split('x');
        if (parts.Length == 2 &&
            int.TryParse(parts[0], out var w) &&
            int.TryParse(parts[1], out var h))
        {
            return (w, h);
        }

        return (0, 0);
    }

    // ── FFmpeg path ───────────────────────────────────────────────────────────

    private static bool _ready;
    private static readonly SemaphoreSlim _lock = new(1, 1);

    private async Task<string> GetFFmpegPathAsync(CancellationToken ct)
    {
        if (!_ready)
        {
            await _lock.WaitAsync(ct);
            try
            {
                if (!_ready)
                {
                    var sysPath = File.Exists("/usr/local/bin/ffmpeg") ? "/usr/local/bin"
                                : File.Exists("/usr/bin/ffmpeg")       ? "/usr/bin"
                                : null;
                    if (sysPath != null)
                        FFmpeg.SetExecutablesPath(sysPath);
                    else
                    {
                        var path = Path.GetFullPath(_ffmpeg.BinaryPath);
                        Directory.CreateDirectory(path);
                        FFmpeg.SetExecutablesPath(path);

                        var exe = Path.Combine(path, OperatingSystem.IsWindows() ? "ffmpeg.exe" : "ffmpeg");
                        if (!File.Exists(exe))
                            await FFmpegDownloader.GetLatestVersion(FFmpegVersion.Official, path);
                    }
                    _ready = true;
                }
            }
            finally { _lock.Release(); }
        }

        var bin = OperatingSystem.IsWindows() ? "ffmpeg.exe" : "ffmpeg";
        return Path.Combine(FFmpeg.ExecutablesPath ?? _ffmpeg.BinaryPath, bin);
    }

    // ── Cleanup ───────────────────────────────────────────────────────────────

    private static void TryDeleteDirectory(string path)
    {
        try { Directory.Delete(path, recursive: true); }
        catch { /* non-fatal */ }
    }
}
