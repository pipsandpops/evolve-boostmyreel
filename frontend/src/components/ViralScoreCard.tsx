import { useState, useEffect, useRef, useCallback } from 'react';
import type { ViralScore, ViewPrediction, InstagramStatus } from '../types';
import { api } from '../services/api';
import {
  Zap, TrendingUp, Eye, Smile, MessageCircle, Lightbulb,
  RefreshCw, Users, BarChart2, ChevronRight, Unlink,
} from 'lucide-react';

// Inline SVG for Instagram (lucide deprecated the branded icon)
function IgIcon({ size = 15, color = 'white' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <circle cx="12" cy="12" r="4"/>
      <circle cx="17.5" cy="6.5" r="0.5" fill={color} stroke="none"/>
    </svg>
  );
}

interface ViralScoreCardProps {
  viralScore: ViralScore;
  jobId: string;
  userId: string;
  isPaidUser?: boolean;
  onUpgrade?: () => void;
  viewPrediction?: ViewPrediction | null;   // server-computed scenario prediction
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

// ─── Tier colour palette ──────────────────────────────────────────────────────

const TIER_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  Low:    { text: '#f87171', bg: 'rgba(239,68,68,0.10)',    border: 'rgba(239,68,68,0.25)'    },
  Medium: { text: '#fbbf24', bg: 'rgba(245,158,11,0.10)',   border: 'rgba(245,158,11,0.25)'   },
  High:   { text: '#34d399', bg: 'rgba(16,185,129,0.10)',   border: 'rgba(16,185,129,0.25)'   },
};

function tierColor(tier: string) {
  return TIER_COLORS[tier] ?? TIER_COLORS.Medium;
}

// ─── AnimatedBar ─────────────────────────────────────────────────────────────

