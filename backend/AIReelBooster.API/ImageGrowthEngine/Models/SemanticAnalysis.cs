namespace AIReelBooster.API.ImageGrowthEngine.Models;

/// <summary>
/// Semantic understanding produced by Claude Vision.
/// </summary>
public class SemanticAnalysis
{
    // ── Human presence ────────────────────────────────────────────────────────
    public bool HasFace { get; set; }
    public int FaceCount { get; set; }

    // ── Text ──────────────────────────────────────────────────────────────────
    public bool HasTextOverlay { get; set; }
    public string? TextContent { get; set; }

    // ── Scene ─────────────────────────────────────────────────────────────────
    public List<string> DominantObjects { get; set; } = [];

    /// <summary>indoor | outdoor | product | person | food | nature | technology | abstract</summary>
    public string SceneType { get; set; } = string.Empty;

    /// <summary>energetic | calm | professional | playful | inspiring | dramatic</summary>
    public string Mood { get; set; } = string.Empty;

    // ── Quality ───────────────────────────────────────────────────────────────
    public List<string> QualityIssues { get; set; } = [];        // ["blurry", "overexposed", ...]
    public List<string> EngagementBoosters { get; set; } = [];   // ["human face", "bold text", ...]
    public List<string> EngagementKillers { get; set; } = [];    // ["cluttered background", ...]

    /// <summary>Claude's own estimated post score 0-100.</summary>
    public int ClaudePostScore { get; set; }
}
