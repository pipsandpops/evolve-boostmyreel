namespace AIReelBooster.API.SmartReframe;

/// <summary>
/// Phase 1 Smart Reframe service.
/// Accepts a source video path, detects faces per-frame using OpenCV Haar Cascade,
/// and produces a 9:16 vertical output video with the face kept horizontally centred.
/// </summary>
public interface ISmartReframeService
{
    /// <summary>
    /// Reframes the video at <paramref name="inputVideoPath"/> to 9:16 vertical
    /// with the detected face centred, writing the result to <paramref name="outputVideoPath"/>.
    /// </summary>
    /// <param name="inputVideoPath">Absolute path to the source video.</param>
    /// <param name="outputVideoPath">Absolute path for the output video.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>A <see cref="SmartReframeResult"/> describing what was done.</returns>
    Task<SmartReframeResult> ReframeAsync(
        string            inputVideoPath,
        string            outputVideoPath,
        CancellationToken ct = default);
}
