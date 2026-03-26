using AIReelBooster.API.AutoReelGenerator.Interfaces;
using AIReelBooster.API.AutoReelGenerator.Models;
using AIReelBooster.API.Models.Domain;

namespace AIReelBooster.API.AutoReelGenerator.Services;

/// <summary>
/// Scores each candidate segment across four dimensions then greedily selects
/// the top N while suppressing segments that substantially overlap.
///
/// Scoring weights:
///   Motion intensity  35% – raw visual activity (scene-change density)
///   Speech density    30% – words-per-second from subtitle overlap
///   Keyword presence  15% – high-engagement vocabulary in overlapping text
///   Duration optimum  20% – preference for 10–20 s clips
/// </summary>
public class SegmentRankingService : ISegmentRankingService
{
    // High-engagement vocabulary strongly correlated with viral short-form content
    private static readonly HashSet<string> EngagementKeywords = new(StringComparer.OrdinalIgnoreCase)
    {
        "wait", "but", "actually", "secret", "never", "always", "everyone",
        "nobody", "truth", "finally", "wrong", "myth", "hack", "tip",
        "amazing", "incredible", "shocking", "unbelievable", "honestly",
        "real", "important", "must", "need", "stop", "start", "watch",
        "look", "see", "know", "think", "feel", "happen", "change",
    };

    // ── Public API ────────────────────────────────────────────────────────────

    public List<RankedSegment> RankAndSelect(
        IReadOnlyList<SceneSegment> segments,
        IReadOnlyList<SubtitleEntry>? subtitles,
        int maxReels = 5,
        HashSet<string>? dynamicKeywords = null)
    {
        if (segments.Count == 0) return [];

        // Use Claude-provided keywords when available, fall back to generic list
        var keywords = dynamicKeywords is { Count: > 0 } ? dynamicKeywords : EngagementKeywords;

        // Score every segment
        var scored = segments.Select(s => Score(s, subtitles, keywords)).ToList();

        // Sort descending by composite score
        scored.Sort((a, b) => b.CompositeScore.CompareTo(a.CompositeScore));

        // Greedy overlap-suppression: accept a candidate only if it does NOT
        // overlap any already-selected segment by more than 30% of the
        // shorter segment's duration.
        var selected = new List<RankedSegment>(maxReels);
        foreach (var candidate in scored)
        {
            if (selected.Count >= maxReels) break;
            if (!OverlapsAny(candidate, selected))
                selected.Add(candidate);
        }

        // Re-index
        for (var i = 0; i < selected.Count; i++)
            selected[i].Index = i;

        return selected;
    }

    // ── Scoring ───────────────────────────────────────────────────────────────

    private static RankedSegment Score(
        SceneSegment seg,
        IReadOnlyList<SubtitleEntry>? subtitles,
        HashSet<string> keywords)
    {
        var rs = new RankedSegment
        {
            Index         = seg.Index,
            StartTime     = seg.StartTime,
            EndTime       = seg.EndTime,
            MotionDensity = seg.MotionDensity,
        };

        rs.MotionScore   = ComputeMotionScore(seg);
        rs.SpeechScore   = ComputeSpeechScore(seg, subtitles, out var snippet);
        rs.KeywordScore  = ComputeKeywordScore(snippet, keywords);
        rs.DurationScore = ComputeDurationScore(seg);
        rs.TranscriptSnippet = snippet;

        rs.CompositeScore =
            rs.MotionScore   * 0.35 +
            rs.SpeechScore   * 0.30 +
            rs.KeywordScore  * 0.15 +
            rs.DurationScore * 0.20;

        return rs;
    }

    /// <summary>MotionDensity is already normalised 0–1 by SceneDetectionService.</summary>
    private static double ComputeMotionScore(SceneSegment seg) =>
        Math.Clamp(seg.MotionDensity * 100.0, 0.0, 100.0);

