using System.Collections.Concurrent;

namespace AIReelBooster.API.Infrastructure;

/// <summary>
/// Thread-safe in-memory daily usage counter.
/// Tracks how many videos each free user has processed today (UTC date).
/// Resets automatically at midnight UTC — no DB required.
/// </summary>
public class DailyUsageLimiter
{
    private readonly record struct Entry(int Count, DateOnly Date);

    private readonly ConcurrentDictionary<string, Entry> _counts = new();

    /// <summary>
    /// Returns true if the user is allowed to process another video today.
    /// Increments the counter if allowed.
    /// </summary>
    public bool TryConsume(string userId, int dailyLimit)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var newEntry = _counts.AddOrUpdate(
            userId,
            // first use today
            _ => new Entry(1, today),
            // subsequent use
            (_, existing) =>
            {
                // new day — reset counter
                if (existing.Date != today)
                    return new Entry(1, today);

                // already at limit
                if (existing.Count >= dailyLimit)
                    return existing;

                return existing with { Count = existing.Count + 1 };
            });

        // if the stored count is <= dailyLimit the increment succeeded
        return newEntry.Count <= dailyLimit;
    }

    /// <summary>How many videos this user has processed today.</summary>
    public int GetTodayCount(string userId)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        if (_counts.TryGetValue(userId, out var entry) && entry.Date == today)
            return entry.Count;
        return 0;
    }
}
