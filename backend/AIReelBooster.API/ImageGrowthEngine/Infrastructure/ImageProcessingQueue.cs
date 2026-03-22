using System.Threading.Channels;

namespace AIReelBooster.API.ImageGrowthEngine.Infrastructure;

/// <summary>
/// Bounded async channel that decouples HTTP upload from background processing.
/// </summary>
public class ImageProcessingQueue
{
    private readonly Channel<string> _channel =
        Channel.CreateBounded<string>(new BoundedChannelOptions(500)
        {
            FullMode       = BoundedChannelFullMode.Wait,
            SingleReader   = true,
            SingleWriter   = false,
        });

    public ValueTask EnqueueAsync(string jobId, CancellationToken ct = default)
        => _channel.Writer.WriteAsync(jobId, ct);

    public IAsyncEnumerable<string> ReadAllAsync(CancellationToken ct)
        => _channel.Reader.ReadAllAsync(ct);
}
