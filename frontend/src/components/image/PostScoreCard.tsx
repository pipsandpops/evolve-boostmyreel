import { useEffect, useRef, useState } from 'react';
import { ImageIcon, Heart, Bookmark, Share2, TrendingUp, Lock } from 'lucide-react';
import type { EngagementPrediction, VisualFeatures } from '../../types';

interface Props {
  postScore: number;
  engagement: EngagementPrediction;
  visual: VisualFeatures | null;
  isPaidUser: boolean;
  onUpgrade?: () => void;
}

function scoreColor(s: number) {
  if (s >= 75) return '#10b981';
  if (s >= 50) return '#f59e0b';
  return '#ef4444';
}

function scoreLabel(s: number) {
  if (s >= 80) return 'Excellent';
  if (s >= 65) return 'Good Potential';
  if (s >= 50) return 'Average';
  if (s >= 35) return 'Needs Work';
  return 'Low Potential';
}

function levelColor(l: string) {
  if (l === 'Viral' || l === 'High') return '#10b981';
  if (l === 'Medium') return '#f59e0b';
  return '#94a3b8';
}

function easeOut(t: number) { return 1 - Math.pow(1 - t, 3); }

interface BarProps { value: number; max: number; color: string; active: boolean }
function ScoreBar({ value, max, color, active }: BarProps) {
  return (
    <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
      <div style={{
        width: active ? `${(value / max) * 100}%` : '0%',
        height: '100%', borderRadius: 3, background: color,
        transition: active ? 'width 0.9s cubic-bezier(0.34,1.2,0.64,1)' : 'none',
      }} />
    </div>
  );
}

