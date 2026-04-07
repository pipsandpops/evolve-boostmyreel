using System.Net.Http.Headers;
using System.Text.Json;
using AIReelBooster.API.Configuration;
using AIReelBooster.API.Models.Domain;
using AIReelBooster.API.Services.Interfaces;
using Microsoft.Extensions.Options;

namespace AIReelBooster.API.Services;

public class WhisperTranscriptionService : ITranscriptionService
{
    private readonly HttpClient _http;
    private readonly WhisperSettings _settings;
    private readonly ILogger<WhisperTranscriptionService> _logger;

    public WhisperTranscriptionService(
        HttpClient http,
        IOptions<AppSettings> options,
        ILogger<WhisperTranscriptionService> logger)
    {
        _http = http;
        _settings = options.Value.Whisper;
        _logger = logger;

        _http.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", _settings.ApiKey);
    }

    public async Task<List<SubtitleEntry>> TranscribeAsync(string audioFilePath, CancellationToken ct = default)
    {
        _logger.LogInformation("Transcribing audio: {AudioPath}", audioFilePath);

        var form = new MultipartFormDataContent();
        await using var fileStream = File.OpenRead(audioFilePath);
        var fileContent = new StreamContent(fileStream);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("audio/wav");
        form.Add(fileContent, "file", Path.GetFileName(audioFilePath));
        form.Add(new StringContent(_settings.Model), "model");
        form.Add(new StringContent("verbose_json"), "response_format");
        form.Add(new StringContent("word"), "timestamp_granularities[]");

        HttpResponseMessage response = null!;
        int[] retryDelaysSeconds = [5, 15, 30];
        for (int attempt = 0; attempt <= retryDelaysSeconds.Length; attempt++)
        {
            response = await _http.PostAsync(_settings.Endpoint, form, ct);
            if ((int)response.StatusCode != 429) break;

            if (attempt < retryDelaysSeconds.Length)
            {
                var delay = retryDelaysSeconds[attempt];
                _logger.LogWarning("Whisper rate-limited (429). Retrying in {Delay}s (attempt {Attempt}/{Max})",
                    delay, attempt + 1, retryDelaysSeconds.Length);
                await Task.Delay(TimeSpan.FromSeconds(delay), ct);

                // Rebuild form — stream was already read, need a fresh one
                fileStream.Seek(0, SeekOrigin.Begin);
                form = new MultipartFormDataContent();
                var retryContent = new StreamContent(fileStream);
                retryContent.Headers.ContentType = new MediaTypeHeaderValue("audio/wav");
                form.Add(retryContent, "file", Path.GetFileName(audioFilePath));
                form.Add(new StringContent(_settings.Model), "model");
                form.Add(new StringContent("verbose_json"), "response_format");
                form.Add(new StringContent("word"), "timestamp_granularities[]");
            }
        }
        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(ct);
            _logger.LogError("Whisper API error {Status}: {Body}", (int)response.StatusCode, body);
            throw new HttpRequestException(
                $"Whisper returned {(int)response.StatusCode}: {body}", null, response.StatusCode);
        }

        var json = await response.Content.ReadAsStringAsync(ct);
        var doc = JsonDocument.Parse(json);

        return ParseSegments(doc);
    }

    private static List<SubtitleEntry> ParseSegments(JsonDocument doc)
    {
        var entries = new List<SubtitleEntry>();
        var root = doc.RootElement;

        if (!root.TryGetProperty("segments", out var segments))
        {
            // Fallback: whole transcript as one entry
            var text = root.GetProperty("text").GetString() ?? string.Empty;
            entries.Add(new SubtitleEntry
            {
                Index = 1,
                Start = TimeSpan.Zero,
                End = TimeSpan.FromSeconds(5),
                Text = text
            });
            return entries;
        }

        int index = 1;
        foreach (var seg in segments.EnumerateArray())
        {
            var start = seg.GetProperty("start").GetDouble();
            var end = seg.GetProperty("end").GetDouble();
            var text = seg.GetProperty("text").GetString() ?? string.Empty;

            entries.Add(new SubtitleEntry
            {
                Index = index++,
                Start = TimeSpan.FromSeconds(start),
                End = TimeSpan.FromSeconds(end),
                Text = text.Trim()
            });
        }

        return entries;
    }
}
