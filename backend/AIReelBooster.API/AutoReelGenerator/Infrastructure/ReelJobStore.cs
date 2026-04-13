using System.Collections.Concurrent;
using AIReelBooster.API.AutoReelGenerator.Models;

namespace AIReelBooster.API.AutoReelGenerator.Infrastructure;

/// <summary>
/// Thread-safe in-memory store for <see cref="ReelJob"/> instances.
/// Mirrors the pattern used by <c>JobStore</c> for video analysis jobs.
/// </summary>
public class ReelJobStore
{
    private readonly ConcurrentDictionary<string, ReelJob> _jobs = new();

    public ReelJob CreateJob(string sourceJobId, string? userId, bool enableSmartReframe = false)
    {
        var job = new ReelJob
        {
            SourceJobId        = sourceJobId,
            UserId             = userId,
            EnableSmartReframe = enableSmartReframe,
        };
        _jobs[job.ReelJobId] = job;
        return job;
    }

    public ReelJob? Get(string reelJobId) =>
        _jobs.TryGetValue(reelJobId, out var job) ? job : null;

    public bool TryUpdate(string reelJobId, Action<ReelJob> update)
    {
        if (_jobs.TryGetValue(reelJobId, out var job))
        {
            update(job);
            return true;
        }
        return false;
    }

    public bool Remove(string reelJobId) => _jobs.TryRemove(reelJobId, out _);

    public IEnumerable<ReelJob> GetExpired(TimeSpan ttl) =>
        _jobs.Values.Where(j => DateTime.UtcNow - j.CreatedAt > ttl);
}
