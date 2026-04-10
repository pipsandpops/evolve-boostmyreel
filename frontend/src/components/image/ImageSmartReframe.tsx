import { useState } from 'react';
import { Crop, Download, Loader } from 'lucide-react';
import { api } from '../../services/api';

const RATIOS = [
  { value: '4:5',  label: '4:5',  desc: 'Feed Portrait' },
  { value: '9:16', label: '9:16', desc: 'Stories / Reels' },
  { value: '1:1',  label: '1:1',  desc: 'Square' },
];

interface Props {
  jobId: string;
}

export function ImageSmartReframe({ jobId }: Props) {
  const [ratio, setRatio]           = useState('4:5');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [downloadUrls, setDownloadUrls] = useState<string[] | null>(null);

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
            onClick={() => { setRatio(r.value); setDownloadUrls(null); setError(null); }}
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

      {/* Action button */}
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
            ? <><Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> Detecting faces & cropping…</>
            : <><Crop size={15} /> Reframe to {ratio}</>}
        </button>
      )}

      {/* Error */}
      {error && (
        <p style={{ color: '#be123c', fontSize: 13, marginTop: 10, textAlign: 'center' }}>{error}</p>
      )}

      {/* Download links */}
      {downloadUrls && downloadUrls.length > 0 && (
        <div style={{ marginTop: 4 }}>
          <p style={{ fontSize: 13, color: '#16a34a', fontWeight: 600, marginBottom: 10 }}>
            ✓ {downloadUrls.length} image{downloadUrls.length > 1 ? 's' : ''} reframed to {ratio}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {downloadUrls.map((url, i) => (
              <a
                key={i}
                href={url}
                download={`reframed_${i + 1}_${ratio.replace(':', 'x')}.jpg`}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', borderRadius: 10,
                  background: '#f0fdf4', border: '1px solid #bbf7d0',
                  textDecoration: 'none', color: '#166534', fontSize: 13, fontWeight: 600,
                }}
              >
                <span>Image {i + 1} — {ratio} reframed</span>
                <Download size={14} />
              </a>
            ))}
          </div>
          <button
            onClick={() => { setDownloadUrls(null); setError(null); }}
            style={{
              marginTop: 12, width: '100%', padding: '9px 0', borderRadius: 10,
              border: '1px solid #e2e8f0', background: 'white',
              color: '#64748b', fontSize: 13, cursor: 'pointer',
            }}
          >
            Try another ratio
          </button>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
