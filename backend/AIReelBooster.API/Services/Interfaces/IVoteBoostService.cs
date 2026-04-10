using AIReelBooster.API.Models.Domain;

namespace AIReelBooster.API.Services.Interfaces;

public interface IVoteBoostService
{
    Task<CreateBoostOrderResult> CreateBoostOrderAsync(
        string battleId, string entryId, string voterToken, string tier,
        CancellationToken ct = default);

    Task<ConfirmBoostResult> ConfirmBoostAsync(
        string battleId, string orderId, string paymentId, string signature,
        CancellationToken ct = default);

    // Awards 5 bonus votes once per voter per battle; returns share card text
    Task<AwardReferralResult> AwardReferralBonusAsync(
        string battleId, string entryId, string voterToken,
        CancellationToken ct = default);

    // Aggregated vote counts: free votes + paid boost votes, ranked by total
    Task<List<BoosterRow>> GetTopBoostersAsync(
        string battleId, int limit = 10, CancellationToken ct = default);

    // Combined vote totals per entry (free + paid) for scoring
    Task<Dictionary<string, int>> GetTotalVotesByEntryAsync(
        string battleId, CancellationToken ct = default);
}

public record CreateBoostOrderResult(
    string OrderId, decimal Amount, string Currency,
    string Label, string KeyId, int Votes);

public record ConfirmBoostResult(bool Success, string Message, int VotesAdded);

public record AwardReferralResult(
    bool Awarded, int BonusVotes,
    ShareCard ShareCard);

public record ShareCard(string Text, string Url);

public record BoosterRow(int Rank, string VoterToken, int TotalVotes, decimal TotalSpent);
