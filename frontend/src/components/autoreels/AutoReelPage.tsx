import { useCallback, useState } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { ArrowLeft, Clapperboard, Upload, Film, X, RotateCcw, Sparkles, TrendingUp, Zap } from 'lucide-react';
import { useAutoReel, type AutoReelState } from '../../hooks/useAutoReel';
import { ReelCard } from './ReelCard';

const ACCEPTED = {
  'video/*': ['.mp4', '.mov', '.webm', '.avi', '.mkv'],
};
const MAX_SIZE = 500 * 1024 * 1024;

// ── Processing steps definition ────────────────────────────────────────────────

interface Step {
  icon: string;
  label: string;
  detail: string;
}

const ANALYSIS_STEPS: Step[] = [
  { icon: '📤', label: 'Uploading video',    detail: 'Sending your file securely' },
  { icon: '🎙️', label: 'Transcribing audio', detail: 'Converting speech to text with Whisper AI' },
  { icon: '🤖', label: 'Analysing content',  detail: 'Understanding your video with Claude AI' },
];

const REEL_STEPS: Step[] = [
  { icon: '🎬', label: 'Detecting scenes',       detail: 'Finding visual cuts and scene changes' },
  { icon: '🧠', label: 'Analysing best moments', detail: 'Scoring motion, speech & engagement' },
  { icon: '✂️', label: 'Generating clips',        detail: 'Extracting the top segments' },
  { icon: '📱', label: 'Optimising for reels',   detail: 'Cropping to 9:16 with zoom effect' },
  { icon: '✍️', label: 'Adding AI titles',        detail: 'Writing hooks for each reel' },
];

function stateToStepIndex(state: AutoReelState, reelStatus: string | null): { phase: 'analysis' | 'reel'; index: number } {
  if (state === 'uploading') return { phase: 'analysis', index: 0 };
  if (state === 'analyzing') return { phase: 'analysis', index: 1 };
  if (state === 'generating') {
    const map: Record<string, number> = {
      Pending: 0, Detecting: 0, Ranking: 1, Extracting: 2, Processing: 3,
    };
    return { phase: 'reel', index: map[reelStatus ?? ''] ?? 0 };
  }
  return { phase: 'reel', index: REEL_STEPS.length - 1 };
}

// ── Upload drop zone ──────────────────────────────────────────────────────────

interface UploaderProps {
  onUpload: (file: File) => void;
}

