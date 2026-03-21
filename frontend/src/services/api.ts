import type {
  AnalysisResult,
  BurnSubtitlesResponse,
  JobStatusResponse,
  UploadVideoResponse,
  ViralScore,
} from '../types';

// In dev the Vite proxy rewrites /api → localhost:5000.
// In production set VITE_API_URL=https://your-backend.railway.app
const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, init);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  uploadVideo(file: File): Promise<UploadVideoResponse> {
    const form = new FormData();
    form.append('file', file);
    return request<UploadVideoResponse>('/video/upload', { method: 'POST', body: form });
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
    plan: string
  ): Promise<{ success: boolean }> {
    return request<{ success: boolean }>('/payment/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, paymentId, orderId, signature, plan }),
    });
  },
};
