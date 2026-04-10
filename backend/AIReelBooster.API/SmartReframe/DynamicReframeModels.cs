namespace AIReelBooster.API.SmartReframe;

// ── Bounding box (normalised 0.0–1.0 relative to frame dimensions) ────────────

/// <summary>
/// Axis-aligned bounding box for a detected face, expressed as fractions of
/// the frame dimensions (0.0 = top/left, 1.0 = bottom/right).
/// </summary>
public record BoundingBox(
    double X,       // left edge
    double Y,       // top edge
    double Width,
    double Height)
{
    public double CenterX => X + Width  / 2.0;
    public double CenterY => Y + Height / 2.0;

    /// <summary>Area (used to pick the largest face when multiple are detected).</summary>
    public double Area => Width * Height;
}

// ── Per-frame analysis result ─────────────────────────────────────────────────

/// <summary>
/// Result of face detection on a single extracted frame.
/// </summary>
public class FrameAnalysisResult
{
    /// <summary>Clip-relative timestamp of this frame in seconds.</summary>
    public double TimestampSeconds { get; init; }

    /// <summary>Largest face detected, or null when no face was found.</summary>
    public BoundingBox? Face { get; init; }

    /// <summary>True when a face was detected in this frame.</summary>
    public bool HasFace => Face is not null;
}

// ── Dynamic reframe result (mirrors SmartReframeResult for the controller) ────

/// <summary>
/// Result returned by <see cref="IDynamicReframeService.ReframeAsync"/>.
/// Contains the same fields as <see cref="SmartReframeResult"/> so the
/// controller can produce a unified response.
/// </summary>
public class DynamicReframeResult
{
    public bool FaceDetected   { get; set; }
    public int  FramesAnalysed { get; set; }
    public int  FramesWithFace { get; set; }
    public int  CropX          { get; set; }
    public int  CropWidth      { get; set; }
    public int  CropHeight     { get; set; }
}
