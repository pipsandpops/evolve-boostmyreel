import { useRef, useState } from 'react';
import { Download, Play, Pause, Lock } from 'lucide-react';
import type { GeneratedReel } from '../../types';
import { api } from '../../services/api';

interface ReelCardProps {
  reel: GeneratedReel;
  reelJobId: string;
  isBest: boolean;
  isLocked: boolean;
  onUpgrade: () => void;
}

function parseSecs(t: string): number {
  const [h, m, s] = t.split(':').map(Number);
  return h * 3600 + m * 60 + s;
}

function durationLabel(start: string, end: string): string {
  const secs = parseSecs(end) - parseSecs(start);
  return `${secs}s`;
}

function formatBytes(b: number): string {
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

export function ReelCard({ reel, reelJobId, isBest, isLocked, onUpgrade }: ReelCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const videoUrl = api.getReelVideoUrl(reelJobId, reel.index);
  const dur = durationLabel(reel.startFormatted, reel.endFormatted);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (playing) { v.pause(); setPlaying(false); }
    else { v.play(); setPlaying(true); }
  };

  const score = Math.round(reel.engagementScore);
  const scoreColor = score >= 70 ? '#10b981' : score >= 45 ? '#f59e0b' : '#94a3b8';

  return (
    <div style={{
      position: 'relative',
      background: 'linear-gradient(160deg, #0f172a 0%, #1e1b4b 100%)',
      border: `1.5px solid ${isBest ? 'rgba(167,139,250,0.6)' : 'rgba(99,102,241,0.2)'}`,
      borderRadius: 20,
      overflow: 'hidden',
      boxShadow: isBest
        ? '0 0 0 1px rgba(167,139,250,0.3), 0 20px 60px rgba(79,70,229,0.25)'
        : '0 4px 24px rgba(0,0,0,0.3)',
      transition: 'transform 0.2s, box-shadow 0.2s',
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
    >

      {/* Best reel badge */}
      {isBest && (
        <div style={{
          position: 'absolute', top: 12, left: 12, zIndex: 10,
          background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
          borderRadius: 99, padding: '4px 10px',
          fontSize: 11, fontWeight: 700, color: 'white',
          display: 'flex', alignItems: 'center', gap: 4,
          boxShadow: '0 2px 8px rgba(245,158,11,0.5)',
          letterSpacing: 0.2,
        }}>
          🔥 Highest Viral Potential
        </div>
      )}

      {/* Duration pill */}
      <div style={{
        position: 'absolute', top: 12, right: 12, zIndex: 10,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)',
        borderRadius: 99, padding: '3px 10px',
        fontSize: 12, fontWeight: 600, color: 'white',
        border: '1px solid rgba(255,255,255,0.12)',
      }}>
        ⏱ {dur}
      </div>

      {/* Video player */}
      <div style={{ position: 'relative', background: '#000', aspectRatio: '9/16', maxHeight: 320 }}>
        <video
          ref={videoRef}
          src={videoUrl}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          playsInline
          preload="metadata"
          onCanPlay={() => setLoaded(true)}
          onEnded={() => setPlaying(false)}
        />

        {/* Play/pause overlay */}
        <button
          onClick={togglePlay}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            background: playing ? 'transparent' : 'rgba(0,0,0,0.35)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.2s',
          }}
        >
          {!playing && (
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'rgba(255,255,255,0.9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            }}>
              {loaded ? <Play size={22} color="#1e1b4b" fill="#1e1b4b" style={{ marginLeft: 3 }} />
                      : <div style={{ width: 18, height: 18, border: '2.5px solid #1e1b4b', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />}
            </div>
          )}
          {playing && (
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: 0,
              transition: 'opacity 0.2s',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0'; }}
            >
              <Pause size={18} color="white" fill="white" />
            </div>
          )}
        </button>
      </div>

      {/* Card body */}
      <div style={{ padding: '16px 18px 18px' }}>

        {/* AI title */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
          <p style={{
            fontSize: 14, fontWeight: 700, color: 'white', margin: 0,
            lineHeight: 1.35, flex: 1,
          }}>
            {reel.title}
          </p>
          <span style={{
            fontSize: 10, fontWeight: 700, color: '#a78bfa',
            background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)',
            borderRadius: 99, padding: '2px 7px', flexShrink: 0, marginTop: 1,
            letterSpacing: 0.3,
          }}>
            AI
          </span>
        </div>

        {/* Timestamps */}
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: '0 0 12px', fontVariantNumeric: 'tabular-nums' }}>
          {reel.startFormatted} → {reel.endFormatted}
        </p>

        {/* Engagement score bar */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: 0.4 }}>
              ENGAGEMENT SCORE
            </span>
            <span style={{ fontSize: 13, fontWeight: 800, color: scoreColor }}>{score}/100</span>
          </div>
          <div style={{ height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.08)' }}>
            <div style={{
              height: '100%', borderRadius: 99, width: `${score}%`,
              background: score >= 70
                ? 'linear-gradient(90deg, #10b981, #34d399)'
                : score >= 45
                ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                : 'linear-gradient(90deg, #6366f1, #818cf8)',
              transition: 'width 0.8s ease',
            }} />
          </div>
        </div>

        {/* Transcript snippet */}
        {reel.transcriptSnippet && (
          <p style={{
            fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '0 0 14px',
            lineHeight: 1.5, fontStyle: 'italic',
            overflow: 'hidden', display: '-webkit-box',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}>
            "{reel.transcriptSnippet}"
          </p>
        )}

        {/* File size */}
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', margin: '0 0 14px' }}>
          {formatBytes(reel.fileSizeBytes)} · MP4 · 9:16
        </p>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          <a
            href={videoUrl}
            download={`reel_${reel.index + 1}.mp4`}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              color: 'white', fontWeight: 700, fontSize: 13,
              borderRadius: 10, padding: '10px 0',
              textDecoration: 'none',
              boxShadow: '0 4px 14px rgba(79,70,229,0.4)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.88'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
          >
            <Download size={14} /> Download
          </a>
          <button
            onClick={togglePlay}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.12)',
              color: 'white', fontWeight: 600, fontSize: 13,
              borderRadius: 10, padding: '10px 16px', cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.14)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; }}
          >
            {playing ? <Pause size={14} fill="white" /> : <Play size={14} fill="white" />}
          </button>
        </div>
      </div>

      {/* Premium lock overlay */}
      {isLocked && (
        <div style={{
          position: 'absolute', inset: 0,
          backdropFilter: 'blur(10px)',
          background: 'rgba(15,23,42,0.75)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 12, padding: 24, textAlign: 'center',
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 0 8px rgba(79,70,229,0.15)',
          }}>
            <Lock size={22} color="white" />
          </div>
          <p style={{ fontSize: 15, fontWeight: 700, color: 'white', margin: 0 }}>
            Unlock 5 Reels + HD Export
          </p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', margin: 0, lineHeight: 1.5 }}>
            Upgrade to Pro and download all generated reels in full quality.
          </p>
          <button
            onClick={onUpgrade}
            className="btn-primary"
            style={{ padding: '10px 24px', fontSize: 13, marginTop: 4 }}
          >
            👉 Upgrade to Pro
          </button>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
