using AIReelBooster.API.AutoReelGenerator.Models;

namespace AIReelBooster.API.AutoReelGenerator.Interfaces;

/// <summary>
/// Entry-point for the Auto Reel Generator feature.
/// Validates the source job, creates a <see cref="ReelJob"/>, enqueues it for
/// background processing, and exposes read-only access to job state.
/// </summary>
public interface IAutoReelService
{
    /// <summary>
    /// Creates a new <see cref="ReelJob"/> linked to an existing video analysis job
    /// and enqueues it for background processing.
    /// </summary>
    /// <param name="sourceJobId">ID of a completed <see cref="Models.Domain.VideoJob"/>.</param>
    /// <param name="userId">Optional user identifier for ownership tracking.</param>
    /// <returns>The newly created <see cref="ReelJob.ReelJobId"/>.</returns>
    /// <exception cref="InvalidOperationException">
    ///   Thrown when the source job does not exist or is not yet complete.
    /// </exception>
    Task<string> StartGenerationAsync(
        string            sourceJobId,
        string?           userId,
        CancellationToken ct = default);

    /// <summary>Returns the current state of a reel job, or null if not found.</summary>
    ReelJob? GetJob(string reelJobId);
}
