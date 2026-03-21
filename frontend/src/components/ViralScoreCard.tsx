import { useState, useEffect, useRef, useCallback } from 'react';
import type { ViralScore } from '../types';
import { Zap, TrendingUp, Eye, Smile, MessageCircle, Lightbulb, RefreshCw } from 'lucide-react';

interface ViralScoreCardProps {
  viralScore: ViralScore;
}

// ─── helpers ────────────────────────────────────────────────────────────────

function getScoreColor(score: number): string {
  if (score >= 75) return '#10b981';
  if (score >= 50) return '#f59e0b';
  return '#ef4444';
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Highly Viral';
  if (score >= 65) return 'Good Potential';
  if (score >= 50) return 'Average';
  if (score >= 35) return 'Needs Work';
  return 'Low Potential';
}

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

// Simulates an AI improvement iteration — bumps each factor slightly
function simulateImprovement(current: ViralScore): ViralScore {
  const bump = () => Math.floor(Math.random() * 7) + 3; // 3–9 pts
  const hs = clamp(current.hookScore     + bump(), 0, 96);
  const es = clamp(current.emotionScore  + bump(), 0, 96);
  const cs = clamp(current.clarityScore  + bump(), 0, 96);
  const ts = clamp(current.trendScore    + bump(), 0, 96);
  const gs = clamp(current.engagementScore + bump(), 0, 96);
  const vs = Math.round(hs * 0.30 + es * 0.20 + cs * 0.15 + ts * 0.15 + gs * 0.20);

  const problems = [
    'Hook lacks emotional urgency — add a pain point.',
    'Caption feels generic — make it more personal.',
    'Opening 2 seconds could grab harder.',
    'Missing a clear call-to-action at the end.',
    'Trend alignment could be stronger — use a current audio.',
  ];
  const hooks = [
    `"${current.improvedHook} — and nobody talks about this"`,
    `"${current.improvedHook.replace(/"/g, '')} (most people get this wrong)"`,
    `"This changed everything: ${current.improvedHook.replace(/"/g, '')}"`,
    `"Stop scrolling — ${current.improvedHook.replace(/"/g, '')}"`,
    `"What I wish I knew: ${current.improvedHook.replace(/"/g, '')}"`,
  ];

  return {
    hookScore: hs,
    emotionScore: es,
    clarityScore: cs,
    trendScore: ts,
    engagementScore: gs,
    viralScore: vs,
    problem: problems[Math.floor(Math.random() * problems.length)],
    improvedHook: hooks[Math.floor(Math.random() * hooks.length)],
  };
}

// ─── sub-components ──────────────────────────────────────────────────────────

interface AnimatedBarProps {
  score: number;
  color: string;
  active: boolean; // triggers CSS transition
}

function AnimatedBar({ score, color, active }: AnimatedBarProps) {
  return (
    <div style={{
      flex: 1, height: 7, borderRadius: 4,
      background: 'rgba(255,255,255,0.1)',
      overflow: 'hidden',
    }}>
      <div style={{
        width: active ? `${score}%` : '0%',
        height: '100%', borderRadius: 4,
        background: color,
        transition: active ? 'width 0.9s cubic-bezier(0.34,1.2,0.64,1)' : 'none',
      }} />
    </div>
  );
}

// ─── main component ──────────────────────────────────────────────────────────

