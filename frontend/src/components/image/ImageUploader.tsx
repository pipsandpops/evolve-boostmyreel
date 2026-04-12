import { useRef, useState, useCallback } from 'react';
import { ImagePlus, X, Upload, Layers } from 'lucide-react';

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILES = 20;
const MAX_MB    = 20;

const TONES = [
  { value: 'Viral',        label: '🔥 Viral',        desc: 'Pattern-interrupt, max curiosity' },
  { value: 'Educational',  label: '📚 Educational',  desc: 'Teach one thing, clear takeaway' },
  { value: 'Storytelling', label: '📖 Storytelling', desc: 'Narrative arc, emotional hook' },
  { value: 'Sales',        label: '💰 Sales',         desc: 'Benefit-first, clear CTA' },
];

interface ImageUploaderProps {
  onAnalyze: (files: File[], tone: string, caption?: string) => void;
  isUploading: boolean;
}

export function ImageUploader({ onAnalyze, isUploading }: ImageUploaderProps) {
  const [files, setFiles]       = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [tone, setTone]         = useState('Viral');
  const [caption, setCaption]   = useState('');
  const [dragging, setDragging] = useState(false);
  const [err, setErr]           = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((incoming: FileList | File[]) => {
    setErr('');
    const arr = Array.from(incoming);
    const valid = arr.filter(f => {
      if (!ACCEPTED.includes(f.type)) { setErr(`"${f.name}" is not a supported format (jpg, png, webp).`); return false; }
      if (f.size > MAX_MB * 1024 * 1024) { setErr(`"${f.name}" exceeds ${MAX_MB} MB.`); return false; }
      return true;
    });

    setFiles(prev => {
      const next = [...prev, ...valid].slice(0, MAX_FILES);
      // Generate object-URL previews for new files
      const newPreviews = valid.slice(0, MAX_FILES - prev.length).map(f => URL.createObjectURL(f));
      setPreviews(p => [...p, ...newPreviews].slice(0, MAX_FILES));
      return next;
    });
  }, []);

  const removeFile = (i: number) => {
    URL.revokeObjectURL(previews[i]);
    setFiles(f => f.filter((_, idx) => idx !== i));
    setPreviews(p => p.filter((_, idx) => idx !== i));
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const isCarousel = files.length > 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => files.length === 0 && inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? '#7c3aed' : files.length ? '#c4b5fd' : '#e2e8f0'}`,
          borderRadius: 20,
          padding: files.length ? '16px' : '48px 24px',
          background: dragging ? '#f5f3ff' : files.length ? '#fafaf9' : '#f8fafc',
          cursor: files.length ? 'default' : 'pointer',
          transition: 'all 0.2s ease',
          textAlign: 'center',
        }}
      >
        {files.length === 0 ? (
          <>
            <div style={{
              width: 56, height: 56, borderRadius: 16, margin: '0 auto 16px',
              background: 'linear-gradient(135deg, #7c3aed18, #4f46e518)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <ImagePlus size={26} color="#7c3aed" />
            </div>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>
              Drop images here or click to browse
            </p>
            <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 16px' }}>
              Single image or up to {MAX_FILES} images for carousel · JPG, PNG, WebP · Max {MAX_MB} MB each
            </p>
            <button className="btn-secondary" style={{ fontSize: 13, padding: '8px 20px' }}
              onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}>
              <Upload size={14} /> Choose Files
            </button>
          </>
        ) : (
          <>
            {/* Image grid */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
              {previews.map((src, i) => (
                <div key={i} style={{ position: 'relative', width: 80, height: 80, borderRadius: 10, overflow: 'hidden',
                  border: '2px solid #e2e8f0', flexShrink: 0 }}>
                  <img src={src} alt={`slide ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    onClick={() => removeFile(i)}
                    style={{
                      position: 'absolute', top: 3, right: 3,
                      width: 20, height: 20, borderRadius: '50%',
                      background: 'rgba(0,0,0,0.6)', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', padding: 0,
                    }}
                  >
                    <X size={11} />
                  </button>
                  {i === 0 && isCarousel && (
                    <div style={{
                      position: 'absolute', bottom: 2, left: 2,
                      background: '#7c3aed', borderRadius: 4,
                      fontSize: 9, fontWeight: 700, color: 'white', padding: '1px 5px',
                    }}>COVER</div>
                  )}
                </div>
              ))}

              {/* Add more */}
              {files.length < MAX_FILES && (
                <button
                  onClick={() => inputRef.current?.click()}
                  style={{
                    width: 80, height: 80, borderRadius: 10, border: '2px dashed #c4b5fd',
                    background: '#f5f3ff', cursor: 'pointer', flexShrink: 0,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
                    color: '#7c3aed', fontSize: 11, fontWeight: 600,
                  }}>
                  <ImagePlus size={18} />
                  Add
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {isCarousel
                ? <span className="badge" style={{ background: '#f5f3ff', color: '#7c3aed', border: '1px solid #c4b5fd', gap: 5 }}>
                    <Layers size={12} /> {files.length} slides · Carousel
                  </span>
                : <span className="badge" style={{ background: '#f0fdf4', color: '#059669', border: '1px solid #bbf7d0', gap: 5 }}>
                    <ImagePlus size={12} /> Single Image
                  </span>
              }
              <button onClick={() => { files.forEach((_, i) => URL.revokeObjectURL(previews[i])); setFiles([]); setPreviews([]); }}
                style={{ fontSize: 12, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}>
                Clear all
              </button>
            </div>
          </>
        )}
      </div>

      <input ref={inputRef} type="file" accept=".jpg,.jpeg,.png,.webp" multiple hidden
        onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }} />

      {err && <p style={{ fontSize: 12, color: '#e11d48', margin: '-8px 0 0', fontWeight: 500 }}>⚠ {err}</p>}

      {/* Tone selector */}
      <div>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#475569', margin: '0 0 10px', letterSpacing: 0.3, textTransform: 'uppercase' }}>
          Caption Tone
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {TONES.map(t => (
            <button key={t.value} onClick={() => setTone(t.value)} style={{
              border: `1.5px solid ${tone === t.value ? '#7c3aed' : '#e2e8f0'}`,
              borderRadius: 12, padding: '10px 12px', textAlign: 'left', cursor: 'pointer',
              background: tone === t.value ? '#f5f3ff' : 'white',
              transition: 'all 0.15s',
            }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: tone === t.value ? '#7c3aed' : '#0f172a', margin: '0 0 2px' }}>
                {t.label}
              </p>
              <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{t.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Optional caption */}
      <div>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#475569', margin: '0 0 8px', letterSpacing: 0.3, textTransform: 'uppercase' }}>
          Your Draft Caption <span style={{ fontWeight: 400, color: '#94a3b8', textTransform: 'none' }}>(optional — AI will improve it)</span>
        </p>
        <textarea
          value={caption}
          onChange={e => setCaption(e.target.value)}
          placeholder="Paste your existing caption or leave blank for AI to create one..."
          rows={3}
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 12, fontSize: 13,
            border: '1.5px solid #e2e8f0', background: 'white', color: '#0f172a',
            outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Analyze button */}
      <button
        onClick={() => files.length > 0 && onAnalyze(files, tone, caption || undefined)}
        disabled={files.length === 0 || isUploading}
        className="btn-primary"
        style={{ padding: '14px', fontSize: 16, borderRadius: 14, width: '100%' }}
      >
        {isUploading
          ? 'Uploading…'
          : files.length === 0
          ? 'Select images to continue'
          : isCarousel
          ? `🎠 Analyse ${files.length}-Slide Carousel`
          : '🖼️ Analyse Image'}
      </button>
    </div>
  );
}
