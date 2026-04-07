using AIReelBooster.API.AutoReelGenerator.Models;

namespace AIReelBooster.API.AutoReelGenerator.Interfaces;

/// <summary>
/// AI-driven Smart Reframe service.
/// Extracts frames from a video segment, uses Claude Vision to locate the
/// primary subject in each frame, applies smoothing, and returns a list of
/// time-windowed <see cref="CropInstruction"/> objects for dynamic 9:16 cropping.
/// </summary>
public interface IAutoReframeService
{
    /// <summary>
    /// Analyses a clip segment and produces a crop instruction timeline that
    /// dynamically follows the main subject (face / speaker).
    /// </summary>
    /// <param name="videoPath">Absolute path to the source video file.</param>
    /// <param name="clipStart">Start of the clip within the source video.</param>
    /// <param name="clipEnd">End of the clip within the source video.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>
    /// Ordered list of <see cref="CropInstruction"/> objects with clip-relative
    /// times (0 = clip start). Returns an empty list if analysis fails — the
    /// caller should fall back to centre-crop in that case.
    /// </returns>
    Task<List<CropInstruction>> AnalyzeAsync(
        string            videoPath,
        TimeSpan          clipStart,
        TimeSpan          clipEnd,
        CancellationToken ct = default);
}
