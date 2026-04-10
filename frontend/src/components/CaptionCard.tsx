import { useState } from 'react';
import { Copy, Check, FileText } from 'lucide-react';

interface CaptionCardProps {
  caption: string;
}

export function CaptionCard({ caption }: CaptionCardProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(caption);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card card-hover" style={{ padding: 20, borderRadius: 16, overflow: 'hidden', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(135deg, #7c3aed, #db2777, #f97316)' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, paddingTop: 4 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10,
          background: 'linear-gradient(135deg, #fdf4ff, #fce7f3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <FileText size={16} color="#a855f7" />
        </div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: 0 }}>Caption</p>
          <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{caption.length} characters</p>
        </div>
        <button onClick={copy} className="btn-secondary" style={{ marginLeft: 'auto', padding: '5px 12px', fontSize: 12, borderRadius: 8 }}>
          {copied ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      <div style={{
        background: '#fafafa', borderRadius: 12, padding: '14px 16px',
        border: '1px solid #f1f5f9',
      }}>
        <p style={{ fontSize: 14, color: '#334155', margin: 0, lineHeight: 1.7 }}>
          {caption}
        </p>
      </div>
    </div>
  );
}
