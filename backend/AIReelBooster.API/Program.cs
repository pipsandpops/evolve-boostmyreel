using AIReelBooster.API.AutoReelGenerator.Infrastructure;
using AIReelBooster.API.AutoReelGenerator.Interfaces;
using AIReelBooster.API.AutoReelGenerator.Services;
using AIReelBooster.API.AutoReelGenerator.Workers;
using AIReelBooster.API.Configuration;
using AIReelBooster.API.ImageGrowthEngine.Infrastructure;
using AIReelBooster.API.ImageGrowthEngine.Interfaces;
using AIReelBooster.API.ImageGrowthEngine.Services;
using AIReelBooster.API.ImageGrowthEngine.Workers;
using AIReelBooster.API.Infrastructure;
using AIReelBooster.API.Middleware;
using AIReelBooster.API.Services;
using AIReelBooster.API.Services.Interfaces;
using AIReelBooster.API.Workers;
using Microsoft.EntityFrameworkCore;

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

// SQLite database for user/payment tracking
var dbPath = Environment.GetEnvironmentVariable("DB_PATH") ?? "./data/users.db";
Directory.CreateDirectory(Path.GetDirectoryName(dbPath)!);
builder.Services.AddDbContext<AppDbContext>(opts =>
    opts.UseSqlite($"Data Source={dbPath}"));

// Generic HTTP client (used by PaymentController for Razorpay API)
builder.Services.AddHttpClient();

// Controllers
builder.Services.AddControllers();
builder.Services.AddScoped<ReferralController>();

// Singletons
builder.Services.AddSingleton<JobStore>();
builder.Services.AddSingleton<BackgroundProcessingQueue>();
builder.Services.AddSingleton<DailyUsageLimiter>();

// Scoped services
builder.Services.AddScoped<IVideoStorageService, VideoStorageService>();
builder.Services.AddScoped<IVideoProcessingService, VideoProcessingService>();

// HTTP clients for external APIs
builder.Services.AddHttpClient<ITranscriptionService, WhisperTranscriptionService>();
builder.Services.AddHttpClient<IAIGenerationService, ClaudeAIGenerationService>();

// Background workers
builder.Services.AddHostedService<VideoProcessingWorker>();
builder.Services.AddHostedService<JobCleanupWorker>();

// ── View Prediction ───────────────────────────────────────────────────────────
builder.Services.AddScoped<IScenarioPredictionService, ScenarioPredictionService>();

// ── Instagram Integration ─────────────────────────────────────────────────────
builder.Services.AddScoped<IInstagramAuthService,          InstagramAuthService>();
builder.Services.AddScoped<IPersonalizedPredictionService, PersonalizedPredictionService>();
builder.Services.AddHttpClient<IInstagramAnalyticsService, InstagramAnalyticsService>();

// ── Auto Reel Generator ───────────────────────────────────────────────────────
builder.Services.AddSingleton<ReelJobStore>();
builder.Services.AddSingleton<ReelProcessingQueue>();
builder.Services.AddScoped<ISceneDetectionService, SceneDetectionService>();
builder.Services.AddScoped<ISegmentRankingService, SegmentRankingService>();
builder.Services.AddScoped<IReelVideoProcessor, ReelVideoProcessor>();
builder.Services.AddScoped<IAutoReelService, AutoReelService>();
builder.Services.AddHostedService<ReelGenerationWorker>();

// ── ImageGrowthEngine ─────────────────────────────────────────────────────────
builder.Services.AddSingleton<ImageJobStore>();
builder.Services.AddSingleton<ImageProcessingQueue>();
builder.Services.AddScoped<IVisualFeatureExtractor, VisualFeatureExtractor>();
builder.Services.AddScoped<IEngagementPredictor, EngagementPredictor>();
builder.Services.AddHttpClient<IImageAnalyzerService, ClaudeImageAnalyzerService>();
builder.Services.AddHttpClient<ICaptionGeneratorService, ClaudeCaptionGeneratorService>();
builder.Services.AddHttpClient<ICarouselOptimizer, CarouselOptimizer>();
builder.Services.AddHostedService<ImageProcessingWorker>();

// Increase default multipart size limits
builder.Services.Configure<Microsoft.AspNetCore.Http.Features.FormOptions>(opts =>
{
    opts.MultipartBodyLengthLimit = 600_000_000;
});

// Allow arbitrarily slow uploads (mobile data) by removing Kestrel's minimum
// body data-rate enforcement. Without this, Kestrel aborts connections that
// send data slower than the default 240 bytes/sec threshold.
builder.WebHost.ConfigureKestrel(k =>
{
    k.Limits.MinRequestBodyDataRate = null;
    k.Limits.MaxRequestBodySize    = 600_000_000;
});

var app = builder.Build();

// Ensure SQLite DB + tables exist
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
}

// Middleware pipeline
app.UseMiddleware<ErrorHandlingMiddleware>();
app.UseCors();

app.UseStaticFiles();
app.MapControllers();
app.MapGet("/api/health", () => Results.Ok(new { status = "healthy" }));

app.Run();
