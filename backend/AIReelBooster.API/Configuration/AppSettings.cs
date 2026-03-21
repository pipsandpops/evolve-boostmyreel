namespace AIReelBooster.API.Configuration;

public class AppSettings
{
    public FFmpegSettings FFmpeg { get; set; } = new();
    public WhisperSettings Whisper { get; set; } = new();
    public ClaudeSettings Claude { get; set; } = new();
    public StorageSettings Storage { get; set; } = new();
    public RazorpaySettings Razorpay { get; set; } = new();
}

public class RazorpaySettings
{
    public string KeyId { get; set; } = string.Empty;
    public string KeySecret { get; set; } = string.Empty;
}

public class FFmpegSettings
{
    public string BinaryPath { get; set; } = "./ffmpeg-bin";
}

public class WhisperSettings
{
    public string ApiKey { get; set; } = string.Empty;
    public string Endpoint { get; set; } = "https://api.openai.com/v1/audio/transcriptions";
    public string Model { get; set; } = "whisper-1";
}

public class ClaudeSettings
{
    public string ApiKey { get; set; } = string.Empty;
    public string Model { get; set; } = "claude-sonnet-4-6";
    public string Endpoint { get; set; } = "https://api.anthropic.com/v1/messages";
}

public class StorageSettings
{
    public string TempPath { get; set; } = "./temp-jobs";
    public long MaxFileSizeBytes { get; set; } = 500 * 1024 * 1024; // 500 MB
    public int JobTtlMinutes { get; set; } = 60;
}
