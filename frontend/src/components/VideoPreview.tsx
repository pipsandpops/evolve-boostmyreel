import { api } from '../services/api';
import type { VideoMetadata } from '../types';
import { Monitor, Clock, Gauge } from 'lucide-react';

interface VideoPreviewProps {
  jobId: string;
  metadata: VideoMetadata | null;
}

export function VideoPreview({ jobId, metadata }: VideoPreviewProps) {
  const formatDuration = (secs: number | null) => {
    if (!secs) return '—';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="card" style={{ borderRadius: 16, overflow: 'hidden' }}>
      {/* Video */}
      <div style={{ background: '#0f172a', position: 'relative' }}>
        <video
          src={api.getVideoStreamUrl(jobId)}
          controls
          style={{ width: '100%', maxHeight: 360, display: 'block', objectFit: 'contain' }}
        />
      </div>

      {/* Metadata row */}
      {metadata && (
        <div style={{
          display: 'flex', gap: 0,
          borderTop: '1px solid #f1f5f9',
        }}>
          {[
            { icon: <Monitor size={13} />, label: 'Resolution', value: metadata.width && metadata.height ? `${metadata.width}×${metadata.height}` : '—' },
            { icon: <Clock size={13} />, label: 'Duration', value: formatDuration(metadata.durationSeconds) },
            { icon: <Gauge size={13} />, label: 'Frame Rate', value: metadata.frameRate ? `${metadata.frameRate.toFixed(0)} fps` : '—' },
          ].map((m, i) => (
            <div key={m.label} style={{
              flex: 1, padding: '12px 14px', textAlign: 'center',
              borderRight: i < 2 ? '1px solid #f1f5f9' : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, color: '#94a3b8', marginBottom: 3 }}>
                {m.icon}
                <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase' }}>{m.label}</span>
              </div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: 0 }}>{m.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
