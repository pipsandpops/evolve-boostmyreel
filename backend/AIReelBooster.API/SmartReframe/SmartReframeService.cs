using System.Diagnostics;
using AIReelBooster.API.Configuration;
using Microsoft.Extensions.Options;
using OpenCvSharp;
using Xabe.FFmpeg;
using Xabe.FFmpeg.Downloader;

namespace AIReelBooster.API.SmartReframe;

/// <summary>
/// Phase 1 Smart Reframe implementation.
///
/// Pipeline:
///   1. Probe source video dimensions via Xabe.FFmpeg.
///   2. Extract frames at <see cref="ExtractionFps"/> using FFmpeg.
///   3. Run OpenCV Haar Cascade face detection on each frame.
///      - Largest face wins when multiple are detected.
///      - Falls back to centre crop when no face is found.
///   4. Compute per-frame crop X, apply a moving-average smoother,
///      then take the median as the single stable crop position.
///   5. Invoke FFmpeg with a static crop filter to produce the 9:16 output.
/// </summary>
public class SmartReframeService : ISmartReframeService
{
    // ── Configuration constants ───────────────────────────────────────────────

    /// <summary>Frames per second to extract for face analysis.</summary>
    private const double ExtractionFps = 5.0;

    /// <summary>Maximum frames to analyse (caps cost on long videos).</summary>
    private const int MaxFrames = 30;

    /// <summary>Moving-average window size for crop-X smoothing.</summary>
    private const int SmoothingWindow = 5;

    /// <summary>Output width for 9:16 portrait reel.</summary>
    private const int OutputWidth = 720;

    /// <summary>Output height for 9:16 portrait reel.</summary>
    private const int OutputHeight = 1280;

    // ── Dependencies ──────────────────────────────────────────────────────────

    private readonly FFmpegSettings _ffmpeg;
    private readonly ILogger<SmartReframeService> _logger;

    // Path to bundled Haar cascade XML, copied to output directory at build.
    private static readonly string CascadePath = Path.Combine(
        AppContext.BaseDirectory, "SmartReframe", "haarcascade_frontalface_default.xml");

    // ── FFmpeg initialisation (shared with other services) ────────────────────
    private static bool   _ffmpegReady;
    private static readonly SemaphoreSlim _ffmpegLock = new(1, 1);

    public SmartReframeService(
        IOptions<AppSettings>          opts,
        ILogger<SmartReframeService>   logger)
    {
        _ffmpeg = opts.Value.FFmpeg;
        _logger = logger;
    }

    // ── Public API ────────────────────────────────────────────────────────────

