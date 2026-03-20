import { useCallback, useState } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { Upload, Film, X, ArrowRight } from 'lucide-react';

const ACCEPTED_TYPES = {
  'video/mp4': ['.mp4'],
  'video/quicktime': ['.mov'],
  'video/webm': ['.webm'],
  'video/x-msvideo': ['.avi'],
  'video/x-matroska': ['.mkv'],
};
const MAX_SIZE = 500 * 1024 * 1024;

interface VideoUploaderProps {
  onUpload: (file: File) => void;
  isUploading: boolean;
}

export function VideoUploader({ onUpload, isUploading }: VideoUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dropError, setDropError] = useState<string | null>(null);

  const onDrop = useCallback((accepted: File[], rejected: FileRejection[]) => {
    setDropError(null);
    if (rejected.length > 0) {
      const msg = rejected[0]?.errors[0]?.message ?? 'Invalid file.';
      setDropError(msg.includes('too large') ? 'File is too large. Max 500 MB.' : msg);
      return;
    }
    if (accepted[0]) setSelectedFile(accepted[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_SIZE,
    multiple: false,
    disabled: isUploading,
  });

  const formatSize = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

  if (isUploading) {
    return (
      <div style={{
        border: '2px solid #e2e8f0', borderRadius: 20,
        padding: '40px 24px', textAlign: 'center',
        background: '#f8faff',
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%', margin: '0 auto 16px',
          background: 'linear-gradient(135deg, #4f46e5, #7c3aed, #db2777)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Film size={24} color="white" />
        </div>
        <p style={{ fontWeight: 600, color: '#0f172a', margin: '0 0 6px', fontSize: 15 }}>
          Uploading your video…
        </p>
        <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>
          {selectedFile?.name}
        </p>
        <div style={{ marginTop: 20, height: 4, borderRadius: 99, background: '#e2e8f0', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 99, width: '60%',
            background: 'linear-gradient(135deg, #4f46e5, #db2777)',
            animation: 'indeterminate 1.4s ease infinite',
          }} />
        </div>
        <style>{`
          @keyframes indeterminate {
            0% { transform: translateX(-100%); width: 60%; }
            50% { width: 80%; }
            100% { transform: translateX(200%); width: 60%; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div>
      {/* Drop Zone */}
      <div
        {...getRootProps()}
        style={{
          border: `2px dashed ${isDragActive ? '#7c3aed' : selectedFile ? '#a5b4fc' : '#cbd5e1'}`,
          borderRadius: 20,
          padding: selectedFile ? '20px 24px' : '48px 24px',
          textAlign: 'center',
          cursor: 'pointer',
          background: isDragActive ? '#f5f3ff' : selectedFile ? '#fafbff' : 'white',
          transition: 'all 0.2s',
          outline: 'none',
        }}
      >
        <input {...getInputProps()} />

        {!selectedFile ? (
          <>
            {/* Upload Icon */}
            <div style={{
              width: 72, height: 72, borderRadius: '50%', margin: '0 auto 20px',
              background: isDragActive
                ? 'linear-gradient(135deg, #4f46e5, #7c3aed, #db2777)'
                : 'linear-gradient(135deg, #eef2ff, #ede9fe)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
              boxShadow: isDragActive ? '0 8px 24px rgba(79,70,229,0.3)' : 'none',
            }}>
              <Upload size={28} color={isDragActive ? 'white' : '#6366f1'} strokeWidth={1.8} />
            </div>

            {isDragActive ? (
              <p style={{ fontWeight: 700, color: '#6366f1', fontSize: 17, margin: '0 0 6px' }}>
                Drop it here!
              </p>
            ) : (
              <>
                <p style={{ fontWeight: 700, color: '#0f172a', fontSize: 17, margin: '0 0 6px' }}>
                  Drop your video here
                </p>
                <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 20px' }}>
                  or{' '}
                  <span style={{
                    color: '#6366f1', fontWeight: 600,
                    textDecoration: 'underline', textDecorationStyle: 'dotted',
                  }}>
                    browse from your computer
                  </span>
                </p>
                <p style={{ color: '#94a3b8', fontSize: 12, margin: 0 }}>
                  MP4, MOV, WebM, AVI, MKV &nbsp;·&nbsp; Max 500 MB
                </p>
              </>
            )}
          </>
        ) : (
          /* File selected state — inline preview */
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }} onClick={e => e.stopPropagation()}>
            {/* Thumbnail icon */}
            <div style={{
              width: 52, height: 52, borderRadius: 12, flexShrink: 0,
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed, #db2777)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Film size={22} color="white" />
            </div>

            {/* File info */}
            <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <p style={{
                fontSize: 14, fontWeight: 600, color: '#0f172a', margin: '0 0 2px',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {selectedFile.name}
              </p>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
                {formatSize(selectedFile.size)} · Ready to upload
              </p>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button
                onClick={() => setSelectedFile(null)}
                className="btn-secondary"
                style={{ padding: '8px 10px', borderRadius: 10 }}
              >
                <X size={14} />
              </button>
              <button
                onClick={() => onUpload(selectedFile)}
                className="btn-primary"
                style={{ padding: '9px 22px', fontSize: 14 }}
              >
                Boost It
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {dropError && (
        <p style={{
          color: '#e11d48', fontSize: 13, textAlign: 'center',
          marginTop: 10, fontWeight: 500,
        }}>
          ⚠ {dropError}
        </p>
      )}
    </div>
  );
}
