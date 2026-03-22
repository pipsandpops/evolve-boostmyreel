using System.Collections.Concurrent;
using AIReelBooster.API.ImageGrowthEngine.Models;

namespace AIReelBooster.API.ImageGrowthEngine.Infrastructure;

/// <summary>
/// Thread-safe in-memory store for image analysis jobs.
/// Jobs are automatically evicted after <see cref="TtlMinutes"/> minutes.
/// </summary>
public class ImageJobStore
{
    private const int TtlMinutes = 60;

    private readonly ConcurrentDictionary<string, ImageJob> _jobs = new();

    public void Add(ImageJob job)       => _jobs[job.JobId] = job;
    public ImageJob? Get(string jobId)  => _jobs.GetValueOrDefault(jobId);

    public void EvictExpired()
    {
        var cutoff = DateTime.UtcNow.AddMinutes(-TtlMinutes);
        foreach (var (id, job) in _jobs)
            if (job.CreatedAt < cutoff)
                _jobs.TryRemove(id, out _);
    }
}
