namespace AIReelBooster.API.Models.Domain;

public class AnalysisResult
{
    public string Hook { get; set; } = string.Empty;
    public string Caption { get; set; } = string.Empty;
    public List<string> Hashtags { get; set; } = [];
    public List<SubtitleEntry> Subtitles { get; set; } = [];
}

public class SubtitleEntry
{
    public int Index { get; set; }
    public TimeSpan Start { get; set; }
    public TimeSpan End { get; set; }
    public string Text { get; set; } = string.Empty;
}
