using System.Diagnostics;
using System.Globalization;
using System.Text;
using AIReelBooster.API.Configuration;
using Microsoft.Extensions.Options;
using OpenCvSharp;
using Xabe.FFmpeg;
using Xabe.FFmpeg.Downloader;

namespace AIReelBooster.API.SmartReframe;

/// <summary>
/// Smart Reframe v2 — dynamic per-frame crop with moving-average smoothing.
///
/// Pipeline:
///   1. Probe source dimensions via FFmpeg.
///   2. Extract frames at <see cref="ExtractionFps"/> using FFmpeg.
///   3. Run OpenCV Haar Cascade face detection on every extracted frame.
///      - Largest face wins when multiple are detected.
///      - Missing-face frames inherit the last known position (dead-zone fill).
///   4. Apply a moving-average smoother (window = <see cref="SmoothingWindow"/>)
///      to the face-centre X values.
///   5. Apply a dead-zone: only update crop position when the subject has moved
///      more than <see cref="DeadZonePixels"/> from the current crop centre.
///      This eliminates micro-jitter from stationary subjects.
///   6. Write an FFmpeg <c>sendcmd</c> script that updates the crop filter's
///      <c>x</c> parameter at each sampled timestamp — no commas inside
///      filter expressions, so no filtergraph parser issues.
///   7. Invoke FFmpeg with the sendcmd script + crop + scale to 9:16 output.
/// </summary>
public class DynamicReframeService : IDynamicReframeService
{
    // ── Tuning constants ──────────────────────────────────────────────────────

    /// <summary>Frames per second to extract for face analysis.</summary>
    private const double ExtractionFps = 5.0;

    /// <summary>Maximum frames to analyse (caps cost on long videos).</summary>
    private const int MaxFrames = 150;

    /// <summary>Moving-average window for crop-X smoothing (frames).</summary>
    private const int SmoothingWindow = 7;

    /// <summary>
    /// Dead-zone: minimum pixel shift from the current crop centre before the
    /// crop position is updated.  Prevents micro-jitter when the subject is
    /// nearly stationary.
    /// </summary>
    private const int DeadZonePixels = 20;

    /// <summary>Output portrait width.</summary>
    private const int OutputWidth  = 1080;

    /// <summary>Output portrait height.</summary>
    private const int OutputHeight = 1920;

    // ── Dependencies ──────────────────────────────────────────────────────────

    private readonly FFmpegSettings _ffmpeg;
    private readonly ILogger<DynamicReframeService> _logger;

    private static readonly string CascadePath = Path.Combine(
        AppContext.BaseDirectory, "SmartReframe", "haarcascade_frontalface_default.xml");

    private static bool _ffmpegReady;
    private static readonly SemaphoreSlim _ffmpegLock = new(1, 1);

    public DynamicReframeService(
        IOptions<AppSettings>            opts,
        ILogger<DynamicReframeService>   logger)
    {
        _ffmpeg = opts.Value.FFmpeg;
        _logger = logger;
    }

    // ── Public API ────────────────────────────────────────────────────────────

