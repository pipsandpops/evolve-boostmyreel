using AIReelBooster.API.Models.Domain;

namespace AIReelBooster.API.Models.Responses;

public record UploadVideoResponse(
    string JobId,
    string Status,
    DateTime UploadedAt
);

public record JobStatusResponse(
    string JobId,
    string Status,
    int ProgressPercent,
    string? ErrorMessage,
    DateTime CreatedAt
);

public record AnalysisResultResponse(
    string JobId,
    string Hook,
    string Caption,
    List<string> Hashtags,
    List<SubtitleEntryDto> Subtitles,
    VideoMetadataDto? Metadata,
    ViralScoreDto? ViralScore,
    bool HasAudio,
    List<string> Insights,
    ViewPredictionDto? ViewPrediction
);

// ── View Prediction DTOs ──────────────────────────────────────────────────────

public record ViewPredictionDto(
    string PredictionType,          // "scenario" | "personalized"
    string ViralTier,               // "Low" | "Medium" | "High"
    List<ViewScenarioDto> Scenarios,
    string Note,
    // Personalised fields (null in scenario mode)
    long?   Followers,
    long?   AvgViews,
    string? PredictedRange,
    string? Confidence,
    string? BasedOn
);

public record ViewScenarioDto(
    string Followers,   // e.g. "10K"
    string Views,       // e.g. "1.3K–5.2K"
    string Tier         // "Low" | "Medium" | "High"
);

public record ViralScoreDto(
    int HookScore,
    int EmotionScore,
    int ClarityScore,
    int TrendScore,
    int EngagementScore,
    int ViralScore,
    string Problem,
    string ImprovedHook
);

public record SubtitleEntryDto(
    int Index,
    string Start,
    string End,
    string Text
);

public record VideoMetadataDto(
    double? DurationSeconds,
    int? Width,
    int? Height,
    double? FrameRate
);

public record BurnSubtitlesResponse(
    string JobId,
    string BurnedVideoUrl
);

public record ImproveReelRequest(string ImprovedHook);

public record ImproveReelResponse(ViralScoreDto ViralScore);
