import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import type { ImageAnalysisResult, ImageJobStatus } from '../types';

type ImageState = 'idle' | 'uploading' | 'polling' | 'complete' | 'error';

interface UseImageAnalysisResult {
  state: ImageState;
  jobId: string | null;
  jobStatus: ImageJobStatus | null;
  result: ImageAnalysisResult | null;
  error: string | null;
  analyze: (files: File[], tone: string, caption?: string) => Promise<void>;
  reset: () => void;
}

export function useImageAnalysis(): UseImageAnalysisResult {
  const [state, setState]         = useState<ImageState>('idle');
  const [jobId, setJobId]         = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<ImageJobStatus | null>(null);
  const [result, setResult]       = useState<ImageAnalysisResult | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
  };

  const startPolling = useCallback((id: string) => {
    stopPolling();
    setState('polling');

    pollingRef.current = setInterval(async () => {
      try {
        const status = await api.getImageStatus(id);
        setJobStatus(status);

        if (status.status === 'Complete') {
          stopPolling();
          const analysis = await api.getImageResult(id);
          setResult(analysis);
          setState('complete');
        } else if (status.status === 'Failed') {
          stopPolling();
          setState('error');
          setError(status.message ?? 'Analysis failed.');
        }
      } catch (err) {
        stopPolling();
        setState('error');
        setError(err instanceof Error ? err.message : 'Network error while polling.');
      }
    }, 2000);
  }, []);

  const analyze = useCallback(async (files: File[], tone: string, caption?: string) => {
    setState('uploading');
    setError(null);
    setResult(null);

    try {
      const res = await api.analyzeImages(files, tone, caption);
      setJobId(res.jobId);
      startPolling(res.jobId);
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Upload failed.');
    }
  }, [startPolling]);

  const reset = useCallback(() => {
    stopPolling();
    setState('idle');
    setJobId(null);
    setJobStatus(null);
    setResult(null);
    setError(null);
  }, []);

  useEffect(() => () => stopPolling(), []);

  return { state, jobId, jobStatus, result, error, analyze, reset };
}
