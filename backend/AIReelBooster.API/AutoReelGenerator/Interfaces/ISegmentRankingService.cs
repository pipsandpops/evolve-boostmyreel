using AIReelBooster.API.AutoReelGenerator.Models;
using AIReelBooster.API.Models.Domain;

namespace AIReelBooster.API.AutoReelGenerator.Interfaces;

/// <summary>
/// Scores candidate segments across four dimensions and selects the top N.
///
/// Scoring weights:
///   Motion intensity  35% – visual activity within the window
///   Speech density    30% – words-per-second from transcript overlap
///   Keyword presence  15% – niche-specific engagement vocabulary (dynamic via Claude, falls back to hardcoded list)
///   Duration optimum  20% – preference for 15–30 s clips
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
    /// <param name="dynamicKeywords">
    ///   Niche-specific viral keywords extracted by Claude from the full transcript.
    ///   When null or empty the service falls back to its internal hardcoded vocabulary.
    /// </param>
    List<RankedSegment> RankAndSelect(
        IReadOnlyList<SceneSegment> segments,
        IReadOnlyList<SubtitleEntry>? subtitles,
        int maxReels = 5,
        HashSet<string>? dynamicKeywords = null);
}
