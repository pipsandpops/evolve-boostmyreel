import { useState } from 'react';
import { Copy, Check, Zap } from 'lucide-react';

interface HookCardProps {
  hook: string;
}

export function HookCard({ hook }: HookCardProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(hook);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card card-hover" style={{ padding: 20, borderRadius: 16, overflow: 'hidden', position: 'relative' }}>
      {/* Gradient accent bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(135deg, #4f46e5, #7c3aed, #db2777)' }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, paddingTop: 4 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10,
          background: 'linear-gradient(135deg, #eef2ff, #ede9fe)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Zap size={16} color="#6366f1" fill="#6366f1" />
        </div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: 0 }}>Viral Hook</p>
          <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>First 3-second overlay</p>
        </div>
        <button onClick={copy} className="btn-secondary" style={{ marginLeft: 'auto', padding: '5px 12px', fontSize: 12, borderRadius: 8 }}>
          {copied ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {/* Hook text */}
      <div style={{
        background: 'linear-gradient(135deg, #f8faff, #f5f3ff)',
        borderRadius: 12, padding: '16px 18px',
        border: '1px solid #e0e7ff',
      }}>
        <p style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1.4, letterSpacing: -0.3 }}>
          "{hook}"
        </p>
      </div>
    </div>
  );
}
