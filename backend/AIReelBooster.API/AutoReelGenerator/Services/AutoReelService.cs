using AIReelBooster.API.AutoReelGenerator.Infrastructure;
using AIReelBooster.API.AutoReelGenerator.Interfaces;
using AIReelBooster.API.AutoReelGenerator.Models;
using AIReelBooster.API.Infrastructure;
using AIReelBooster.API.Models.Domain;

namespace AIReelBooster.API.AutoReelGenerator.Services;

/// <summary>
/// Entry-point for the Auto Reel Generator.
/// Validates the source video analysis job, creates a <see cref="ReelJob"/>,
/// and enqueues it for background processing.
/// </summary>
public class AutoReelService : IAutoReelService
{
    private readonly JobStore            _videoJobStore;
    private readonly ReelJobStore        _reelJobStore;
    private readonly ReelProcessingQueue _queue;

    public AutoReelService(
        JobStore            videoJobStore,
        ReelJobStore        reelJobStore,
        ReelProcessingQueue queue)
    {
        _videoJobStore = videoJobStore;
        _reelJobStore  = reelJobStore;
        _queue         = queue;
    }

    public async Task<string> StartGenerationAsync(
        string            sourceJobId,
        string?           userId,
        CancellationToken ct = default)
    {
        var videoJob = _videoJobStore.Get(sourceJobId)
            ?? throw new InvalidOperationException(
                $"Source job '{sourceJobId}' was not found.");

        if (videoJob.Status != JobStatus.Complete)
            throw new InvalidOperationException(
                $"Source job '{sourceJobId}' is not yet complete (current status: {videoJob.Status}). "
              + "Wait for the analysis to finish before generating reels.");

        if (string.IsNullOrEmpty(videoJob.OriginalFilePath) || !File.Exists(videoJob.OriginalFilePath))
            throw new InvalidOperationException(
                $"Source job '{sourceJobId}' has no accessible video file.");

        var reelJob = _reelJobStore.CreateJob(sourceJobId, userId);
        await _queue.EnqueueAsync(reelJob.ReelJobId, ct);
        return reelJob.ReelJobId;
    }

    public ReelJob? GetJob(string reelJobId) =>
        _reelJobStore.Get(reelJobId);
}
