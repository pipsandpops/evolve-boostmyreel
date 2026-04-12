namespace AIReelBooster.API.ImageGrowthEngine.Models;

public class CaptionSuggestion
{
    /// <summary>Scroll-stopping first sentence (max 12 words).</summary>
    public string Hook { get; set; } = string.Empty;

    /// <summary>Full Instagram/TikTok caption (max 150 chars, no hashtags).</summary>
    public string FullCaption { get; set; } = string.Empty;

    /// <summary>Call-to-action line.</summary>
    public string Cta { get; set; } = string.Empty;

    /// <summary>10-12 relevant hashtags without the # symbol.</summary>
    public List<string> Hashtags { get; set; } = [];

    /// <summary>Tone used to generate this caption.</summary>
    public string Tone { get; set; } = string.Empty;
}
