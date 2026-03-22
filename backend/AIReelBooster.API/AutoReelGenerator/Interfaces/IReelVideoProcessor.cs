using AIReelBooster.API.AutoReelGenerator.Models;
using AIReelBooster.API.Models.Domain;

namespace AIReelBooster.API.AutoReelGenerator.Interfaces;

/// <summary>
/// Handles all FFmpeg video operations for the reel generator pipeline:
/// clip extraction, vertical reformatting, zoom/subtitle overlay.
/// </summary>
public interface IReelVideoProcessor
{
    /// <summary>
    /// Cuts a clip from <paramref name="sourceVideoPath"/> between
    /// <paramref name="start"/> and <paramref name="end"/> and re-encodes it.
    /// </summary>
    /// <returns>Absolute path to the extracted clip.</returns>
    Task<string> ExtractClipAsync(
        string            sourceVideoPath,
        TimeSpan          start,
        TimeSpan          end,
        string            outputDir,
        string            fileName,
        CancellationToken ct = default);

    /// <summary>
    /// Converts a clip to 9:16 vertical format with optional zoom-pan and subtitle overlay.
    /// </summary>
    /// <param name="clipPath">Input clip (output of <see cref="ExtractClipAsync"/>).</param>
    /// <param name="subtitles">
    ///   Subtitle entries from the source job; timestamps are automatically offset to clip-relative time.
    ///   Pass null or empty to skip subtitles.
    /// </param>
    /// <param name="clipStartOffset">Original start time used to adjust subtitle timestamps.</param>
    /// <returns>Absolute path to the finished vertical reel.</returns>
    Task<string> ConvertToVerticalAsync(
        string                        clipPath,
        string                        outputDir,
        string                        fileName,
        bool                          enableZoom,
        IReadOnlyList<SubtitleEntry>? subtitles,
        TimeSpan                      clipStartOffset,
        CancellationToken             ct = default);
}
