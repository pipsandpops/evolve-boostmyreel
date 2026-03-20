using AIReelBooster.API.Configuration;
using AIReelBooster.API.Services.Interfaces;
using Microsoft.Extensions.Options;

namespace AIReelBooster.API.Services;

public class VideoStorageService : IVideoStorageService
{
    private readonly string _basePath;

    public VideoStorageService(IOptions<AppSettings> options)
    {
        _basePath = Path.GetFullPath(options.Value.Storage.TempPath);
        Directory.CreateDirectory(_basePath);
    }

    public async Task<string> SaveUploadedFileAsync(IFormFile file, string jobId, CancellationToken ct = default)
    {
        var dir = GetJobDirectory(jobId);
        Directory.CreateDirectory(dir);

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        var filePath = Path.Combine(dir, $"original{ext}");

        await using var stream = File.Create(filePath);
        await file.CopyToAsync(stream, ct);

        return filePath;
    }

    public string GetJobDirectory(string jobId) => Path.Combine(_basePath, jobId);

    public string GetFilePath(string jobId, string fileName) =>
        Path.Combine(GetJobDirectory(jobId), fileName);

    public Stream OpenFileStream(string filePath) =>
        new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.Read, 4096, useAsync: true);

    public async Task DeleteJobFilesAsync(string jobId)
    {
        var dir = GetJobDirectory(jobId);
        if (Directory.Exists(dir))
            await Task.Run(() => Directory.Delete(dir, recursive: true));
    }
}