    /// <summary>
    /// Counts words in subtitle entries that overlap the segment window
    /// and computes words-per-second. Normal speech ≈ 2.5 wps = 100 points.
    /// </summary>
    private static double ComputeSpeechScore(
        SceneSegment seg,
        IReadOnlyList<SubtitleEntry>? subtitles,
        out string? snippet)
    {
        snippet = null;
        if (subtitles == null || subtitles.Count == 0) return 0.0;

        var overlap = subtitles
            .Where(s => s.End > seg.StartTime && s.Start < seg.EndTime)
            .ToList();

        if (overlap.Count == 0) return 0.0;

        snippet = string.Join(" ", overlap.Select(s => s.Text));

        var wordCount  = snippet.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length;
        var durSeconds = seg.Duration.TotalSeconds;
        var wps        = durSeconds > 0 ? wordCount / durSeconds : 0.0;

        // 2.5 wps = natural speech = score 100; capped at 100
        return Math.Min(wps / 2.5 * 100.0, 100.0);
    }

    /// <summary>
    /// Scores keyword presence with position weighting:
    ///   - Hook zone (first 3 words) and cliffhanger zone (last 3 words) count 2×
    ///   - Body words count 1×
    /// 5 weighted hits → maximum score.
    /// Accepts the active keyword set (dynamic from Claude or hardcoded fallback).
    /// </summary>
    private static double ComputeKeywordScore(string? snippet, HashSet<string> keywords)
    {
        if (string.IsNullOrWhiteSpace(snippet)) return 0.0;

        var words = snippet.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (words.Length == 0) return 0.0;

        // Segments that are multi-word phrases in the keyword list (e.g. "never do this")
        // are matched by checking if the snippet contains the phrase as a substring.
        double phraseBonus = keywords
            .Where(k => k.Contains(' ') && snippet.Contains(k, StringComparison.OrdinalIgnoreCase))
            .Count() * 2.0;

        // Position-weighted single-word scoring
        var hookZone        = words.Take(3).ToArray();
        var cliffhangerZone = words.TakeLast(3).ToArray();
        var bodyZone        = words.Skip(3).SkipLast(3).ToArray();

        var hookHits        = hookZone.Count(w => keywords.Contains(w));
        var cliffHits       = cliffhangerZone.Count(w => keywords.Contains(w));
        var bodyHits        = bodyZone.Count(w => keywords.Contains(w));

        // Hook + cliffhanger hits count 2× because position is high-value
        var weightedHits = hookHits * 2.0 + cliffHits * 2.0 + bodyHits * 1.0 + phraseBonus;

        // 5 weighted hits = 100 pts
        return Math.Min(weightedHits / 5.0 * 100.0, 100.0);
    }

    /// <summary>
    /// Sweet-spot 10–20 s scores 100.
    /// Linear ramp up 0→10 s; linear decay 20→30 s.
    /// </summary>
    private static double ComputeDurationScore(SceneSegment seg)
    {
        var dur = seg.Duration.TotalSeconds;
        if (dur >= 10 && dur <= 20) return 100.0;
        if (dur < 10) return Math.Max(dur / 10.0 * 100.0, 0.0);
        return Math.Max((30.0 - dur) / 10.0 * 100.0, 0.0);
    }

    // ── Overlap suppression ───────────────────────────────────────────────────

    private static bool OverlapsAny(RankedSegment candidate, IEnumerable<RankedSegment> selected)
    {
        foreach (var existing in selected)
        {
            var overlapStart = candidate.StartTime > existing.StartTime
                ? candidate.StartTime : existing.StartTime;
            var overlapEnd = candidate.EndTime < existing.EndTime
                ? candidate.EndTime : existing.EndTime;

            if (overlapEnd <= overlapStart) continue;   // no overlap

            var overlapSecs = (overlapEnd - overlapStart).TotalSeconds;
            var shorter     = Math.Min(
                candidate.Duration.TotalSeconds,
                existing.Duration.TotalSeconds);

            if (shorter > 0 && overlapSecs / shorter > 0.30)
                return true;
        }
        return false;
    }
}
