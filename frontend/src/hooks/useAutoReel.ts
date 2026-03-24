import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import type { GeneratedReel, ReelJobStatus } from '../types';

export type AutoReelState =
  | 'idle'
  | 'uploading'
  | 'analyzing'
  | 'generating'
  | 'complete'
  | 'failed';

interface UseAutoReelResult {
  state: AutoReelState;
  progressPercent: number;
  currentStep: string | null;
  reelJobStatus: ReelJobStatus | null;
  reels: GeneratedReel[];
  reelJobId: string | null;
  isPremium: boolean;
  unlockedCount: number;
  error: string | null;
  start: (file: File, userId: string | null) => Promise<void>;
  reset: () => void;
}

export function useAutoReel(): UseAutoReelResult {
  const [state, setState]               = useState<AutoReelState>('idle');
  const [progressPercent, setProgress]  = useState(0);
  const [currentStep, setStep]          = useState<string | null>(null);
  const [reelJobStatus, setReelStatus]  = useState<ReelJobStatus | null>(null);
  const [reels, setReels]               = useState<GeneratedReel[]>([]);
  const [reelJobId, setReelJobId]       = useState<string | null>(null);
  const [isPremium, setIsPremium]       = useState(false);
  const [unlockedCount, setUnlocked]    = useState(0);
  const [error, setError]               = useState<string | null>(null);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  // ── Phase 1: poll video analysis ──────────────────────────────────────────

  const pollAnalysis = useCallback((videoJobId: string): Promise<void> =>
    new Promise((resolve, reject) => {
      pollingRef.current = setInterval(async () => {
        try {
          const status = await api.getStatus(videoJobId);

          // Map analysis status to a 15–68% progress band
          const progressMap: Record<string, number> = {
            Pending: 15,
            Uploading: 22,
            Transcribing: 38,
            GeneratingAI: 55,
            RenderingSubtitles: 65,
            Complete: 68,
          };
          setProgress(progressMap[status.status] ?? 40);

          if (status.status === 'Transcribing') setStep('Transcribing audio…');
          else if (status.status === 'GeneratingAI') setStep('Analysing content…');

          if (status.status === 'Complete') { stopPolling(); resolve(); }
          else if (status.status === 'Failed') {
            stopPolling();
            reject(new Error(status.errorMessage ?? 'Video analysis failed.'));
          }
        } catch (err) {
          stopPolling();
          reject(err);
        }
      }, 2000);
    }), []);

  // ── Phase 2: poll reel generation ────────────────────────────────────────

  const pollReelJob = useCallback((rid: string): Promise<void> =>
    new Promise((resolve, reject) => {
      pollingRef.current = setInterval(async () => {
        try {
          const status = await api.getReelStatus(rid);
          setReelStatus(status.status);

          // 70–98% band for reel generation
          setProgress(70 + Math.round(status.progressPercent * 0.28));
          if (status.currentStep) setStep(status.currentStep);

          if (status.status === 'Complete') { stopPolling(); resolve(); }
          else if (status.status === 'Failed') {
            stopPolling();
            reject(new Error(status.errorMessage ?? 'Reel generation failed.'));
          }
        } catch (err) {
          stopPolling();
          reject(err);
        }
      }, 2000);
    }), []);

  // ── Main entry ────────────────────────────────────────────────────────────

  const start = useCallback(async (file: File, userId: string | null) => {
    stopPolling();
    setState('uploading');
    setProgress(5);
    setStep('Uploading video…');
    setError(null);
    setReels([]);
    setReelJobId(null);
    setReelStatus(null);

    try {
      // 1. Upload
      const { jobId: videoJobId } = await api.uploadVideo(file, undefined, undefined, userId ?? undefined);
      setProgress(15);

      // 2. Analyse
      setState('analyzing');
      setStep('Transcribing audio…');
      await pollAnalysis(videoJobId);

      // 3. Start reel generation
      setState('generating');
      setProgress(70);
      setStep('Detecting scenes…');
      const { reelJobId: rid } = await api.generateReels(videoJobId, userId);
      setReelJobId(rid);

      // 4. Poll reel job
      await pollReelJob(rid);

      // 5. Fetch results
      const result = await api.getReelResult(rid);
      setReels(result.reels);
      setIsPremium(result.isPremium);
      setUnlocked(result.unlockedCount);
      setState('complete');
      setProgress(100);
      setStep(null);
    } catch (err) {
      stopPolling();
      setState('failed');
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    }
  }, [pollAnalysis, pollReelJob]);

  const reset = useCallback(() => {
    stopPolling();
    setState('idle');
    setProgress(0);
    setStep(null);
    setReels([]);
    setReelJobId(null);
    setReelStatus(null);
    setIsPremium(false);
    setUnlocked(0);
    setError(null);
  }, []);

  useEffect(() => () => stopPolling(), []);

  return { state, progressPercent, currentStep, reelJobStatus, reels, reelJobId, isPremium, unlockedCount, error, start, reset };
}
