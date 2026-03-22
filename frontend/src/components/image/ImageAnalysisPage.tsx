import { ArrowLeft, ImagePlus } from 'lucide-react';
import { useImageAnalysis } from '../../hooks/useImageAnalysis';
import { ImageUploader } from './ImageUploader';
import { ImageProcessingStatus } from './ImageProcessingStatus';
import { ImageResultsPanel } from './ImageResultsPanel';

interface Props {
  isPaidUser: boolean;
  onBack: () => void;
  onUpgrade?: () => void;
}

export function ImageAnalysisPage({ isPaidUser, onBack, onUpgrade }: Props) {
  const { state, jobStatus, result, error, analyze, reset } = useImageAnalysis();

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>

      {/* Top bar */}
      <div style={{
        background: 'white', borderBottom: '1px solid #e2e8f0',
        padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', gap: 14,
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button onClick={onBack} className="btn-secondary" style={{ padding: '7px 14px', fontSize: 13 }}>
          <ArrowLeft size={14} /> Back
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8, flexShrink: 0,
            background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ImagePlus size={14} color="white" />
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Image Growth Engine</span>
        </div>
        <span style={{ fontSize: 13, color: '#94a3b8', marginLeft: 4 }}>— Predict · Optimise · Post</span>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '36px 24px' }}>

        {/* Idle — uploader */}
        {state === 'idle' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                <span className="badge" style={{ background: '#f5f3ff', color: '#7c3aed', border: '1px solid #c4b5fd', fontSize: 12 }}>
                  ✨ AI-Powered Image & Carousel Optimiser
                </span>
              </div>
              <h1 style={{
                fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 800, color: '#0f172a',
                margin: '0 0 10px', letterSpacing: -1, lineHeight: 1.2,
              }}>
                Stop guessing.{' '}
                <span style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Start knowing.
                </span>
              </h1>
              <p style={{ fontSize: 16, color: '#64748b', margin: '0 auto', maxWidth: 520, lineHeight: 1.6 }}>
                Upload a single image or up to 20 slides for carousel analysis.
                Get a post score, growth insights, AI captions, and carousel optimisation — before you hit post.
              </p>
            </div>

            <div style={{ maxWidth: 600, margin: '0 auto' }}>
              <div className="card" style={{ borderRadius: 24, padding: 28 }}>
                <ImageUploader onAnalyze={analyze} isUploading={false} />
              </div>
            </div>
          </>
        )}

        {/* Uploading */}
        {state === 'uploading' && (
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            <div className="card" style={{ borderRadius: 20, padding: 32, textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>⬆️</div>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>Uploading images…</p>
              <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Sending your images for analysis</p>
              <div style={{ marginTop: 20, height: 6, borderRadius: 3, background: '#f1f5f9', overflow: 'hidden' }}>
                <div style={{
                  width: '40%', height: '100%', borderRadius: 3,
                  background: 'linear-gradient(90deg, #7c3aed, #a855f7)',
                  animation: 'shimmer 1.2s ease-in-out infinite',
                }} />
              </div>
            </div>
          </div>
        )}

        {/* Polling */}
        {state === 'polling' && (
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            <ImageProcessingStatus jobStatus={jobStatus} />
          </div>
        )}

        {/* Error */}
        {state === 'error' && (
          <div style={{ maxWidth: 480, margin: '0 auto' }}>
            <div style={{
              background: '#fff1f2', border: '1px solid #fecdd3',
              borderRadius: 16, padding: 32, textAlign: 'center',
            }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>😕</div>
              <p style={{ color: '#be123c', fontWeight: 700, fontSize: 16, margin: '0 0 6px' }}>Analysis failed</p>
              <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 20px', lineHeight: 1.5 }}>{error}</p>
              <button onClick={reset} className="btn-primary" style={{ padding: '10px 28px', fontSize: 14 }}>
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Complete */}
        {state === 'complete' && result && (
          <ImageResultsPanel
            result={result}
            isPaidUser={isPaidUser}
            onReset={reset}
            onUpgrade={onUpgrade}
          />
        )}
      </div>

      <style>{`
        @keyframes shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(350%); }
        }
      `}</style>
    </div>
  );
}
