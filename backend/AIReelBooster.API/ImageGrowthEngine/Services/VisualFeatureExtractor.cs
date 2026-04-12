using AIReelBooster.API.ImageGrowthEngine.Interfaces;
using AIReelBooster.API.ImageGrowthEngine.Models;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;

namespace AIReelBooster.API.ImageGrowthEngine.Services;

/// <summary>
/// Pure ImageSharp implementation — extracts brightness, contrast, sharpness,
/// dominant colours, and clutter score without any API calls.
/// </summary>
public class VisualFeatureExtractor : IVisualFeatureExtractor
{
    private readonly ILogger<VisualFeatureExtractor> _logger;

    public VisualFeatureExtractor(ILogger<VisualFeatureExtractor> logger)
        => _logger = logger;

    public Task<VisualFeatures> ExtractAsync(Stream imageStream, CancellationToken ct = default)
    {
        // Wrap synchronous ImageSharp work on a thread-pool thread
        return Task.Run(() => Extract(imageStream), ct);
    }

    private VisualFeatures Extract(Stream stream)
    {
        using var image = Image.Load<Rgba32>(stream);

        int width  = image.Width;
        int height = image.Height;

        // ── Pass 1: brightness + collect per-pixel luminance ─────────────────
        double lumSum  = 0;
        long   pixels  = (long)width * height;
        var    lumGrid = new double[pixels]; // store for std-dev + sharpness
        var    colorBuckets = new Dictionary<uint, int>(); // RGB→count for dominant colour

        image.ProcessPixelRows(accessor =>
        {
            long idx = 0;
            for (int y = 0; y < accessor.Height; y++)
            {
                var row = accessor.GetRowSpan(y);
                foreach (ref Rgba32 px in row)
                {
                    double lum = (0.299 * px.R + 0.587 * px.G + 0.114 * px.B) / 255.0;
                    lumSum        += lum;
                    lumGrid[idx++] = lum;

                    // Bucket to 32-level per-channel for dominant colour
                    uint bucket = ((uint)(px.R >> 3) << 10)
                                | ((uint)(px.G >> 3) << 5)
                                |  (uint)(px.B >> 3);
                    colorBuckets.TryGetValue(bucket, out var cnt);
                    colorBuckets[bucket] = cnt + 1;
                }
            }
        });

        double brightness = (lumSum / pixels) * 100.0;

        // ── Pass 2: contrast (σ of luminance) ────────────────────────────────
        double mean       = lumSum / pixels;
        double varSum     = 0;
        foreach (var lum in lumGrid) varSum += (lum - mean) * (lum - mean);
        double stdDev   = Math.Sqrt(varSum / pixels);
        double contrast = Math.Min(stdDev * 300.0, 100.0);

        // ── Pass 3: sharpness (Laplacian-variance on sampled grid) ───────────
        double sharpness = ComputeSharpness(image, width, height);

        // ── Pass 4: visual clutter (normalised edge density) ─────────────────
        double clutterScore = ComputeClutter(image, width, height);

        // ── Dominant colours (top-5 buckets → hex) ───────────────────────────
        var topBuckets = colorBuckets
            .OrderByDescending(kv => kv.Value)
            .Take(5)
            .Select(kv =>
            {
                int r = (int)((kv.Key >> 10) & 0x1F) << 3;
                int g = (int)((kv.Key >> 5)  & 0x1F) << 3;
                int b = (int)( kv.Key        & 0x1F) << 3;
                return $"#{r:X2}{g:X2}{b:X2}";
            })
            .ToList();

        // ── Colour temperature ────────────────────────────────────────────────
        string temp = ComputeColorTemperature(image, width, height);

        // ── Aspect ratio ──────────────────────────────────────────────────────
        string aspect = ClassifyAspectRatio(width, height);

        _logger.LogInformation(
            "Visual extract: {W}x{H} brightness={B:F1} contrast={C:F1} sharpness={S:F1} clutter={CL:F1}",
            width, height, brightness, contrast, sharpness, clutterScore);

        return new VisualFeatures
        {
            Width             = width,
            Height            = height,
            AspectRatio       = aspect,
            Brightness        = Math.Round(brightness, 1),
            Contrast          = Math.Round(contrast, 1),
            Sharpness         = Math.Round(sharpness, 1),
            VisualClutterScore = Math.Round(clutterScore, 1),
            DominantColors    = topBuckets,
            ColorTemperature  = temp,
        };
    }

    // ── Sharpness via approximate Laplacian variance ──────────────────────────

    private static double ComputeSharpness(Image<Rgba32> img, int width, int height)
    {
        // Sample every 4th pixel for speed; apply 3×3 Laplacian kernel
        int step    = Math.Max(1, Math.Min(width, height) / 80);
        double sumSq = 0;
        long   count = 0;

        for (int y = step; y < height - step; y += step)
        {
            for (int x = step; x < width - step; x += step)
            {
                double c  = Lum(img[x,     y    ]);
                double n  = Lum(img[x,     y - step]);
                double s  = Lum(img[x,     y + step]);
                double e  = Lum(img[x + step, y]);
                double w  = Lum(img[x - step, y]);
                double lap = 4 * c - n - s - e - w;
                sumSq += lap * lap;
                count++;
            }
        }

        if (count == 0) return 50;
        double variance = sumSq / count;
        // Map variance [0…0.03] → [0…100]
        return Math.Min(variance / 0.03 * 100.0, 100.0);
    }

    // ── Clutter via normalised gradient magnitude density ────────────────────

    private static double ComputeClutter(Image<Rgba32> img, int width, int height)
    {
        int    step       = Math.Max(1, Math.Min(width, height) / 80);
        double edgeSum    = 0;
        long   count      = 0;

        for (int y = step; y < height - step; y += step)
        {
            for (int x = step; x < width - step; x += step)
            {
                double gx = Lum(img[x + step, y]) - Lum(img[x - step, y]);
                double gy = Lum(img[x, y + step]) - Lum(img[x, y - step]);
                edgeSum += Math.Sqrt(gx * gx + gy * gy);
                count++;
            }
        }

        if (count == 0) return 50;
        double mean = edgeSum / count;
        // Typical range 0–0.3; map to 0-100
        return Math.Min(mean / 0.3 * 100.0, 100.0);
    }

    // ── Colour temperature (warm/cool/neutral by R-B bias) ───────────────────

    private static string ComputeColorTemperature(Image<Rgba32> img, int width, int height)
    {
        int step = Math.Max(1, Math.Min(width, height) / 40);
        long rSum = 0, bSum = 0, n = 0;

        for (int y = 0; y < height; y += step)
        {
            for (int x = 0; x < width; x += step)
            {
                var px = img[x, y];
                rSum += px.R;
                bSum += px.B;
                n++;
            }
        }

        if (n == 0) return "neutral";
        double diff = (double)(rSum - bSum) / n;
        if (diff > 15)  return "warm";
        if (diff < -15) return "cool";
        return "neutral";
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static double Lum(Rgba32 px)
        => (0.299 * px.R + 0.587 * px.G + 0.114 * px.B) / 255.0;

    private static string ClassifyAspectRatio(int w, int h)
    {
        if (h == 0) return "other";
        double ratio = (double)w / h;
        return ratio switch
        {
            >= 0.95 and <= 1.05 => "1:1",
            >= 0.78 and <= 0.82 => "4:5",
            >= 0.55 and <= 0.57 => "9:16",
            >= 1.75 and <= 1.80 => "16:9",
            >= 1.30 and <= 1.35 => "4:3",
            _                    => "other",
        };
    }
}
