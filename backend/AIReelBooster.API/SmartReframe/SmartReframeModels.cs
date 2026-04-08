namespace AIReelBooster.API.SmartReframe;

// ── Request / Response ────────────────────────────────────────────────────────

/// <summary>POST /api/video/smart-reframe request body.</summary>
public record SmartReframeRequest(
    /// <summary>Job ID of a completed video analysis job whose file will be reframed.</summary>
    string JobId);

/// <summary>POST /api/video/smart-reframe response body.</summary>
public record SmartReframeResponse(
    string ReframeJobId,
    string Status,
    string? OutputUrl);

// ── Internal result ───────────────────────────────────────────────────────────

/// <summary>Internal result returned by <see cref="ISmartReframeService.ReframeAsync"/>.</summary>
public class SmartReframeResult
{
    /// <summary>Whether a face was detected in at least one frame.</summary>
    public bool FaceDetected { get; set; }

    /// <summary>Number of frames analysed.</summary>
    public int FramesAnalysed { get; set; }

    /// <summary>Number of frames where a face was found.</summary>
    public int FramesWithFace { get; set; }

    /// <summary>
    /// Final crop X used (pixels from left of source frame).
    /// Median of all per-frame detections.
    /// </summary>
    public int CropX { get; set; }

    /// <summary>Crop window width in source pixels (= inputHeight × 9/16).</summary>
    public int CropWidth { get; set; }

    /// <summary>Crop window height in source pixels (= inputHeight).</summary>
    public int CropHeight { get; set; }
}

// ── Per-frame face measurement ────────────────────────────────────────────────

internal record FaceMeasurement(
    double Timestamp,
    int    FaceCenterX,
    int    CropX,
    bool   FaceDetected);