export function PostScoreCard({ postScore, engagement, visual, isPaidUser, onUpgrade }: Props) {
  const [animated, setAnimated]     = useState(0);
  const [barsActive, setBarsActive] = useState(false);
  const [visible, setVisible]       = useState(false);
  const [showModal, setShowModal]   = useState(false);
  const rafRef  = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => { const t = setTimeout(() => setVisible(true), 60); return () => clearTimeout(t); }, []);

  useEffect(() => {
    setBarsActive(false);
    setAnimated(0);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    startRef.current = null;

    const delay = setTimeout(() => {
      setBarsActive(true);
      const tick = (ts: number) => {
        if (!startRef.current) startRef.current = ts;
        const p = Math.min((ts - startRef.current) / 1200, 1);
        setAnimated(Math.round(easeOut(p) * postScore));
        if (p < 1) rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    }, 500);

    return () => { clearTimeout(delay); if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [postScore]);

  const color        = scoreColor(animated);
  const finalColor   = scoreColor(postScore);
  const radius       = 52;
  const circ         = 2 * Math.PI * radius;
  const offset       = circ - (animated / 100) * circ;

  // Top factors from breakdown (sorted by value desc, top 6)
  const factors = Object.entries(engagement.scoreBreakdown)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6);

  const maxFactor = Math.max(...factors.map(([, v]) => v), 1);

  const factorColors = ['#a78bfa', '#60a5fa', '#34d399', '#f472b6', '#fb923c', '#fbbf24'];

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e3a5f 100%)',
      borderRadius: 20, padding: '24px 20px',
      border: '1px solid rgba(139,92,246,0.3)',
      boxShadow: '0 8px 32px rgba(139,92,246,0.2)',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(12px)',
      transition: 'opacity 0.5s ease, transform 0.5s ease',
    }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <ImageIcon size={18} color="white" />
        </div>
        <div>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#e9d5ff', margin: 0 }}>Post Score</p>
          <p style={{ fontSize: 12, color: '#a78bfa', margin: 0 }}>AI-powered engagement prediction</p>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
            background: `${finalColor}20`, border: `1px solid ${finalColor}40`, color: finalColor,
          }}>{scoreLabel(postScore)}</span>
        </div>
      </div>

      {/* Gauge + bars */}
      <div className="r-viral-inner">

        {/* SVG gauge */}
        <div style={{ position: 'relative', width: 130, height: 130, flexShrink: 0 }}>
          <svg width="130" height="130" viewBox="0 0 130 130">
            <circle cx="65" cy="65" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
            <circle cx="65" cy="65" r={radius} fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"
              strokeDasharray={circ} strokeDashoffset={offset} transform="rotate(-90 65 65)"
              style={{ opacity: 0.18, filter: 'blur(4px)', transition: 'stroke-dashoffset 0.06s linear, stroke 0.4s ease' }} />
            <circle cx="65" cy="65" r={radius} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
              strokeDasharray={circ} strokeDashoffset={offset} transform="rotate(-90 65 65)"
              style={{ transition: 'stroke-dashoffset 0.06s linear, stroke 0.4s ease' }} />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 32, fontWeight: 800, color, lineHeight: 1, transition: 'color 0.4s ease', fontVariantNumeric: 'tabular-nums' }}>
              {animated}
            </span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>/100</span>
          </div>
        </div>

        {/* Factor bars */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {factors.map(([label, value], i) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', width: 90, flexShrink: 0, lineHeight: 1.2 }}>{label}</span>
              <ScoreBar value={value} max={maxFactor} color={factorColors[i % factorColors.length]} active={barsActive} />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', width: 20, textAlign: 'right', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Engagement pills */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 16 }}>
        {[
          { icon: <Heart size={13} />, label: 'Likes',  value: engagement.likesPrediction },
          { icon: <Bookmark size={13} />, label: 'Saves', value: engagement.saveProbability },
          { icon: <Share2 size={13} />, label: 'Shares', value: engagement.shareProbability },
        ].map(p => (
          <div key={p.label} style={{
            background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '8px 10px', textAlign: 'center',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 3, color: 'rgba(255,255,255,0.5)' }}>
              {p.icon}
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{p.label}</span>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: levelColor(p.value) }}>{p.value}</span>
          </div>
        ))}
      </div>

      {/* Reach — premium gated */}
      <div style={{ marginTop: 12, position: 'relative', overflow: 'hidden', borderRadius: 12 }}>
        <div style={{
          background: 'rgba(6,182,212,0.07)', border: '1px solid rgba(6,182,212,0.2)',
          borderRadius: 12, padding: '12px 14px',
          filter: isPaidUser ? 'none' : 'blur(5px)',
          userSelect: isPaidUser ? 'auto' : 'none',
          transition: 'filter 0.3s',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <TrendingUp size={14} color="#22d3ee" />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#67e8f9', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Estimated Reach
            </span>
          </div>
          <p style={{ fontSize: 22, fontWeight: 900, color: '#e0f2fe', margin: '6px 0 2px', letterSpacing: -0.5 }}>
            {engagement.estimatedReach}
          </p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
            Confidence: {engagement.confidence}
          </p>
        </div>
        {!isPaidUser && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(15,10,40,0.45)', backdropFilter: 'blur(2px)', borderRadius: 12, cursor: 'pointer',
          }} onClick={() => setShowModal(true)}>
            <span style={{
              fontSize: 12, fontWeight: 700, color: '#e0f2fe',
              background: 'rgba(6,182,212,0.2)', border: '1px solid rgba(6,182,212,0.35)',
              padding: '6px 14px', borderRadius: 20, backdropFilter: 'blur(4px)',
            }}>
              <Lock size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />
              Unlock full prediction
            </span>
          </div>
        )}
      </div>

      {/* Visual quality pills */}
      {visual && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
          {[
            { label: `Brightness ${visual.brightness.toFixed(0)}`, ok: visual.isWellLit },
            { label: `Contrast ${visual.contrast.toFixed(0)}`, ok: visual.isHighContrast },
            { label: `Sharpness ${visual.sharpness.toFixed(0)}`, ok: visual.isSharp },
            { label: visual.aspectRatio, ok: ['4:5','9:16','1:1'].includes(visual.aspectRatio) },
            { label: visual.colorTemperature, ok: true },
          ].map(p => (
            <span key={p.label} style={{
              fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 20,
              background: p.ok ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
              color: p.ok ? '#6ee7b7' : '#fca5a5',
              border: `1px solid ${p.ok ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
            }}>
              {p.ok ? '✓' : '✗'} {p.label}
            </span>
          ))}
        </div>
      )}

      {/* Upgrade modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24, backdropFilter: 'blur(4px)',
        }} onClick={() => setShowModal(false)}>
          <div style={{
            background: 'white', borderRadius: 24, padding: '36px 28px',
            maxWidth: 380, width: '100%', textAlign: 'center',
            boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 44, marginBottom: 16 }}>🚀</div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 10px' }}>
              Unlock your full reach prediction
            </h3>
            <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 24px', lineHeight: 1.6 }}>
              See estimated reach, full captions, carousel optimization, and all growth insights.
            </p>
            <button onClick={() => { setShowModal(false); onUpgrade?.(); }}
              className="btn-primary" style={{ width: '100%', padding: '13px', fontSize: 15, borderRadius: 12 }}>
              🔓 Unlock Now
            </button>
            <button onClick={() => setShowModal(false)}
              style={{ marginTop: 12, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#94a3b8', padding: '4px 8px' }}>
              Maybe later
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
