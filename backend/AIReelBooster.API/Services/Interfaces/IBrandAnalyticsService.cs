using AIReelBooster.API.Models.Domain;

namespace AIReelBooster.API.Services.Interfaces;

public interface IBrandAnalyticsService
{
    Task TrackPageViewAsync(string battleId, string visitorToken, CancellationToken ct = default);
    Task<BrandRoiAnalytics?> GetRoiAsync(string battleId, string brandUserId, CancellationToken ct = default);
}
