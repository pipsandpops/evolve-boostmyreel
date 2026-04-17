<!-- ============================================================
     EVOLVE HACK 2026 — Abstract Submission
     Project: BoostMyReel
     ============================================================ -->

# Evolve Hack 2026 — Abstract Submission

---

## Team Information

**Team Name :** AI Alchemists
**Primary Member Name :** [Your Name]
**Primary Member Email :** [your.email@globallogic.com]
**Theme:** Reimagining Learning and Collaboration in the Digital Era

---

## Title: BoostMyReel — AI-Powered Social Content Intelligence & Auto-Optimisation Platform

---

## 1. Problem Statement

Content creators on Instagram and TikTok invest significant time producing videos and
images, yet the majority of posts underperform due to poor hooks, misaligned captions,
wrong aspect ratios, and ineffective framing — all discovered only after publishing.

Creators currently face three critical gaps:

- **No pre-publish intelligence** — there is no tool that predicts a post's viral potential
  before it goes live, leaving creators to guess.
- **Manual, time-consuming reformatting** — every video or image must be manually
  cropped and resized for Stories (9:16), Feed Portrait (4:5), and Square (1:1) formats,
  often losing the key subject in the frame.
- **Generic AI assistance** — existing AI caption tools generate one-size-fits-all text
  without understanding the actual visual content, tone, or platform context.

This leads to:

- Reduced reach and engagement despite high production effort
- Repeated manual editing across formats (reels, stories, feed posts)
- Missed viral windows due to slow content iteration cycles

---

## 2. Proposed Solution

**BoostMyReel** is a full-stack AI platform that analyses, scores, and automatically
optimises social media content — both video and images — before it is published.

Key features include:

- **AI Viral Score** — Claude Vision analyses uploaded content and returns a 0–100
  viral potential score with actionable insights, predicted reach, and engagement
  benchmarks.
- **Smart Hook & Caption Generation** — Whisper transcribes video audio; Claude
  generates scroll-stopping opening hooks, platform-aware captions, and niche
  hashtag sets across four tones (Viral, Educational, Storytelling, Sales).
- **Smart Reframe for Video** — OpenCV Haar Cascade detects faces across sampled
  frames; a moving-average + dead-zone algorithm produces jitter-free dynamic crop
  paths; FFmpeg outputs a perfectly framed 9:16 reel automatically.
- **Image Smart Reframe** — The same face-detection pipeline applied to still photos
  and carousels, outputting cropped previews at 9:16, 4:5, and 1:1 with live in-app
  preview and one-click download.
- **Image Growth Engine** — Carousel-aware AI analysis scores each slide individually,
  recommends the optimal slide order, identifies the best cover image, and generates
  a carousel-specific caption.
- **Auto Reel Generator** — Automatically slices long-form videos into multiple
  short-form clips, each independently reframed and ready for upload.
- **In-App AI Strategy Agent** — A multi-turn Claude-powered chat agent with tool_use
  that answers content strategy questions, explains scores, and suggests improvements
  in real time.

Unlike generic content tools, BoostMyReel combines computer vision, large language
models, and real-time video processing into a single, zero-setup web platform.

---

## 3. Uniqueness of Approach

**What Makes It Unique**
BoostMyReel is the only platform that combines pre-publish viral prediction, AI-generated
hooks/captions, and fully automated multi-format smart reframing in a single workflow.
A creator uploads once and gets a score, a caption, and correctly framed outputs for every
platform format — in under 60 seconds.

**Difference from Existing Tools**
Existing solutions treat these as separate products:

- Caption tools (e.g., Predis.ai) generate text but cannot reframe video or predict scores.
- Video editors (e.g., CapCut) crop manually but have no AI content analysis.
- Analytics tools (e.g., Iconosquare) report past performance but cannot predict future
  viral potential before posting.

BoostMyReel goes further by:

- Running OpenCV face detection across video frames to produce a **mathematically
  smoothed, subject-following crop** (not a simple centre crop)
- Using **Claude Vision** on actual pixel data to score creative quality — not just metadata
- Generating captions that are **tone-aware and transcript-grounded**, not generic templates
- Applying the same reframe intelligence to **still images and carousels**, not just video

**Distinctiveness**
The Smart Reframe pipeline is technically novel: per-frame face positions are collected,
filled for missing frames, passed through a **moving-average smoother (window = 7 frames)**
and a **20-pixel dead-zone filter**, then fed to FFmpeg as a sendcmd script — eliminating
both camera shake and the FFmpeg comma-in-filtergraph parsing bug that plagues
naive implementations. This level of engineering is not found in any consumer content tool.

