import { useState, useEffect, useRef } from 'react';
import { Link2, Loader, ArrowLeft, Youtube, Instagram, Facebook, Sparkles, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { ResultsPanel } from './ResultsPanel';
import { ProcessingStatus } from './ProcessingStatus';
import type { AnalysisResult, JobStatusResponse } from '../types';

interface Props {
  userId: string;
  isPaidUser?: boolean;
  onBack: () => void;
  onUpgrade?: () => void;
}

type Stage = 'input' | 'processing' | 'complete' | 'error';

const PLATFORM_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  YouTube:   { label: 'YouTube',   icon: <Youtube size={18} />,   color: '#ff0000' },
  Instagram: { label: 'Instagram', icon: <Instagram size={18} />, color: '#e1306c' },
  Facebook:  { label: 'Facebook',  icon: <Facebook size={18} />,  color: '#1877f2' },
};

function detectPlatform(url: string): string {
  if (/youtube\.com|youtu\.be/i.test(url)) return 'YouTube';
  if (/instagram\.com/i.test(url))          return 'Instagram';
  if (/facebook\.com|fb\.watch/i.test(url)) return 'Facebook';
  return '';
}


export function UrlAnalysisPage({ userId, isPaidUser = false, onBack, onUpgrade }: Props) {
  const [url, setUrl]           = useState('');
  const [stage, setStage]       = useState<Stage>('input');
  const [jobId, setJobId]       = useState<string | null>(null);
  const [platform, setPlatform] = useState('');
  const [jobStatus, setJobStatus] = useState<JobStatusResponse | null>(null);
  const [result, setResult]     = useState<AnalysisResult | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const detectedPlatform = detectPlatform(url);
  const meta = PLATFORM_META[detectedPlatform] ?? PLATFORM_META[platform];

  // Stop polling on unmount
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const startPolling = (id: string) => {
    pollRef.current = setInterval(async () => {
      try {
        const status = await api.getStatus(id);
        setJobStatus(status);
        if (status.status === 'Complete') {
          clearInterval(pollRef.current!);
          const analysis = await api.getAnalysis(id);
          setResult(analysis);
          setStage('complete');
        } else if (status.status === 'Failed') {
          clearInterval(pollRef.current!);
          setError(status.errorMessage ?? 'Processing failed. Please try a different URL.');
          setStage('error');
        }
      } catch {
        clearInterval(pollRef.current!);
        setError('Lost connection to server. Please try again.');
        setStage('error');
      }
    }, 2000);
  };

  const handleAnalyze = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;

    setError(null);
    setStage('processing');

    try {
      const res = await api.analyzeUrl(trimmed);
      setJobId(res.jobId);
      setPlatform(res.platform);
      startPolling(res.jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start analysis.');
      setStage('error');
    }
  };

  const reset = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setUrl('');
    setStage('input');
    setJobId(null);
    setJobStatus(null);
    setResult(null);
    setError(null);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>

      {/* Top bar */}
      <div style={{
        background: 'white', borderBottom: '1px solid #e2e8f0',
        padding: '0 24px', height: 60,
        display: 'flex', alignItems: 'center', gap: 14,
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button onClick={onBack} className="btn-secondary" style={{ padding: '7px 14px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
          <ArrowLeft size={14} /> Back
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Link2 size={14} color="white" />
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Analyze Reel URL</span>
        </div>
        {stage === 'complete' && (
          <button onClick={reset} className="btn-secondary" style={{ marginLeft: 'auto', padding: '7px 14px', fontSize: 13 }}>
            Analyze another
          </button>
        )}
      </div>

      <div style={{ maxWidth: stage === 'complete' ? 1100 : 640, margin: '0 auto', padding: '40px 24px 64px' }}>

        {/* ── Input stage ── */}
        {stage === 'input' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                <span className="badge" style={{ background: '#eef2ff', color: '#4f46e5', border: '1px solid #c7d2fe' }}>
                  <Sparkles size={12} /> Paste any public reel URL
                </span>
              </div>
              <h1 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, color: '#0f172a', margin: '0 0 10px', letterSpacing: -0.8 }}>
                Get AI suggestions for any reel
              </h1>
              <p style={{ fontSize: 15, color: '#64748b', margin: 0, lineHeight: 1.6 }}>
                Paste a YouTube, Instagram, or Facebook reel URL — we'll analyse it and give you a better hook, caption, hashtags and viral score.
              </p>
            </div>

            {/* Supported platforms */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
              {Object.entries(PLATFORM_META).map(([key, p]) => (
                <div key={key} style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  background: 'white', border: '1px solid #e2e8f0', borderRadius: 10,
                  padding: '8px 14px', fontSize: 13, fontWeight: 600, color: '#334155',
                }}>
                  <span style={{ color: p.color }}>{p.icon}</span>
                  {p.label}
                </div>
              ))}
            </div>

            {/* URL input */}
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 16, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
              <div style={{ position: 'relative', marginBottom: 14 }}>
                <div style={{
                  position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                  color: meta?.color ?? '#94a3b8', display: 'flex', alignItems: 'center',
                  transition: 'color 0.2s',
                }}>
                  {meta?.icon ?? <Link2 size={18} />}
                </div>
                <input
                  type="url"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
                  placeholder="https://www.youtube.com/shorts/... or instagram.com/reel/..."
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '14px 14px 14px 46px',
                    borderRadius: 10, border: '1.5px solid #e2e8f0',
                    fontSize: 14, color: '#0f172a', outline: 'none',
                    fontFamily: 'inherit',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#7c3aed'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#e2e8f0'; }}
                />
                {detectedPlatform && (
                  <div style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    fontSize: 11, fontWeight: 700, color: meta?.color,
                    background: `${meta?.color}18`, padding: '3px 8px', borderRadius: 99,
                  }}>
                    {detectedPlatform} detected
                  </div>
                )}
              </div>

              <button
                onClick={handleAnalyze}
                disabled={!url.trim()}
                className="btn-primary"
                style={{ width: '100%', padding: '13px', fontSize: 15, fontWeight: 700, borderRadius: 10, opacity: url.trim() ? 1 : 0.5 }}
              >
                <Sparkles size={16} /> Analyze This Reel
              </button>
            </div>

            {/* Tips */}
            <div style={{ marginTop: 20, padding: '14px 18px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12 }}>
              <p style={{ fontSize: 13, color: '#92400e', margin: 0, lineHeight: 1.6 }}>
                <strong>Works best with:</strong> Public reels with spoken audio. Private posts, age-restricted content, or videos without speech may not work.
              </p>
            </div>
          </div>
        )}

        {/* ── Processing stage ── */}
        {stage === 'processing' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: 24 }}>
              {meta && (
                <div style={{
                  width: 56, height: 56, borderRadius: 16, margin: '0 auto 16px',
                  background: `${meta.color}18`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: meta.color, fontSize: 28,
                }}>
                  {meta.icon}
                </div>
              )}
              <p style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>
                Analyzing your {platform || 'reel'}…
              </p>
              <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 24px' }}>
                Downloading audio, transcribing, then generating AI content
              </p>
            </div>
            {jobStatus && (
              <ProcessingStatus jobStatus={jobStatus.status as any} progressPercent={jobStatus.progressPercent} />
            )}
            {!jobStatus && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, color: '#7c3aed', fontSize: 14 }}>
                <Loader size={20} style={{ animation: 'url-spin 1s linear infinite' }} />
                Connecting…
              </div>
            )}
            <style>{`@keyframes url-spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* ── Error stage ── */}
        {stage === 'error' && (
          <div style={{ textAlign: 'center', maxWidth: 480, margin: '0 auto' }}>
            <div style={{
              background: '#fff1f2', border: '1px solid #fecdd3',
              borderRadius: 16, padding: 32,
            }}>
              <AlertCircle size={36} color="#dc2626" style={{ marginBottom: 12 }} />
              <p style={{ fontWeight: 700, color: '#be123c', fontSize: 16, margin: '0 0 8px' }}>Analysis failed</p>
              <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 20px', lineHeight: 1.5 }}>{error}</p>
              <button onClick={reset} className="btn-primary" style={{ padding: '10px 28px', fontSize: 14 }}>
                Try another URL
              </button>
            </div>
          </div>
        )}

        {/* ── Results stage ── */}
        {stage === 'complete' && result && jobId && (
          <ResultsPanel
            result={result}
            jobId={jobId}
            userId={userId}
            isPaidUser={isPaidUser}
            onUpgrade={onUpgrade}
            isUrlAnalysis
            sourceUrl={url}
            sourcePlatform={platform || detectedPlatform}
          />
        )}

      </div>
    </div>
  );
}
