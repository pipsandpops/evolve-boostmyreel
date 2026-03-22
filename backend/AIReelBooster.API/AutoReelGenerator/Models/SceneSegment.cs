namespace AIReelBooster.API.AutoReelGenerator.Models;

/// <summary>
/// A candidate clip window produced by scene detection.
/// </summary>
public class SceneSegment
{
    public int      Index      { get; set; }
    public TimeSpan StartTime  { get; set; }
    public TimeSpan EndTime    { get; set; }

    /// <summary>
    /// Number of scene-change events within this window, normalised 0–1.
    /// Used as the raw motion intensity signal.
    /// </summary>
    public double   MotionDensity { get; set; }

    public TimeSpan Duration => EndTime - StartTime;
}