export function ViralScoreCard({ viralScore }: ViralScoreCardProps) {
  const [displayed, setDisplayed]       = useState<ViralScore>(viralScore);
  const [animatedScore, setAnimatedScore] = useState(0);
  const [barsActive, setBarsActive]     = useState(false);
  const [visible, setVisible]           = useState(false);   // fade-in
  const [fading, setFading]             = useState(false);   // cross-fade on update
  const [improving, setImproving]       = useState(false);

  const rafRef   = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  // Kick off animation whenever `displayed` changes
  const runAnimation = useCallback((target: number) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    startRef.current = null;
    setAnimatedScore(0);
    setBarsActive(false);

    const DELAY = 600;
    const DURATION = 1200;

    const delayTimer = setTimeout(() => {
      setBarsActive(true);

      const tick = (ts: number) => {
        if (!startRef.current) startRef.current = ts;
        const elapsed = ts - startRef.current;
        const progress = Math.min(elapsed / DURATION, 1);
        setAnimatedScore(Math.round(easeOut(progress) * target));
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(tick);
        }
      };
      rafRef.current = requestAnimationFrame(tick);
    }, DELAY);

    return () => {
      clearTimeout(delayTimer);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Fade in on mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  // Re-animate whenever displayed score changes
  useEffect(() => {
    const cleanup = runAnimation(displayed.viralScore);
    return cleanup;
  }, [displayed, runAnimation]);

  // "Improve My Reel" handler
  const handleImprove = () => {
    setImproving(true);
    setFading(true);

    setTimeout(() => {
      const next = simulateImprovement(displayed);
      setDisplayed(next);
      setFading(false);
      setImproving(false);
    }, 1500);
  };

  const liveColor  = getScoreColor(animatedScore);
  const finalColor = getScoreColor(displayed.viralScore);
  const label      = getScoreLabel(displayed.viralScore);

  const radius        = 52;
  const circumference = 2 * Math.PI * radius;
  const offset        = circumference - (animatedScore / 100) * circumference;

  const factors = [
    { label: 'Hook Strength',       score: displayed.hookScore,        weight: '30%', icon: <Zap size={13} />,           color: '#818cf8' },
    { label: 'Emotional Trigger',   score: displayed.emotionScore,     weight: '20%', icon: <Smile size={13} />,         color: '#f472b6' },
    { label: 'Clarity & Simplicity',score: displayed.clarityScore,     weight: '15%', icon: <Eye size={13} />,           color: '#34d399' },
    { label: 'Trend Alignment',     score: displayed.trendScore,       weight: '15%', icon: <TrendingUp size={13} />,    color: '#fb923c' },
    { label: 'Engagement Potential',score: displayed.engagementScore,  weight: '20%', icon: <MessageCircle size={13} />, color: '#60a5fa' },
  ];

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)',
      borderRadius: 20,
      padding: '24px 20px',
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
          <Zap size={18} color="white" fill="white" />
        </div>
        <div>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#e9d5ff', margin: 0 }}>Viral Score</p>
          <p style={{ fontSize: 12, color: '#a78bfa', margin: 0 }}>AI-powered virality prediction</p>
        </div>
      </div>

      {/* Animated content area */}
      <div style={{
        opacity: fading ? 0.35 : 1,
        transition: 'opacity 0.3s ease',
        pointerEvents: fading ? 'none' : 'auto',
      }}>

        {/* Gauge + factors */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>

          {/* SVG gauge */}
          <div style={{ position: 'relative', width: 130, height: 130, flexShrink: 0 }}>
            <svg width="130" height="130" viewBox="0 0 130 130">
              {/* Track */}
              <circle cx="65" cy="65" r={radius}
                fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
              {/* Glow layer (blurred duplicate) */}
              <circle cx="65" cy="65" r={radius}
                fill="none"
                stroke={liveColor}
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                transform="rotate(-90 65 65)"
                style={{
                  opacity: 0.18,
                  filter: 'blur(4px)',
                  transition: 'stroke-dashoffset 0.06s linear, stroke 0.4s ease',
                }}
              />
              {/* Main arc */}
              <circle cx="65" cy="65" r={radius}
                fill="none"
                stroke={liveColor}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                transform="rotate(-90 65 65)"
                style={{ transition: 'stroke-dashoffset 0.06s linear, stroke 0.4s ease' }}
              />
            </svg>
            {/* Number inside gauge */}
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{
                fontSize: 32, fontWeight: 800,
                color: liveColor,
                lineHeight: 1,
                transition: 'color 0.4s ease',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {animatedScore}
              </span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>/100</span>
            </div>
          </div>

          {/* Label + factor bars */}
          <div style={{ flex: 1 }}>
            <div style={{
              display: 'inline-block', padding: '4px 12px',
              background: `${finalColor}20`,
              border: `1px solid ${finalColor}45`,
              borderRadius: 20, marginBottom: 12,
              transition: 'background 0.4s ease, border-color 0.4s ease',
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: finalColor, transition: 'color 0.4s ease' }}>
                {label}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {factors.map(f => (
                <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: f.color, flexShrink: 0 }}>{f.icon}</span>
                  <AnimatedBar score={f.score} color={f.color} active={barsActive} />
                  <span style={{
                    fontSize: 11, color: 'rgba(255,255,255,0.55)',
                    width: 24, textAlign: 'right', flexShrink: 0,
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {f.score}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Problem */}
        {displayed.problem && (
          <div style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.22)',
            borderRadius: 12, padding: '10px 14px', marginBottom: 10,
          }}>
            <p style={{ fontSize: 11, color: '#fca5a5', margin: 0, fontWeight: 600, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              What to improve
            </p>
            <p style={{ fontSize: 13, color: '#fecaca', margin: 0 }}>{displayed.problem}</p>
          </div>
        )}

        {/* Improved hook */}
        {displayed.improvedHook && (
          <div style={{
            background: 'rgba(16,185,129,0.08)',
            border: '1px solid rgba(16,185,129,0.22)',
            borderRadius: 12, padding: '10px 14px', marginBottom: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <Lightbulb size={15} color="#34d399" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ fontSize: 11, color: '#6ee7b7', margin: 0, fontWeight: 600, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Improved Hook
                </p>
                <p style={{ fontSize: 13, color: '#a7f3d0', margin: 0, fontStyle: 'italic' }}>
                  {displayed.improvedHook}
                </p>
              </div>
            </div>
          </div>
        )}

      </div>{/* end fading wrapper */}

      {/* Improve My Reel button */}
      <button
        onClick={handleImprove}
        disabled={improving}
        style={{
          width: '100%',
          padding: '12px 0',
          borderRadius: 12,
          border: 'none',
          cursor: improving ? 'not-allowed' : 'pointer',
          background: improving
            ? 'rgba(139,92,246,0.2)'
            : 'linear-gradient(135deg, #7c3aed, #a855f7)',
          color: improving ? 'rgba(196,181,253,0.6)' : '#fff',
          fontSize: 14,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          transition: 'opacity 0.2s ease, transform 0.15s ease, background 0.3s ease',
          opacity: improving ? 0.7 : 1,
          transform: improving ? 'scale(0.98)' : 'scale(1)',
          boxShadow: improving ? 'none' : '0 4px 20px rgba(139,92,246,0.35)',
        }}
        onMouseEnter={e => { if (!improving) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.02)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
      >
        <RefreshCw
          size={15}
          style={{
            animation: improving ? 'spin 0.9s linear infinite' : 'none',
          }}
        />
        {improving ? 'Improving your reel…' : '✦ Improve My Reel'}
      </button>

      {/* Spin keyframe via a style tag injected once */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
