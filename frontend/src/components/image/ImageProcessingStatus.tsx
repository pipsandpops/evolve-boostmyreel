import type { ImageJobStatus } from '../../types';

interface Props { jobStatus: ImageJobStatus | null }

const STEPS: Record<string, { label: string; icon: string }> = {
  Pending:            { label: 'Queued…',                         icon: '⏳' },
  Analyzing:          { label: 'Extracting visual features…',     icon: '🔍' },
  GeneratingCaptions: { label: 'Generating AI captions…',         icon: '✍️'  },
  Complete:           { label: 'Done!',                           icon: '✅' },
};

export function ImageProcessingStatus({ jobStatus }: Props) {
  const progress = jobStatus?.progressPercent ?? 5;
  const step     = STEPS[jobStatus?.status ?? 'Pending'];
  const message  = jobStatus?.message ?? step.label;

  return (
    <div style={{
      background: 'white', borderRadius: 20, padding: '28px 24px',
      border: '1px solid #e2e8f0', boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: 'linear-gradient(135deg, #7c3aed18, #4f46e518)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
        }}>
          {step.icon}
        </div>
        <div>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>Analysing your content</p>
          <p style={{ fontSize: 13, color: '#7c3aed', margin: 0, fontWeight: 500 }}>{message}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 8, borderRadius: 4, background: '#f1f5f9', overflow: 'hidden', marginBottom: 14 }}>
        <div style={{
          height: '100%', borderRadius: 4,
          width: `${progress}%`,
          background: 'linear-gradient(90deg, #7c3aed, #a855f7, #c084fc)',
          transition: 'width 0.4s ease',
          boxShadow: '0 0 8px rgba(124,58,237,0.4)',
        }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 16 }}>
          {['Analyzing', 'GeneratingCaptions', 'Complete'].map((s, i) => {
            const statuses = ['Analyzing', 'GeneratingCaptions', 'Complete'];
            const currentIdx = statuses.indexOf(jobStatus?.status ?? 'Analyzing');
            const done = i <= currentIdx;
            return (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: done ? '#7c3aed' : '#e2e8f0',
                  transition: 'background 0.3s',
                }} />
                <span style={{ fontSize: 11, color: done ? '#7c3aed' : '#94a3b8', fontWeight: done ? 600 : 400 }}>
                  {['Visual', 'AI Caption', 'Done'][i]}
                </span>
              </div>
            );
          })}
        </div>
        <span style={{ fontSize: 12, color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>{progress}%</span>
      </div>
    </div>
  );
}
