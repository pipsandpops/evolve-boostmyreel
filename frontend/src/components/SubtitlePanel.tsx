import { useState } from 'react';
import { Download, Flame, Check, Captions } from 'lucide-react';
import { api } from '../services/api';
import { Spinner } from './ui/Spinner';
import type { SubtitleEntry } from '../types';

interface SubtitlePanelProps {
  jobId: string;
  subtitles: SubtitleEntry[];
}

export function SubtitlePanel({ jobId, subtitles }: SubtitlePanelProps) {
  const [burning, setBurning] = useState(false);
  const [burnedUrl, setBurnedUrl] = useState<string | null>(null);
  const [burnError, setBurnError] = useState<string | null>(null);

  const handleBurn = async () => {
    setBurning(true);
    setBurnError(null);
    try {
      await api.burnSubtitles(jobId);
      setBurnedUrl(api.getBurnedVideoUrl(jobId));
    } catch (err) {
      setBurnError(err instanceof Error ? err.message : 'Burn failed.');
    } finally {
      setBurning(false);
    }
  };

  return (
    <div className="card" style={{ borderRadius: 16, overflow: 'hidden', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(135deg, #4f46e5, #7c3aed, #db2777)' }} />

      <div style={{ padding: 20, paddingTop: 24 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'linear-gradient(135deg, #eef2ff, #ede9fe)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Captions size={16} color="#6366f1" />
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: 0 }}>Subtitles</p>
            <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{subtitles.length} segments</p>
          </div>
        </div>

        {/* Subtitle list */}
        <div style={{
          maxHeight: 180, overflowY: 'auto', marginBottom: 16,
          background: '#f8fafc', borderRadius: 10, padding: '8px 12px',
          border: '1px solid #f1f5f9',
        }}>
          {subtitles.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: 13, fontStyle: 'italic', margin: '8px 0' }}>
              No subtitles generated.
            </p>
          ) : subtitles.map(sub => (
            <div key={sub.index} style={{
              display: 'flex', gap: 12, padding: '6px 0',
              borderBottom: sub.index < subtitles.length ? '1px solid #f1f5f9' : 'none',
              alignItems: 'flex-start',
            }}>
              <span style={{
                fontSize: 10, color: '#94a3b8', fontFamily: 'ui-monospace, monospace',
                flexShrink: 0, paddingTop: 2, minWidth: 52,
              }}>
                {sub.start.split(',')[0]}
              </span>
              <span style={{ fontSize: 13, color: '#334155', lineHeight: 1.5 }}>
                {sub.text}
              </span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
          <a
            href={api.getSrtUrl(jobId)}
            download={`subtitles-${jobId}.srt`}
            className="btn-secondary"
            style={{ padding: '8px 16px', fontSize: 12, textDecoration: 'none' }}
          >
            <Download size={13} />
            Download SRT
          </a>

          {burnedUrl ? (
            <a
              href={burnedUrl}
              download={`burned-${jobId}.mp4`}
              className="btn-primary"
              style={{ padding: '8px 18px', fontSize: 12, textDecoration: 'none' }}
            >
              <Check size={13} />
              Download Burned Video
            </a>
          ) : (
            <button
              onClick={handleBurn}
              disabled={burning}
              className="btn-secondary"
              style={{ padding: '8px 16px', fontSize: 12 }}
            >
              {burning ? <Spinner size={13} /> : <Flame size={13} />}
              {burning ? 'Rendering…' : 'Burn Subtitles'}
            </button>
          )}
        </div>

        {burnError && (
          <p style={{ color: '#e11d48', fontSize: 12, marginTop: 10, fontWeight: 500 }}>
            ⚠ {burnError}
          </p>
        )}
      </div>
    </div>
  );
}
