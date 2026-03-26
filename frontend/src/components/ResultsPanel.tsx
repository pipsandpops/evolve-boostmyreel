import type { AnalysisResult } from '../types';
import { HookCard } from './HookCard';
import { CaptionCard } from './CaptionCard';
import { HashtagCard } from './HashtagCard';
import { SubtitlePanel } from './SubtitlePanel';
import { VideoPreview } from './VideoPreview';
import { ViralScoreCard } from './ViralScoreCard';
import { Sparkles, VolumeX, Gift } from 'lucide-react';

interface ResultsPanelProps {
  result: AnalysisResult;
  jobId: string;
  userId: string;
  isPaidUser?: boolean;
  onUpgrade?: () => void;
  onOpenReferral?: () => void;
}

export function ResultsPanel({ result, jobId, userId, isPaidUser = false, onUpgrade, onOpenReferral }: ResultsPanelProps) {
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

      {/* Referral CTA */}
      {onOpenReferral && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'linear-gradient(135deg, #eef2ff, #fdf4ff)',
          border: '1px solid #c7d2fe', borderRadius: 16,
          padding: '12px 18px', marginBottom: 16,
          flexWrap: 'wrap',
        }}>
          <Gift size={18} color="#7c3aed" />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#4f46e5', flex: 1 }}>
            Loving it? Share BoostMyReel and earn free credits!
          </span>
          <button
            onClick={onOpenReferral}
            style={{
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              color: 'white', border: 'none', borderRadius: 8,
              padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}
          >
            View Rewards
          </button>
        </div>
      )}

      {/* No-audio insight banner */}
      {!result.hasAudio && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 16,
          padding: '14px 20px', marginBottom: 24,
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, flexShrink: 0,
            background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <VolumeX size={18} color="#d97706" />
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#92400e', margin: '0 0 2px' }}>
              No audio detected
            </p>
            <p style={{ fontSize: 13, color: '#b45309', margin: 0 }}>
              Adding voiceover or background music can significantly boost engagement.
            </p>
          </div>
        </div>
      )}

      {/* Two-column layout */}
      <div className="r-results-grid">

        {/* Left: Video */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <VideoPreview jobId={jobId} metadata={result.metadata} />
          <SubtitlePanel jobId={jobId} subtitles={result.subtitles} />
        </div>

        {/* Right: AI results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {result.viralScore && (
            <ViralScoreCard
              viralScore={result.viralScore}
              jobId={jobId}
              userId={userId}
              isPaidUser={isPaidUser}
              onUpgrade={onUpgrade}
              viewPrediction={result.viewPrediction}
            />
          )}
          <HookCard hook={result.hook} />
          <CaptionCard caption={result.caption} />
          <HashtagCard hashtags={result.hashtags} />
        </div>

      </div>
    </div>
  );
}
