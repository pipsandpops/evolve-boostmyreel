using System.Threading.Channels;

namespace AIReelBooster.API.Infrastructure;

public class BackgroundProcessingQueue
{
    private readonly Channel<string> _channel = Channel.CreateUnbounded<string>(
        new UnboundedChannelOptions { SingleReader = true }
    );

    public ValueTask EnqueueAsync(string jobId, CancellationToken ct = default) =>
        _channel.Writer.WriteAsync(jobId, ct);

    public IAsyncEnumerable<string> ReadAllAsync(CancellationToken ct = default) =>
        _channel.Reader.ReadAllAsync(ct);
}
