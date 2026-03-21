import { useState, useEffect, useRef, useCallback } from 'react';
import type { ViralScore } from '../types';
import { api } from '../services/api';
import { Zap, TrendingUp, Eye, Smile, MessageCircle, Lightbulb, RefreshCw, AlertTriangle } from 'lucide-react';

interface ViralScoreCardProps {
  viralScore: ViralScore;
  jobId: string;
}

// ─── Score helpers ────────────────────────────────────────────────────────────

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

// ─── View prediction helpers ──────────────────────────────────────────────────

interface ViewRange { min: number; max: number }

/** Maps viral score → realistic view range with ±20% randomness. */
function predictViews(score: number): ViewRange {
  let base: ViewRange;
  if      (score >= 80) base = { min: 100_000, max: 1_000_000 };
  else if (score >= 60) base = { min:  25_000, max:   150_000 };
  else if (score >= 40) base = { min:   5_000, max:    50_000 };
  else                  base = { min:   1_000, max:    10_000 };

  // ±20 % randomness to feel realistic
  const rand = () => 0.8 + Math.random() * 0.4;
  return {
    min: Math.round(base.min * rand()),
    max: Math.round(base.max * rand()),
  };
}

function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M+`;
  if (n >= 1_000)     return `${Math.round(n / 1_000)}K`;
  return `${n}`;
}

interface Confidence { label: string; color: string; bg: string; border: string }

function getConfidence(score: number): Confidence {
  if (score >= 75) return { label: 'High Confidence',   color: '#10b981', bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.25)' };
  if (score >= 50) return { label: 'Medium Confidence', color: '#f59e0b', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.25)' };
  return            { label: 'Low Confidence',   color: '#ef4444', bg: 'rgba(239,68,68,0.10)',  border: 'rgba(239,68,68,0.25)'  };
}

// ─── AnimatedBar ─────────────────────────────────────────────────────────────

interface AnimatedBarProps { score: number; color: string; active: boolean }

function AnimatedBar({ score, color, active }: AnimatedBarProps) {
  return (
    <div style={{ flex: 1, height: 7, borderRadius: 4, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
      <div style={{
        width: active ? `${score}%` : '0%',
        height: '100%', borderRadius: 4, background: color,
        transition: active ? 'width 0.9s cubic-bezier(0.34,1.2,0.64,1)' : 'none',
      }} />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ViralScoreCard({ viralScore, jobId }: ViralScoreCardProps) {
  const [displayed, setDisplayed]           = useState<ViralScore>(viralScore);
  const [animatedScore, setAnimatedScore]   = useState(0);
  const [barsActive, setBarsActive]         = useState(false);
  const [visible, setVisible]               = useState(false);
  const [fading, setFading]                 = useState(false);
  const [improving, setImproving]           = useState(false);

  // View prediction state
  const [viewRange, setViewRange]           = useState<ViewRange | null>(null);
  const [animViewMin, setAnimViewMin]       = useState(0);
  const [animViewMax, setAnimViewMax]       = useState(0);
  const [viewVisible, setViewVisible]       = useState(false);

  const rafRef      = useRef<number | null>(null);
  const viewRafRef  = useRef<number | null>(null);
  const startRef    = useRef<number | null>(null);
  const viewStart   = useRef<number | null>(null);

  // ── View count-up animation ────────────────────────────────────────────────
  const runViewAnimation = useCallback((range: ViewRange) => {
    if (viewRafRef.current) cancelAnimationFrame(viewRafRef.current);
    viewStart.current = null;
    setAnimViewMin(0);
    setAnimViewMax(0);
    setViewVisible(false);

    const VIEW_DELAY    = 400;   // ms after view box appears
    const VIEW_DURATION = 1000;

    const delayTimer = setTimeout(() => {
      setViewVisible(true);

      const tick = (ts: number) => {
        if (!viewStart.current) viewStart.current = ts;
        const progress = Math.min((ts - viewStart.current) / VIEW_DURATION, 1);
        const e = easeOut(progress);
        setAnimViewMin(Math.round(e * range.min));
        setAnimViewMax(Math.round(e * range.max));
        if (progress < 1) {
          viewRafRef.current = requestAnimationFrame(tick);
        }
      };
      viewRafRef.current = requestAnimationFrame(tick);
    }, VIEW_DELAY);

    return () => {
      clearTimeout(delayTimer);
      if (viewRafRef.current) cancelAnimationFrame(viewRafRef.current);
    };
  }, []);

  // ── Viral score animation + triggers view prediction after it finishes ─────
  const runAnimation = useCallback((target: number, range: ViewRange) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    startRef.current = null;
    setAnimatedScore(0);
    setBarsActive(false);

    const DELAY    = 600;
    const DURATION = 1200;

    const delayTimer = setTimeout(() => {
      setBarsActive(true);

      const tick = (ts: number) => {
        if (!startRef.current) startRef.current = ts;
        const elapsed  = ts - startRef.current;
        const progress = Math.min(elapsed / DURATION, 1);
        setAnimatedScore(Math.round(easeOut(progress) * target));
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(tick);
        }
      };
      rafRef.current = requestAnimationFrame(tick);

      // Trigger view animation shortly after viral score anim completes
      const viewTimer = setTimeout(() => runViewAnimation(range), DURATION + 300);
      return () => clearTimeout(viewTimer);
    }, DELAY);

    return () => {
      clearTimeout(delayTimer);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [runViewAnimation]);

  // Fade in on mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  // Re-compute view range + re-animate whenever displayed changes
  useEffect(() => {
    const range = predictViews(displayed.viralScore);
    setViewRange(range);
    const cleanup = runAnimation(displayed.viralScore, range);
    return cleanup;
  }, [displayed, runAnimation]);

  // ── "Increase My Views" / improve handler ─────────────────────────────────
  const handleImprove = async () => {
    setImproving(true);
    setFading(true);

    try {
      const result = await api.improveReel(jobId, displayed.improvedHook);
      setDisplayed(result.viralScore);
    } catch {
      // keep current results on error
    } finally {
      setFading(false);
      setImproving(false);
    }
  };

  // ── Derived display values ────────────────────────────────────────────────
  const liveColor  = getScoreColor(animatedScore);
  const finalColor = getScoreColor(displayed.viralScore);
  const label      = getScoreLabel(displayed.viralScore);
  const confidence = getConfidence(displayed.viralScore);

  const radius        = 52;
  const circumference = 2 * Math.PI * radius;
  const offset        = circumference - (animatedScore / 100) * circumference;

  const factors = [
    { label: 'Hook Strength',        score: displayed.hookScore,       weight: '30%', icon: <Zap size={13} />,            color: '#818cf8' },
    { label: 'Emotional Trigger',    score: displayed.emotionScore,    weight: '20%', icon: <Smile size={13} />,          color: '#f472b6' },
    { label: 'Clarity & Simplicity', score: displayed.clarityScore,    weight: '15%', icon: <Eye size={13} />,            color: '#34d399' },
    { label: 'Trend Alignment',      score: displayed.trendScore,      weight: '15%', icon: <TrendingUp size={13} />,     color: '#fb923c' },
    { label: 'Engagement Potential', score: displayed.engagementScore, weight: '20%', icon: <MessageCircle size={13} />,  color: '#60a5fa' },
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
        <div className="r-viral-inner">

          {/* SVG gauge */}
          <div className="r-viral-gauge" style={{ position: 'relative', width: 130, height: 130, flexShrink: 0 }}>
            <svg width="130" height="130" viewBox="0 0 130 130">
              <circle cx="65" cy="65" r={radius}
                fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
              {/* Glow */}
              <circle cx="65" cy="65" r={radius}
                fill="none" stroke={liveColor} strokeWidth="14" strokeLinecap="round"
                strokeDasharray={circumference} strokeDashoffset={offset}
                transform="rotate(-90 65 65)"
                style={{ opacity: 0.18, filter: 'blur(4px)', transition: 'stroke-dashoffset 0.06s linear, stroke 0.4s ease' }}
              />
              {/* Main arc */}
              <circle cx="65" cy="65" r={radius}
                fill="none" stroke={liveColor} strokeWidth="10" strokeLinecap="round"
                strokeDasharray={circumference} strokeDashoffset={offset}
                transform="rotate(-90 65 65)"
                style={{ transition: 'stroke-dashoffset 0.06s linear, stroke 0.4s ease' }}
              />
            </svg>
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{
                fontSize: 32, fontWeight: 800, color: liveColor, lineHeight: 1,
                transition: 'color 0.4s ease', fontVariantNumeric: 'tabular-nums',
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
              background: `${finalColor}20`, border: `1px solid ${finalColor}45`,
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

        {/* ── Predicted Views box ─────────────────────────────────────────── */}
        {viewRange && (
          <div style={{
            background: 'rgba(6,182,212,0.07)',
            border: '1px solid rgba(6,182,212,0.22)',
            borderRadius: 14,
            padding: '14px 16px',
            marginBottom: 10,
            opacity: viewVisible ? 1 : 0,
            transform: viewVisible ? 'translateY(0)' : 'translateY(8px)',
            transition: 'opacity 0.5s ease, transform 0.5s ease',
          }}>
            {/* Section label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <Eye size={14} color="#22d3ee" />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#67e8f9', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Predicted Views
              </span>
            </div>

            {/* Views range + confidence */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              <span style={{
                fontSize: 26, fontWeight: 900, color: '#e0f2fe',
                letterSpacing: -0.5, fontVariantNumeric: 'tabular-nums', lineHeight: 1,
              }}>
                {formatViews(animViewMin)} – {formatViews(animViewMax)}
              </span>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20,
                background: confidence.bg, border: `1px solid ${confidence.border}`,
                color: confidence.color, flexShrink: 0,
              }}>
                {confidence.label}
              </span>
            </div>

            {/* Mini progress bar: view potential meter */}
            <div style={{ height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginBottom: 10 }}>
              <div style={{
                height: '100%', borderRadius: 4,
                width: barsActive ? `${displayed.viralScore}%` : '0%',
                background: 'linear-gradient(90deg, #06b6d4, #0ea5e9, #38bdf8)',
                transition: 'width 1.2s cubic-bezier(0.34,1.2,0.64,1)',
                boxShadow: '0 0 8px rgba(6,182,212,0.5)',
              }} />
            </div>

            {/* Why not higher */}
            {displayed.problem && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                <AlertTriangle size={13} color="#fbbf24" style={{ flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.5 }}>
                  <span style={{ color: '#fcd34d', fontWeight: 600 }}>Why not higher: </span>
                  {displayed.problem}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Problem box */}
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

      {/* "Increase My Views" button */}
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
            : 'linear-gradient(135deg, #0891b2, #0e7490, #7c3aed)',
          color: improving ? 'rgba(196,181,253,0.6)' : '#fff',
          fontSize: 14,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          transition: 'opacity 0.2s ease, transform 0.15s ease, background 0.3s ease',
          opacity: improving ? 0.7 : 1,
          transform: improving ? 'scale(0.98)' : 'scale(1)',
          boxShadow: improving ? 'none' : '0 4px 20px rgba(6,182,212,0.3)',
          letterSpacing: 0.2,
        }}
        onMouseEnter={e => { if (!improving) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.02)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
      >
        <RefreshCw
          size={15}
          style={{ animation: improving ? 'spin 0.9s linear infinite' : 'none' }}
        />
        {improving ? 'Improving your reel…' : '🚀 Increase My Views'}
      </button>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
