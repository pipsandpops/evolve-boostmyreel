using System.Threading.Channels;

namespace AIReelBooster.API.AutoReelGenerator.Infrastructure;

/// <summary>
/// Bounded channel used to pass reel job IDs from the API layer to the
/// background <c>ReelGenerationWorker</c>.
///
/// Capacity 100 jobs; writer blocks if full (back-pressure instead of data loss).
/// </summary>
public class ReelProcessingQueue
{
    private readonly Channel<string> _channel = Channel.CreateBounded<string>(
        new BoundedChannelOptions(100)
        {
            SingleReader = true,
            FullMode     = BoundedChannelFullMode.Wait,
        });

    public ValueTask EnqueueAsync(string reelJobId, CancellationToken ct = default) =>
        _channel.Writer.WriteAsync(reelJobId, ct);

    public IAsyncEnumerable<string> ReadAllAsync(CancellationToken ct = default) =>
        _channel.Reader.ReadAllAsync(ct);
}
