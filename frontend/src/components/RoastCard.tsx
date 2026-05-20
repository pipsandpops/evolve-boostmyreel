import { useState } from 'react';
import { Flame, Loader, RefreshCw, Sparkles, Copy, Check } from 'lucide-react';
import { api } from '../services/api';
import type { RoastResponse } from '../types';

interface Props {
  jobId: string;
}

type State = 'idle' | 'loading' | 'ready' | 'error';

export function RoastCard({ jobId }: Props) {
  const [state, setState]     = useState<State>('idle');
  const [result, setResult]   = useState<RoastResponse | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [copied, setCopied]   = useState(false);

  const fetchRoast = async () => {
    setState('loading');
    setError(null);
    try {
      const res = await api.roastReel(jobId);
      setResult(res);
      setState('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : `Claude refused to roast you (that's worse tbh 💀)`);
      setState('error');
    }
  };

  const copyRoast = () => {
    if (!result) return;
    const text = `${result.roast}\n\nGlow-Up Plan:\n${result.glowUp.map((f, i) => `${i + 1}. ${f}`).join('\n')}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{
      border: '1px solid #fecaca', borderRadius: 16,
      background: state === 'ready' ? '#fff7f7' : 'white',
      marginBottom: 16, overflow: 'hidden',
      transition: 'background 0.3s',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '16px 20px',
        borderBottom: state === 'ready' ? '1px solid #fecaca' : 'none',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: 'linear-gradient(135deg, #dc2626, #ea580c)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Flame size={17} color="white" />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>
            AI Roast Mode 🔥
          </p>
          <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
            Brutally honest feedback + glow-up plan, Gen-Z style
          </p>
        </div>
        {state === 'ready' && (
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={copyRoast}
              title="Copy roast"
              style={{
                background: 'none', border: '1px solid #fca5a5', borderRadius: 8,
                cursor: 'pointer', padding: '5px 8px', color: '#dc2626',
                display: 'flex', alignItems: 'center', gap: 4, fontSize: 12,
              }}
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={fetchRoast}
              title="Get a new roast"
              style={{
                background: 'none', border: '1px solid #fca5a5', borderRadius: 8,
                cursor: 'pointer', padding: '5px 8px', color: '#dc2626',
                display: 'flex', alignItems: 'center', gap: 4, fontSize: 12,
              }}
            >
              <RefreshCw size={13} />
              Re-roast
            </button>
          </div>
        )}
      </div>

      <div style={{ padding: '16px 20px' }}>
        {/* Idle */}
        {state === 'idle' && (
          <button
            onClick={fetchRoast}
            style={{
              width: '100%', padding: '11px 0', borderRadius: 10, border: 'none',
              cursor: 'pointer', fontSize: 14, fontWeight: 700,
              background: 'linear-gradient(135deg, #dc2626, #ea580c)',
              color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <Flame size={16} />
            Get Roasted 💀
          </button>
        )}

        {/* Loading */}
        {state === 'loading' && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 10, padding: '10px 0', color: '#dc2626', fontSize: 14, fontWeight: 500,
          }}>
            <Loader size={18} style={{ animation: 'roast-spin 1s linear infinite' }} />
            Claude is cooking… brace yourself 💀
          </div>
        )}

        {/* Ready */}
        {state === 'ready' && result && (
          <div>
            {/* The Roast */}
            <div style={{
              background: 'white', border: '1px solid #fecaca', borderRadius: 12,
              padding: '14px 16px', marginBottom: 16, position: 'relative',
            }}>
              <div style={{
                fontSize: 10, fontWeight: 800, letterSpacing: 1, color: '#dc2626',
                textTransform: 'uppercase', marginBottom: 8,
              }}>
                THE ROAST 🔥
              </div>
              <p style={{
                fontSize: 14, color: '#1e293b', lineHeight: 1.65, margin: 0,
                fontStyle: 'italic',
              }}>
                "{result.roast}"
              </p>
            </div>

            {/* Glow-Up Plan */}
            <div style={{
              background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)',
              border: '1px solid #bbf7d0', borderRadius: 12, padding: '14px 16px',
            }}>
              <div style={{
                fontSize: 10, fontWeight: 800, letterSpacing: 1, color: '#059669',
                textTransform: 'uppercase', marginBottom: 10,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <Sparkles size={12} />
                THE GLOW-UP PLAN ✨
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {result.glowUp.map((fix, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, color: 'white', marginTop: 1,
                    }}>
                      {i + 1}
                    </div>
                    <p style={{ fontSize: 13, color: '#065f46', margin: 0, lineHeight: 1.5 }}>
                      {fix}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {state === 'error' && (
          <div>
            <p style={{ color: '#dc2626', fontSize: 13, margin: '0 0 10px' }}>💀 {error}</p>
            <button
              onClick={fetchRoast}
              style={{
                width: '100%', padding: '10px 0', borderRadius: 10, border: 'none',
                cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: '#fee2e2', color: '#dc2626',
              }}
            >
              Try Again
            </button>
          </div>
        )}
      </div>

      <style>{`@keyframes roast-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
