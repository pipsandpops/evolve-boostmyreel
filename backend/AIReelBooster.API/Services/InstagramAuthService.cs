using System.Net.Http.Json;
using System.Text.Json;
using AIReelBooster.API.Configuration;
using AIReelBooster.API.Infrastructure;
using AIReelBooster.API.Models.Domain;
using AIReelBooster.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace AIReelBooster.API.Services;

/// <summary>
/// Implements the Meta OAuth flow for connecting an Instagram Business/Creator account.
///
/// Flow:
///   1. Frontend redirects user to GetOAuthUrl()
///   2. Meta calls our /api/instagram/callback?code=…&state={userId}
///   3. HandleCallbackAsync() exchanges code → short-lived token → long-lived token,
///      fetches IG profile, and persists InstagramToken to the DB.
///
/// Requirements on Meta side:
///   - App permissions: instagram_basic, pages_show_list, instagram_manage_insights
///   - The user's Instagram account must be a Business or Creator account linked to a Facebook Page.
///   - Valid OAuth Redirect URI registered in Meta App settings.
/// </summary>
public class InstagramAuthService : IInstagramAuthService
{
    private const string GraphBase = "https://graph.facebook.com/v19.0";

    private readonly InstagramSettings   _ig;
    private readonly AppDbContext        _db;
    private readonly IHttpClientFactory  _http;
    private readonly ILogger<InstagramAuthService> _logger;

    public InstagramAuthService(
        IOptions<AppSettings>          opts,
        AppDbContext                   db,
        IHttpClientFactory             http,
        ILogger<InstagramAuthService>  logger)
    {
        _ig     = opts.Value.Instagram;
        _db     = db;
        _http   = http;
        _logger = logger;
    }

    // ── GetOAuthUrl ──────────────────────────────────────────────────────────

    public string GetOAuthUrl(string userId)
    {
        var scopes = "instagram_basic,pages_show_list,instagram_manage_insights";
        var url    = $"https://www.facebook.com/v19.0/dialog/oauth"
                   + $"?client_id={Uri.EscapeDataString(_ig.AppId)}"
                   + $"&redirect_uri={Uri.EscapeDataString(_ig.RedirectUri)}"
                   + $"&scope={Uri.EscapeDataString(scopes)}"
                   + $"&response_type=code"
                   + $"&state={Uri.EscapeDataString(userId)}";
        return url;
    }

    // ── HandleCallbackAsync ──────────────────────────────────────────────────