    public async Task<DynamicReframeResult> ReframeAsync(
        string            inputVideoPath,
        string            outputVideoPath,
        CancellationToken ct = default)
    {
        _logger.LogInformation("DynamicReframe: starting — input={Input}", inputVideoPath);
        await EnsureFFmpegAsync(ct);

        // Step 1: probe dimensions
        var (inputWidth, inputHeight) = await ProbeDimensionsAsync(inputVideoPath, ct);
        if (inputWidth <= 0 || inputHeight <= 0)
            throw new InvalidOperationException("Could not probe video dimensions.");

        var cropWidth   = (int)(inputHeight * 9.0 / 16.0);
        var cropHeight  = inputHeight;
        var centreCropX = (inputWidth - cropWidth) / 2;

        _logger.LogInformation(
            "DynamicReframe: source={W}×{H} cropW={CW} centreX={CX}",
            inputWidth, inputHeight, cropWidth, centreCropX);

        // Already portrait — fall back to static centre crop
        if (cropWidth >= inputWidth)
        {
            _logger.LogInformation("DynamicReframe: already portrait — static centre crop");
            await ApplyStaticCropAsync(inputVideoPath, outputVideoPath, centreCropX, 0, cropWidth, cropHeight, ct);
            return new DynamicReframeResult
            {
                FaceDetected   = false,
                FramesAnalysed = 0,
                CropX          = centreCropX,
                CropWidth      = cropWidth,
                CropHeight     = cropHeight,
            };
        }

        // Step 2: extract frames
        var frameDir = Path.Combine(Path.GetTempPath(), $"dynreframe_{Guid.NewGuid():N}");
        Directory.CreateDirectory(frameDir);

        try
        {
            await ExtractFramesAsync(inputVideoPath, frameDir, ct);

            var frameFiles = Directory.GetFiles(frameDir, "frame_*.jpg")
                                      .OrderBy(f => f)
                                      .ToList();

            _logger.LogInformation("DynamicReframe: {Count} frames extracted", frameFiles.Count);

            // Step 3: detect faces per frame
            var analysed = AnalyseFrames(frameFiles, inputWidth, inputHeight, cropWidth, centreCropX);

            var framesWithFace = analysed.Count(r => r.HasFace);
            _logger.LogInformation(
                "DynamicReframe: {F}/{T} frames had a face detected",
                framesWithFace, analysed.Count);

            // Step 4: smooth the face-centre X series
            var smoothedX = SmoothCropX(analysed, cropWidth, inputWidth, centreCropX);

            // Step 5: apply dead-zone to eliminate micro-jitter
            var stabilisedX = ApplyDeadZone(smoothedX, DeadZonePixels);

            // Derive a representative single crop X for the result object
            var sortedFinal = stabilisedX.OrderBy(v => v).ToList();
            var medianFinal = sortedFinal.Count > 0 ? sortedFinal[sortedFinal.Count / 2] : centreCropX;

            _logger.LogInformation(
                "DynamicReframe: median cropX={X} faceDetected={F}",
                medianFinal, framesWithFace > 0);

            // Step 6: write sendcmd script
            var sendcmdPath = Path.Combine(frameDir, "crop_cmds.txt");
            WriteSendcmdScript(analysed, stabilisedX, sendcmdPath);

            // Step 7: render with dynamic crop
            await ApplyDynamicCropAsync(
                inputVideoPath, outputVideoPath,
                centreCropX, cropWidth, cropHeight,
                sendcmdPath, ct);

            return new DynamicReframeResult
            {
                FaceDetected   = framesWithFace > 0,
                FramesAnalysed = analysed.Count,
                FramesWithFace = framesWithFace,
                CropX          = medianFinal,
                CropWidth      = cropWidth,
                CropHeight     = cropHeight,
            };
        }
        finally
        {
            TryDeleteDir(frameDir);
        }
    }

    // ── Frame extraction ──────────────────────────────────────────────────────

    private async Task ExtractFramesAsync(string videoPath, string outputDir, CancellationToken ct)
    {
        var ffmpegExe = BuildFFmpegPath();
        var ic        = CultureInfo.InvariantCulture;

        var args = new[]
        {
            "-y",
            "-i",        videoPath,
            "-vf",       $"fps={ExtractionFps.ToString(ic)},scale=640:-1",
            "-frames:v", MaxFrames.ToString(),
            "-q:v",      "4",
            Path.Combine(outputDir, "frame_%04d.jpg"),
        };

        await RunFFmpegAsync(ffmpegExe, args, ct);
    }

    // ── Face detection (OpenCV Haar Cascade) ──────────────────────────────────

