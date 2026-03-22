using AIReelBooster.API.AutoReelGenerator.Models;
using AIReelBooster.API.Models.Domain;

namespace AIReelBooster.API.AutoReelGenerator.Interfaces;

/// <summary>
/// Scores candidate segments across four dimensions and selects the top N.
///
/// Scoring weights:
///   Motion intensity  35% – visual activity within the window
///   Speech density    30% – words-per-second from transcript overlap
///   Keyword presence  15% – high-engagement vocabulary in transcript
///   Duration optimum  20% – preference for 10–20 s clips
/// </summary>
public interface ISegmentRankingService
{
    /// <summary>
    /// Ranks segments and returns the top <paramref name="maxReels"/> by composite score.
    /// Ensures no two returned segments overlap by more than 30%.
    /// </summary>
    /// <param name="segments">Candidate segments from <see cref="ISceneDetectionService"/>.</param>
    /// <param name="subtitles">
    ///   Optional subtitle entries from the source job; used to compute speech and keyword scores.
    /// </param>
    /// <param name="maxReels">Maximum number of reels to return.</param>
    List<RankedSegment> RankAndSelect(
        IReadOnlyList<SceneSegment> segments,
        IReadOnlyList<SubtitleEntry>? subtitles,
        int maxReels = 5);
}
