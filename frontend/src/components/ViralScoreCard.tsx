import type { ViralScore } from '../types';
import { Zap, TrendingUp, Eye, Smile, MessageCircle, Lightbulb } from 'lucide-react';

interface ViralScoreCardProps {
  viralScore: ViralScore;
}

interface FactorRow {
  label: string;
  score: number;
  weight: string;
  icon: React.ReactNode;
  color: string;
}

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div style={{
      flex: 1, height: 8, borderRadius: 4,
      background: 'rgba(255,255,255,0.15)',
      overflow: 'hidden',
    }}>
      <div style={{
        width: `${score}%`, height: '100%', borderRadius: 4,
        background: color,
        transition: 'width 0.8s ease',
      }} />
    </div>
  );
}

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

export function ViralScoreCard({ viralScore }: ViralScoreCardProps) {
  const mainColor = getScoreColor(viralScore.viralScore);
  const label = getScoreLabel(viralScore.viralScore);

  const factors: FactorRow[] = [
    { label: 'Hook Strength', score: viralScore.hookScore, weight: '30%', icon: <Zap size={14} />, color: '#818cf8' },
    { label: 'Emotional Trigger', score: viralScore.emotionScore, weight: '20%', icon: <Smile size={14} />, color: '#f472b6' },
    { label: 'Clarity & Simplicity', score: viralScore.clarityScore, weight: '15%', icon: <Eye size={14} />, color: '#34d399' },
    { label: 'Trend Alignment', score: viralScore.trendScore, weight: '15%', icon: <TrendingUp size={14} />, color: '#fb923c' },
    { label: 'Engagement Potential', score: viralScore.engagementScore, weight: '20%', icon: <MessageCircle size={14} />, color: '#60a5fa' },
  ];

  // Circumference for SVG circle gauge
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (viralScore.viralScore / 100) * circumference;

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)',
      borderRadius: 20, padding: '24px 20px',
      border: '1px solid rgba(139,92,246,0.3)',
      boxShadow: '0 8px 32px rgba(139,92,246,0.2)',
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

      {/* Gauge + score */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
        <div style={{ position: 'relative', width: 130, height: 130, flexShrink: 0 }}>
          <svg width="130" height="130" viewBox="0 0 130 130">
            {/* Background circle */}
            <circle
              cx="65" cy="65" r={radius}
              fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10"
            />
            {/* Progress circle */}
            <circle
              cx="65" cy="65" r={radius}
              fill="none"
              stroke={mainColor}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              transform="rotate(-90 65 65)"
              style={{ transition: 'stroke-dashoffset 1s ease' }}
            />
          </svg>
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 32, fontWeight: 800, color: mainColor, lineHeight: 1 }}>
              {viralScore.viralScore}
            </span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>/100</span>
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{
            display: 'inline-block', padding: '4px 12px',
            background: `${mainColor}25`, border: `1px solid ${mainColor}50`,
            borderRadius: 20, marginBottom: 10,
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: mainColor }}>{label}</span>
          </div>

          {/* Factor bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {factors.map(f => (
              <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: f.color, flexShrink: 0 }}>{f.icon}</span>
                <ScoreBar score={f.score} color={f.color} />
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', width: 26, textAlign: 'right', flexShrink: 0 }}>
                  {f.score}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Factor legend */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: '6px 12px', marginBottom: 16,
      }}>
        {factors.map(f => (
          <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ color: f.color }}>{f.icon}</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
              {f.label} <span style={{ color: 'rgba(255,255,255,0.3)' }}>({f.weight})</span>
            </span>
          </div>
        ))}
      </div>

      {/* Problem & improved hook */}
      {viralScore.problem && (
        <div style={{
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: 12, padding: '10px 14px', marginBottom: 10,
        }}>
          <p style={{ fontSize: 12, color: '#fca5a5', margin: 0, fontWeight: 600, marginBottom: 2 }}>
            What to improve
          </p>
          <p style={{ fontSize: 13, color: '#fecaca', margin: 0 }}>{viralScore.problem}</p>
        </div>
      )}

      {viralScore.improvedHook && (
        <div style={{
          background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
          borderRadius: 12, padding: '10px 14px',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <Lightbulb size={16} color="#34d399" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <p style={{ fontSize: 12, color: '#6ee7b7', margin: 0, fontWeight: 600, marginBottom: 2 }}>
                Improved Hook Suggestion
              </p>
              <p style={{ fontSize: 13, color: '#a7f3d0', margin: 0, fontStyle: 'italic' }}>
                "{viralScore.improvedHook}"
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
