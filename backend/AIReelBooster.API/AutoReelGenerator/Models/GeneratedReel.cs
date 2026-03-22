namespace AIReelBooster.API.AutoReelGenerator.Models;

/// <summary>
/// A finished vertical reel ready for download.
/// </summary>
public class GeneratedReel
{
    public int     Index             { get; set; }
    public string  Title             { get; set; } = string.Empty;

    /// <summary>SRT-formatted start time, e.g. "00:00:12".</summary>
    public string  StartFormatted    { get; set; } = string.Empty;

    /// <summary>SRT-formatted end time, e.g. "00:00:28".</summary>
    public string  EndFormatted      { get; set; } = string.Empty;

    public TimeSpan Start            { get; set; }
    public TimeSpan End              { get; set; }

    /// <summary>Absolute path to the generated MP4 file on disk.</summary>
    public string  FilePath          { get; set; } = string.Empty;

    /// <summary>Relative URL exposed through the download endpoint.</summary>
    public string  RelativeUrl       { get; set; } = string.Empty;

    /// <summary>0–100 motion intensity score used for ranking.</summary>
    public double  MotionScore       { get; set; }

    /// <summary>0–100 overall engagement potential score.</summary>
    public double  EngagementScore   { get; set; }

    /// <summary>Transcript excerpt for this clip (null when no audio).</summary>
    public string? TranscriptSnippet { get; set; }

    /// <summary>File size in bytes (0 until file is written).</summary>
    public long    FileSizeBytes     { get; set; }
}
