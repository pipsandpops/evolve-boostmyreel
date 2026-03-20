namespace AIReelBooster.API.Models.Domain;

public enum JobStatus
{
    Pending,
    Uploading,
    Transcribing,
    GeneratingAI,
    RenderingSubtitles,
    Complete,
    Failed
}

public class VideoJob
{
    public string JobId { get; set; } = Guid.NewGuid().ToString("N");
    public JobStatus Status { get; set; } = JobStatus.Pending;
    public int ProgressPercent { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }

    // File paths
    public string? OriginalFilePath { get; set; }
    public string? AudioFilePath { get; set; }
    public string? SrtFilePath { get; set; }
    public string? ThumbnailFilePath { get; set; }
    public string? BurnedVideoFilePath { get; set; }

    // Video metadata
    public double? DurationSeconds { get; set; }
    public int? Width { get; set; }
    public int? Height { get; set; }
    public double? FrameRate { get; set; }

    // AI Results
    public AnalysisResult? AnalysisResult { get; set; }
}
