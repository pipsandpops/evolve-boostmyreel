using AIReelBooster.API.Services.Interfaces;

namespace AIReelBooster.API.Workers;

public class BattleExpiryWorker : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly ILogger<BattleExpiryWorker> _logger;

    public BattleExpiryWorker(IServiceProvider services, ILogger<BattleExpiryWorker> logger)
    {
        _services = services;
        _logger   = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);

            try
            {
                using var scope = _services.CreateScope();
                var battles = scope.ServiceProvider.GetRequiredService<IBattleService>();
                await battles.ExpireStaleItemsAsync(stoppingToken);

                var prizes = scope.ServiceProvider.GetRequiredService<IPrizePoolService>();
                await prizes.DistributeAllPendingAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "BattleExpiryWorker failed");
            }
        }
    }
}
