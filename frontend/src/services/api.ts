import type {
  AgentChatResponse,
  AgentMessage,
  AnalysisResult,
  BattleScoreResult,
  BattleSummary,
  ChallengeStatus,
  CreateChallengeResponse,
  BurnSubtitlesResponse,
  ImageAnalysisResult,
  ImageJobStatus,
  InstagramStatus,
  JobStatusResponse,
  ReelJobStatusResponse,
  ReelResult,
  UploadVideoResponse,
  ViralScore,
  ViewPrediction,
} from '../types';

// In dev: Vite proxy rewrites /api → localhost:5000 (see vite.config.ts).
// In production: Vercel rewrites /api/* → Railway (see vercel.json).
// VITE_API_URL is no longer needed; all requests use the same-origin /api path.
const BASE = '/api';

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, init);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// Each chunk is 4 MB — well under Railway's ~100 s proxy timeout even on slow mobile data.
const CHUNK_SIZE = 4 * 1024 * 1024;

/**
 * Upload a file using XMLHttpRequest so we can track real byte-level progress.
 * `onProgress` receives 0–100 as bytes are sent over the wire.
 * Pass an AbortSignal to cancel mid-upload.
 */
function uploadWithProgress<T>(
  url: string,
  form: FormData,
  onProgress: (pct: number) => void,
  signal?: AbortSignal,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Wire up abort signal
    const abort = () => xhr.abort();
    signal?.addEventListener('abort', abort);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      signal?.removeEventListener('abort', abort);
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(JSON.parse(xhr.responseText)); }
        catch { reject(new Error('Invalid server response.')); }
      } else {
        let msg = `HTTP ${xhr.status}`;
        try { msg = JSON.parse(xhr.responseText)?.error ?? msg; } catch { /* use default */ }
        reject(new Error(msg));
      }
    };

    xhr.onerror = () => {
      signal?.removeEventListener('abort', abort);
      reject(new Error('Network error — check your connection and try again.'));
    };

    xhr.onabort = () => {
      signal?.removeEventListener('abort', abort);
      reject(new DOMException('Upload cancelled.', 'AbortError'));
    };

    xhr.open('POST', `${BASE}${url}`);
    xhr.send(form);
  });
}

/**
 * Splits `file` into CHUNK_SIZE slices and uploads each one to /video/chunk,
 * then calls /video/finalize to assemble them server-side.
 * This bypasses Railway's ~100 s proxy timeout on slow mobile connections.
 */
async function uploadInChunks(
  file: File,
  onProgress: (pct: number) => void,
  signal?: AbortSignal,
  userId?: string,
): Promise<UploadVideoResponse> {
  const uploadId    = crypto.randomUUID();
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

  for (let i = 0; i < totalChunks; i++) {
    if (signal?.aborted) throw new DOMException('Upload cancelled.', 'AbortError');

    const form = new FormData();
    form.append('uploadId', uploadId);
    form.append('chunkIndex', String(i));
    form.append('totalChunks', String(totalChunks));
    form.append('chunk', file.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE), file.name);

    await uploadWithProgress<unknown>(
      '/video/chunk',
      form,
      (pct) => onProgress(Math.round(((i + pct / 100) / totalChunks) * 95)),
      signal,
    );
  }

  onProgress(97);

  const result = await request<UploadVideoResponse>('/video/finalize', {
    signal,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uploadId, totalChunks, fileName: file.name, userId }),
  });

  onProgress(100);
  return result;
}

