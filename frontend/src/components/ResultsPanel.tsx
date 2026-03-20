import type { AnalysisResult } from '../types';
import { HookCard } from './HookCard';
import { CaptionCard } from './CaptionCard';
import { HashtagCard } from './HashtagCard';
import { SubtitlePanel } from './SubtitlePanel';
import { VideoPreview } from './VideoPreview';
import { Sparkles } from 'lucide-react';

interface ResultsPanelProps {
  result: AnalysisResult;
  jobId: string;
}

export function ResultsPanel({ result, jobId }: ResultsPanelProps) {
  return (
    <div>
      {/* Success banner */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)',
        border: '1px solid #bbf7d0', borderRadius: 16,
        padding: '14px 20px', marginBottom: 24,
      }}>
        <div style={{
          width: 42, height: 42, borderRadius: 12, flexShrink: 0,
          background: 'linear-gradient(135deg, #10b981, #059669)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Sparkles size={20} color="white" />
        </div>
        <div>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#064e3b', margin: 0 }}>
            Your content is ready to go viral!
          </p>
          <p style={{ fontSize: 13, color: '#059669', margin: 0 }}>
            Copy any section below and paste it directly to Instagram, TikTok, or Reels
          </p>
        </div>
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 400px) 1fr', gap: 20, alignItems: 'start' }}>

        {/* Left: Video */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <VideoPreview jobId={jobId} metadata={result.metadata} />
          <SubtitlePanel jobId={jobId} subtitles={result.subtitles} />
        </div>

        {/* Right: AI results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <HookCard hook={result.hook} />
          <CaptionCard caption={result.caption} />
          <HashtagCard hashtags={result.hashtags} />
        </div>

      </div>
    </div>
  );
}
