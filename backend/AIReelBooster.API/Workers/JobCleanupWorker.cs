using AIReelBooster.API.Configuration;
using AIReelBooster.API.Infrastructure;
using AIReelBooster.API.Services.Interfaces;
using Microsoft.Extensions.Options;
using System.IO;

namespace AIReelBooster.API.Workers;

public class JobCleanupWorker : BackgroundService
{
    private readonly JobStore _jobStore;
    private readonly IServiceProvider _services;
    private readonly TimeSpan _ttl;
    private readonly string _chunksDir;
    private readonly ILogger<JobCleanupWorker> _logger;

    public JobCleanupWorker(
        JobStore jobStore,
        IServiceProvider services,
        IOptions<AppSettings> options,
        ILogger<JobCleanupWorker> logger)
    {
        _jobStore  = jobStore;
        _services  = services;
        _ttl       = TimeSpan.FromMinutes(options.Value.Storage.JobTtlMinutes);
        _chunksDir = Path.Combine(Path.GetFullPath(options.Value.Storage.TempPath), "_chunks");
        _logger    = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            await Task.Delay(TimeSpan.FromMinutes(10), stoppingToken);
            await CleanExpiredJobsAsync(stoppingToken);
            CleanStaleChunks();
        }
    }

    // Remove _chunks sub-directories older than 2 × TTL (abandoned uploads)
    private void CleanStaleChunks()
    {
        if (!Directory.Exists(_chunksDir)) return;
        var cutoff = DateTime.UtcNow - (_ttl * 2);
        foreach (var dir in Directory.GetDirectories(_chunksDir))
        {
            try
            {
                if (Directory.GetCreationTimeUtc(dir) < cutoff)
                    Directory.Delete(dir, recursive: true);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to clean stale chunk dir {Dir}", dir);
            }
        }
    }

    private async Task CleanExpiredJobsAsync(CancellationToken ct)
    {
        var expired = _jobStore.GetExpired(_ttl).ToList();
        if (expired.Count == 0) return;

        _logger.LogInformation("Cleaning {Count} expired jobs", expired.Count);

        using var scope = _services.CreateScope();
        var storage = scope.ServiceProvider.GetRequiredService<IVideoStorageService>();

        foreach (var job in expired)
        {
            try
            {
                await storage.DeleteJobFilesAsync(job.JobId);
                _jobStore.Remove(job.JobId);
                _logger.LogDebug("Cleaned job {JobId}", job.JobId);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to clean job {JobId}", job.JobId);
            }
        }
    }
}
