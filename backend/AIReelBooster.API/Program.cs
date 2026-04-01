using AIReelBooster.API.AutoReelGenerator.Infrastructure;
using AIReelBooster.API.AutoReelGenerator.Interfaces;
using AIReelBooster.API.AutoReelGenerator.Services;
using AIReelBooster.API.AutoReelGenerator.Workers;
using AIReelBooster.API.Configuration;
using AIReelBooster.API.ImageGrowthEngine.Infrastructure;
using AIReelBooster.API.ImageGrowthEngine.Interfaces;
using AIReelBooster.API.ImageGrowthEngine.Services;
using AIReelBooster.API.ImageGrowthEngine.Workers;
using AIReelBooster.API.Controllers;
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
builder.Services.AddHttpClient<IAgentService, ClaudeAgentService>();

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

// ── Reel Streak Battle ────────────────────────────────────────────────────────
builder.Services.AddScoped<IBattleService, BattleService>();
builder.Services.AddHostedService<BattleExpiryWorker>();

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

// Ensure SQLite DB + tables exist.
// EnsureCreated only works on a brand-new DB — use CREATE TABLE IF NOT EXISTS
// to add tables that were introduced after the DB was first created.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();

    db.Database.ExecuteSqlRaw("""
        CREATE TABLE IF NOT EXISTS UserReferralCodes (
            Code      TEXT NOT NULL PRIMARY KEY,
            UserId    TEXT NOT NULL,
            CreatedAt TEXT NOT NULL DEFAULT (datetime('now'))
        )
        """);

    db.Database.ExecuteSqlRaw("""
        CREATE TABLE IF NOT EXISTS UserReferrals (
            UserId        TEXT NOT NULL PRIMARY KEY,
            ReferrerId    TEXT NOT NULL,
            HasUploaded   INTEGER NOT NULL DEFAULT 0,
            CreditAwarded INTEGER NOT NULL DEFAULT 0,
            CreatedAt     TEXT NOT NULL DEFAULT (datetime('now'))
        )
        """);

    db.Database.ExecuteSqlRaw("""
        CREATE TABLE IF NOT EXISTS UserCredits (
            UserId    TEXT NOT NULL PRIMARY KEY,
            Balance   INTEGER NOT NULL DEFAULT 0,
            UpdatedAt TEXT NOT NULL DEFAULT (datetime('now'))
        )
        """);

    db.Database.ExecuteSqlRaw("""
        CREATE TABLE IF NOT EXISTS OtpCodes (
            Id        INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            Email     TEXT NOT NULL,
            Code      TEXT NOT NULL,
            ExpiresAt TEXT NOT NULL,
            CreatedAt TEXT NOT NULL DEFAULT (datetime('now'))
        )
        """);

    // Add Email column to UserPlans if not exists (safe for existing DBs)
    try { db.Database.ExecuteSqlRaw("ALTER TABLE UserPlans ADD COLUMN Email TEXT"); } catch { /* already exists */ }

    // ── Battle tables ────────────────────────────────────────────────────────
    db.Database.ExecuteSqlRaw("""
        CREATE TABLE IF NOT EXISTS BattleChallenges (
            Id             TEXT NOT NULL PRIMARY KEY,
            ChallengerId   TEXT NOT NULL,
            OpponentHandle TEXT NOT NULL,
            OpponentEmail  TEXT,
            TrashTalkMsg   TEXT,
            Status         INTEGER NOT NULL DEFAULT 0,
            BattleId       TEXT,
            CreatedAt      TEXT NOT NULL DEFAULT (datetime('now')),
            ExpiresAt      TEXT NOT NULL
        )
        """);

    db.Database.ExecuteSqlRaw("""
        CREATE TABLE IF NOT EXISTS Battles (
            Id               TEXT NOT NULL PRIMARY KEY,
            ChallengeId      TEXT NOT NULL,
            ChallengerUserId TEXT NOT NULL,
            OpponentUserId   TEXT NOT NULL,
            Status           INTEGER NOT NULL DEFAULT 0,
            StartedAt        TEXT NOT NULL,
            EndsAt           TEXT NOT NULL,
            WinnerUserId     TEXT,
            CreatedAt        TEXT NOT NULL DEFAULT (datetime('now'))
        )
        """);

    db.Database.ExecuteSqlRaw("""
        CREATE TABLE IF NOT EXISTS BattleEntries (
            Id                TEXT NOT NULL PRIMARY KEY,
            BattleId          TEXT NOT NULL,
            UserId            TEXT NOT NULL,
            InstagramHandle   TEXT NOT NULL,
            ReelUrl           TEXT NOT NULL,
            ReelPostId        TEXT,
            BaselineViews     INTEGER NOT NULL DEFAULT 0,
            BaselineLikes     INTEGER NOT NULL DEFAULT 0,
            BaselineComments  INTEGER NOT NULL DEFAULT 0,
            BaselineSaves     INTEGER NOT NULL DEFAULT 0,
            BaselineShares    INTEGER NOT NULL DEFAULT 0,
            BaselineFollowers INTEGER NOT NULL DEFAULT 0,
            SubmittedAt       TEXT NOT NULL DEFAULT (datetime('now'))
        )
        """);

    db.Database.ExecuteSqlRaw("""
        CREATE TABLE IF NOT EXISTS BattleMetricSnapshots (
            Id         INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            EntryId    TEXT NOT NULL,
            BattleId   TEXT NOT NULL,
            Views      INTEGER NOT NULL DEFAULT 0,
            Likes      INTEGER NOT NULL DEFAULT 0,
            Comments   INTEGER NOT NULL DEFAULT 0,
            Saves      INTEGER NOT NULL DEFAULT 0,
            Shares     INTEGER NOT NULL DEFAULT 0,
            Followers  INTEGER NOT NULL DEFAULT 0,
            Score      REAL NOT NULL DEFAULT 0,
            Source     INTEGER NOT NULL DEFAULT 1,
            RecordedAt TEXT NOT NULL DEFAULT (datetime('now'))
        )
        """);

    db.Database.ExecuteSqlRaw("""
        CREATE TABLE IF NOT EXISTS BattleVotes (
            Id         INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            BattleId   TEXT NOT NULL,
            EntryId    TEXT NOT NULL,
            VoterToken TEXT NOT NULL,
            VoterIp    TEXT,
            CreatedAt  TEXT NOT NULL DEFAULT (datetime('now'))
        )
        """);
}

// Middleware pipeline
app.UseMiddleware<ErrorHandlingMiddleware>();
app.UseCors();

app.UseStaticFiles();
app.MapControllers();
app.MapGet("/api/health", () => Results.Ok(new { status = "healthy" }));

app.Run();
