using AIReelBooster.API.Infrastructure;
using AIReelBooster.API.Models.Domain;
using AIReelBooster.API.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace AIReelBooster.API.Controllers;

[ApiController]
[Route("api/url")]
public class UrlAnalysisController : ControllerBase
{
    private readonly IUrlDownloadService _urlDownload;
    private readonly JobStore _jobStore;
    private readonly BackgroundProcessingQueue _queue;

    public UrlAnalysisController(
        IUrlDownloadService urlDownload,
        JobStore jobStore,
        BackgroundProcessingQueue queue)
    {
        _urlDownload = urlDownload;
        _jobStore    = jobStore;
        _queue       = queue;
    }

    public record AnalyzeUrlRequest(string Url);

    /// <summary>
    /// Accepts a public YouTube / Instagram / Facebook reel URL,
    /// creates a job, and enqueues it for processing.
    /// Poll GET /api/video/{jobId}/status then GET /api/analysis/{jobId}.
    /// </summary>
    [HttpPost("analyze")]
    public async Task<IActionResult> Analyze([FromBody] AnalyzeUrlRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Url))
            return BadRequest(new { error = "URL is required." });

        if (!Uri.TryCreate(request.Url.Trim(), UriKind.Absolute, out _))
            return BadRequest(new { error = "Please enter a valid URL." });

        if (!_urlDownload.IsSupported(request.Url))
            return BadRequest(new { error = "Only public YouTube, Instagram, and Facebook reel URLs are supported." });

        var job            = _jobStore.CreateJob();
        job.SourceUrl      = request.Url.Trim();
        job.SourcePlatform = _urlDownload.DetectPlatform(request.Url);

        await _queue.EnqueueAsync(job.JobId);

        return Ok(new { jobId = job.JobId, platform = job.SourcePlatform });
    }
}
