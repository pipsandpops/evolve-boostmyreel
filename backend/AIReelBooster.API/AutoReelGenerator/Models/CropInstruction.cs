namespace AIReelBooster.API.AutoReelGenerator.Models;

/// <summary>
/// A single time-windowed crop rectangle for the Smart Reframe pipeline.
/// Times are relative to the clip start (0 = clip begin).
/// X/Y/Width/Height are in source-video pixels.
/// </summary>
public class CropInstruction
{
    /// <summary>Clip-relative start time in seconds.</summary>
    public double StartTime { get; set; }

    /// <summary>Clip-relative end time in seconds.</summary>
    public double EndTime { get; set; }

    /// <summary>Left edge of the crop window (pixels from left of source frame).</summary>
    public int X { get; set; }

    /// <summary>Top edge of the crop window (pixels from top of source frame). Typically 0.</summary>
    public int Y { get; set; }

    /// <summary>Width of the crop window in pixels (= inputHeight × 9/16).</summary>
    public int Width { get; set; }

    /// <summary>Height of the crop window in pixels (= inputHeight for portrait output).</summary>
    public int Height { get; set; }
}
