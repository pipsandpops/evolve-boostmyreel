namespace AIReelBooster.API.ImageGrowthEngine.Models;

/// <summary>
/// Pixel-level metrics extracted by ImageSharp — no AI required.
/// All scores are 0-100 unless noted.
/// </summary>
public class VisualFeatures
{
    // ── Dimensions ────────────────────────────────────────────────────────────
    public int Width { get; set; }
    public int Height { get; set; }
    public string AspectRatio { get; set; } = string.Empty;   // "1:1" | "4:5" | "9:16" | "16:9" | "other"
    public bool IsVertical => Height > Width;

    // ── Photometric quality ───────────────────────────────────────────────────
    /// <summary>Average luminance: 0=black, 100=white. Sweet spot: 35-75.</summary>
    public double Brightness { get; set; }

    /// <summary>Standard-deviation of luminance scaled to 0-100. Higher = more punch.</summary>
    public double Contrast { get; set; }

    /// <summary>Laplacian-variance sharpness estimate scaled to 0-100.</summary>
    public double Sharpness { get; set; }

    /// <summary>Edge density proxy for visual complexity. High = cluttered.</summary>
    public double VisualClutterScore { get; set; }

    // ── Color ─────────────────────────────────────────────────────────────────
    public List<string> DominantColors { get; set; } = [];   // hex strings e.g. "#FF5733"
    public string ColorTemperature { get; set; } = string.Empty;  // "warm" | "cool" | "neutral"
    public bool IsHighContrast => Contrast >= 55;
    public bool IsWellLit => Brightness is >= 30 and <= 80;
    public bool IsSharp => Sharpness >= 50;
}
