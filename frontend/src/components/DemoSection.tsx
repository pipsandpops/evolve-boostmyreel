import { useState, useEffect } from 'react';
import { Zap, FileText, Hash, Captions, Play, CheckCircle2 } from 'lucide-react';

const DEMO_HOOK = "This 60-second hack will 10x your content reach 🚀";
const DEMO_CAPTION = "Most creators miss this simple trick that doubles engagement overnight. Save this for later and drop a 💬 if you want the full breakdown!";
const DEMO_HASHTAGS = ['contentcreator', 'reels', 'viral', 'socialmediatips', 'growyourbusiness', 'instagramreels', 'tiktoktips', 'digitalmarketing', 'creatorsoftiktok', 'reelsviral'];
const DEMO_SUBTITLES = [
  { time: '0:00', text: 'Most creators overlook this one thing...' },
  { time: '0:04', text: 'And it costs them thousands of followers.' },
  { time: '0:09', text: 'Here\'s the secret to going viral in 2025.' },
  { time: '0:14', text: 'Post consistently at these exact times.' },
];

const TABS = [
  { id: 'hook',     icon: <Zap size={14} />,      label: 'Viral Hook',  color: '#6366f1' },
  { id: 'caption',  icon: <FileText size={14} />,  label: 'Caption',     color: '#a855f7' },
  { id: 'hashtags', icon: <Hash size={14} />,      label: 'Hashtags',    color: '#f97316' },
  { id: 'subtitles',icon: <Captions size={14} />,  label: 'Subtitles',   color: '#0ea5e9' },
];

