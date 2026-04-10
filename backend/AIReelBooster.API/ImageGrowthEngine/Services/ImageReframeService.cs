using OpenCvSharp;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Processing;

namespace AIReelBooster.API.ImageGrowthEngine.Services;

/// <summary>
/// Smart Reframe for still images.
///
/// Pipeline (per image):
///   1. OpenCV Haar Cascade face detection — picks the largest face.
///   2. Compute face-centred crop window for the requested aspect ratio.
///      Falls back to centre crop when no face is found.
///   3. SixLabors.ImageSharp crop + resize to the target pixel dimensions.
///   4. Save to a parallel "reframed/" sub-directory next to the originals.
/// </summary>
public class ImageReframeService
{
    // ── Supported output profiles ─────────────────────────────────────────────

    public static readonly Dictionary<string, (int W, int H)> AspectProfiles = new(StringComparer.OrdinalIgnoreCase)
    {
        ["9:16"] = (1080, 1920),   // Instagram Stories / Reels cover
        ["4:5"]  = (1080, 1350),   // Instagram feed portrait (best engagement)
        ["1:1"]  = (1080, 1080),   // Square feed post
    };

    // ── OpenCV cascade path (already bundled by SmartReframeService) ──────────

    private static readonly string CascadePath = Path.Combine(
        AppContext.BaseDirectory, "SmartReframe", "haarcascade_frontalface_default.xml");

    private readonly ILogger<ImageReframeService> _logger;

    public ImageReframeService(ILogger<ImageReframeService> logger)
    {
        _logger = logger;
    }

    // ── Public API ────────────────────────────────────────────────────────────

    /// <summary>
    /// Reframes every image in <paramref name="imagePaths"/> to the requested
    /// aspect ratio, saving results to <paramref name="outputDir"/>.
    /// </summary>
    /// <returns>Absolute paths to the reframed output files.</returns>
    public List<string> ReframeImages(
        IReadOnlyList<string> imagePaths,
        string                outputDir,
        string                aspectRatio)
    {
        if (!AspectProfiles.TryGetValue(aspectRatio, out var profile))
            throw new ArgumentException($"Unsupported aspect ratio '{aspectRatio}'. Supported: {string.Join(", ", AspectProfiles.Keys)}");

        Directory.CreateDirectory(outputDir);

        var results = new List<string>(imagePaths.Count);

        // Load cascade once for the whole batch
        using var cascade = File.Exists(CascadePath)
            ? new CascadeClassifier(CascadePath)
            : null;

        if (cascade == null)
            _logger.LogWarning("ImageReframe: cascade not found at {Path} — using centre crop for all images", CascadePath);

        for (var i = 0; i < imagePaths.Count; i++)
        {
            var inputPath  = imagePaths[i];
            var outputName = $"reframed_{i:D3}{Path.GetExtension(inputPath).ToLowerInvariant()}";
            var outputPath = Path.Combine(outputDir, outputName);

            try
            {
                ReframeSingle(inputPath, outputPath, profile.W, profile.H, cascade);
                results.Add(outputPath);
                _logger.LogInformation(
                    "ImageReframe: [{I}/{N}] {Ratio} → {Out}",
                    i + 1, imagePaths.Count, aspectRatio, outputPath);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "ImageReframe: failed on image {I} ({Path})", i, inputPath);
                throw;
            }
        }

        return results;
    }

    // ── Per-image reframe ─────────────────────────────────────────────────────

    private void ReframeSingle(
        string             inputPath,
        string             outputPath,
        int                targetW,
        int                targetH,
        CascadeClassifier? cascade)
    {
        // ── Detect face (OpenCV) ──────────────────────────────────────────────
        int? faceCenterX = null;
        int? faceCenterY = null;

        if (cascade != null)
        {
            try
            {
                using var mat = Cv2.ImRead(inputPath, ImreadModes.Grayscale);
                if (!mat.Empty())
                {
                    Cv2.EqualizeHist(mat, mat);

                    var faces = cascade.DetectMultiScale(
                        image:        mat,
                        scaleFactor:  1.1,
                        minNeighbors: 4,
                        flags:        HaarDetectionTypes.ScaleImage,
                        minSize:      new OpenCvSharp.Size(30, 30));

                    if (faces.Length > 0)
                    {
                        var best = faces.OrderByDescending(f => f.Width * f.Height).First();
                        faceCenterX = best.X + best.Width  / 2;
                        faceCenterY = best.Y + best.Height / 2;

                        _logger.LogDebug(
                            "ImageReframe: face detected at ({X},{Y}) in {File}",
                            faceCenterX, faceCenterY, Path.GetFileName(inputPath));
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "ImageReframe: face detection failed — using centre crop");
            }
        }

        // ── Crop + resize with ImageSharp ─────────────────────────────────────
        using var image = SixLabors.ImageSharp.Image.Load(inputPath);

        var srcW = image.Width;
        var srcH = image.Height;

        // Compute crop rectangle that matches the target aspect ratio
        var (cropW, cropH) = ComputeCropDimensions(srcW, srcH, targetW, targetH);

        // Face-centred crop origin; fall back to centre
        var centerX = faceCenterX ?? srcW / 2;
        var centerY = faceCenterY ?? srcH / 2;

        var cropX = Math.Max(0, Math.Min(centerX - cropW / 2, srcW - cropW));
        var cropY = Math.Max(0, Math.Min(centerY - cropH / 2, srcH - cropH));

        _logger.LogDebug(
            "ImageReframe: src={SW}x{SH} crop={CW}x{CH}@({CX},{CY}) → {TW}x{TH}",
            srcW, srcH, cropW, cropH, cropX, cropY, targetW, targetH);

        image.Mutate(ctx =>
        {
            ctx.Crop(new SixLabors.ImageSharp.Rectangle(cropX, cropY, cropW, cropH));
            ctx.Resize(targetW, targetH);
        });

        // Save — detect format from extension
        var ext = Path.GetExtension(outputPath).ToLowerInvariant();
        if (ext is ".jpg" or ".jpeg")
        {
            image.SaveAsJpeg(outputPath, new SixLabors.ImageSharp.Formats.Jpeg.JpegEncoder { Quality = 92 });
        }
        else
        {
            image.SaveAsPng(outputPath);
        }
    }

    // ── Geometry helper ───────────────────────────────────────────────────────

    /// <summary>
    /// Computes the largest crop rectangle (in source pixels) that matches the
    /// target aspect ratio without exceeding the source dimensions.
    /// </summary>
    private static (int cropW, int cropH) ComputeCropDimensions(
        int srcW, int srcH, int targetW, int targetH)
    {
        var targetAspect = (double)targetW / targetH;
        var srcAspect    = (double)srcW    / srcH;

        int cropW, cropH;

        if (srcAspect > targetAspect)
        {
            // Source is wider — constrain by height
            cropH = srcH;
            cropW = (int)Math.Round(srcH * targetAspect);
        }
        else
        {
            // Source is taller — constrain by width
            cropW = srcW;
            cropH = (int)Math.Round(srcW / targetAspect);
        }

        return (Math.Min(cropW, srcW), Math.Min(cropH, srcH));
    }
}
