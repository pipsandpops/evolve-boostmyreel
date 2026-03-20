namespace AIReelBooster.API.Services.Interfaces;

public interface IVideoStorageService
{
    Task<string> SaveUploadedFileAsync(IFormFile file, string jobId, CancellationToken ct = default);
    string GetJobDirectory(string jobId);
    string GetFilePath(string jobId, string fileName);
    Stream OpenFileStream(string filePath);
    Task DeleteJobFilesAsync(string jobId);
}