    private List<FrameAnalysisResult> AnalyseFrames(
        List<string> frameFiles,
        int          videoWidth,
        int          videoHeight,
        int          cropWidth,
        int          centreCropX)
    {
        if (!File.Exists(CascadePath))
        {
            _logger.LogWarning(
                "DynamicReframe: cascade not found at {Path} — using centre for all frames",
                CascadePath);

            return frameFiles.Select((_, i) => new FrameAnalysisResult
            {
                TimestampSeconds = i / ExtractionFps,
                Face             = null,
            }).ToList();
        }

        using var cascade = new CascadeClassifier(CascadePath);
        var results       = new List<FrameAnalysisResult>(frameFiles.Count);

        for (var i = 0; i < frameFiles.Count; i++)
        {
            var ts = i / ExtractionFps;

            try
            {
                using var mat = Cv2.ImRead(frameFiles[i], ImreadModes.Grayscale);
                if (mat.Empty())
                {
                    results.Add(new FrameAnalysisResult { TimestampSeconds = ts });
                    continue;
                }

                // Scale factor: frames extracted at width=640, map back to source
                var scaleX = (double)videoWidth  / mat.Width;
                var scaleY = (double)videoHeight / mat.Height;

                Cv2.EqualizeHist(mat, mat);

                var faces = cascade.DetectMultiScale(
                    image:       mat,
                    scaleFactor: 1.1,
                    minNeighbors: 4,
                    flags:       HaarDetectionTypes.ScaleImage,
                    minSize:     new Size(30, 30));

                if (faces.Length == 0)
                {
                    results.Add(new FrameAnalysisResult { TimestampSeconds = ts });
                    continue;
                }

                // Pick the largest face
                var best = faces.OrderByDescending(f => f.Width * f.Height).First();

                var normX = (best.X * scaleX) / videoWidth;
                var normY = (best.Y * scaleY) / videoHeight;
                var normW = (best.Width  * scaleX) / videoWidth;
                var normH = (best.Height * scaleY) / videoHeight;

                results.Add(new FrameAnalysisResult
                {
                    TimestampSeconds = ts,
                    Face = new BoundingBox(normX, normY, normW, normH),
                });

                _logger.LogDebug(
                    "DynamicReframe: frame {I} t={T:F2}s face=({X:F2},{Y:F2}) w={W:F2}",
                    i, ts, normX, normY, normW);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "DynamicReframe: face detection error on frame {I}", i);
                results.Add(new FrameAnalysisResult { TimestampSeconds = ts });
            }
        }

