import { useState } from 'react';
import { Copy, Check, Sparkles, Lock } from 'lucide-react';
import type { CaptionSuggestion } from '../../types';

interface Props {
  caption: CaptionSuggestion;
  isPaidUser: boolean;
  onUpgrade?: () => void;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };
  return (
    <button onClick={copy} style={{
      background: copied ? '#f0fdf4' : '#f8fafc', border: `1px solid ${copied ? '#bbf7d0' : '#e2e8f0'}`,
      borderRadius: 8, padding: '5px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600,
      color: copied ? '#059669' : '#475569', display: 'flex', alignItems: 'center', gap: 5,
      transition: 'all 0.2s', flexShrink: 0,
    }}>
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

function BlurredSection({ label, onUpgrade }: { label: string; onUpgrade?: () => void }) {
  return (
    <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{
        padding: '12px 14px', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0',
        filter: 'blur(5px)', userSelect: 'none', pointerEvents: 'none',
      }}>
        <p style={{ fontSize: 13, color: '#475569', margin: 0 }}>
          This is a premium generated caption that will help your post get more engagement and reach a wider audience on Instagram.
        </p>
      </div>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(2px)', cursor: 'pointer', borderRadius: 12,
      }} onClick={onUpgrade}>
        <span style={{
          fontSize: 12, fontWeight: 700, color: '#0f172a',
          background: 'white', border: '1px solid #e2e8f0', padding: '6px 14px',
          borderRadius: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <Lock size={11} /> Unlock {label}
        </span>
      </div>
    </div>
  );
}

export function ImageCaptionCard({ caption, isPaidUser, onUpgrade }: Props) {
  const toneColors: Record<string, string> = {
    Viral: '#ef4444', Educational: '#3b82f6', Storytelling: '#8b5cf6', Sales: '#f59e0b',
  };
  const toneColor = toneColors[caption.tone] ?? '#7c3aed';

  return (
    <div className="card" style={{ borderRadius: 20, padding: 22 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={16} color="#7c3aed" /> AI Caption Package
        </h3>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
          background: `${toneColor}15`, color: toneColor, border: `1px solid ${toneColor}30`,
        }}>
          {caption.tone}
        </span>
      </div>

      {/* Hook — always visible */}
      <div style={{ marginBottom: 14 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#475569', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 0.3 }}>
          Hook Line
        </p>
        <div style={{
          background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)',
          border: '1px solid #c4b5fd', borderRadius: 12, padding: '12px 14px',
          display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#4c1d95', margin: 0, flex: 1, lineHeight: 1.5 }}>
            "{caption.hook}"
          </p>
          <CopyButton text={caption.hook} />
        </div>
      </div>

      {/* Full caption — premium */}
      <div style={{ marginBottom: 14 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#475569', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 0.3 }}>
          Full Caption
        </p>
        {isPaidUser ? (
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <p style={{ fontSize: 13, color: '#0f172a', margin: 0, flex: 1, lineHeight: 1.6 }}>{caption.fullCaption}</p>
              <CopyButton text={caption.fullCaption} />
            </div>
            {caption.cta && (
              <p style={{ fontSize: 13, fontWeight: 600, color: '#7c3aed', margin: '8px 0 0', borderTop: '1px solid #e2e8f0', paddingTop: 8 }}>
                👉 {caption.cta}
              </p>
            )}
          </div>
        ) : <BlurredSection label="full caption" onUpgrade={onUpgrade} />}
      </div>

      {/* Hashtags — premium */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#475569', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 0.3 }}>
          Hashtags
        </p>
        {isPaidUser ? (
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, flex: 1 }}>
                {caption.hashtags.map(tag => (
                  <span key={tag} style={{
                    fontSize: 12, fontWeight: 500, padding: '3px 10px', borderRadius: 20,
                    background: '#ede9fe', color: '#5b21b6', border: '1px solid #c4b5fd',
                  }}>
                    #{tag}
                  </span>
                ))}
              </div>
              <CopyButton text={caption.hashtags.map(t => `#${t}`).join(' ')} />
            </div>
          </div>
        ) : <BlurredSection label="hashtags" onUpgrade={onUpgrade} />}
      </div>
    </div>
  );
}
