namespace AIReelBooster.API.AutoReelGenerator.Models;

/// <summary>
/// A <see cref="SceneSegment"/> enriched with multi-factor ranking scores.
/// </summary>
public class RankedSegment : SceneSegment
{
    /// <summary>0–100. Derived from FFmpeg motion density within the window.</summary>
    public double MotionScore     { get; set; }

    /// <summary>0–100. Words-per-second density from subtitle/transcript overlap.</summary>
    public double SpeechScore     { get; set; }

    /// <summary>0–100. Presence of high-engagement keyword clusters in transcript.</summary>
    public double KeywordScore    { get; set; }

    /// <summary>0–100. Preference for 10–20 s clips; penalises very short/long.</summary>
    public double DurationScore   { get; set; }

    /// <summary>Weighted composite of all four factors (0–100).</summary>
    public double CompositeScore  { get; set; }

    /// <summary>Transcript text that overlaps this segment (may be null if no audio).</summary>
    public string? TranscriptSnippet { get; set; }
}