export const api = {
  uploadVideo(
    file: File,
    onProgress: (pct: number) => void = () => {},
    signal?: AbortSignal,
    userId?: string,
  ): Promise<UploadVideoResponse> {
    return uploadInChunks(file, onProgress, signal, userId);
  },

  getStatus(jobId: string): Promise<JobStatusResponse> {
    return request<JobStatusResponse>(`/video/${jobId}/status`);
  },

  getAnalysis(jobId: string): Promise<AnalysisResult> {
    return request<AnalysisResult>(`/analysis/${jobId}`);
  },

  getSrtUrl(jobId: string): string {
    return `${BASE}/analysis/${jobId}/subtitles/srt`;
  },

  burnSubtitles(jobId: string): Promise<BurnSubtitlesResponse> {
    return request<BurnSubtitlesResponse>(`/analysis/${jobId}/subtitles/burn`, { method: 'POST' });
  },

  getBurnedVideoUrl(jobId: string): string {
    return `${BASE}/analysis/${jobId}/burned-video`;
  },

  getVideoStreamUrl(jobId: string): string {
    return `${BASE}/video/${jobId}/stream`;
  },

  deleteJob(jobId: string): Promise<void> {
    return fetch(`${BASE}/video/${jobId}`, { method: 'DELETE' }).then(() => undefined);
  },

  improveReel(jobId: string, improvedHook: string): Promise<{ viralScore: ViralScore }> {
    return request<{ viralScore: ViralScore }>(`/analysis/${jobId}/improve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ improvedHook }),
    });
  },

  getUserStatus(userId: string): Promise<{ isPaid: boolean; plan: string }> {
    return request<{ isPaid: boolean; plan: string }>(
      `/user/status?userId=${encodeURIComponent(userId)}`
    );
  },

  createOrder(userId: string, plan: string): Promise<{ orderId: string; amount: number; currency: string; keyId: string }> {
    return request<{ orderId: string; amount: number; currency: string; keyId: string }>(
      '/payment/create-order',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, plan }),
      }
    );
  },

  verifyPayment(
    userId: string,
    paymentId: string,
    orderId: string,
    signature: string,
    plan: string,
    email?: string,
  ): Promise<{ success: boolean }> {
    return request<{ success: boolean }>('/payment/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, paymentId, orderId, signature, plan, email }),
    });
  },

  requestOtp(email: string): Promise<{ message: string }> {
    return request('/user/request-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
  },

  verifyOtp(email: string, code: string): Promise<{ userId: string; plan: string }> {
    return request('/user/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });
  },

  // ── Instagram Integration ────────────────────────────────────────────────────

  getInstagramAuthUrl(userId: string): Promise<{ authUrl: string }> {
    return request<{ authUrl: string }>(`/instagram/auth-url?userId=${encodeURIComponent(userId)}`);
  },

  getInstagramStatus(userId: string): Promise<InstagramStatus> {
    return request<InstagramStatus>(`/instagram/status?userId=${encodeURIComponent(userId)}`);
  },

  getPersonalizedPrediction(
    userId: string,
    viralScore: number,
    engagementScore: number,
    hookScore: number,
  ): Promise<ViewPrediction> {
    return request<ViewPrediction>('/instagram/prediction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, viralScore, engagementScore, hookScore }),
    });
  },

  disconnectInstagram(userId: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(
      `/instagram/disconnect?userId=${encodeURIComponent(userId)}`,
      { method: 'DELETE' },
    );
  },

  // ── Auto Reel Generator ──────────────────────────────────────────────────────

  generateReels(sourceJobId: string, userId: string | null): Promise<{ reelJobId: string }> {
    return request<{ reelJobId: string }>('/auto-reel/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceJobId, userId }),
    });
  },

  getReelStatus(reelJobId: string): Promise<ReelJobStatusResponse> {
    return request<ReelJobStatusResponse>(`/auto-reel/${reelJobId}/status`);
  },

  getReelResult(reelJobId: string): Promise<ReelResult> {
    return request<ReelResult>(`/auto-reel/${reelJobId}/result`);
  },

  /** Returns a streamable video URL for use as <video src> or download link. */
  getReelVideoUrl(reelJobId: string, index: number): string {
    return `${BASE}/auto-reel/${reelJobId}/download/${index}`;
  },

  // ── Image Growth Engine ──────────────────────────────────────────────────────

  analyzeImages(files: File[], tone: string, caption?: string): Promise<{ jobId: string; status: string }> {
    const form = new FormData();
    files.forEach(f => form.append('images', f));
    form.append('tone', tone);
    if (caption) form.append('caption', caption);
    return request('/image/analyze', { method: 'POST', body: form });
  },

  getImageStatus(jobId: string): Promise<ImageJobStatus> {
    return request<ImageJobStatus>(`/image/${jobId}/status`);
  },

  getImageResult(jobId: string): Promise<ImageAnalysisResult> {
    return request<ImageAnalysisResult>(`/image/${jobId}/result`);
  },

  // ── AI Agent ──────────────────────────────────────────────────────────────────

  agentChat(messages: AgentMessage[], userId?: string): Promise<AgentChatResponse> {
    return request<AgentChatResponse>('/agent/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, userId }),
    });
  },

  // ── Reel Streak Battle ───────────────────────────────────────────────────────

  createChallenge(
    challengerId: string,
    opponentHandle: string,
    trashTalkMsg?: string,
    opponentEmail?: string,
    prizeDescription?: string,
    battleTitle?: string,
    durationHours?: number,
    platform?: string,
    themeHashtag?: string,
    prizePoolAmount?: number,
    prizeCurrency?: string,
    contentGuidelines?: string,
  ): Promise<CreateChallengeResponse> {
    return request<CreateChallengeResponse>('/battle/challenge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        challengerId, opponentHandle, trashTalkMsg, opponentEmail, prizeDescription,
        battleTitle, durationHours: durationHours ?? 24, platform: platform ?? 'Instagram',
        themeHashtag, prizePoolAmount, prizeCurrency, contentGuidelines,
      }),
    });
  },

  getBattle(id: string): Promise<ChallengeStatus | BattleScoreResult> {
    return request<ChallengeStatus | BattleScoreResult>(`/battle/${id}`);
  },

  acceptChallenge(challengeId: string, opponentUserId: string): Promise<{ battleId: string; endsAt: string; message: string }> {
    return request(`/battle/${challengeId}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ opponentUserId }),
    });
  },

  declineChallenge(challengeId: string): Promise<{ message: string }> {
    return request(`/battle/${challengeId}/decline`, { method: 'POST' });
  },

  submitBattleEntry(
    battleId: string,
    userId: string,
    opts: {
      platform: string;          // 'Instagram' | 'YouTube' | 'Both'
      instagramUrl?: string;
      youtubeUrl?: string;
      instagramHandle?: string;
      youtubeHandle?: string;
    },
  ): Promise<{ entryId: string; submittedPlatform: string; validationStatus: string; message: string }> {
    return request(`/battle/${battleId}/entry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        platform: opts.platform,
        instagramUrl: opts.instagramUrl,
        youtubeUrl: opts.youtubeUrl,
        instagramHandle: opts.instagramHandle,
        youtubeHandle: opts.youtubeHandle,
        // backward-compat: also send reelUrl for older backend versions
        reelUrl: opts.instagramUrl,
      }),
    });
  },

  getBattleScores(battleId: string): Promise<BattleScoreResult['battle']> {
    return request<BattleScoreResult['battle']>(`/battle/${battleId}/scores`);
  },

  recordBattleMetrics(
    battleId: string,
    userId: string,
    entryId: string,
    metrics: { views: number; likes: number; comments: number; saves: number; shares: number; followers: number },
    platform = 'Instagram',
  ): Promise<{ message: string }> {
    return request(`/battle/${battleId}/metrics/manual`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, entryId, ...metrics, platform }),
    });
  },

  voteBattle(battleId: string, entryId: string, voterToken: string): Promise<{ success: boolean; message: string; newTotalForEntry: number }> {
    return request(`/battle/${battleId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entryId, voterToken }),
    });
  },

  getBattleLeaderboard(limit = 10): Promise<BattleSummary[]> {
    return request<BattleSummary[]>(`/battle/leaderboard?limit=${limit}`);
  },

  // ── Prize Pool ───────────────────────────────────────────────────────────────

  createPrizePool(
    challengeId: string,
    brandUserId: string,
    tier: string,
    amount: number,
    currency: string,
    nonCashPrizes?: string,
  ): Promise<import('../types').CreatePrizePoolResponse> {
    return request('/prize-pool', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeId, brandUserId, tier, amount, currency, nonCashPrizes }),
    });
  },

  createPrizePoolPaymentOrder(prizePoolId: string): Promise<{ orderId: string; amount: number; prizePoolId: string }> {
    return request(`/prize-pool/${prizePoolId}/pay`, { method: 'POST' });
  },

  confirmPrizePoolPayment(prizePoolId: string, paymentId: string, signature: string): Promise<{ prizePoolId: string; status: string; paidAt: string; message: string }> {
    return request(`/prize-pool/${prizePoolId}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentId, signature }),
    });
  },

  getPrizePoolSummary(battleOrChallengeId: string): Promise<import('../types').PrizePoolSummary> {
    return request<import('../types').PrizePoolSummary>(`/prize-pool/battle/${battleOrChallengeId}`);
  },

  // ── Referral ─────────────────────────────────────────────────────────────────

  getReferralLink(userId: string): Promise<{
    referralCode: string;
    referralUrl: string;
    credits: number;
    stats: { total: number; pending: number; successful: number };
  }> {
    return request(`/referral/my-link?userId=${encodeURIComponent(userId)}`);
  },

  registerReferral(userId: string, referralCode: string): Promise<{ success?: boolean }> {
    return request('/referral/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, referralCode }),
    });
  },

  getReferralStats(userId: string): Promise<{
    stats: { total: number; pending: number; successful: number };
    credits: number;
  }> {
    return request(`/referral/stats?userId=${encodeURIComponent(userId)}`);
  },
};