**Core Innovation**
The core innovation is the fusion of three AI disciplines into one real-time pipeline:

1. **Computer Vision** (OpenCV Haar Cascade) — spatial subject detection
2. **Large Language Models** (Claude claude-sonnet-4-6) — semantic content understanding and generation
3. **Signal Processing** (moving-average smoothing + dead-zone filter) — stable, broadcast-quality crop paths

**Nature of the Solution**
This is a completely new approach. Traditional tools treat cropping as a geometric
operation and captioning as a text task. BoostMyReel unifies both under a shared
understanding of *what is visually important in the frame* and *what story the content tells*.

---

## 4. Feasibility & Technical Approach

**Practical Feasibility**
BoostMyReel is fully built and working. Every feature described is implemented and
testable in the current codebase. No hypothetical components are included.

**Core System Architecture**

BoostMyReel is built on a modern, cloud-deployed full-stack architecture with AI at its core:

| Layer | Technology |
|---|---|
| **Frontend** | React 19 + TypeScript, Vite, deployed on Vercel |
| **Backend** | ASP.NET Core (.NET 9 / C#), deployed on Railway |
| **AI — Content Analysis** | Anthropic Claude claude-sonnet-4-6 (Vision + text generation) |
| **AI — Transcription** | OpenAI Whisper |
| **Computer Vision** | OpenCV Haar Cascade (face detection) |
| **Image Processing** | SixLabors.ImageSharp (crop + resize) |
| **Video Processing** | FFmpeg (bundled binary, server-side) |
| **Background Jobs** | .NET Channels-based async worker pipeline |
| **Database** | SQLite via EF Core |
| **Payments** | Razorpay |

**Challenges & Constraints**

- **FFmpeg filtergraph parsing** — comma-separated crop expressions were being
  misinterpreted as separate filters. Solved by writing crop keyframes to a sendcmd
  script file and referencing it by path, keeping the filtergraph expression comma-free.
- **Windows libass subtitle rendering** — libass cannot resolve file paths via the
  subtitles filter on Windows regardless of escaping strategy. Resolved by decoupling
  subtitle burn-in into a separate optional pipeline stage.
- **File lifecycle management** — source images were being deleted by the processing
  worker after analysis, preventing subsequent reframe requests. Fixed by deferring
  cleanup to the TTL-based JobCleanupWorker (60-minute expiry).
- **Chunked upload** — Railway's 100-second proxy timeout is bypassed by splitting
  files into 4 MB chunks uploaded sequentially, then finalised server-side.

**Integration Capability**
The entire platform is API-first. Every feature is exposed as a versioned REST endpoint,
making it straightforward to embed Smart Reframe or viral scoring into third-party
tools, browser extensions, or scheduling platforms via standard HTTP calls.

**MVP Readiness**
The MVP is complete and running. Core features (upload, score, caption, smart reframe,
image analysis) are fully functional. The codebase is deployed to Vercel + Railway and
accessible via a public URL.

---

## 5. Impact Potential

**Target Users & Beneficiaries**
- Solo content creators on Instagram, TikTok, and YouTube Shorts
- Social media managers handling multiple brand accounts
- Digital marketing agencies producing high-volume content
- Small businesses with no dedicated video editing resource

**Problem & Impact at Scale**
Over 200 million creators publish on Instagram alone. The majority lack access to
professional video editors or AI tools that understand both visual content and platform
algorithms. BoostMyReel democratises professional-grade content optimisation:
a creator with a smartphone can now get the same pre-publish intelligence and
format-perfect outputs that a production studio would provide — instantly and for free.

By predicting viral potential before posting, creators can iterate on content in minutes
rather than days, compressing the learning cycle that currently takes months of
trial-and-error posting.

**Future Potential**

- **Scheduled auto-posting** — integrate with Instagram Graph API to post at predicted
  peak engagement windows
- **A/B hook testing** — generate multiple hook variants and track which drives the
  highest watch-time
- **Brand voice memory** — Claude remembers a creator's past top-performing posts
  and styles future captions to match
- **Multi-platform export** — single upload produces platform-optimised variants for
  Instagram, TikTok, YouTube Shorts, and LinkedIn simultaneously
- **Trend signal ingestion** — real-time hashtag and audio trend data fed into scoring
  to surface "trending window" opportunities before they peak

---

*Submitted for Evolve Hack 2026 — GlobalLogic*
