namespace AIReelBooster.API.ImageGrowthEngine.Models;

public enum EngagementLevel { Low, Medium, High, Viral }
public enum ConfidenceLevel { Low, Medium, High }

public class EngagementPrediction
{
    /// <summary>Composite 0-100 score.</summary>
    public int PostScore { get; set; }

    public EngagementLevel LikesPrediction { get; set; }
    public EngagementLevel SaveProbability { get; set; }
    public EngagementLevel ShareProbability { get; set; }
    public ConfidenceLevel Confidence { get; set; }

    /// <summary>Estimated organic reach bucket.</summary>
    public string EstimatedReach { get; set; } = string.Empty;  // "1K-5K" | "5K-20K" | "20K-100K" | "100K+"

    /// <summary>Breakdown of what contributed to the score.</summary>
    public Dictionary<string, int> ScoreBreakdown { get; set; } = [];
}
