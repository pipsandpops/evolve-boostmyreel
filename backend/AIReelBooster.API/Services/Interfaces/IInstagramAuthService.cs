using AIReelBooster.API.Models.Domain;

namespace AIReelBooster.API.Services.Interfaces;

/// <summary>
/// Handles Meta OAuth flow for Instagram connection.
/// </summary>
public interface IInstagramAuthService
{
    /// <summary>Returns the Meta OAuth authorization URL for the given app user.</summary>
    string GetOAuthUrl(string userId);

    /// <summary>
    /// Exchanges the authorization code returned by Meta for a long-lived access token,
    /// fetches the Instagram profile, and persists an <see cref="InstagramToken"/> record.
    /// </summary>
    Task<InstagramConnectResult> HandleCallbackAsync(string code, string userId, CancellationToken ct = default);

    /// <summary>Removes the stored token for the given user.</summary>
    Task DisconnectAsync(string userId, CancellationToken ct = default);

    /// <summary>Returns the stored token, or null if the user hasn't connected Instagram.</summary>
    Task<InstagramToken?> GetTokenAsync(string userId, CancellationToken ct = default);
}

public class InstagramConnectResult
{
    public bool   Success    { get; set; }
    public string Username   { get; set; } = string.Empty;
    public long   Followers  { get; set; }
    public string? Error     { get; set; }
}
