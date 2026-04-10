import { useState } from 'react';
import { Crop, Download, Loader, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';

const RATIOS = [
  { value: '4:5',  label: '4:5',  desc: 'Feed Portrait', aspectW: 4, aspectH: 5 },
  { value: '9:16', label: '9:16', desc: 'Stories / Reels', aspectW: 9, aspectH: 16 },
  { value: '1:1',  label: '1:1',  desc: 'Square', aspectW: 1, aspectH: 1 },
];

// Preview container height in px — width is derived from aspect ratio
const PREVIEW_H = 220;

interface Props {
  jobId: string;
}

export function ImageSmartReframe({ jobId }: Props) {
  const [ratio, setRatio]           = useState('4:5');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [downloadUrls, setDownloadUrls] = useState<string[] | null>(null);

  const selectedRatio = RATIOS.find(r => r.value === ratio)!;
  const previewW = Math.round(PREVIEW_H * selectedRatio.aspectW / selectedRatio.aspectH);

  const handleReframe = async () => {
    setLoading(true);
    setError(null);
    setDownloadUrls(null);
    try {
      const res = await api.reframeImages(jobId, ratio);
      setDownloadUrls(res.downloadUrls);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reframe failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRatioChange = (v: string) => {
    setRatio(v);
    setDownloadUrls(null);
    setError(null);
  };

  return (
    <div style={{
      background: 'white', border: '1px solid #e2e8f0',
      borderRadius: 16, padding: 24, marginTop: 16,
    }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Crop size={17} color="white" />
        </div>
        <div>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>Smart Reframe</p>
          <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
            AI face detection · auto-crop to portrait
          </p>
        </div>
      </div>

      {/* Ratio picker */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
        {RATIOS.map(r => (
          <button
            key={r.value}
            onClick={() => handleRatioChange(r.value)}
            style={{
              flex: 1, padding: '10px 8px', borderRadius: 10, cursor: 'pointer',
              border: ratio === r.value ? '2px solid #7c3aed' : '2px solid #e2e8f0',
              background: ratio === r.value ? '#f5f3ff' : 'white',
              textAlign: 'center', transition: 'all 0.15s',
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 700, color: ratio === r.value ? '#7c3aed' : '#0f172a' }}>
              {r.label}
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{r.desc}</div>
          </button>
        ))}
      </div>

      {/* ── Reframe button (before results) ── */}
      {!downloadUrls && (
        <button
          onClick={handleReframe}
          disabled={loading}
          style={{
            width: '100%', padding: '11px 0', borderRadius: 10, border: 'none',
            background: loading ? '#e2e8f0' : 'linear-gradient(135deg, #7c3aed, #a855f7)',
            color: loading ? '#94a3b8' : 'white', fontWeight: 700, fontSize: 14,
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {loading
            ? <><Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> Detecting faces &amp; cropping…</>
            : <><Crop size={15} /> Reframe to {ratio}</>}
        </button>
      )}

      {/* Error */}
      {error && (
        <p style={{ color: '#be123c', fontSize: 13, marginTop: 10, textAlign: 'center' }}>{error}</p>
      )}

      {/* ── Preview + download (after results) ── */}
      {downloadUrls && downloadUrls.length > 0 && (
        <div>
          {/* Success label */}
          <p style={{ fontSize: 13, color: '#16a34a', fontWeight: 600, marginBottom: 14 }}>
            ✓ {downloadUrls.length} image{downloadUrls.length > 1 ? 's' : ''} reframed to {ratio}
          </p>

          {/* Preview grid */}
          <div style={{
            display: 'flex', gap: 14, flexWrap: 'wrap',
            justifyContent: downloadUrls.length === 1 ? 'center' : 'flex-start',
            marginBottom: 16,
          }}>
            {downloadUrls.map((url, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                {/* Image preview */}
                <div style={{
                  width: previewW, height: PREVIEW_H,
                  borderRadius: 10, overflow: 'hidden',
                  border: '2px solid #e2e8f0',
                  background: '#f8fafc',
                  position: 'relative',
                }}>
                  <img
                    src={url}
                    alt={`Reframed ${i + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                  {/* Ratio badge */}
                  <span style={{
                    position: 'absolute', top: 6, left: 6,
                    background: 'rgba(124,58,237,0.85)', color: 'white',
                    fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 5,
                  }}>
                    {ratio}
                  </span>
                </div>

                {/* Download button per image */}
                <a
                  href={url}
                  download={`reframed_${i + 1}_${ratio.replace(':', 'x')}.jpg`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '7px 14px', borderRadius: 8,
                    background: '#f0fdf4', border: '1px solid #bbf7d0',
                    textDecoration: 'none', color: '#166534',
                    fontSize: 12, fontWeight: 600,
                  }}
                >
                  <Download size={12} /> Download {downloadUrls.length > 1 ? `#${i + 1}` : ''}
                </a>
              </div>
            ))}
          </div>

          {/* Try another ratio */}
          <button
            onClick={() => { setDownloadUrls(null); setError(null); }}
            style={{
              width: '100%', padding: '9px 0', borderRadius: 10,
              border: '1px solid #e2e8f0', background: 'white',
              color: '#64748b', fontSize: 13, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <RefreshCw size={13} /> Try another ratio
          </button>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
