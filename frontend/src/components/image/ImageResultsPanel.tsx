import { RotateCcw, Sparkles } from 'lucide-react';
import type { ImageAnalysisResult } from '../../types';
import { PostScoreCard } from './PostScoreCard';
import { ImageInsightsPanel } from './ImageInsightsPanel';
import { ImageCaptionCard } from './ImageCaptionCard';
import { CarouselBreakdown } from './CarouselBreakdown';
import { ImageSmartReframe } from './ImageSmartReframe';

interface Props {
  result: ImageAnalysisResult;
  jobId: string;
  isPaidUser: boolean;
  onReset: () => void;
  onUpgrade?: () => void;
}

export function ImageResultsPanel({ result, jobId, isPaidUser, onReset, onUpgrade }: Props) {
  return (
    <div>
      {/* Success banner */}
      <div style={{
        display: 'flex', alignItems: 'center',
        background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)',
        border: '1px solid #c4b5fd', borderRadius: 16,
        padding: '14px 20px', marginBottom: 24,
        justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12, flexShrink: 0,
            background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Sparkles size={20} color="white" />
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#4c1d95', margin: 0 }}>
              {result.type === 'carousel' ? `${result.slideBreakdown.length}-slide carousel analysed!` : 'Image analysed!'}
            </p>
            <p style={{ fontSize: 13, color: '#7c3aed', margin: 0 }}>
              Post score: <strong>{result.postScore}/100</strong> · Estimated reach: <strong>{result.engagement.estimatedReach}</strong>
            </p>
          </div>
        </div>
        <button onClick={onReset} className="btn-secondary" style={{ fontSize: 13, padding: '8px 16px', flexShrink: 0 }}>
          <RotateCcw size={13} /> New Analysis
        </button>
      </div>

      {/* Main grid */}
      <div className="r-results-grid">

        {/* Left: Score card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <PostScoreCard
            postScore={result.postScore}
            engagement={result.engagement}
            visual={result.primaryVisualFeatures}
            isPaidUser={isPaidUser}
            onUpgrade={onUpgrade}
          />
        </div>

        {/* Right: Insights + Caption */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <ImageInsightsPanel
            insights={result.insights}
            missingElements={result.missingElements}
            isPaidUser={isPaidUser}
            onUpgrade={onUpgrade}
          />
          <ImageCaptionCard
            caption={result.caption}
            isPaidUser={isPaidUser}
            onUpgrade={onUpgrade}
          />
        </div>
      </div>

      {/* Carousel breakdown (full width below) */}
      {result.type === 'carousel' && result.slideBreakdown.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <CarouselBreakdown
            slides={result.slideBreakdown}
            bestSlideIndex={result.bestSlideIndex}
            flowSuggestions={result.carouselFlowSuggestions}
            suggestedOrder={result.suggestedSlideOrder}
            coverRecommendation={result.coverRecommendation}
            isPaidUser={isPaidUser}
            onUpgrade={onUpgrade}
          />
        </div>
      )}

      {/* Smart Reframe — always shown after analysis */}
      <ImageSmartReframe jobId={jobId} />
    </div>
  );
}
