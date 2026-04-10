using AIReelBooster.API.Models.Domain;

namespace AIReelBooster.API.Infrastructure;

public static class SrtWriter
{
    public static async Task WriteAsync(string filePath, List<SubtitleEntry> entries, CancellationToken ct = default)
    {
        var sb = new System.Text.StringBuilder();
        foreach (var entry in entries)
        {
            sb.AppendLine(entry.Index.ToString());
            sb.AppendLine($"{FormatTime(entry.Start)} --> {FormatTime(entry.End)}");
            sb.AppendLine(entry.Text);
            sb.AppendLine();
        }
        await File.WriteAllTextAsync(filePath, sb.ToString(), ct);
    }

    private static string FormatTime(TimeSpan ts) =>
        $"{(int)ts.TotalHours:D2}:{ts.Minutes:D2}:{ts.Seconds:D2},{ts.Milliseconds:D3}";
}
