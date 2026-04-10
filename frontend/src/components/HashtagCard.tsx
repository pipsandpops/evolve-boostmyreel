import { useState } from 'react';
import { Copy, Check, Hash } from 'lucide-react';

interface HashtagCardProps {
  hashtags: string[];
}

export function HashtagCard({ hashtags }: HashtagCardProps) {
  const [copied, setCopied] = useState(false);
  const allTags = hashtags.map(h => `#${h}`).join(' ');

  const copy = async () => {
    await navigator.clipboard.writeText(allTags);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card card-hover" style={{ padding: 20, borderRadius: 16, overflow: 'hidden', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(135deg, #db2777, #f97316, #eab308)' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, paddingTop: 4 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10,
          background: 'linear-gradient(135deg, #fff7ed, #fef3c7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Hash size={16} color="#f97316" />
        </div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: 0 }}>Hashtags</p>
          <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{hashtags.length} tags</p>
        </div>
        <button onClick={copy} className="btn-secondary" style={{ marginLeft: 'auto', padding: '5px 12px', fontSize: 12, borderRadius: 8 }}>
          {copied ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
          {copied ? 'Copied all!' : 'Copy all'}
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
        {hashtags.map((tag, i) => (
          <span key={i} className="tag-pill">#{tag}</span>
        ))}
      </div>
    </div>
  );
}
