import { TrendingUp, AlertTriangle } from 'lucide-react';

interface Props {
  insights: string[];
  missingElements: string[];
  isPaidUser: boolean;
  onUpgrade?: () => void;
}

export function ImageInsightsPanel({ insights, missingElements, isPaidUser, onUpgrade }: Props) {
  const visibleInsights = isPaidUser ? insights : insights.slice(0, 3);
  const isStrength = (s: string) => s.startsWith('Strength:') || s.includes('detected') && !s.includes('Watch');

  return (
    <div className="card" style={{ borderRadius: 20, padding: 22 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <TrendingUp size={16} color="#7c3aed" /> Growth Insights
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: missingElements.length > 0 ? 18 : 0 }}>
        {visibleInsights.map((insight, i) => {
          const positive = isStrength(insight);
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '10px 12px', borderRadius: 12,
              background: positive ? '#f0fdf4' : '#fff7ed',
              border: `1px solid ${positive ? '#bbf7d0' : '#fed7aa'}`,
            }}>
              <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>{positive ? '✅' : '💡'}</span>
              <p style={{ fontSize: 13, color: positive ? '#064e3b' : '#7c2d12', margin: 0, lineHeight: 1.5 }}>
                {insight.replace(/^(Strength:|Watch out:)\s*/i, '')}
              </p>
            </div>
          );
        })}

        {/* Blurred lock for free users */}
        {!isPaidUser && insights.length > 3 && (
          <div style={{ position: 'relative' }}>
            <div style={{ filter: 'blur(4px)', userSelect: 'none', pointerEvents: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {insights.slice(3, 6).map((insight, i) => (
                <div key={i} style={{
                  padding: '10px 12px', borderRadius: 12,
                  background: '#fff7ed', border: '1px solid #fed7aa',
                }}>
                  <p style={{ fontSize: 13, color: '#7c2d12', margin: 0 }}>{insight}</p>
                </div>
              ))}
            </div>
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }} onClick={onUpgrade}>
              <span style={{
                fontSize: 12, fontWeight: 700, color: '#0f172a',
                background: 'white', border: '1px solid #e2e8f0',
                padding: '6px 14px', borderRadius: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}>
                🔒 Unlock {insights.length - 3} more insights
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Missing elements */}
      {missingElements.length > 0 && (
        <>
          <div style={{ height: 1, background: '#f1f5f9', margin: '4px 0 16px' }} />
          <h4 style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={13} color="#f59e0b" /> Missing Elements
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {missingElements.map((el, i) => {
              const [title, ...rest] = el.split(' — ');
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%', background: '#fbbf24',
                    flexShrink: 0, marginTop: 6,
                  }} />
                  <p style={{ fontSize: 12, color: '#475569', margin: 0, lineHeight: 1.5 }}>
                    <strong style={{ color: '#0f172a' }}>{title}</strong>
                    {rest.length > 0 && <> — {rest.join(' — ')}</>}
                  </p>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
