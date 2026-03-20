using AIReelBooster.API.Configuration;
using AIReelBooster.API.Infrastructure;
using AIReelBooster.API.Middleware;
using AIReelBooster.API.Services;
using AIReelBooster.API.Services.Interfaces;
using AIReelBooster.API.Workers;

var builder = WebApplication.CreateBuilder(args);

// Typed configuration
builder.Services.Configure<AppSettings>(builder.Configuration.GetSection("AppSettings"));

// CORS — dev origins + any extra origins from CORS_ORIGINS env var (comma-separated)
var corsOrigins = new List<string> { "http://localhost:5173", "http://localhost:5174", "http://localhost:3000" };
var extraOrigins = Environment.GetEnvironmentVariable("CORS_ORIGINS");
if (!string.IsNullOrWhiteSpace(extraOrigins))
    corsOrigins.AddRange(extraOrigins.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries));

builder.Services.AddCors(opts =>
    opts.AddDefaultPolicy(p =>
        p.WithOrigins(corsOrigins.ToArray())
         .AllowAnyHeader()
         .AllowAnyMethod()
    )
);

// Controllers
builder.Services.AddControllers();

// Singletons
builder.Services.AddSingleton<JobStore>();
builder.Services.AddSingleton<BackgroundProcessingQueue>();

// Scoped services
builder.Services.AddScoped<IVideoStorageService, VideoStorageService>();
builder.Services.AddScoped<IVideoProcessingService, VideoProcessingService>();

// HTTP clients for external APIs
builder.Services.AddHttpClient<ITranscriptionService, WhisperTranscriptionService>();
builder.Services.AddHttpClient<IAIGenerationService, ClaudeAIGenerationService>();

// Background workers
builder.Services.AddHostedService<VideoProcessingWorker>();
builder.Services.AddHostedService<JobCleanupWorker>();

// Increase default multipart size limits
builder.Services.Configure<Microsoft.AspNetCore.Http.Features.FormOptions>(opts =>
{
    opts.MultipartBodyLengthLimit = 600_000_000;
});

var app = builder.Build();

// Middleware pipeline
app.UseMiddleware<ErrorHandlingMiddleware>();
app.UseCors();

app.UseStaticFiles();
app.MapControllers();
app.MapGet("/api/health", () => Results.Ok(new { status = "healthy" }));

app.Run();
