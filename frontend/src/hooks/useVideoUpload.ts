import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import type { AnalysisResult, JobStatus } from '../types';

type UploadState = 'idle' | 'uploading' | 'polling' | 'complete' | 'error';

interface UseVideoUploadResult {
  state: UploadState;
  jobId: string | null;
  jobStatus: JobStatus | null;
  progressPercent: number;
  result: AnalysisResult | null;
  error: string | null;
  upload: (file: File) => Promise<void>;
  reset: () => void;
}

export function useVideoUpload(): UseVideoUploadResult {
  const [state, setState] = useState<UploadState>('idle');
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [progressPercent, setProgressPercent] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const startPolling = useCallback((id: string) => {
    stopPolling();
    setState('polling');

    pollingRef.current = setInterval(async () => {
      try {
        const status = await api.getStatus(id);
        setJobStatus(status.status);
        setProgressPercent(status.progressPercent);

        if (status.status === 'Complete') {
          stopPolling();
          const analysis = await api.getAnalysis(id);
          setResult(analysis);
          setState('complete');
          setProgressPercent(100);
        } else if (status.status === 'Failed') {
          stopPolling();
          setState('error');
          setError(status.errorMessage ?? 'Processing failed.');
        }
      } catch (err) {
        stopPolling();
        setState('error');
        setError(err instanceof Error ? err.message : 'Network error while polling.');
      }
    }, 2000);
  }, []);

  const upload = useCallback(async (file: File) => {
    setState('uploading');
    setError(null);
    setResult(null);
    setProgressPercent(5);

    try {
      const res = await api.uploadVideo(file);
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
    setProgressPercent(0);
    setResult(null);
    setError(null);
  }, []);

  useEffect(() => () => stopPolling(), []);

  return { state, jobId, jobStatus, progressPercent, result, error, upload, reset };
}
