namespace AIReelBooster.API.Models.Domain;

/// <summary>
/// Stores a connected Instagram account's long-lived access token and profile snapshot.
/// One record per app user (keyed by UserId).
/// </summary>
public class InstagramToken
{
    /// <summary>Our app's internal user ID (FK to UserPlan / local storage ID).</summary>
    public string UserId { get; set; } = null!;

    /// <summary>Long-lived Meta access token (60-day expiry; auto-refreshed on each use).</summary>
    public string AccessToken { get; set; } = null!;

    /// <summary>Instagram Business/Creator User ID from the Graph API.</summary>
    public string IgUserId { get; set; } = null!;

    /// <summary>Instagram username, e.g. "@johndoe".</summary>
    public string IgUsername { get; set; } = null!;

    /// <summary>Follower count at time of last sync.</summary>
    public long FollowerCount { get; set; }

    /// <summary>Media count at time of last sync.</summary>
    public int MediaCount { get; set; }

    /// <summary>Average views/plays across last 20 reels (–1 if insights are unavailable).</summary>
    public long AvgReelViews { get; set; } = -1;

    /// <summary>Average engagement rate (likes+comments / followers) × 100.</summary>
    public double EngagementRate { get; set; }

    public DateTime ConnectedAt { get; set; } = DateTime.UtcNow;

    /// <summary>When the access token expires (Meta long-lived tokens are 60 days).</summary>
    public DateTime TokenExpiry { get; set; }

    /// <summary>Last time profile metrics were refreshed from the Graph API.</summary>
    public DateTime LastSyncAt { get; set; } = DateTime.UtcNow;
}
