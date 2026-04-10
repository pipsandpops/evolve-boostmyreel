import type { JobStatus } from '../types';
import { Check, Loader2 } from 'lucide-react';

interface ProcessingStatusProps {
  jobStatus: JobStatus | null;
  progressPercent: number;
}

const STEPS = [
  { key: 'Uploading',     label: 'Uploading',    desc: 'Sending video to server' },
  { key: 'Transcribing',  label: 'Transcribing', desc: 'Converting speech to text' },
  { key: 'GeneratingAI',  label: 'Generating',   desc: 'Creating viral content' },
  { key: 'Complete',      label: 'Done',         desc: 'Your content is ready!' },
];

const STATUS_ORDER = ['Pending', 'Uploading', 'Transcribing', 'GeneratingAI', 'RenderingSubtitles', 'Complete'];

const STATUS_MSG: Record<string, string> = {
  Pending:            'Preparing…',
  Uploading:          'Uploading your video…',
  Transcribing:       'Transcribing with Whisper AI…',
  GeneratingAI:       'Generating viral content with Claude…',
  RenderingSubtitles: 'Rendering subtitles…',
  Complete:           'All done!',
};

export function ProcessingStatus({ jobStatus, progressPercent }: ProcessingStatusProps) {
  const msg = jobStatus ? (STATUS_MSG[jobStatus] ?? jobStatus) : 'Processing…';
  const currentIdx = STATUS_ORDER.indexOf(jobStatus ?? '');
  return (
    <div className="card" style={{ padding: '28px 28px 24px', borderRadius: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
          background: 'linear-gradient(135deg, #4f46e5, #7c3aed, #db2777)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Loader2 size={18} color="white" style={{ animation: 'spin 1s linear infinite' }} />
        </div>
        <div>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 2px' }}>
            Processing your video
          </p>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>{msg}</p>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 22, fontWeight: 700, color: '#0f172a' }}>
          {progressPercent}%
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 6, borderRadius: 99, background: '#f1f5f9', marginBottom: 28, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 99, width: `${progressPercent}%`,
          background: 'linear-gradient(135deg, #4f46e5, #7c3aed, #db2777)',
          transition: 'width 0.5s ease',
        }} />
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        {STEPS.map((step, i) => {
          const stepOrderIdx = STATUS_ORDER.indexOf(step.key);
          const done = currentIdx > stepOrderIdx || jobStatus === 'Complete';
          const active = step.key === jobStatus ||
            (step.key === 'Uploading' && jobStatus === 'Pending');

          return (
            <div key={step.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <div style={{
                  position: 'absolute', top: 18, left: '50%', right: '-50%',
                  height: 2, background: '#f1f5f9', zIndex: 0,
                }}>
                  <div style={{
                    height: '100%',
                    background: done ? 'linear-gradient(135deg, #4f46e5, #db2777)' : 'transparent',
                    transition: 'all 0.4s ease',
                  }} />
                </div>
              )}

              {/* Circle */}
              <div className={active ? 'pulse' : ''} style={{
                width: 36, height: 36, borderRadius: '50%', zIndex: 1,
                background: done
                  ? 'linear-gradient(135deg, #4f46e5, #7c3aed, #db2777)'
                  : active
                  ? 'linear-gradient(135deg, #4f46e5, #7c3aed, #db2777)'
                  : '#f1f5f9',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.3s',
                boxShadow: active ? '0 4px 12px rgba(79,70,229,0.35)' : 'none',
              }}>
                {done && !active ? (
                  <Check size={15} color="white" strokeWidth={2.5} />
                ) : active ? (
                  <Loader2 size={15} color="white" style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8' }}>{i + 1}</span>
                )}
              </div>

              {/* Label */}
              <p style={{
                fontSize: 11, fontWeight: 600, marginTop: 8, textAlign: 'center',
                color: done || active ? '#0f172a' : '#94a3b8',
                lineHeight: 1.3,
              }}>
                {step.label}
              </p>
              <p style={{
                fontSize: 10, color: '#94a3b8', margin: '2px 0 0',
                textAlign: 'center', display: active ? 'block' : 'none',
              }}>
                {step.desc}
              </p>
            </div>
          );
        })}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
