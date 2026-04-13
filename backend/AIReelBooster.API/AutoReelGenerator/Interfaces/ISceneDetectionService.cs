using AIReelBooster.API.AutoReelGenerator.Models;

namespace AIReelBooster.API.AutoReelGenerator.Interfaces;

/// <summary>
/// Analyses a video file with FFmpeg and returns candidate segments grouped by visual activity.
/// </summary>
public interface ISceneDetectionService
{
    /// <summary>
    /// Runs FFmpeg scene detection and returns segments between scene-change events.
    /// Segments shorter than <paramref name="minSeconds"/> or longer than
    /// <paramref name="maxSeconds"/> are filtered out.
    /// </summary>
    /// <param name="videoPath">Absolute path to the source video file.</param>
    /// <param name="threshold">
    ///   Scene-change sensitivity (0.0–1.0). Recommended range: 0.25–0.50.
    ///   Lower = more segments, higher = fewer but more dramatic changes.
    /// </param>
    /// <param name="minSeconds">Discard segments shorter than this.</param>
    /// <param name="maxSeconds">Discard segments longer than this.</param>
    Task<List<SceneSegment>> DetectScenesAsync(
        string            videoPath,
        double            threshold  = 0.35,
        double            minSeconds = 5.0,
        double            maxSeconds = 30.0,
        CancellationToken ct         = default);
}
