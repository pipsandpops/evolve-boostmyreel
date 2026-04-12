namespace AIReelBooster.API.ImageGrowthEngine.Models;

public enum ImageJobStatus
{
    Pending,
    Analyzing,
    GeneratingCaptions,
    Complete,
    Failed
}

public enum CaptionTone
{
    Viral,
    Educational,
    Storytelling,
    Sales
}

public class ImageJob
{
    public string JobId { get; set; } = Guid.NewGuid().ToString("N");
    public ImageJobStatus Status { get; set; } = ImageJobStatus.Pending;
    public int ProgressPercent { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }

    // Input
    public List<string> ImageFilePaths { get; set; } = [];
    public string? UserCaption { get; set; }
    public CaptionTone Tone { get; set; } = CaptionTone.Viral;
    public bool IsCarousel => ImageFilePaths.Count > 1;

    // Output
    public ImageAnalysisResult? Result { get; set; }
}
