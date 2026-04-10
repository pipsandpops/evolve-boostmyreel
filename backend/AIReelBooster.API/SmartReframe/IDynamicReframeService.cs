namespace AIReelBooster.API.SmartReframe;

/// <summary>
/// Enhanced Smart Reframe v2 — per-frame face tracking with moving-average
/// smoothing and FFmpeg sendcmd-driven dynamic crop.
///
/// Enabled via <c>AppSettings.Features.EnableDynamicReframe = true</c>.
/// When disabled, the existing <see cref="ISmartReframeService"/> is used.
/// </summary>
public interface IDynamicReframeService
{
    /// <summary>
    /// Analyses <paramref name="inputVideoPath"/> frame-by-frame, tracks the
    /// primary face with a moving-average smoother, and writes the dynamically
    /// cropped 9:16 output to <paramref name="outputVideoPath"/>.
    /// </summary>
    Task<DynamicReframeResult> ReframeAsync(
        string            inputVideoPath,
        string            outputVideoPath,
        CancellationToken ct = default);
}
