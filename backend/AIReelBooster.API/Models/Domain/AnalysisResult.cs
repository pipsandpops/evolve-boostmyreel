namespace AIReelBooster.API.Models.Domain;

public class AnalysisResult
{
    public string Hook { get; set; } = string.Empty;
    public string Caption { get; set; } = string.Empty;
    public List<string> Hashtags { get; set; } = [];
    public List<SubtitleEntry> Subtitles { get; set; } = [];
    public ViralScoreResult? ViralScore { get; set; }
}

public class ViralScoreResult
{
    public int HookScore { get; set; }
    public int EmotionScore { get; set; }
    public int ClarityScore { get; set; }
    public int TrendScore { get; set; }
    public int EngagementScore { get; set; }
    public int ViralScore { get; set; }
    public string Problem { get; set; } = string.Empty;
    public string ImprovedHook { get; set; } = string.Empty;
}

public class SubtitleEntry
{
    public int Index { get; set; }
    public TimeSpan Start { get; set; }
    public TimeSpan End { get; set; }
    public string Text { get; set; } = string.Empty;
}
