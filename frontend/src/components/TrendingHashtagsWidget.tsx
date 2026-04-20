import { useEffect, useState } from 'react';
import { TrendingUp, Copy, Check, RefreshCw, Loader } from 'lucide-react';
import { api } from '../services/api';
import type { TrendingHashtag } from '../types';

// Category colour map
const CATEGORY_COLOURS: Record<string, { bg: string; text: string; border: string }> = {
  Motivation:  { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
  Comedy:      { bg: '#fefce8', text: '#a16207', border: '#fde68a' },
  Tech:        { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  Finance:     { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  Lifestyle:   { bg: '#fdf4ff', text: '#7e22ce', border: '#e9d5ff' },
  Education:   { bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0' },
  Entertainment:{ bg: '#fff1f2', text: '#be123c', border: '#fecdd3' },
  Food:        { bg: '#fefce8', text: '#92400e', border: '#fde68a' },
  Travel:      { bg: '#eff6ff', text: '#0369a1', border: '#bae6fd' },
  Fitness:     { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' },
};

function getCategoryStyle(category: string) {
  return CATEGORY_COLOURS[category] ?? { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' };
}

function ViralityBar({ score }: { score: number }) {
  const colour = score >= 80 ? '#16a34a' : score >= 60 ? '#d97706' : '#dc2626';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, borderRadius: 3, background: '#f1f5f9', overflow: 'hidden' }}>
        <div style={{
          width: `${score}%`, height: '100%', borderRadius: 3,
          background: colour, transition: 'width 0.6s ease',
        }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: colour, minWidth: 28 }}>{score}</span>
    </div>
  );
}

function HashtagCard({ tag, onCopy, copied }: {
  tag: TrendingHashtag;
  onCopy: (t: string) => void;
  copied: boolean;
}) {
  const catStyle = getCategoryStyle(tag.category);
  return (
    <div style={{
      background: 'white', border: '1px solid #e2e8f0', borderRadius: 14,
      padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10,
      transition: 'box-shadow 0.15s',
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: '#7c3aed' }}>{tag.tag}</span>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
            background: catStyle.bg, color: catStyle.text, border: `1px solid ${catStyle.border}`,
          }}>
            {tag.category}
          </span>
        </div>
        <button
          onClick={() => onCopy(tag.tag)}
          title="Copy hashtag"
          style={{
            padding: '5px 10px', borderRadius: 8, border: '1px solid #e2e8f0',
            background: copied ? '#f0fdf4' : 'white', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 4,
            color: copied ? '#16a34a' : '#64748b', fontSize: 12, fontWeight: 600,
            transition: 'all 0.15s', flexShrink: 0,
          }}
        >
          {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
        </button>
      </div>

      {/* Description */}
      <p style={{ fontSize: 13, color: '#475569', margin: 0, lineHeight: 1.5 }}>
        {tag.description}
      </p>

      {/* Content idea */}
      <div style={{
        background: '#f8fafc', borderRadius: 8, padding: '8px 12px',
        borderLeft: '3px solid #7c3aed',
      }}>
        <p style={{ fontSize: 12, color: '#0f172a', margin: 0, lineHeight: 1.5 }}>
          <span style={{ fontWeight: 700, color: '#7c3aed' }}>Idea: </span>
          {tag.idea}
        </p>
      </div>

      {/* Virality bar */}
      <div>
        <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 4px', fontWeight: 600 }}>
          VIRALITY SCORE
        </p>
        <ViralityBar score={tag.virality_score} />
      </div>
    </div>
  );
}

export function TrendingHashtagsWidget() {
  const [hashtags, setHashtags] = useState<TrendingHashtag[]>([]);
  const [date, setDate]         = useState<string>('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);

  const fetchTrends = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getTrendingHashtags();
      setHashtags(res.hashtags);
      setDate(res.date);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load trends.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTrends(); }, []);

  const handleCopy = (tag: string) => {
    navigator.clipboard.writeText(tag).catch(() => {});
    setCopiedTag(tag);
    setTimeout(() => setCopiedTag(null), 2000);
  };

  return (
    <div style={{
      background: 'white', border: '1px solid #e2e8f0',
      borderRadius: 20, padding: 24,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12, flexShrink: 0,
            background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <TrendingUp size={20} color="white" />
          </div>
          <div>
            <p style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Trending Hashtags
            </p>
            <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
              {date ? `Top 5 for ${date} · Reels & Shorts` : 'Top 5 for today · Reels & Shorts'}
            </p>
          </div>
        </div>

        <button
          onClick={fetchTrends}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 10,
            border: '1px solid #e2e8f0', background: 'white',
            color: '#64748b', fontSize: 12, fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          <RefreshCw size={13} style={loading ? { animation: 'spin 1s linear infinite' } : undefined} />
          Refresh
        </button>
      </div>

      {/* Loading */}
      {loading && hashtags.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8' }}>
          <Loader size={28} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ fontSize: 13, margin: 0 }}>Analysing today's trends…</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          background: '#fff1f2', border: '1px solid #fecdd3',
          borderRadius: 10, padding: '12px 16px', marginBottom: 16,
        }}>
          <p style={{ color: '#be123c', fontSize: 13, margin: 0 }}>{error}</p>
        </div>
      )}

      {/* Hashtag cards */}
      {hashtags.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {hashtags.map((tag) => (
            <HashtagCard
              key={tag.tag}
              tag={tag}
              onCopy={handleCopy}
              copied={copiedTag === tag.tag}
            />
          ))}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