function AnimatedBar({ score, color, active }: { score: number; color: string; active: boolean }) {
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

export function ViralScoreCard({
  viralScore,
  jobId,
  userId,
  isPaidUser = false,
  onUpgrade,
  viewPrediction,
}: ViralScoreCardProps) {
  const [displayed, setDisplayed]             = useState<ViralScore>(viralScore);
  const [animatedScore, setAnimatedScore]     = useState(0);
  const [barsActive, setBarsActive]           = useState(false);
  const [visible, setVisible]                 = useState(false);
  const [fading, setFading]                   = useState(false);
  const [improving, setImproving]             = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [predVisible, setPredVisible]         = useState(false);

  // Instagram state
  const [igStatus, setIgStatus]               = useState<InstagramStatus | null>(null);
  const [igLoading, setIgLoading]             = useState(false);
  const [activePrediction, setActivePrediction] = useState<ViewPrediction | null>(viewPrediction ?? null);
  const [predLoading, setPredLoading]         = useState(false);

  const rafRef   = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  // ── Gauge animation ────────────────────────────────────────────────────────
  const runAnimation = useCallback((target: number) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    startRef.current = null;
    setAnimatedScore(0);
    setBarsActive(false);
    setPredVisible(false);

    const delayTimer = setTimeout(() => {
      setBarsActive(true);
      const DURATION = 1200;

      const tick = (ts: number) => {
        if (!startRef.current) startRef.current = ts;
        const progress = Math.min((ts - startRef.current) / DURATION, 1);
        setAnimatedScore(Math.round(easeOut(progress) * target));
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(tick);
        }
      };
      rafRef.current = requestAnimationFrame(tick);

      const predTimer = setTimeout(() => setPredVisible(true), DURATION + 300);
      return () => clearTimeout(predTimer);
    }, 600);

    return () => {
      clearTimeout(delayTimer);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const cleanup = runAnimation(displayed.viralScore);
    return cleanup;
  }, [displayed, runAnimation]);

  // ── Fetch Instagram status on mount ───────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const status = await api.getInstagramStatus(userId);
        if (!cancelled) setIgStatus(status);
      } catch {
        // Instagram not connected; silent
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  // ── Fetch personalised prediction when IG is connected ────────────────────
  useEffect(() => {
    if (!igStatus?.connected || !isPaidUser) return;
    let cancelled = false;
    (async () => {
      setPredLoading(true);
      try {
        const pred = await api.getPersonalizedPrediction(
          userId,
          displayed.viralScore,
          displayed.engagementScore,
          displayed.hookScore,
        );
        if (!cancelled) setActivePrediction(pred);
      } catch {
        // Fall back to scenario prediction silently
      } finally {
        if (!cancelled) setPredLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [igStatus, isPaidUser, userId, displayed]);

  // ── "Increase My Views" handler ───────────────────────────────────────────
  const handleImprove = async () => {
    setImproving(true);
    setFading(true);
    try {
      const result = await api.improveReel(jobId, displayed.improvedHook);
      setDisplayed(result.viralScore);
    } catch {
      // keep current results
    } finally {
      setFading(false);
      setImproving(false);
    }
  };

  // ── Connect Instagram ─────────────────────────────────────────────────────
  const handleConnectInstagram = async () => {
    if (!isPaidUser) { setShowUpgradeModal(true); return; }
    setIgLoading(true);
    try {
      const { authUrl } = await api.getInstagramAuthUrl(userId);
      window.location.href = authUrl;
    } catch {
      setIgLoading(false);
    }
  };

  // ── Disconnect Instagram ──────────────────────────────────────────────────
  const handleDisconnect = async () => {
    try {
      await api.disconnectInstagram(userId);
      setIgStatus(null);
      setActivePrediction(viewPrediction ?? null);
    } catch {
      // silent
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const liveColor  = getScoreColor(animatedScore);
  const finalColor = getScoreColor(displayed.viralScore);
  const label      = getScoreLabel(displayed.viralScore);
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

  const prediction = activePrediction ?? viewPrediction;
  const isPersonalised = prediction?.predictionType === 'personalized';

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

      {/* Animated content */}
      <div style={{
        opacity: fading ? 0.35 : 1,
        transition: 'opacity 0.3s ease',
        pointerEvents: fading ? 'none' : 'auto',
      }}>

        {/* Gauge + factor bars */}
        <div className="r-viral-inner">

          {/* SVG gauge */}
          <div className="r-viral-gauge" style={{ position: 'relative', width: 130, height: 130, flexShrink: 0 }}>
            <svg width="130" height="130" viewBox="0 0 130 130">
              <circle cx="65" cy="65" r={radius}
                fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
              <circle cx="65" cy="65" r={radius}
                fill="none" stroke={liveColor} strokeWidth="14" strokeLinecap="round"
                strokeDasharray={circumference} strokeDashoffset={offset}
                transform="rotate(-90 65 65)"
                style={{ opacity: 0.18, filter: 'blur(4px)', transition: 'stroke-dashoffset 0.06s linear, stroke 0.4s ease' }}
              />
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
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: finalColor }}>{label}</span>
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

        {/* ── View Prediction Box ──────────────────────────────────────────── */}
        {prediction && (
          <div style={{
            background: 'rgba(6,182,212,0.07)',
            border: '1px solid rgba(6,182,212,0.22)',
            borderRadius: 14,
            padding: '14px 16px',
            marginBottom: 10,
            opacity: predVisible ? 1 : 0,
            transform: predVisible ? 'translateY(0)' : 'translateY(8px)',
            transition: 'opacity 0.5s ease, transform 0.5s ease',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Eye size={14} color="#22d3ee" />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#67e8f9', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Predicted Views
                </span>
                {isPersonalised && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                    background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.35)',
                    color: '#34d399',
                  }}>
                    Personalised ✦
                  </span>
                )}
              </div>
              {/* Viral tier badge */}
              {(() => {
                const tc = tierColor(prediction.viralTier);
                return (
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                    background: tc.bg, border: `1px solid ${tc.border}`, color: tc.text,
                  }}>
                    {prediction.viralTier} Viral
                  </span>
                );
              })()}
            </div>

            {/* ── PERSONALISED mode ─────────────────────────────────────── */}
            {isPersonalised && (
              <>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 28, fontWeight: 900, color: '#e0f2fe', letterSpacing: -0.5, lineHeight: 1 }}>
                    {prediction.predictedRange}
                  </span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>views</span>
                </div>
                <div style={{ display: 'flex', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
                  {prediction.followers != null && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Users size={11} color="#a78bfa" />
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                        {prediction.followers.toLocaleString()} followers
                      </span>
                    </div>
                  )}
                  {prediction.avgViews != null && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <BarChart2 size={11} color="#a78bfa" />
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                        {prediction.avgViews.toLocaleString()} avg views
                      </span>
                    </div>
                  )}
                </div>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0, fontStyle: 'italic' }}>
                  {prediction.note}
                </p>
              </>
            )}

            {/* ── SCENARIO mode ─────────────────────────────────────────── */}
            {!isPersonalised && (
              <>
                {/* Blur wrapper for free users */}
                <div style={{
                  filter: isPaidUser ? 'none' : 'blur(5px)',
                  userSelect: isPaidUser ? 'auto' : 'none',
                  pointerEvents: isPaidUser ? 'auto' : 'none',
                  transition: 'filter 0.4s ease',
                }}>
                  {/* Scenario table — show 4 rows, scroll for more */}
                  <div style={{
                    display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10,
                    maxHeight: 168,   /* ~4 rows × 42px */
                    overflowY: 'auto',
                    paddingRight: 2,
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'rgba(6,182,212,0.3) transparent',
                  }}>
                    {prediction.scenarios.map((s) => {
                      const tc = tierColor(s.tier);
                      return (
                        <div key={s.followers} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          background: 'rgba(255,255,255,0.04)',
                          borderRadius: 8, padding: '7px 12px',
                          border: `1px solid ${tc.border}`,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <Users size={12} color={tc.text} />
                            <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>
                              {s.followers} followers
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Eye size={11} color={tc.text} />
                            <span style={{ fontSize: 13, fontWeight: 700, color: tc.text, fontVariantNumeric: 'tabular-nums' }}>
                              {s.views}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Progress bar */}
                  <div style={{ height: 3, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginBottom: 8 }}>
                    <div style={{
                      height: '100%', borderRadius: 3,
                      width: barsActive ? `${displayed.viralScore}%` : '0%',
                      background: 'linear-gradient(90deg, #06b6d4, #38bdf8)',
                      transition: 'width 1.2s cubic-bezier(0.34,1.2,0.64,1)',
                    }} />
                  </div>
                </div>

                {/* Lock overlay for free users */}
                {!isPaidUser && (
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: 14,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(15,10,40,0.45)', backdropFilter: 'blur(2px)',
                    cursor: 'pointer',
                  }} onClick={() => setShowUpgradeModal(true)}>
                    <span style={{
                      fontSize: 12, fontWeight: 700, color: '#e0f2fe',
                      background: 'rgba(6,182,212,0.2)',
                      border: '1px solid rgba(6,182,212,0.35)',
                      padding: '6px 14px', borderRadius: 20, backdropFilter: 'blur(4px)',
                    }}>
                      🔒 Unlock to see predictions
                    </span>
                  </div>
                )}
              </>
            )}

            {/* Trust note — always visible */}
            {isPaidUser && (
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', margin: '8px 0 0', fontStyle: 'italic' }}>
                {prediction.note}
              </p>
            )}
          </div>
        )}

        {/* ── Instagram Connect Card (PRO) ──────────────────────────────── */}
        {isPaidUser && !igStatus?.connected && (
          <div style={{
            background: 'rgba(225,48,108,0.07)',
            border: '1px solid rgba(225,48,108,0.22)',
            borderRadius: 14, padding: '12px 14px', marginBottom: 10,
            opacity: predVisible ? 1 : 0,
            transition: 'opacity 0.6s ease 0.2s',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                  background: 'linear-gradient(135deg, #e1306c, #fd1d1d, #fcb045)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <IgIcon size={15} color="white" />
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#fda4af', margin: 0 }}>
                    Connect Instagram
                  </p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                    Get personalised predictions based on your real data
                  </p>
                </div>
              </div>
              <button
                onClick={handleConnectInstagram}
                disabled={igLoading}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: 'linear-gradient(135deg, #e1306c, #fd1d1d)',
                  border: 'none', borderRadius: 8,
                  padding: '7px 12px', cursor: igLoading ? 'not-allowed' : 'pointer',
                  fontSize: 12, fontWeight: 700, color: 'white',
                  flexShrink: 0, opacity: igLoading ? 0.6 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                {igLoading ? 'Redirecting…' : <><ChevronRight size={13} /> Connect</>}
              </button>
            </div>
          </div>
        )}

        {/* ── Connected Instagram badge ─────────────────────────────────── */}
        {isPaidUser && igStatus?.connected && (
          <div style={{
            background: 'rgba(16,185,129,0.07)',
            border: '1px solid rgba(16,185,129,0.22)',
            borderRadius: 14, padding: '10px 14px', marginBottom: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <IgIcon size={14} color="#34d399" />
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#6ee7b7', margin: 0 }}>
                  @{igStatus.username}
                </p>
                {predLoading
                  ? <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0 }}>Loading personalised data…</p>
                  : <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0 }}>
                      {igStatus.followers?.toLocaleString()} followers
                      {igStatus.avgViews != null ? ` · ~${igStatus.avgViews.toLocaleString()} avg views` : ''}
                    </p>
                }
              </div>
            </div>
            <button
              onClick={handleDisconnect}
              title="Disconnect Instagram"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'rgba(255,255,255,0.25)', padding: 4,
                display: 'flex', alignItems: 'center',
              }}
            >
              <Unlink size={13} />
            </button>
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
                  "{displayed.improvedHook}"
                </p>
              </div>
            </div>
          </div>
        )}

      </div>{/* end fading wrapper */}

      {/* ── Increase My Views button ──────────────────────────────────────── */}
      <button
        onClick={isPaidUser ? handleImprove : () => setShowUpgradeModal(true)}
        disabled={improving}
        style={{
          width: '100%', padding: '12px 0', borderRadius: 12,
          border: isPaidUser ? 'none' : '1px solid rgba(255,255,255,0.15)',
          cursor: improving ? 'not-allowed' : 'pointer',
          background: !isPaidUser
            ? 'rgba(255,255,255,0.06)'
            : improving
            ? 'rgba(139,92,246,0.2)'
            : 'linear-gradient(135deg, #0891b2, #0e7490, #7c3aed)',
          color: !isPaidUser ? 'rgba(255,255,255,0.45)' : improving ? 'rgba(196,181,253,0.6)' : '#fff',
          fontSize: 14, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          transition: 'all 0.3s ease',
          opacity: improving ? 0.7 : 1,
          boxShadow: isPaidUser && !improving ? '0 4px 20px rgba(6,182,212,0.3)' : 'none',
          letterSpacing: 0.2,
        }}
        onMouseEnter={e => { if (isPaidUser && !improving) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.02)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
      >
        <RefreshCw size={15} style={{ animation: improving ? 'spin 0.9s linear infinite' : 'none' }} />
        {!isPaidUser
          ? '🔒 Unlock to Increase Views'
          : improving
          ? 'Improving your reel…'
          : '🚀 Increase My Views'}
      </button>

      {/* Trust message */}
      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', margin: '10px 0 0', textAlign: 'center', lineHeight: 1.5 }}>
        We estimate performance based on content quality signals — not guesswork.
      </p>

      {/* ── Upgrade modal ─────────────────────────────────────────────────── */}
      {showUpgradeModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24, backdropFilter: 'blur(4px)',
          }}
          onClick={() => setShowUpgradeModal(false)}
        >
          <div
            style={{
              background: 'white', borderRadius: 24, padding: '36px 28px',
              maxWidth: 380, width: '100%', textAlign: 'center',
              boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
              animation: 'modalPop 0.25s cubic-bezier(0.34,1.4,0.64,1)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 44, marginBottom: 16, lineHeight: 1 }}>🔥</div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 10px', letterSpacing: -0.4 }}>
              Unlock your full prediction
            </h3>
            <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 24px', lineHeight: 1.6 }}>
              See scenario-based view estimates across all follower tiers, connect Instagram for
              personalised predictions, and use the improvement loop to maximise reach.
            </p>
            <button
              onClick={() => { setShowUpgradeModal(false); onUpgrade?.(); }}
              className="btn-primary"
              style={{ width: '100%', padding: '13px', fontSize: 15, borderRadius: 12 }}
            >
              🚀 Unlock Now
            </button>
            <button
              onClick={() => setShowUpgradeModal(false)}
              style={{
                marginTop: 12, background: 'none', border: 'none',
                cursor: 'pointer', fontSize: 13, color: '#94a3b8', padding: '4px 8px',
              }}
            >
              Maybe later
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin     { from { transform: rotate(0deg);  } to { transform: rotate(360deg); } }
        @keyframes modalPop { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}
