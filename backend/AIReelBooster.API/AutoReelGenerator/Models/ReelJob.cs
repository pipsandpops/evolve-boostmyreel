namespace AIReelBooster.API.AutoReelGenerator.Models;

public enum ReelJobStatus
{
    Pending,    // Queued, not yet picked up
    Detecting,  // Running FFmpeg scene detection
    Ranking,    // Scoring and selecting best segments
    Extracting, // Cutting raw clips from source video
    Processing, // Converting to 9:16 vertical + zoom + subtitles
    Complete,   // All reels ready for download
    Failed,     // Unrecoverable error
}

public class ReelJob
{
    public string        ReelJobId      { get; set; } = Guid.NewGuid().ToString("N")[..16];
    public string        SourceJobId    { get; set; } = null!;
    public string?       UserId         { get; set; }
    public ReelJobStatus Status         { get; set; } = ReelJobStatus.Pending;
    public int           ProgressPercent { get; set; }
    public string?       CurrentStep    { get; set; }
    public string?       ErrorMessage   { get; set; }
    public List<GeneratedReel> GeneratedReels { get; set; } = [];
    public DateTime      CreatedAt      { get; set; } = DateTime.UtcNow;
    public DateTime?     CompletedAt    { get; set; }
}