        return results;
    }

    // ── Smoothing ─────────────────────────────────────────────────────────────

    /// <summary>
    /// Converts per-frame face detections to a smoothed list of crop-left-X
    /// pixel values.
    ///
    /// Strategy:
    ///  1. Fill missing-face frames with the last known face centre X
    ///     (fallback to video centre).
    ///  2. Apply a symmetric moving-average over <see cref="SmoothingWindow"/>
    ///     frames to eliminate jitter.
    /// </summary>
    private static List<int> SmoothCropX(
        List<FrameAnalysisResult> frames,
        int cropWidth,
        int videoWidth,
        int centreCropX)
    {
        // 1. Fill raw centre-X values (pixel space)
        var rawCentreX = new List<double>(frames.Count);
        double lastKnown = videoWidth / 2.0;

        foreach (var f in frames)
        {
            if (f.HasFace)
            {
                lastKnown = f.Face!.CenterX * videoWidth;
            }
            rawCentreX.Add(lastKnown);
        }

        // 2. Moving average
        var smoothed = new List<double>(frames.Count);
        var half     = SmoothingWindow / 2;

        for (var i = 0; i < rawCentreX.Count; i++)
        {
            var start = Math.Max(0,                    i - half);
            var end   = Math.Min(rawCentreX.Count - 1, i + half);
            var avg   = rawCentreX.Skip(start).Take(end - start + 1).Average();
            smoothed.Add(avg);
        }

        // 3. Convert smooth centre to crop-left X, clamped to frame bounds
        return smoothed
            .Select(cx =>
            {
                var left = (int)Math.Round(cx - cropWidth / 2.0);
                return Math.Max(0, Math.Min(left, videoWidth - cropWidth));
            })
            .ToList();
    }

    /// <summary>
    /// Dead-zone filter: only propagate a new crop-left value when the shift
    /// exceeds <paramref name="threshold"/> pixels.  Keeps the subject
    /// centered without chasing tiny movements.
    /// </summary>
    private static List<int> ApplyDeadZone(List<int> cropX, int threshold)
    {
        if (cropX.Count == 0) return cropX;

        var result  = new List<int>(cropX.Count);
        var current = cropX[0];
        result.Add(current);

        for (var i = 1; i < cropX.Count; i++)
        {
            if (Math.Abs(cropX[i] - current) > threshold)
                current = cropX[i];

            result.Add(current);
        }

        return result;
    }

    // ── sendcmd script builder ────────────────────────────────────────────────

    /// <summary>
    /// Writes an FFmpeg <c>sendcmd</c> script that updates the crop filter's
    /// <c>x</c> value at every sampled frame timestamp.
    ///
    /// Format (one directive per line):
    /// <code>
    ///   0.000 [enter] crop x value 320;
    ///   0.200 [enter] crop x value 330;
    /// </code>
    ///
    /// Using <c>sendcmd</c> avoids embedding commas inside a filter expression
    /// — the FFmpeg filtergraph parser would otherwise treat those commas as
    /// filter-chain separators.
    /// </summary>
    private static void WriteSendcmdScript(
        List<FrameAnalysisResult> frames,
        List<int>                 cropX,
        string                    path)
    {
        var ic = CultureInfo.InvariantCulture;
        var sb = new StringBuilder();

        for (var i = 0; i < frames.Count && i < cropX.Count; i++)
        {
            var ts = frames[i].TimestampSeconds.ToString("F3", ic);
            sb.AppendLine($"{ts} [enter] crop x value {cropX[i]};");
        }

        File.WriteAllText(path, sb.ToString());
    }

    // ── FFmpeg crop rendering ─────────────────────────────────────────────────

    /// <summary>
    /// Renders the output with dynamic per-frame crop driven by the sendcmd script.
    /// The filtergraph is:
    /// <code>
    ///   sendcmd=filename=...,crop=W:H:X0:0,scale=OutputWidth:OutputHeight
    /// </code>
    /// where X0 is the initial crop-left value (updated at each timestamp by sendcmd).
    /// </summary>
    private async Task ApplyDynamicCropAsync(
        string            inputPath,
        string            outputPath,
        int               initialCropX,
        int               cropW,
        int               cropH,
        string            sendcmdPath,
        CancellationToken ct)
    {
        var ffmpegExe = BuildFFmpegPath();

        // Escape backslashes in sendcmd path for FFmpeg on Windows
        var escapedCmd = sendcmdPath.Replace("\\", "/");

        // The filtergraph: sendcmd updates crop's x option at each timestamp
        var vf = $"sendcmd=filename='{escapedCmd}',crop={cropW}:{cropH}:{initialCropX}:0,scale={OutputWidth}:{OutputHeight}";

        _logger.LogInformation("DynamicReframe: applying dynamic crop — vf={VF}", vf);

        var args = new[]
        {
            "-y",
            "-i",      inputPath,
            "-vf",     vf,
            "-c:v",    "libx264",
            "-preset", "fast",
            "-crf",    "18",
            "-c:a",    "aac",
            "-b:a",    "128k",
            "-movflags", "+faststart",
            outputPath,
        };

        await RunFFmpegAsync(ffmpegExe, args, ct);
        _logger.LogInformation("DynamicReframe: output written to {Output}", outputPath);
    }

    /// <summary>Static crop used when the source is already portrait.</summary>
    private async Task ApplyStaticCropAsync(
        string inputPath, string outputPath,
        int cropX, int cropY, int cropW, int cropH,
        CancellationToken ct)
    {
        var ffmpegExe = BuildFFmpegPath();
        var vf        = $"crop={cropW}:{cropH}:{cropX}:{cropY},scale={OutputWidth}:{OutputHeight}";

        var args = new[]
        {
            "-y",
            "-i",      inputPath,
            "-vf",     vf,
            "-c:v",    "libx264",
            "-preset", "fast",
            "-crf",    "18",
            "-c:a",    "aac",
            "-b:a",    "128k",
            "-movflags", "+faststart",
            outputPath,
        };

        await RunFFmpegAsync(ffmpegExe, args, ct);
    }

    // ── Video probe ───────────────────────────────────────────────────────────

    private async Task<(int width, int height)> ProbeDimensionsAsync(string path, CancellationToken ct)
    {
        try
        {
            var info  = await FFmpeg.GetMediaInfo(path, ct);
            var video = info.VideoStreams.FirstOrDefault();
            if (video != null) return ((int)video.Width, (int)video.Height);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "DynamicReframe: Xabe probe failed — trying ffprobe");
        }

        return await ProbeDimensionsViaFfprobeAsync(path, ct);
    }

    private async Task<(int, int)> ProbeDimensionsViaFfprobeAsync(string path, CancellationToken ct)
    {
        var bin     = OperatingSystem.IsWindows() ? "ffprobe.exe" : "ffprobe";
        var ffprobe = Path.Combine(FFmpeg.ExecutablesPath ?? _ffmpeg.BinaryPath, bin);

        var args = new[]
        {
            "-v", "error",
            "-select_streams", "v:0",
            "-show_entries", "stream=width,height",
            "-of", "csv=s=x:p=0",
            path,
        };

        using var proc = new Process();
        proc.StartInfo = new ProcessStartInfo
        {
            FileName               = ffprobe,
            RedirectStandardOutput = true,
            RedirectStandardError  = true,
            UseShellExecute        = false,
            CreateNoWindow         = true,
        };
        foreach (var arg in args) proc.StartInfo.ArgumentList.Add(arg);
        proc.Start();

        var stdout = await proc.StandardOutput.ReadToEndAsync(ct);
        await proc.WaitForExitAsync(ct);

        var parts = stdout.Trim().Split('x');
        if (parts.Length == 2 && int.TryParse(parts[0], out var w) && int.TryParse(parts[1], out var h))
            return (w, h);

        return (0, 0);
    }

    // ── Process runner ────────────────────────────────────────────────────────

    private static async Task RunFFmpegAsync(string exe, string[] args, CancellationToken ct)
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
        foreach (var arg in args) proc.StartInfo.ArgumentList.Add(arg);
        proc.Start();

        var stdoutTask = proc.StandardOutput.ReadToEndAsync(ct);
        var stderrTask = proc.StandardError.ReadToEndAsync(ct);
        await Task.WhenAll(stdoutTask, stderrTask);
        await proc.WaitForExitAsync(ct);

        if (proc.ExitCode != 0)
        {
            var stderr  = await stderrTask;
            var preview = stderr.Length > 600 ? stderr[^600..] : stderr;
            throw new InvalidOperationException(
                $"FFmpeg exited with code {proc.ExitCode}. Last output: {preview}");
        }
    }

    // ── FFmpeg initialisation ─────────────────────────────────────────────────

    private string BuildFFmpegPath()
    {
        var bin = OperatingSystem.IsWindows() ? "ffmpeg.exe" : "ffmpeg";
        return Path.Combine(FFmpeg.ExecutablesPath ?? _ffmpeg.BinaryPath, bin);
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
                var path      = Path.GetFullPath(_ffmpeg.BinaryPath);
                Directory.CreateDirectory(path);
                FFmpeg.SetExecutablesPath(path);

                var ffmpegExe = Path.Combine(path, OperatingSystem.IsWindows() ? "ffmpeg.exe" : "ffmpeg");
                if (!File.Exists(ffmpegExe))
                {
                    _logger.LogInformation("DynamicReframe: downloading FFmpeg to {Path}…", path);
                    await FFmpegDownloader.GetLatestVersion(FFmpegVersion.Official, path);
                }
            }

            _ffmpegReady = true;
        }
        finally
        {
            _ffmpegLock.Release();
        }
    }

    // ── Cleanup ───────────────────────────────────────────────────────────────

    private static void TryDeleteDir(string path)
    {
        try { Directory.Delete(path, recursive: true); }
        catch { /* non-fatal */ }
    }
}
