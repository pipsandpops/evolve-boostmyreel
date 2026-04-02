using AIReelBooster.API.Models.Domain;

namespace AIReelBooster.API.Services.Interfaces;

// ── Request / Response records ─────────────────────────────────────────────────

public record CreateCampaignRequest(
    string BrandUserId,
    string BrandName,
    string Title,
    string? Description,
    string? ThemeHashtag,
    string? ContentGuidelines,
    decimal PrizeAmount,
    string  PrizeCurrency,
    string? PrizeDescription,
    int     DurationHours   // how long campaign runs
);

public record JoinCampaignRequest(
    string CreatorHandle,
    string ReelUrl,
    string Platform,
    string CreatorUserId,   // device token or email
    string? PaymentHandle   // UPI id or bank detail for payout
);

public record CampaignVoteRequest(
    string EntryId,
    string VoterToken,
    string? VoterIp
);

public record CampaignLeaderboardEntry(
    int    Rank,
    string EntryId,
    string CreatorHandle,
    string ReelUrl,
    string Platform,
    int    Votes,
    bool   IsWinner
);

public record CampaignDetail(
    string          Id,
    string          BrandUserId,
    string          BrandName,
    string          Title,
    string?         Description,
    string?         ThemeHashtag,
    string?         ContentGuidelines,
    decimal         PrizeAmount,
    string          PrizeCurrency,
    string?         PrizeDescription,
    int             MaxEntries,
    int             EntryCount,
    string          JoinCode,
    string          Status,
    DateTime        StartsAt,
    DateTime        EndsAt,
    bool            PrizePaid,
    string?         WinnerEntryId,
    List<CampaignLeaderboardEntry> Entries
);

public record CampaignSummary(
    string   Id,
    string   Title,
    string?  ThemeHashtag,
    decimal  PrizeAmount,
    string   PrizeCurrency,
    string   JoinCode,
    string   Status,
    DateTime EndsAt,
    int      EntryCount,
    int      TotalVotes
);

// ── Interface ──────────────────────────────────────────────────────────────────

public interface IBrandCampaignService
{
    Task<BrandCampaign>         CreateAsync(CreateCampaignRequest req, CancellationToken ct = default);
    Task<CampaignDetail?>       GetAsync(string campaignId, CancellationToken ct = default);
    Task<CampaignDetail?>       GetByJoinCodeAsync(string joinCode, CancellationToken ct = default);
    Task<List<CampaignSummary>> GetByBrandAsync(string brandUserId, CancellationToken ct = default);
    Task<BrandCampaignEntry?>   JoinAsync(string campaignId, JoinCampaignRequest req, CancellationToken ct = default);
    Task<bool>                  VoteAsync(string campaignId, CampaignVoteRequest req, CancellationToken ct = default);
    Task<bool>                  MarkPaidAsync(string campaignId, string brandUserId, CancellationToken ct = default);
    Task                        ExpireEndedCampaignsAsync(CancellationToken ct = default);
}
