# BoostMyReel — CLAUDE.md

## Project overview
BoostMyReel (repo: "AI Reel Booster") is a SaaS web app that helps Instagram/TikTok
creators go viral. Users upload a video; the backend transcribes it, generates a
scroll-stopping hook + caption + hashtags via Claude, calculates a viral score, and
produces auto-subtitles. Additional features: Auto Reel Generator (slices long videos
into short clips), Image Growth Engine (analyses photos/carousels for engagement),
and an in-app AI agent chat for content strategy assistance.

Payments: Razorpay. Deployment: frontend on Vercel, backend on Railway.

---

## Tech stack

### Frontend
- React 19 + TypeScript (~5.9) compiled by Vite 8
- Tailwind CSS 4 via @tailwindcss/vite plugin (no tailwind.config.js — config in CSS)
- lucide-react for icons, react-dropzone for file picking
- @vercel/analytics for usage tracking
- No UI component library — all components hand-rolled with inline styles
- No React Router — page navigation is a `useState<Page>` in App.tsx

### Backend
- .NET 9 / ASP.NET Core C# (single project: AIReelBooster.API)
- SQLite via EF Core (file path from DB_PATH env var, default ./data/users.db)
- External APIs via typed HttpClient registrations:
  - OpenAI Whisper (transcription)
  - Anthropic Claude claude-sonnet-4-6 — hooks, captions, viral scoring, agent chat
  - Razorpay (payment verification)
- FFmpeg bundled in ./ffmpeg-bin for video processing

---

## Architecture

### Background job pipeline (video analysis)
1. POST /api/video/upload or /api/video/finalize → creates VideoJob in JobStore,
   enqueues jobId onto BackgroundProcessingQueue (System.Threading.Channels)
2. VideoProcessingWorker (IHostedService) runs: probe → extract audio → Whisper →
   Claude AI generation → viral score → mark Complete
3. Frontend polls GET /api/video/{jobId}/status every 2 s, then fetches
   GET /api/analysis/{jobId}

### JobStore
In-memory ConcurrentDictionary<string, VideoJob>. Jobs auto-expire after 60 min
(JobCleanupWorker). Auto Reel and Image features have separate stores.

### Chunked upload
Frontend splits files into 4 MB chunks → POST /api/video/chunk → POST /api/video/finalize.
Bypasses Railway's ~100 s proxy timeout.

### Auto Reel Generator
Under AutoReelGenerator/ — separate ReelJobStore + ReelProcessingQueue + ReelGenerationWorker.

### Image Growth Engine
Under ImageGrowthEngine/ — separate ImageJobStore + ImageProcessingQueue + ImageProcessingWorker.

### In-app AI Agent
POST /api/agent/chat — stateless multi-turn Claude chat with tool_use.
Frontend sends full conversation history each request. Agent tools: get_job_status,
get_analysis_result, generate_captions, analyze_viral_score, suggest_content_strategy.

---

## Key file locations

### Backend
| File | Purpose |
|---|---|
| Program.cs | DI registration + middleware pipeline |
| Configuration/AppSettings.cs | Typed config (ClaudeSettings, etc.) |
| Infrastructure/JobStore.cs | In-memory video job store |
| Infrastructure/BackgroundProcessingQueue.cs | Channel-based job queue |
| Workers/VideoProcessingWorker.cs | Main video analysis pipeline |
| Services/ClaudeAIGenerationService.cs | Claude: hook/caption/hashtag/viral score |
| Services/ClaudeAgentService.cs | Claude: multi-turn agent with tool_use |
| Controllers/VideoController.cs | Upload + chunked upload endpoints |
| Controllers/AnalysisController.cs | Analysis results, burn subtitles |
| Controllers/AgentController.cs | POST /api/agent/chat |
| ImageGrowthEngine/Services/ClaudeImageAnalyzerService.cs | Claude Vision for images |

### Frontend
| File | Purpose |
|---|---|
| src/services/api.ts | All fetch calls to /api — single source of truth |
| src/types/index.ts | All shared TypeScript types |
| src/App.tsx | Root component + page routing (useState<Page>) |
| src/hooks/useVideoUpload.ts | Upload + polling state machine |
| src/hooks/useAgentChat.ts | Agent chat state + API calls |
| src/components/AgentChat.tsx | Floating chat widget |

---

## Running the project

### Backend
```bash
cd backend/AIReelBooster.API
# Set secrets in appsettings.Development.json or env vars:
#   AppSettings__Claude__ApiKey, AppSettings__Whisper__ApiKey, etc.
dotnet run
# Listens on http://localhost:5000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# Vite dev server on http://localhost:5173
# /api/* proxied to http://localhost:5000 (see vite.config.ts)
```

---

## Coding conventions

### Backend (C#)
- File-scoped namespaces (`namespace Foo.Bar;`)
- Records for DTOs/responses (`record UploadVideoResponse(...)`)
- Interfaces under Services/Interfaces/ — all services registered by interface
- HTTP clients for external APIs registered via `AddHttpClient<IFoo, FooImpl>()`
- Singletons: JobStore, BackgroundProcessingQueue, DailyUsageLimiter
- Scoped: services that touch EF Core or file I/O
- Transient: AddHttpClient services (ClaudeAIGenerationService, etc.)
- Error handling: global ErrorHandlingMiddleware → 500 { error: "..." }
- Controller actions return IActionResult using Ok(), Conflict(), NotFound(), StatusCode()
- Logging: ILogger<T> injected, use _logger.LogInformation/Warning/Error

### Frontend (TypeScript/React)
- Function components only, no class components
- Custom hooks (useXxx) encapsulate all async/state logic — components are dumb
- All API calls go through src/services/api.ts — never fetch() inline in components
- Inline styles preferred over Tailwind utility classes (existing convention)
- Lucide icons for all iconography
- Types defined in src/types/index.ts, imported explicitly

---

## Git workflow
- **Never push directly to main.** All changes go on a feature branch.
- Branch naming: `feature/<short-description>` or `fix/<short-description>`
- Open a pull request to main for all changes, even solo work.
- Commit messages: conventional prefix (feat:, fix:, docs:, refactor:) + concise description.

---

## Existing Claude integration points

All Claude calls share the same base settings from AppSettings.Claude:
- Model: `claude-sonnet-4-6`
- Endpoint: `https://api.anthropic.com/v1/messages`
- Auth: `x-api-key` header + `anthropic-version: 2023-06-01`

| Service | What it does |
|---|---|
| ClaudeAIGenerationService.GenerateAsync | Hook + caption + hashtags from transcript |
| ClaudeAIGenerationService.AnalyzeViralScoreAsync | 0–100 viral score |
| ClaudeAIGenerationService.ExtractViralKeywordsAsync | Top 25 niche keywords |
| ClaudeImageAnalyzerService.AnalyzeAsync | Vision analysis of uploaded image |
| ClaudeCaptionGeneratorService.GenerateAsync | Tone-aware caption for images |
| ClaudeAgentService.ChatAsync | Multi-turn agent with tool_use (agentic loop) |