    public async Task<SmartReframeResult> ReframeAsync(
        string            inputVideoPath,
        string            outputVideoPath,
        CancellationToken ct = default)
    {
        _logger.LogInformation("SmartReframe: starting — input={Input}", inputVideoPath);

        await EnsureFFmpegAsync(ct);

        // ── Step 1: probe dimensions ──────────────────────────────────────────
        var (inputWidth, inputHeight) = await ProbeDimensionsAsync(inputVideoPath, ct);
        if (inputWidth <= 0 || inputHeight <= 0)
            throw new InvalidOperationException("Could not probe video dimensions.");

        var cropWidth  = (int)(inputHeight * 9.0 / 16.0);
        var cropHeight = inputHeight;
        var centreCropX = (inputWidth - cropWidth) / 2;

        _logger.LogInformation(
            "SmartReframe: source={W}×{H} cropW={CW} centreX={CX}",
            inputWidth, inputHeight, cropWidth, centreCropX);

        if (cropWidth >= inputWidth)
        {
            _logger.LogInformation("SmartReframe: video already portrait — using centre crop");
            await ApplyCropAsync(inputVideoPath, outputVideoPath, centreCropX, 0, cropWidth, cropHeight, ct);
            return new SmartReframeResult
            {
                FaceDetected   = false,
                FramesAnalysed = 0,
                CropX          = centreCropX,
                CropWidth      = cropWidth,
                CropHeight     = cropHeight,
            };
        }

        // ── Step 2: extract frames ────────────────────────────────────────────
        var frameDir = Path.Combine(Path.GetTempPath(), $"smreframe_{Guid.NewGuid():N}");
        Directory.CreateDirectory(frameDir);

        try
        {
            await ExtractFramesAsync(inputVideoPath, frameDir, ct);

            var frameFiles = Directory.GetFiles(frameDir, "frame_*.jpg")
                                      .OrderBy(f => f)
                                      .ToList();

            _logger.LogInformation("SmartReframe: {Count} frames extracted", frameFiles.Count);

            // ── Step 3: detect faces ──────────────────────────────────────────
            var measurements = DetectFaces(frameFiles, inputWidth, cropWidth, centreCropX);

            var framesWithFace = measurements.Count(m => m.FaceDetected);
            _logger.LogInformation(
                "SmartReframe: {With}/{Total} frames had a face",
                framesWithFace, measurements.Count);

            // ── Step 4: compute stable crop X ─────────────────────────────────
            var smoothed  = ApplyMovingAverage(measurements.Select(m => m.CropX).ToList(), SmoothingWindow);
            var sortedX   = smoothed.OrderBy(v => v).ToList();
            var finalCropX = sortedX.Count > 0 ? sortedX[sortedX.Count / 2] : centreCropX;
            finalCropX     = Math.Max(0, Math.Min(finalCropX, inputWidth - cropWidth));

            _logger.LogInformation("SmartReframe: final cropX={X} (face detected={F})", finalCropX, framesWithFace > 0);

            // ── Step 5: render output ─────────────────────────────────────────
            await ApplyCropAsync(inputVideoPath, outputVideoPath, finalCropX, 0, cropWidth, cropHeight, ct);

            return new SmartReframeResult
            {
                FaceDetected   = framesWithFace > 0,
                FramesAnalysed = measurements.Count,
                FramesWithFace = framesWithFace,
                CropX          = finalCropX,
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
        var ic        = System.Globalization.CultureInfo.InvariantCulture;

        var args = new[]
        {
            "-y",
            "-i",       videoPath,
            "-vf",      $"fps={ExtractionFps.ToString(ic)},scale=640:-1",
            "-frames:v", MaxFrames.ToString(),
            "-q:v",     "4",
            Path.Combine(outputDir, "frame_%04d.jpg"),
        };

        await RunFFmpegAsync(ffmpegExe, args, ct);
    }

    // ── Face detection (OpenCV Haar Cascade) ──────────────────────────────────

    private List<FaceMeasurement> DetectFaces(
        List<string> frameFiles,
        int          videoWidth,
        int          cropWidth,
        int          centreCropX)
    {
        if (!File.Exists(CascadePath))
        {
            _logger.LogWarning("SmartReframe: cascade file not found at {Path} — using centre crop for all frames", CascadePath);
            return frameFiles.Select((_, i) => new FaceMeasurement(i, videoWidth / 2, centreCropX, false)).ToList();
        }

        using var cascade    = new CascadeClassifier(CascadePath);
        var       results    = new List<FaceMeasurement>(frameFiles.Count);

        for (var i = 0; i < frameFiles.Count; i++)
        {
            try
            {
                using var mat  = Cv2.ImRead(frameFiles[i], ImreadModes.Grayscale);
                if (mat.Empty())
                {
                    results.Add(new FaceMeasurement(i, videoWidth / 2, centreCropX, false));
                    continue;
                }

                // Scale factor: frames were extracted at width=640; face coords are
                // relative to the 640-wide image and need mapping back to source.
                var scaleX = (double)videoWidth / mat.Width;

                Cv2.EqualizeHist(mat, mat);

                var faces = cascade.DetectMultiScale(
                    image:          mat,
                    scaleFactor:    1.1,
                    minNeighbors:   4,
                    flags:          HaarDetectionTypes.ScaleImage,
                    minSize:        new Size(30, 30));

                if (faces.Length == 0)
                {
                    _logger.LogDebug("SmartReframe: frame {I} — no face", i);
                    results.Add(new FaceMeasurement(i, videoWidth / 2, centreCropX, false));
                    continue;
                }

                // Pick the largest face (area = w × h)
                var best       = faces.OrderByDescending(f => f.Width * f.Height).First();
                var faceCenterX = (int)((best.X + best.Width / 2.0) * scaleX);

                // face_center_x = face_x + face_width / 2
                // x_position    = face_center_x - crop_width / 2
                // clamped to [0, videoWidth - cropWidth]
                var cropX = (int)Math.Round(faceCenterX - cropWidth / 2.0);
                cropX     = Math.Max(0, Math.Min(cropX, videoWidth - cropWidth));

                _logger.LogDebug(
                    "SmartReframe: frame {I} — face center={FC} cropX={CX}",
                    i, faceCenterX, cropX);

                results.Add(new FaceMeasurement(i, faceCenterX, cropX, true));
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "SmartReframe: face detection failed for frame {I}", i);
                results.Add(new FaceMeasurement(i, videoWidth / 2, centreCropX, false));
            }
        }

        return results;
    }

    // ── Smoothing ─────────────────────────────────────────────────────────────

    /// <summary>
    /// Applies a simple moving-average to a list of crop-X values.
    /// Replaces frames with no face with the running average of neighbours.
    /// </summary>
    private static List<int> ApplyMovingAverage(List<int> values, int window)
    {
        if (values.Count == 0) return values;

        var smoothed = new List<int>(values.Count);
        for (var i = 0; i < values.Count; i++)
        {
            var start = Math.Max(0, i - window / 2);
            var end   = Math.Min(values.Count - 1, i + window / 2);
            var avg   = (int)Math.Round(values.Skip(start).Take(end - start + 1).Average());
            smoothed.Add(avg);
        }
        return smoothed;
    }

    // ── FFmpeg crop rendering ─────────────────────────────────────────────────

    private async Task ApplyCropAsync(
        string            inputPath,
        string            outputPath,
        int               cropX,
        int               cropY,
        int               cropW,
        int               cropH,
        CancellationToken ct)
    {
        var ffmpegExe  = BuildFFmpegPath();
        var cropFilter = $"crop={cropW}:{cropH}:{cropX}:{cropY},scale={OutputWidth}:{OutputHeight}";

        _logger.LogInformation("SmartReframe: applying crop filter: {Filter}", cropFilter);

        var args = new[]
        {
            "-y",
            "-i",      inputPath,
            "-vf",     cropFilter,
            "-c:v",    "libx264",
            "-preset", "fast",
            "-crf",    "23",
            "-c:a",    "aac",
            "-b:a",    "128k",
            "-movflags", "+faststart",
            outputPath,
        };

        await RunFFmpegAsync(ffmpegExe, args, ct);
        _logger.LogInformation("SmartReframe: output written to {Output}", outputPath);
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
            _logger.LogWarning(ex, "SmartReframe: Xabe probe failed — trying ffprobe");
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
                var path   = Path.GetFullPath(_ffmpeg.BinaryPath);
                Directory.CreateDirectory(path);
                FFmpeg.SetExecutablesPath(path);

                var ffmpegExe = Path.Combine(path, OperatingSystem.IsWindows() ? "ffmpeg.exe" : "ffmpeg");
                if (!File.Exists(ffmpegExe))
                {
                    _logger.LogInformation("SmartReframe: downloading FFmpeg to {Path}…", path);
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
