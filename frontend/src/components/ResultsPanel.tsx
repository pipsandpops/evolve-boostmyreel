import { useState, useCallback } from 'react';
import type { AnalysisResult } from '../types';
import { HookCard } from './HookCard';
import { CaptionCard } from './CaptionCard';
import { HashtagCard } from './HashtagCard';
import { SubtitlePanel } from './SubtitlePanel';
import { VideoPreview } from './VideoPreview';
import { ViralScoreCard } from './ViralScoreCard';
import { CinematicCard } from './CinematicCard';
import { RoastCard } from './RoastCard';
import { Sparkles, VolumeX, Gift, Copy, Check } from 'lucide-react';

interface ResultsPanelProps {
  result: AnalysisResult;
  jobId: string;
  userId: string;
  isPaidUser?: boolean;
  onUpgrade?: () => void;
  onOpenReferral?: () => void;
  isUrlAnalysis?: boolean;
  sourceUrl?: string;
  sourcePlatform?: string;
}

function getEmbedUrl(url: string, platform: string): string | null {
  if (platform === 'YouTube') {
    const shortMatch = url.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]+)/i);
    const watchMatch = url.match(/[?&]v=([A-Za-z0-9_-]+)/i);
    const shortUrl   = url.match(/youtu\.be\/([A-Za-z0-9_-]+)/i);
    const id = shortMatch?.[1] ?? watchMatch?.[1] ?? shortUrl?.[1];
    return id ? `https://www.youtube.com/embed/${id}` : null;
  }
  if (platform === 'Instagram') {
    const m = url.match(/instagram\.com\/(?:reel|p)\/([A-Za-z0-9_-]+)/i);
    return m ? `https://www.instagram.com/p/${m[1]}/embed/` : null;
  }
  return null;
}

export function ResultsPanel({ result, jobId, userId, isPaidUser = false, onUpgrade, onOpenReferral, isUrlAnalysis = false, sourceUrl = '', sourcePlatform = '' }: ResultsPanelProps) {
  const [linkCopied, setLinkCopied] = useState(false);

  const referralUrl = `https://boostmyreel.com/?ref=${userId}`;

  const copyReferralLink = useCallback(() => {
    const shareText = `I just tested my reel using AI and got insane insights 🔥 Try it free: ${referralUrl}`;
    navigator.clipboard.writeText(shareText).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    });
  }, [referralUrl]);

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

      {/* Referral CTA — shown after results to strike while motivation is high */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
        background: 'linear-gradient(135deg, #eef2ff, #fdf2f8)',
        border: '1px solid #c7d2fe', borderRadius: 16,
        padding: '14px 20px', marginBottom: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Gift size={20} color="#4f46e5" />
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#3730a3', margin: 0 }}>
              🔥 Loved your results? Invite friends — earn 5 free videos
            </p>
            <p style={{ fontSize: 12, color: '#6366f1', margin: 0 }}>
              Every friend who uploads earns you 1 Boost Credit
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button onClick={copyReferralLink} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: linkCopied ? '#10b981' : '#4f46e5', color: 'white',
            fontSize: 13, fontWeight: 600, transition: 'background 0.2s',
          }}>
            {linkCopied ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy Link</>}
          </button>
          {onOpenReferral && (
            <button onClick={onOpenReferral} style={{
              padding: '8px 14px', borderRadius: 10, cursor: 'pointer',
              background: 'white', border: '1px solid #c7d2fe',
              fontSize: 13, fontWeight: 600, color: '#4f46e5',
            }}>
              View Rewards
            </button>
          )}
        </div>
      </div>

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

        {/* Left: Video or embedded player */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {isUrlAnalysis ? (
            <>
              {/* Embedded platform video */}
              {(() => {
                const embedUrl = getEmbedUrl(sourceUrl, sourcePlatform);
                return embedUrl ? (
                  <div style={{ borderRadius: 16, overflow: 'hidden', background: '#000', boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }}>
                    <div style={{ position: 'relative', paddingBottom: '177.78%', height: 0 }}>
                      <iframe
                        src={embedUrl}
                        title={`${sourcePlatform} video`}
                        allowFullScreen
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                      />
                    </div>
                    <div style={{ padding: '10px 14px', background: '#0f172a' }}>
                      <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>
                        Original {sourcePlatform} video
                      </p>
                    </div>
                  </div>
                ) : (
                  <div style={{
                    borderRadius: 16, background: '#f1f5f9', border: '1px solid #e2e8f0',
                    padding: 32, textAlign: 'center', color: '#64748b', fontSize: 13,
                  }}>
                    Video embed not available for this URL
                  </div>
                );
              })()}
              <SubtitlePanel jobId={jobId} subtitles={result.subtitles} />
            </>
          ) : (
            <>
              <VideoPreview jobId={jobId} metadata={result.metadata} isPaidUser={isPaidUser} />
              <CinematicCard jobId={jobId} />
              <SubtitlePanel jobId={jobId} subtitles={result.subtitles} />
            </>
          )}
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
          <RoastCard jobId={jobId} />
          <HookCard hook={result.hook} isPaidUser={isPaidUser} />
          <CaptionCard caption={result.caption} isPaidUser={isPaidUser} />
          <HashtagCard hashtags={result.hashtags} />
        </div>

      </div>
    </div>
  );
}