function ReelUploader({ onUpload }: UploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dropError, setDropError] = useState<string | null>(null);

  const onDrop = useCallback((accepted: File[], rejected: FileRejection[]) => {
    setDropError(null);
    if (rejected.length > 0) {
      const msg = rejected[0]?.errors[0]?.message ?? 'Invalid file.';
      setDropError(msg.includes('too large') ? 'File is too large. Max 500 MB.' : msg);
      return;
    }
    if (accepted[0]) setFile(accepted[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: ACCEPTED, maxSize: MAX_SIZE, multiple: false,
  });

  const fmt = (b: number) => `${(b / 1024 / 1024).toFixed(1)} MB`;

  return (
    <div>
      <div
        {...getRootProps()}
        style={{
          border: `2px dashed ${isDragActive ? '#7c3aed' : file ? '#a5b4fc' : '#cbd5e1'}`,
          borderRadius: 20, padding: file ? '20px 24px' : '52px 24px',
          textAlign: 'center', cursor: 'pointer',
          background: isDragActive ? '#f5f3ff' : file ? '#fafbff' : 'white',
          transition: 'all 0.2s', outline: 'none',
        }}
      >
        <input {...getInputProps()} />

        {!file ? (
          <>
            <div style={{
              width: 76, height: 76, borderRadius: '50%', margin: '0 auto 20px',
              background: isDragActive
                ? 'linear-gradient(135deg, #4f46e5, #7c3aed, #db2777)'
                : 'linear-gradient(135deg, #eef2ff, #ede9fe)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
              boxShadow: isDragActive ? '0 8px 24px rgba(79,70,229,0.3)' : 'none',
            }}>
              <Upload size={30} color={isDragActive ? 'white' : '#6366f1'} strokeWidth={1.8} />
            </div>
            {isDragActive ? (
              <p style={{ fontWeight: 700, color: '#6366f1', fontSize: 18, margin: '0 0 6px' }}>Drop it here!</p>
            ) : (
              <>
                <p style={{ fontWeight: 700, color: '#0f172a', fontSize: 18, margin: '0 0 8px' }}>
                  Drop your long video here
                </p>
                <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 20px' }}>
                  or{' '}
                  <span style={{ color: '#6366f1', fontWeight: 600, textDecoration: 'underline', textDecorationStyle: 'dotted' }}>
                    browse from your computer
                  </span>
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {['MP4', 'MOV'].map(f => (
                    <span key={f} style={{
                      fontSize: 12, fontWeight: 600, color: '#64748b',
                      background: '#f8fafc', border: '1px solid #e2e8f0',
                      borderRadius: 99, padding: '3px 10px',
                    }}>{f}</span>
                  ))}
                  <span style={{ fontSize: 12, color: '#94a3b8', padding: '3px 6px' }}>Max 500 MB</span>
                </div>
              </>
            )}
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }} onClick={e => e.stopPropagation()}>
            <div style={{
              width: 52, height: 52, borderRadius: 12, flexShrink: 0,
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed, #db2777)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Film size={22} color="white" />
            </div>
            <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {file.name}
              </p>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>{fmt(file.size)} · Ready to generate</p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button onClick={() => setFile(null)} className="btn-secondary" style={{ padding: '8px 10px', borderRadius: 10 }}>
                <X size={14} />
              </button>
              <button
                onClick={() => onUpload(file)}
                className="btn-primary"
                style={{ padding: '10px 24px', fontSize: 14 }}
              >
                <Clapperboard size={15} /> Generate Viral Reels
              </button>
            </div>
          </div>
        )}
      </div>

      {dropError && (
        <p style={{ color: '#e11d48', fontSize: 13, textAlign: 'center', marginTop: 10, fontWeight: 500 }}>
          ⚠ {dropError}
        </p>
      )}
    </div>
  );
}

// ── Processing steps UI ────────────────────────────────────────────────────────

interface ProcessingProps {
  state: AutoReelState;
  progressPercent: number;
  currentStep: string | null;
  reelStatus: string | null;
}

function ProcessingSteps({ state, progressPercent, currentStep, reelStatus }: ProcessingProps) {
  const { phase, index: activeIndex } = stateToStepIndex(state, reelStatus);
  const analysisActive = phase === 'analysis';

  return (
    <div style={{
      background: 'linear-gradient(160deg, #0f172a, #1e1b4b)',
      borderRadius: 20, padding: '32px 28px',
      border: '1px solid rgba(99,102,241,0.25)',
      boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%', margin: '0 auto 14px',
          background: 'linear-gradient(135deg, #4f46e5, #7c3aed, #db2777)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 0 8px rgba(79,70,229,0.12)',
          animation: 'pulse 2s ease infinite',
        }}>
          <Sparkles size={24} color="white" />
        </div>
        <p style={{ fontSize: 17, fontWeight: 700, color: 'white', margin: '0 0 4px' }}>
          {state === 'generating' ? 'Generating your reels…' : 'Analysing your video…'}
        </p>
        {currentStep && (
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: 0 }}>{currentStep}</p>
        )}
      </div>

      {/* Progress bar */}
      <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.08)', marginBottom: 28, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 99,
          width: `${progressPercent}%`,
          background: 'linear-gradient(90deg, #4f46e5, #7c3aed, #db2777)',
          transition: 'width 0.6s ease',
          boxShadow: '0 0 12px rgba(124,58,237,0.6)',
        }} />
      </div>

      {/* Phase 1: Analysis */}
      <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: 1, margin: '0 0 10px', textTransform: 'uppercase' }}>
        Phase 1 — Video Analysis
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
        {ANALYSIS_STEPS.map((step, i) => {
          const done = !analysisActive || i < activeIndex;
          const active = analysisActive && i === activeIndex;
          return (
            <StepRow key={step.label} step={step} done={done || !analysisActive} active={active && analysisActive} />
          );
        })}
      </div>

      {/* Phase 2: Reel Generation */}
      <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: 1, margin: '0 0 10px', textTransform: 'uppercase' }}>
        Phase 2 — Reel Generation
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {REEL_STEPS.map((step, i) => {
          const done = !analysisActive && i < activeIndex;
          const active = !analysisActive && i === activeIndex;
          const pending = analysisActive || i > activeIndex;
          return (
            <StepRow key={step.label} step={step} done={done} active={active} dimmed={pending && analysisActive} />
          );
        })}
      </div>

      <style>{`
        @keyframes pulse { 0%,100% { box-shadow: 0 0 0 8px rgba(79,70,229,0.12); } 50% { box-shadow: 0 0 0 14px rgba(79,70,229,0.06); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

function StepRow({ step, done, active, dimmed }: { step: Step; done: boolean; active: boolean; dimmed?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '9px 12px', borderRadius: 10,
      background: active ? 'rgba(99,102,241,0.15)' : 'transparent',
      border: `1px solid ${active ? 'rgba(99,102,241,0.4)' : 'transparent'}`,
      opacity: dimmed ? 0.35 : 1,
      transition: 'all 0.3s',
    }}>
      {/* Status indicator */}
      <div style={{
        width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
        background: done
          ? 'linear-gradient(135deg, #10b981, #059669)'
          : active
          ? 'rgba(99,102,241,0.3)'
          : 'rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: active ? '1.5px solid rgba(99,102,241,0.6)' : 'none',
        fontSize: 11,
      }}>
        {done && <span style={{ color: 'white', fontWeight: 700, fontSize: 12 }}>✓</span>}
        {active && (
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            border: '2px solid #818cf8', borderTopColor: 'transparent',
            animation: 'spin 0.7s linear infinite',
          }} />
        )}
      </div>

      {/* Icon + label */}
      <span style={{ fontSize: 16, lineHeight: 1 }}>{step.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 13, fontWeight: active ? 700 : 500, margin: 0,
          color: done ? '#86efac' : active ? 'white' : 'rgba(255,255,255,0.5)',
        }}>
          {step.label}
        </p>
        {active && (
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '2px 0 0' }}>{step.detail}</p>
        )}
      </div>
    </div>
  );
}

// ── Main AutoReelPage ──────────────────────────────────────────────────────────

interface Props {
  isPaidUser: boolean;
  userId: string;
  onBack: () => void;
  onUpgrade: () => void;
}

export function AutoReelPage({ userId, onBack, onUpgrade }: Props) {
  const { state, progressPercent, currentStep, reelJobStatus, reels, reelJobId, isPremium, error, start, reset } = useAutoReel();
  const [selectedReel, setSelectedReel] = useState<number | null>(null);

  const isIdle       = state === 'idle';
  const isProcessing = state === 'uploading' || state === 'analyzing' || state === 'generating';
  const isComplete   = state === 'complete';
  const isFailed     = state === 'failed';

  const lockedCount  = reels.filter(r => r.locked).length;

  // Best reel = index 0 (already ranked by backend, highest score first)
  const bestIndex = 0;

  // Selected reel for insight panel
  const insightReel = selectedReel !== null ? reels[selectedReel] : reels[0] ?? null;

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>

      {/* Top bar */}
      <div style={{
        background: 'white', borderBottom: '1px solid #e2e8f0',
        padding: '0 24px', height: 60,
        display: 'flex', alignItems: 'center', gap: 14,
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <button onClick={onBack} className="btn-secondary" style={{ padding: '7px 14px', fontSize: 13 }}>
          <ArrowLeft size={14} /> Back
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed, #db2777)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Clapperboard size={14} color="white" />
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Auto Reel Generator</span>
        </div>
        <span style={{ fontSize: 13, color: '#94a3b8', marginLeft: 4 }}>— 1 video → 5 ready-to-post reels</span>
        {(isComplete || isFailed) && (
          <button onClick={reset} className="btn-secondary" style={{ padding: '7px 14px', fontSize: 13, marginLeft: 'auto' }}>
            <RotateCcw size={13} /> New Video
          </button>
        )}
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '36px 24px 64px' }}>

        {/* ── Idle: Hero + Uploader ── */}
        {isIdle && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 36 }}>
              <span className="badge" style={{ background: '#eef2ff', color: '#4f46e5', border: '1px solid #c7d2fe', marginBottom: 16, display: 'inline-flex' }}>
                <Sparkles size={12} /> AI-Powered Reel Generator
              </span>
              <h1 style={{
                fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, color: '#0f172a',
                margin: '0 0 12px', letterSpacing: -1.5, lineHeight: 1.15,
              }}>
                Upload 1 video.{' '}
                <span className="gradient-text">Get 5 viral reels.</span>
              </h1>
              <p style={{ fontSize: 16, color: '#64748b', margin: '0 auto 32px', maxWidth: 520, lineHeight: 1.6 }}>
                Our AI detects the best moments, crops to 9:16, adds captions,
                and generates scroll-stopping titles — automatically.
              </p>

              {/* Feature pills */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 36 }}>
                {[
                  { icon: '🎬', label: 'Scene Detection' },
                  { icon: '📱', label: '9:16 Auto Crop' },
                  { icon: '✍️', label: 'AI Titles' },
                  { icon: '🔥', label: 'Viral Scoring' },
                  { icon: '🎯', label: 'Subtitle Burn-in' },
                ].map(f => (
                  <span key={f.label} className="badge" style={{ background: 'white', color: '#475569', border: '1px solid #e2e8f0', gap: 5 }}>
                    {f.icon} {f.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Plan tier banner */}
            <div style={{
              maxWidth: 640, margin: '0 auto 24px',
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
            }}>
              <div style={{
                background: 'white', border: '1.5px solid #e2e8f0',
                borderRadius: 14, padding: '14px 16px',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <span style={{ fontSize: 22 }}>🆓</span>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: '0 0 2px' }}>Free</p>
                  <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>1 reel unlocked · watermark</p>
                </div>
              </div>
              <div style={{
                background: 'linear-gradient(135deg, #eef2ff, #f5f3ff)',
                border: '1.5px solid #c7d2fe',
                borderRadius: 14, padding: '14px 16px',
                display: 'flex', alignItems: 'center', gap: 12,
                cursor: 'pointer',
              }} onClick={onUpgrade}>
                <span style={{ fontSize: 22 }}>⚡</span>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#4f46e5', margin: '0 0 2px' }}>Pro / Creator</p>
                  <p style={{ fontSize: 12, color: '#6366f1', margin: 0 }}>All 5 reels · HD · no watermark</p>
                </div>
              </div>
            </div>

            <div style={{ maxWidth: 640, margin: '0 auto' }}>
              <ReelUploader onUpload={file => start(file, userId)} />
            </div>

            {/* How it works */}
            <div style={{ marginTop: 56, textAlign: 'center' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 24 }}>
                How it works
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, maxWidth: 760, margin: '0 auto' }}>
                {[
                  { step: '01', icon: '📤', title: 'Upload', desc: 'Drop any long-form video' },
                  { step: '02', icon: '🧠', title: 'AI Analyses', desc: 'Scenes, speech & engagement scored' },
                  { step: '03', icon: '✂️', title: 'Clips Cut', desc: 'Top 3–5 moments extracted' },
                  { step: '04', icon: '📱', title: 'Reels Ready', desc: 'Download & post instantly' },
                ].map(s => (
                  <div key={s.step} style={{
                    background: 'white', border: '1px solid #e2e8f0',
                    borderRadius: 14, padding: '20px 16px', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#a5b4fc', margin: '0 0 4px', letterSpacing: 1 }}>{s.step}</p>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>{s.title}</p>
                    <p style={{ fontSize: 12, color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── Processing ── */}
        {isProcessing && (
          <div style={{ maxWidth: 580, margin: '0 auto' }}>
            <ProcessingSteps
              state={state}
              progressPercent={progressPercent}
              currentStep={currentStep}
              reelStatus={reelJobStatus}
            />
          </div>
        )}

        {/* ── Error ── */}
        {isFailed && (
          <div style={{
            maxWidth: 480, margin: '0 auto',
            background: '#fff1f2', border: '1px solid #fecdd3',
            borderRadius: 16, padding: 32, textAlign: 'center',
          }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>😕</div>
            <p style={{ color: '#be123c', fontWeight: 700, fontSize: 16, margin: '0 0 6px' }}>Generation failed</p>
            <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 24px', lineHeight: 1.5 }}>{error}</p>
            <button onClick={reset} className="btn-primary" style={{ padding: '10px 28px', fontSize: 14 }}>Try Again</button>
          </div>
        )}

        {/* ── Results ── */}
        {isComplete && reels.length > 0 && reelJobId && (
          <>
            {/* Success banner */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 14,
              background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)',
              border: '1px solid #bbf7d0', borderRadius: 16,
              padding: '14px 20px', marginBottom: 28,
            }}>
              <div style={{
                width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                background: 'linear-gradient(135deg, #10b981, #059669)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Sparkles size={20} color="white" />
              </div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#064e3b', margin: 0 }}>
                  {reels.length} reels generated and ready to download!
                </p>
                <p style={{ fontSize: 13, color: '#059669', margin: 0 }}>
                  Each reel is cropped 9:16, optimised for engagement, and titled by Claude AI.
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isComplete && reels.length > 0 ? '1fr 320px' : '1fr', gap: 24, alignItems: 'start' }}
              className="reel-results-grid">

              {/* ── Reel cards grid ── */}
              <div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: 16,
                }}>
                  {reels.map((reel, i) => (
                    <div key={reel.index} onClick={() => setSelectedReel(i)} style={{ cursor: 'pointer' }}>
                      <ReelCard
                        reel={reel}
                        reelJobId={reelJobId}
                        isBest={i === bestIndex}
                        isLocked={reel.locked}
                        onUpgrade={onUpgrade}
                      />
                    </div>
                  ))}
                </div>

                {/* Free user upgrade nudge */}
                {!isPremium && lockedCount > 0 && (
                  <div style={{
                    marginTop: 20,
                    background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
                    border: '1px solid rgba(99,102,241,0.4)',
                    borderRadius: 16, padding: '20px 24px',
                    display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
                  }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                      background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Zap size={20} color="white" fill="white" />
                    </div>
                    <div style={{ flex: 1, minWidth: 180 }}>
                      <p style={{ fontSize: 15, fontWeight: 700, color: 'white', margin: '0 0 2px' }}>
                        Unlock {lockedCount} more reel{lockedCount > 1 ? 's' : ''}
                      </p>
                      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', margin: 0 }}>
                        Upgrade to Pro to unlock all reels + HD export
                      </p>
                    </div>
                    <button onClick={onUpgrade} className="btn-primary" style={{ padding: '10px 22px', fontSize: 13, flexShrink: 0 }}>
                      Upgrade to Pro →
                    </button>
                  </div>
                )}
              </div>

              {/* ── Insight panel ── */}
              {insightReel && (
                <div style={{
                  background: 'white', border: '1px solid #e2e8f0',
                  borderRadius: 20, padding: 24, position: 'sticky', top: 80,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <TrendingUp size={16} color="#7c3aed" />
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                      Reel Insights
                    </p>
                  </div>

                  <div style={{
                    background: 'linear-gradient(135deg, #eef2ff, #f5f3ff)',
                    border: '1px solid #c7d2fe', borderRadius: 12, padding: '12px 14px', marginBottom: 14,
                  }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#4f46e5', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Why this clip was selected
                    </p>
                    <p style={{ fontSize: 13, color: '#1e1b4b', margin: 0, lineHeight: 1.55 }}>
                      {insightReel.motionScore >= 60 && insightReel.engagementScore >= 60
                        ? 'High visual motion combined with strong speech clarity makes this an ideal short-form clip.'
                        : insightReel.motionScore >= 60
                        ? 'This segment has high motion density — fast-paced content that holds viewer attention.'
                        : insightReel.engagementScore >= 60
                        ? 'Strong speech and engagement keyword density detected in this segment.'
                        : 'Consistent pacing and clear audio make this a solid reel candidate.'}
                    </p>
                  </div>

                  {/* Score breakdown */}
                  {[
                    { label: 'Motion', value: Math.round(insightReel.motionScore), color: '#6366f1' },
                    { label: 'Engagement', value: Math.round(insightReel.engagementScore), color: '#8b5cf6' },
                  ].map(m => (
                    <div key={m.label} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>{m.label}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: m.color }}>{m.value}/100</span>
                      </div>
                      <div style={{ height: 5, borderRadius: 99, background: '#f1f5f9' }}>
                        <div style={{
                          height: '100%', borderRadius: 99,
                          width: `${m.value}%`,
                          background: `linear-gradient(90deg, ${m.color}, ${m.color}99)`,
                          transition: 'width 0.6s ease',
                        }} />
                      </div>
                    </div>
                  ))}

                  {/* Transcript snippet */}
                  {insightReel.transcriptSnippet && (
                    <div style={{ marginTop: 14 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>
                        Hook Strength
                      </p>
                      <p style={{
                        fontSize: 13, color: '#475569', margin: 0,
                        fontStyle: 'italic', lineHeight: 1.55,
                        borderLeft: '2px solid #c7d2fe', paddingLeft: 10,
                      }}>
                        "{insightReel.transcriptSnippet.slice(0, 120)}{insightReel.transcriptSnippet.length > 120 ? '…' : ''}"
                      </p>
                    </div>
                  )}

                  {/* Reel selector tabs */}
                  {reels.length > 1 && (
                    <div style={{ marginTop: 18 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>
                        Switch Reel
                      </p>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {reels.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setSelectedReel(i)}
                            style={{
                              padding: '5px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600,
                              border: '1.5px solid',
                              borderColor: (selectedReel ?? 0) === i ? '#7c3aed' : '#e2e8f0',
                              background: (selectedReel ?? 0) === i ? '#f5f3ff' : 'white',
                              color: (selectedReel ?? 0) === i ? '#7c3aed' : '#64748b',
                              cursor: 'pointer', transition: 'all 0.15s',
                            }}
                          >
                            Reel {i + 1}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .reel-results-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
