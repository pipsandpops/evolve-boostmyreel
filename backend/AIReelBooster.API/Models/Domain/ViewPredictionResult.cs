namespace AIReelBooster.API.Models.Domain;

/// <summary>
/// The result of a view prediction — either scenario-based (free) or personalised (Pro + Instagram connected).
/// </summary>
public class ViewPredictionResult
{
    /// <summary>"scenario" | "personalized"</summary>
    public string PredictionType { get; set; } = "scenario";

    /// <summary>Which viral tier drove these numbers: "Low" | "Medium" | "High"</summary>
    public string ViralTier { get; set; } = "Medium";

    /// <summary>One row per follower tier, showing the estimated view range.</summary>
    public List<ViewScenario> Scenarios { get; set; } = [];

    /// <summary>Trust-building note shown beneath the table.</summary>
    public string Note { get; set; } = string.Empty;

    // ── Personalised fields (only populated when predictionType = "personalized") ─

    public long?   Followers      { get; set; }
    public long?   AvgViews       { get; set; }
    public string? PredictedRange { get; set; }
    public string? Confidence     { get; set; }
    public string? BasedOn        { get; set; }
}

public class ViewScenario
{
    /// <summary>Formatted follower count, e.g. "10K", "500K", "1M"</summary>
    public string Followers { get; set; } = string.Empty;

    /// <summary>Formatted view range, e.g. "1.3K–5.2K"</summary>
    public string Views { get; set; } = string.Empty;

    /// <summary>Tier colour hint for UI: "Low" | "Medium" | "High"</summary>
    public string Tier { get; set; } = string.Empty;
}