    public async Task<InstagramConnectResult> HandleCallbackAsync(
        string code, string userId, CancellationToken ct = default)
    {
        try
        {
            var client = _http.CreateClient();

            // Step 1 — Exchange code for short-lived token
            var tokenUrl = $"{GraphBase}/oauth/access_token"
                         + $"?client_id={Uri.EscapeDataString(_ig.AppId)}"
                         + $"&client_secret={Uri.EscapeDataString(_ig.AppSecret)}"
                         + $"&redirect_uri={Uri.EscapeDataString(_ig.RedirectUri)}"
                         + $"&code={Uri.EscapeDataString(code)}";

            var tokenResp = await client.GetAsync(tokenUrl, ct);
            var tokenJson = await tokenResp.Content.ReadFromJsonAsync<JsonElement>(cancellationToken: ct);

            if (!tokenResp.IsSuccessStatusCode || !tokenJson.TryGetProperty("access_token", out var shortTokenEl))
            {
                var err = tokenJson.TryGetProperty("error", out var e) ? e.GetRawText() : "unknown";
                _logger.LogError("Token exchange failed: {Error}", err);
                return new InstagramConnectResult { Success = false, Error = "Token exchange failed. Please try again." };
            }

            var shortToken = shortTokenEl.GetString()!;

            // Step 2 — Exchange for long-lived token (60-day expiry)
            var longTokenUrl = $"{GraphBase}/oauth/access_token"
                             + $"?grant_type=fb_exchange_token"
                             + $"&client_id={Uri.EscapeDataString(_ig.AppId)}"
                             + $"&client_secret={Uri.EscapeDataString(_ig.AppSecret)}"
                             + $"&fb_exchange_token={Uri.EscapeDataString(shortToken)}";

            var longTokenResp = await client.GetAsync(longTokenUrl, ct);
            var longTokenJson = await longTokenResp.Content.ReadFromJsonAsync<JsonElement>(cancellationToken: ct);

            string longToken;
            DateTime tokenExpiry;

            if (longTokenResp.IsSuccessStatusCode
                && longTokenJson.TryGetProperty("access_token", out var longTokenEl))
            {
                longToken   = longTokenEl.GetString()!;
                var seconds = longTokenJson.TryGetProperty("expires_in", out var exp)
                    ? exp.GetInt64() : 5_184_000L; // 60 days fallback
                tokenExpiry = DateTime.UtcNow.AddSeconds(seconds);
            }
            else
            {
                // Fall back to short-lived token (1 hour) — still functional
                _logger.LogWarning("Long-lived token exchange failed; using short-lived token.");
                longToken   = shortToken;
                tokenExpiry = DateTime.UtcNow.AddHours(1);
            }

            // Step 3 — Resolve linked Instagram Business/Creator account
            var (igUserId, igUsername, followers) = await ResolveInstagramAccountAsync(client, longToken, ct);

            if (igUserId is null)
            {
                return new InstagramConnectResult
                {
                    Success = false,
                    Error   = "No Instagram Business or Creator account linked to this Facebook profile. "
                            + "Please link your Instagram to a Facebook Page in Instagram settings.",
                };
            }

            // Step 4 — Persist / upsert token record
            var existing = await _db.InstagramTokens.FindAsync([userId], ct);
            if (existing != null)
            {
                existing.AccessToken   = longToken;
                existing.IgUserId      = igUserId;
                existing.IgUsername    = igUsername;
                existing.FollowerCount = followers;
                existing.TokenExpiry   = tokenExpiry;
                existing.LastSyncAt    = DateTime.UtcNow;
            }
            else
            {
                _db.InstagramTokens.Add(new InstagramToken
                {
                    UserId        = userId,
                    AccessToken   = longToken,
                    IgUserId      = igUserId,
                    IgUsername    = igUsername,
                    FollowerCount = followers,
                    ConnectedAt   = DateTime.UtcNow,
                    TokenExpiry   = tokenExpiry,
                    LastSyncAt    = DateTime.UtcNow,
                });
            }

            await _db.SaveChangesAsync(ct);

            _logger.LogInformation("Instagram connected for user {UserId}: @{Username} ({Followers} followers)",
                userId, igUsername, followers);

            return new InstagramConnectResult
            {
                Success   = true,
                Username  = igUsername,
                Followers = followers,
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Instagram connect failed for user {UserId}", userId);
            return new InstagramConnectResult { Success = false, Error = "An unexpected error occurred. Please try again." };
        }
    }

    // ── DisconnectAsync ──────────────────────────────────────────────────────

    public async Task DisconnectAsync(string userId, CancellationToken ct = default)
    {
        var token = await _db.InstagramTokens.FindAsync([userId], ct);
        if (token != null)
        {
            _db.InstagramTokens.Remove(token);
            await _db.SaveChangesAsync(ct);
            _logger.LogInformation("Instagram disconnected for user {UserId}", userId);
        }
    }

    // ── GetTokenAsync ────────────────────────────────────────────────────────

    public async Task<InstagramToken?> GetTokenAsync(string userId, CancellationToken ct = default)
        => await _db.InstagramTokens.FindAsync([userId], ct);

    // ── Private helpers ──────────────────────────────────────────────────────

    /// <summary>
    /// Resolves the Instagram Business/Creator account linked to the Facebook user.
    /// Returns (igUserId, username, followerCount) or (null, "", 0) if not found.
    /// </summary>
    private async Task<(string? igUserId, string username, long followers)>
        ResolveInstagramAccountAsync(HttpClient client, string token, CancellationToken ct)
    {
        try
        {
            // Try Business/Creator path: FB User → Pages → IG Business Account
            var pagesUrl  = $"{GraphBase}/me/accounts?fields=instagram_business_account{{id,username,followers_count}}&access_token={token}";
            var pagesResp = await client.GetAsync(pagesUrl, ct);
            var pagesJson = await pagesResp.Content.ReadFromJsonAsync<JsonElement>(cancellationToken: ct);

            if (pagesResp.IsSuccessStatusCode && pagesJson.TryGetProperty("data", out var pages))
            {
                foreach (var page in pages.EnumerateArray())
                {
                    if (!page.TryGetProperty("instagram_business_account", out var igAccount)) continue;

                    var id       = igAccount.TryGetProperty("id",               out var idEl)  ? idEl.GetString() : null;
                    var username = igAccount.TryGetProperty("username",          out var unEl)  ? unEl.GetString() ?? "" : "";
                    var followers = igAccount.TryGetProperty("followers_count",  out var fcEl)  ? fcEl.GetInt64()  : 0L;

                    if (id is not null)
                        return (id, username, followers);
                }
            }

            // Fallback: try basic Instagram account (personal creator accounts)
            var basicUrl  = $"{GraphBase}/me?fields=id,name&access_token={token}";
            var basicResp = await client.GetAsync(basicUrl, ct);
            var basicJson = await basicResp.Content.ReadFromJsonAsync<JsonElement>(cancellationToken: ct);

            if (basicResp.IsSuccessStatusCode && basicJson.TryGetProperty("id", out var fbId))
            {
                // With instagram_basic scope on personal accounts,
                // the user node may expose instagram_accounts edge
                var igUrl  = $"{GraphBase}/{fbId.GetString()}/instagram_accounts?fields=id,username,followers_count&access_token={token}";
                var igResp = await client.GetAsync(igUrl, ct);
                var igJson = await igResp.Content.ReadFromJsonAsync<JsonElement>(cancellationToken: ct);

                if (igResp.IsSuccessStatusCode && igJson.TryGetProperty("data", out var igAccounts))
                {
                    foreach (var acc in igAccounts.EnumerateArray())
                    {
                        var id       = acc.TryGetProperty("id",               out var idEl) ? idEl.GetString() : null;
                        var username = acc.TryGetProperty("username",         out var unEl) ? unEl.GetString() ?? "" : "";
                        var followers = acc.TryGetProperty("followers_count", out var fcEl) ? fcEl.GetInt64()  : 0L;

                        if (id is not null)
                            return (id, username, followers);
                    }
                }
            }

            return (null, "", 0);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "ResolveInstagramAccount failed");
            return (null, "", 0);
        }
    }
}
