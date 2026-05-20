import { useState } from 'react';
import { Clapperboard, Download, Loader, Share2, X } from 'lucide-react';
import { api } from '../services/api';

interface Props {
  jobId: string;
}

type State = 'idle' | 'generating' | 'ready' | 'error';

const canWebShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

async function fetchVideoFile(url: string): Promise<File> {
  const res  = await fetch(url);
  const blob = await res.blob();
  return new File([blob], 'cinematic-reel.mp4', { type: 'video/mp4' });
}

export function CinematicCard({ jobId }: Props) {
  const [state, setState]           = useState<State>('idle');
  const [videoUrl, setVideoUrl]     = useState<string | null>(null);
  const [error, setError]           = useState<string | null>(null);
  const [sharing, setSharing]       = useState<'whatsapp' | 'instagram' | null>(null);
  const [showIgTip, setShowIgTip]   = useState(false);

  const handleGenerate = async () => {
    setState('generating');
    setError(null);
    try {
      await api.generateCinematic(jobId);
      setVideoUrl(api.getCinematicVideoUrl(jobId));
      setState('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed. Please try again.');
      setState('error');
    }
  };

  const shareOnWhatsApp = async () => {
    if (!videoUrl) return;
    setSharing('whatsapp');
    try {
      // Mobile: share the actual video file via the native share sheet
      if (canWebShare) {
        const file = await fetchVideoFile(videoUrl);
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: 'My Cinematic Reel 🎬', text: 'Check out my cinematic reel made with AI! 🔥' });
          return;
        }
      }
      // Desktop fallback: open WhatsApp Web with a text message
      const text = encodeURIComponent('Check out my cinematic reel made with AI on BoostMyReel 🎬🔥');
      window.open(`https://wa.me/?text=${text}`, '_blank');
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        // User cancelled — silently ignore
      }
    } finally {
      setSharing(null);
    }
  };

  const shareOnInstagram = async () => {
    if (!videoUrl) return;
    setSharing('instagram');
    try {
      // Mobile: Web Share API opens native sheet → user picks Instagram
      if (canWebShare) {
        const file = await fetchVideoFile(videoUrl);
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: 'My Cinematic Reel 🎬' });
          return;
        }
      }
      // Desktop: can't push files to Instagram directly — show tip
      setShowIgTip(true);
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setShowIgTip(true);
      }
    } finally {
      setSharing(null);
    }
  };

  return (
    <div style={{
      border: '1px solid #e2e8f0', borderRadius: 16,
      padding: '20px 22px', background: 'white',
      marginBottom: 16,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: 'linear-gradient(135deg, #1e1b4b, #4f46e5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Clapperboard size={17} color="white" />
        </div>
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Cinematic Camera Movement
          </p>
          <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
            Slow zoom + pan · color grade · vignette — ready to post
          </p>
        </div>
      </div>

      {state === 'idle' && (
        <button
          onClick={handleGenerate}
          className="btn-primary"
          style={{ width: '100%', justifyContent: 'center', fontSize: 14, padding: '10px 0' }}
        >
          <Clapperboard size={15} />
          Generate Cinematic Video
        </button>
      )}

      {state === 'generating' && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          padding: '12px 0', color: '#6366f1', fontSize: 14, fontWeight: 500,
        }}>
          <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
          Rendering cinematic effects… this may take a minute
        </div>
      )}

      {state === 'ready' && videoUrl && (
        <div>
          <video
            src={videoUrl}
            controls
            playsInline
            style={{
              width: '100%', borderRadius: 10, marginBottom: 12,
              background: '#000', maxHeight: 360,
            }}
          />

          {/* Action buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Download */}
            <a
              href={videoUrl}
              download={`cinematic-${jobId}.mp4`}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '10px 0', borderRadius: 10, fontSize: 14, fontWeight: 600,
                background: 'linear-gradient(135deg, #1e1b4b, #4f46e5)',
                color: 'white', textDecoration: 'none',
              }}
            >
              <Download size={15} />
              Download Cinematic Video
            </a>

            {/* Share row */}
            <div style={{ display: 'flex', gap: 8 }}>
              {/* WhatsApp */}
              <button
                onClick={shareOnWhatsApp}
                disabled={sharing !== null}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: '#25d366', color: 'white',
                  fontSize: 13, fontWeight: 600,
                  opacity: sharing !== null ? 0.7 : 1,
                }}
              >
                {sharing === 'whatsapp'
                  ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  : <Share2 size={14} />}
                WhatsApp
              </button>

              {/* Instagram */}
              <button
                onClick={shareOnInstagram}
                disabled={sharing !== null}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)',
                  color: 'white', fontSize: 13, fontWeight: 600,
                  opacity: sharing !== null ? 0.7 : 1,
                }}
              >
                {sharing === 'instagram'
                  ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  : <Share2 size={14} />}
                Instagram
              </button>
            </div>

            {/* Instagram desktop tip */}
            {showIgTip && (
              <div style={{
                background: '#fdf2f8', border: '1px solid #fbcfe8',
                borderRadius: 10, padding: '12px 14px',
                display: 'flex', alignItems: 'flex-start', gap: 10,
              }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#9d174d', margin: '0 0 4px' }}>
                    Upload to Instagram
                  </p>
                  <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 8px', lineHeight: 1.5 }}>
                    Instagram doesn't support direct uploads from the browser on desktop.
                    Download your cinematic video above, then post it as a Reel on the Instagram app or website.
                  </p>
                  <a
                    href="https://www.instagram.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 12, fontWeight: 600, color: '#9d174d' }}
                  >
                    Open Instagram →
                  </a>
                </div>
                <button
                  onClick={() => setShowIgTip(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9d174d', padding: 0, flexShrink: 0 }}
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {state === 'error' && (
        <div>
          <p style={{ color: '#e11d48', fontSize: 13, margin: '0 0 10px' }}>⚠ {error}</p>
          <button
            onClick={handleGenerate}
            className="btn-secondary"
            style={{ width: '100%', justifyContent: 'center', fontSize: 14 }}
          >
            Try Again
          </button>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
