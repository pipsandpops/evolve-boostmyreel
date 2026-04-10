namespace AIReelBooster.API.Services.Interfaces;

/// <summary>
/// Fetches and computes analytics from the Instagram Graph API.
/// </summary>
public interface IInstagramAnalyticsService
{
    /// <summary>
    /// Fetches follower count, last 20 media items, and computes engagement stats.
    /// Refreshes the <see cref="Models.Domain.InstagramToken"/> record in the DB.
    /// </summary>
    Task<InstagramAnalytics> GetAnalyticsAsync(string accessToken, string igUserId, CancellationToken ct = default);
}

public class InstagramAnalytics
{
    public long   FollowerCount   { get; set; }
    public int    MediaCount      { get; set; }
    public long   AvgReelViews    { get; set; }   // –1 if insights unavailable
    public long   MaxReelViews    { get; set; }
    public double EngagementRate  { get; set; }   // (likes+comments)/followers × 100
    public int    ReelsSampled    { get; set; }
    public bool   InsightsEnabled { get; set; }   // false = business account not set up
    public List<ReelMetric> RecentReels { get; set; } = [];
}

public class ReelMetric
{
    public string   MediaId   { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
    public long     Views     { get; set; }   // plays/reach; 0 if unavailable
    public long     Likes     { get; set; }
    public long     Comments  { get; set; }
}
