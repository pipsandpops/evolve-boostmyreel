import { Layers, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';
import type { SlideAnalysis } from '../../types';

interface Props {
  slides: SlideAnalysis[];
  bestSlideIndex: number | null;
  flowSuggestions: string[];
  suggestedOrder: number[] | null;
  coverRecommendation: string | null;
  isPaidUser: boolean;
  onUpgrade?: () => void;
}

function scoreColor(s: number) {
  if (s >= 65) return '#10b981';
  if (s >= 45) return '#f59e0b';
  return '#ef4444';
}

export function CarouselBreakdown({
  slides, bestSlideIndex, flowSuggestions, suggestedOrder,
  coverRecommendation, isPaidUser, onUpgrade,
}: Props) {
  return (
    <div className="card" style={{ borderRadius: 20, padding: 22 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Layers size={16} color="#7c3aed" /> Carousel Breakdown
        <span style={{ fontSize: 12, fontWeight: 500, color: '#94a3b8', marginLeft: 4 }}>
          {slides.length} slides
        </span>
      </h3>

      {/* Slide cards — horizontally scrollable */}
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8, marginBottom: 16, scrollbarWidth: 'thin' }}>
        {slides.map((slide, i) => {
          const isBest = bestSlideIndex === i;
          const color = scoreColor(slide.postScore);
          return (
            <div key={i} style={{
              minWidth: 130, borderRadius: 14, padding: '14px 12px',
              border: `1.5px solid ${slide.isWeakSlide ? '#fecdd3' : isBest ? '#c4b5fd' : '#e2e8f0'}`,
              background: slide.isWeakSlide ? '#fff1f2' : isBest ? '#f5f3ff' : '#f8fafc',
              flexShrink: 0, position: 'relative',
            }}>
              {/* Slide number */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8' }}>Slide {i + 1}</span>
                {isBest && <span style={{ fontSize: 9, fontWeight: 700, background: '#7c3aed', color: 'white', padding: '2px 6px', borderRadius: 20 }}>BEST</span>}
                {slide.isWeakSlide && <AlertTriangle size={12} color="#ef4444" />}
              </div>

              {/* Score ring */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                <svg width="64" height="64" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="26" fill="none" stroke="#f1f5f9" strokeWidth="6" />
                  <circle cx="32" cy="32" r="26" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 26}
                    strokeDashoffset={2 * Math.PI * 26 * (1 - slide.postScore / 100)}
                    transform="rotate(-90 32 32)"
                    style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
                </svg>
                <div style={{ position: 'absolute', textAlign: 'center' }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color, display: 'block', lineHeight: 1 }}>{slide.postScore}</span>
                  <span style={{ fontSize: 9, color: '#94a3b8' }}>/100</span>
                </div>
              </div>

              {/* Signals */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: slide.semantic.hasFace ? '#10b981' : '#e2e8f0', flexShrink: 0 }} />
                  <span style={{ fontSize: 10, color: slide.semantic.hasFace ? '#059669' : '#94a3b8' }}>
                    {slide.semantic.hasFace ? 'Face present' : 'No face'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: slide.semantic.hasTextOverlay ? '#10b981' : '#e2e8f0', flexShrink: 0 }} />
                  <span style={{ fontSize: 10, color: slide.semantic.hasTextOverlay ? '#059669' : '#94a3b8' }}>
                    {slide.semantic.hasTextOverlay ? 'Has text' : 'No text'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: slide.visual.isHighContrast ? '#10b981' : '#fbbf24', flexShrink: 0 }} />
                  <span style={{ fontSize: 10, color: slide.visual.isHighContrast ? '#059669' : '#92400e' }}>
                    {slide.visual.isHighContrast ? 'Hi contrast' : 'Low contrast'}
                  </span>
                </div>
              </div>

              {slide.isWeakSlide && slide.improvementSuggestion && (
                <p style={{ fontSize: 10, color: '#be123c', margin: '8px 0 0', lineHeight: 1.4 }}>
                  💡 {slide.improvementSuggestion}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Cover recommendation */}
      {coverRecommendation && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px',
          background: '#f5f3ff', border: '1px solid #c4b5fd', borderRadius: 12, marginBottom: 14,
        }}>
          <CheckCircle size={14} color="#7c3aed" style={{ flexShrink: 0, marginTop: 2 }} />
          <p style={{ fontSize: 13, color: '#4c1d95', margin: 0, lineHeight: 1.5 }}>{coverRecommendation}</p>
        </div>
      )}

      {/* Flow suggestions — premium */}
      {flowSuggestions.length > 0 && (
        <>
          <h4 style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <ArrowRight size={13} color="#7c3aed" /> Storytelling Flow
          </h4>
          {isPaidUser ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {flowSuggestions.map((tip, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', background: '#ede9fe', padding: '1px 7px', borderRadius: 20, flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                  <p style={{ fontSize: 13, color: '#475569', margin: 0, lineHeight: 1.5 }}>{tip}</p>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ filter: 'blur(4px)', userSelect: 'none', pointerEvents: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {flowSuggestions.slice(0, 3).map((tip, i) => (
                  <div key={i} style={{ padding: '9px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10 }}>
                    <p style={{ fontSize: 13, color: '#475569', margin: 0 }}>{tip}</p>
                  </div>
                ))}
              </div>
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(2px)', cursor: 'pointer', borderRadius: 12,
              }} onClick={onUpgrade}>
                <span style={{
                  fontSize: 12, fontWeight: 700, color: '#0f172a',
                  background: 'white', border: '1px solid #e2e8f0', padding: '6px 14px',
                  borderRadius: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}>
                  🔒 Unlock flow suggestions
                </span>
              </div>
            </div>
          )}
        </>
      )}

      {/* Suggested order */}
      {isPaidUser && suggestedOrder && suggestedOrder.length > 0 && (
        <div style={{ marginTop: 14, padding: '10px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#475569', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: 0.3 }}>
            Suggested Slide Order
          </p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {suggestedOrder.map((idx, pos) => (
              <span key={pos} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{
                  width: 28, height: 28, borderRadius: '50%', background: '#ede9fe', color: '#5b21b6',
                  fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {idx + 1}
                </span>
                {pos < suggestedOrder.length - 1 && <ArrowRight size={10} color="#c4b5fd" />}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