export function DemoSection() {
  const [activeTab, setActiveTab] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const [key, setKey] = useState(0); // for re-triggering fade animation

  // Auto-cycle through tabs
  useEffect(() => {
    if (!autoPlay) return;
    const timer = setInterval(() => {
      setActiveTab(prev => (prev + 1) % TABS.length);
      setKey(k => k + 1);
    }, 3000);
    return () => clearInterval(timer);
  }, [autoPlay]);

  const handleTabClick = (i: number) => {
    setAutoPlay(false);
    setActiveTab(i);
    setKey(k => k + 1);
  };

  const tab = TABS[activeTab];

  return (
    <section style={{
      background: '#f8fafc',
      borderTop: '1px solid #e2e8f0',
      padding: '72px 24px',
    }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>

        {/* Section header */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#eef2ff', color: '#4f46e5',
            padding: '4px 14px', borderRadius: 99, fontSize: 12, fontWeight: 600,
            border: '1px solid #c7d2fe', marginBottom: 14,
          }}>
            <Play size={11} fill="#4f46e5" />
            Live Demo
          </span>
          <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, color: '#0f172a', margin: '0 0 12px', letterSpacing: -0.8 }}>
            See what you get — instantly
          </h2>
          <p style={{ color: '#64748b', fontSize: 15, margin: 0 }}>
            Here's an example of the content ReelBooster generates for a typical creator video
          </p>
        </div>

        {/* Demo card */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'start' }}>

          {/* Left: mock phone / video thumbnail */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Phone mockup */}
            <div style={{
              background: '#0f172a', borderRadius: 24, overflow: 'hidden',
              border: '4px solid #1e293b', boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
              aspectRatio: '9/16', maxHeight: 420, position: 'relative',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {/* Gradient background */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(160deg, #1e1b4b 0%, #4c1d95 40%, #881337 100%)',
              }} />
              {/* Play icon */}
              <div style={{
                position: 'relative', zIndex: 1,
                width: 60, height: 60, borderRadius: '50%',
                background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid rgba(255,255,255,0.3)',
              }}>
                <Play size={24} color="white" fill="white" style={{ marginLeft: 2 }} />
              </div>
              {/* Subtitle overlay at bottom */}
              <div style={{
                position: 'absolute', bottom: 40, left: 16, right: 16, zIndex: 2,
                background: 'rgba(0,0,0,0.65)', borderRadius: 8,
                padding: '8px 12px', backdropFilter: 'blur(4px)',
              }}>
                <p style={{ color: 'white', fontSize: 13, fontWeight: 700, margin: 0, textAlign: 'center', lineHeight: 1.4 }}>
                  {DEMO_HOOK}
                </p>
              </div>
              {/* Top bar like TikTok/Reels */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2,
                padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 500 }}>@yourchannel</span>
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>0:32</span>
              </div>
            </div>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {[
                { label: 'Reach',       value: '∞', note: 'No limits' },
                { label: 'Time',        value: '<30s', note: 'Per video' },
                { label: 'AI Models',   value: '2', note: 'Whisper + Claude' },
              ].map(s => (
                <div key={s.label} className="card" style={{ borderRadius: 12, padding: '12px 10px', textAlign: 'center' }}>
                  <p style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: '0 0 2px', letterSpacing: -0.5 }}>{s.value}</p>
                  <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>{s.note}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Tabbed output */}
          <div className="card" style={{ borderRadius: 20, overflow: 'hidden' }}>
            {/* Tab bar */}
            <div style={{
              display: 'flex', borderBottom: '1px solid #f1f5f9',
              background: '#f8fafc', padding: '4px 4px 0',
            }}>
              {TABS.map((t, i) => (
                <button
                  key={t.id}
                  onClick={() => handleTabClick(i)}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    padding: '10px 8px',
                    background: activeTab === i ? 'white' : 'transparent',
                    border: 'none',
                    borderRadius: activeTab === i ? '10px 10px 0 0' : 0,
                    borderBottom: activeTab === i ? '2px solid white' : '2px solid transparent',
                    cursor: 'pointer',
                    fontSize: 11, fontWeight: 600,
                    color: activeTab === i ? t.color : '#94a3b8',
                    transition: 'all 0.15s',
                    marginBottom: activeTab === i ? -1 : 0,
                  }}
                >
                  <span style={{ color: activeTab === i ? t.color : '#94a3b8' }}>{t.icon}</span>
                  <span style={{ display: 'none' }}>{t.label}</span>
                </button>
              ))}
            </div>

            {/* Tab label */}
            <div style={{
              padding: '16px 20px 0',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ color: tab.color }}>{tab.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{tab.label}</span>
              {autoPlay && (
                <span style={{
                  marginLeft: 'auto', fontSize: 10, color: '#94a3b8', fontWeight: 500,
                  background: '#f1f5f9', padding: '2px 8px', borderRadius: 99,
                }}>
                  Auto-playing
                </span>
              )}
            </div>

            {/* Tab content */}
            <div key={key} className="fade-in" style={{ padding: '14px 20px 20px', minHeight: 220 }}>

              {activeTab === 0 && (
                <div>
                  <div style={{
                    background: 'linear-gradient(135deg, #f8faff, #f5f3ff)',
                    borderRadius: 12, padding: '18px 20px', marginBottom: 12,
                    border: '1px solid #e0e7ff',
                  }}>
                    <p style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1.4, letterSpacing: -0.3 }}>
                      "{DEMO_HOOK}"
                    </p>
                  </div>
                  <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
                    Optimised to stop the scroll in the first 3 seconds
                  </p>
                </div>
              )}

              {activeTab === 1 && (
                <div>
                  <div style={{
                    background: '#fafafa', borderRadius: 12, padding: '14px 16px', marginBottom: 12,
                    border: '1px solid #f1f5f9',
                  }}>
                    <p style={{ fontSize: 14, color: '#334155', margin: 0, lineHeight: 1.7 }}>
                      {DEMO_CAPTION}
                    </p>
                  </div>
                  <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
                    {DEMO_CAPTION.length} characters · includes call-to-action
                  </p>
                </div>
              )}

              {activeTab === 2 && (
                <div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 12 }}>
                    {DEMO_HASHTAGS.map((tag, i) => (
                      <span key={i} className="tag-pill">#{tag}</span>
                    ))}
                  </div>
                  <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
                    {DEMO_HASHTAGS.length} trending hashtags tailored to your content
                  </p>
                </div>
              )}

              {activeTab === 3 && (
                <div>
                  <div style={{
                    background: '#f8fafc', borderRadius: 10, overflow: 'hidden',
                    border: '1px solid #f1f5f9', marginBottom: 12,
                  }}>
                    {DEMO_SUBTITLES.map((s, i) => (
                      <div key={i} style={{
                        display: 'flex', gap: 12, padding: '8px 12px', alignItems: 'flex-start',
                        borderBottom: i < DEMO_SUBTITLES.length - 1 ? '1px solid #f1f5f9' : 'none',
                      }}>
                        <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'ui-monospace, monospace', flexShrink: 0, paddingTop: 2 }}>
                          {s.time}
                        </span>
                        <span style={{ fontSize: 13, color: '#334155', lineHeight: 1.5 }}>{s.text}</span>
                      </div>
                    ))}
                  </div>
                  <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
                    Word-level timestamps · downloadable as SRT or burned into video
                  </p>
                </div>
              )}
            </div>

            {/* Bottom CTA */}
            <div style={{
              padding: '14px 20px',
              background: 'linear-gradient(135deg, #f8faff, #f5f3ff)',
              borderTop: '1px solid #f1f5f9',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <CheckCircle2 size={14} color="#6366f1" />
              <p style={{ fontSize: 12, color: '#475569', margin: 0, fontWeight: 500 }}>
                Upload your video above to generate real content like this
              </p>
            </div>
          </div>
        </div>

        {/* How it works steps */}
        <div style={{ marginTop: 64 }}>
          <h3 style={{ textAlign: 'center', fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 32px', letterSpacing: -0.5 }}>
            How it works
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            {[
              { step: '01', title: 'Upload',      desc: 'Drop any video up to 500 MB — MP4, MOV, WebM and more',           color: '#4f46e5' },
              { step: '02', title: 'Transcribe',  desc: 'OpenAI Whisper converts speech to text with word-level timestamps', color: '#7c3aed' },
              { step: '03', title: 'Generate',    desc: 'Claude AI crafts a viral hook, punchy caption and hashtag set',    color: '#db2777' },
              { step: '04', title: 'Publish',     desc: 'Copy your content, download the SRT, or burn subtitles in',        color: '#f97316' },
            ].map(s => (
              <div key={s.step} className="card card-hover" style={{ borderRadius: 16, padding: 20, position: 'relative', overflow: 'hidden' }}>
                <div style={{
                  fontSize: 11, fontWeight: 800, color: s.color, marginBottom: 10,
                  letterSpacing: 1, opacity: 0.6,
                }}>
                  STEP {s.step}
                </div>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>{s.title}</p>
                <p style={{ fontSize: 13, color: '#64748b', margin: 0, lineHeight: 1.5 }}>{s.desc}</p>
                {/* Background number */}
                <div style={{
                  position: 'absolute', right: -8, bottom: -12,
                  fontSize: 72, fontWeight: 900, color: s.color, opacity: 0.05,
                  lineHeight: 1, pointerEvents: 'none', userSelect: 'none',
                }}>
                  {s.step}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
