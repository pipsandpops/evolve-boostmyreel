using System.Collections.Concurrent;
using AIReelBooster.API.Models.Domain;

namespace AIReelBooster.API.Infrastructure;

public class JobStore
{
    private readonly ConcurrentDictionary<string, VideoJob> _jobs = new();

    public VideoJob CreateJob()
    {
        var job = new VideoJob();
        _jobs[job.JobId] = job;
        return job;
    }

    public VideoJob? Get(string jobId) =>
        _jobs.TryGetValue(jobId, out var job) ? job : null;

    public bool TryUpdate(string jobId, Action<VideoJob> update)
    {
        if (_jobs.TryGetValue(jobId, out var job))
        {
            update(job);
            return true;
        }
        return false;
    }

    public bool Remove(string jobId) => _jobs.TryRemove(jobId, out _);

    public IEnumerable<VideoJob> GetExpired(TimeSpan ttl) =>
        _jobs.Values.Where(j => DateTime.UtcNow - j.CreatedAt > ttl);
}
