import { useState, useEffect, useRef } from 'react';
import { Zap, FileText, Hash, Captions, CheckCircle2, TrendingUp } from 'lucide-react';

// ── Demo content ─────────────────────────────────────────────────────────────

const DEMO_HOOK     = "This 60-second hack will 10x your content reach 🚀";
const DEMO_CAPTION  = "Most creators miss this simple trick that doubles engagement overnight. Save this for later and drop a 💬 if you want the full breakdown!";
const DEMO_HASHTAGS = ['contentcreator', 'reels', 'viral', 'socialmediatips', 'growyourbusiness', 'instagramreels', 'tiktoktips', 'digitalmarketing', 'creatorsoftiktok', 'reelsviral'];
const DEMO_SUBTITLES = [
  { time: '0:00', text: 'Most creators overlook this one thing...' },
  { time: '0:04', text: 'And it costs them thousands of followers.' },
  { time: '0:09', text: "Here's the secret to going viral in 2025." },
  { time: '0:14', text: 'Post consistently at these exact times.' },
];

const TABS = [
  { id: 'hook',      icon: <Zap size={14} />,       label: 'Viral Hook',  color: '#6366f1' },
  { id: 'caption',   icon: <FileText size={14} />,   label: 'Caption',     color: '#a855f7' },
  { id: 'hashtags',  icon: <Hash size={14} />,       label: 'Hashtags',    color: '#f97316' },
  { id: 'subtitles', icon: <Captions size={14} />,   label: 'Subtitles',   color: '#0ea5e9' },
];

// ── Simulation stages ─────────────────────────────────────────────────────────
//   Each stage lives in the phone mockup. Durations in ms.

const STAGE_DURATIONS = [2200, 2000, 2000, 2400, 4000]; // upload, transcribe, analyse, score, result

// ── Typewriter hook ───────────────────────────────────────────────────────────

function useTypewriter(text: string, active: boolean, speed = 28) {
  const [displayed, setDisplayed] = useState('');
  const idx = useRef(0);

  useEffect(() => {
    if (!active) { setDisplayed(''); idx.current = 0; return; }
    idx.current = 0;
    setDisplayed('');
    const t = setInterval(() => {
      idx.current++;
      setDisplayed(text.slice(0, idx.current));
      if (idx.current >= text.length) clearInterval(t);
    }, speed);
    return () => clearInterval(t);
  }, [active, text, speed]);

  return displayed;
}

// ── Upload progress bar ───────────────────────────────────────────────────────

function UploadStage() {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setPct(p => Math.min(p + 3, 97)), 60);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ padding: '0 20px', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'white', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            creator_tips_2025.mp4
          </p>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', margin: 0 }}>78.4 MB · Uploading…</p>
        </div>
        <span style={{ fontSize: 13, fontWeight: 800, color: '#a5b4fc' }}>{pct}%</span>
      </div>
      <div style={{ height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 99,
          width: `${pct}%`,
          background: 'linear-gradient(90deg, #6366f1, #a855f7)',
          transition: 'width 0.06s linear',
          boxShadow: '0 0 8px rgba(99,102,241,0.6)',
        }} />
      </div>
      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', margin: '8px 0 0', textAlign: 'center' }}>
        Chunked upload · secure transfer
      </p>
    </div>
  );
}

// ── Spinner stage (transcribe / analyse) ─────────────────────────────────────

function SpinnerStage({ label, sublabel, color }: { label: string; sublabel: string; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '0 20px', width: '100%' }}>
      <div style={{
        width: 52, height: 52, borderRadius: '50%',
        border: `3px solid ${color}30`,
        borderTop: `3px solid ${color}`,
        animation: 'spin 0.8s linear infinite',
      }} />
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'white', margin: '0 0 4px' }}>{label}</p>
        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', margin: 0 }}>{sublabel}</p>
      </div>
      {/* Fake waveform for transcription stage */}
      {label.includes('Transcrib') && (
        <div style={{ display: 'flex', gap: 3, alignItems: 'center', height: 24 }}>
          {[0.4, 0.8, 0.5, 1, 0.6, 0.9, 0.4, 0.7, 1, 0.5, 0.8, 0.3].map((h, i) => (
            <div key={i} style={{
              width: 3, borderRadius: 99,
              height: `${h * 24}px`,
              background: `rgba(99,102,241,${0.4 + h * 0.5})`,
              animation: `wave 0.8s ease-in-out ${i * 0.07}s infinite alternate`,
            }} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Score reveal stage ────────────────────────────────────────────────────────

function ScoreStage() {
  const [score, setScore] = useState(0);
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setShow(true), 200);
    let current = 0;
    const t2 = setInterval(() => {
      current = Math.min(current + 2, 87);
      setScore(current);
      if (current >= 87) clearInterval(t2);
    }, 22);
    return () => { clearTimeout(t1); clearInterval(t2); };
  }, []);

  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (score / 100) * circumference;
  const scoreColor = score >= 70 ? '#10b981' : score >= 45 ? '#f59e0b' : '#94a3b8';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '0 16px', width: '100%' }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, textTransform: 'uppercase', margin: 0 }}>
        Viral Score
      </p>
      {/* SVG gauge */}
      <div style={{ position: 'relative', width: 100, height: 100 }}>
        <svg width="100" height="100" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle cx="50" cy="50" r="36" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
          {/* Progress arc */}
          <circle
            cx="50" cy="50" r="36"
            fill="none"
            stroke={show ? scoreColor : 'transparent'}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform="rotate(-90 50 50)"
            style={{ transition: 'stroke-dashoffset 0.02s linear, stroke 0.4s ease' }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 26, fontWeight: 900, color: scoreColor, lineHeight: 1, transition: 'color 0.3s' }}>
            {score}
          </span>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>/100</span>
        </div>
      </div>
      {/* Score tiers */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, width: '100%' }}>
        {[
          { label: 'Hook Strength',    val: 91, color: '#10b981' },
          { label: 'Engagement',       val: 84, color: '#6366f1' },
          { label: 'Trending Keywords',val: 78, color: '#a855f7' },
        ].map(m => (
          <div key={m.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>{m.label}</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: m.color }}>{show ? m.val : 0}</span>
            </div>
            <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.08)' }}>
              <div style={{
                height: '100%', borderRadius: 99,
                width: show ? `${m.val}%` : '0%',
                background: m.color,
                transition: 'width 1.2s ease 0.3s',
              }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Result preview stage (hook typed out on phone) ────────────────────────────

function ResultStage() {
  const typed = useTypewriter(DEMO_HOOK, true, 32);
  return (
    <div style={{ padding: '0 16px', width: '100%' }}>
      <div style={{
        background: 'rgba(255,255,255,0.07)', borderRadius: 10,
        padding: '10px 12px', marginBottom: 10,
        border: '1px solid rgba(255,255,255,0.1)',
      }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: '#a5b4fc', margin: '0 0 5px', letterSpacing: 0.5, textTransform: 'uppercase' }}>
          ✦ AI Hook
        </p>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'white', margin: 0, lineHeight: 1.45 }}>
          "{typed}<span style={{ animation: 'blink 1s step-end infinite', opacity: typed.length < DEMO_HOOK.length ? 1 : 0 }}>|</span>"
        </p>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {DEMO_HASHTAGS.slice(0, 5).map((tag, i) => (
          <span key={i} style={{
            fontSize: 9, fontWeight: 600, color: '#a5b4fc',
            background: 'rgba(99,102,241,0.15)', borderRadius: 99,
            padding: '2px 7px', border: '1px solid rgba(99,102,241,0.3)',
          }}>
            #{tag}
          </span>
        ))}
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', padding: '2px 4px' }}>+5 more</span>
      </div>
    </div>
  );
}

// ── Phone shell ───────────────────────────────────────────────────────────────

function PhoneMockup({ stage }: { stage: number }) {
  const stageLabels = ['Uploading video…', 'Transcribing audio…', 'Analysing with Claude AI…', 'Calculating viral score…', 'Results ready ✓'];

  return (
    <div style={{
      background: '#0f172a', borderRadius: 36,
      border: '5px solid #1e293b',
      boxShadow: '0 24px 64px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)',
      aspectRatio: '9/16', maxHeight: 440,
      position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Ambient glow */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(160deg, rgba(79,70,229,0.15) 0%, rgba(124,58,237,0.1) 40%, rgba(219,39,119,0.12) 100%)',
        pointerEvents: 'none',
      }} />

      {/* Status bar */}
      <div style={{
        position: 'relative', zIndex: 2,
        padding: '12px 18px 6px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0,
      }}>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>BoostMyReel</span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 2 }}>
            {[3, 5, 7, 5, 3].map((h, i) => (
              <div key={i} style={{ width: 2, height: h, background: i < 4 ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)', borderRadius: 1 }} />
            ))}
          </div>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>5G</span>
        </div>
      </div>

      {/* Stage indicator pills */}
      <div style={{
        position: 'relative', zIndex: 2,
        padding: '0 14px 12px',
        display: 'flex', gap: 4, justifyContent: 'center', flexShrink: 0,
      }}>
        {STAGE_DURATIONS.map((_, i) => (
          <div key={i} style={{
            height: 3, flex: 1, borderRadius: 99,
            background: i <= stage
              ? 'linear-gradient(90deg, #6366f1, #a855f7)'
              : 'rgba(255,255,255,0.1)',
            transition: 'background 0.4s ease',
          }} />
        ))}
      </div>

      {/* Stage label */}
      <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', marginBottom: 14, flexShrink: 0 }}>
        <span style={{
          fontSize: 10, fontWeight: 600,
          color: stage === 4 ? '#86efac' : 'rgba(255,255,255,0.4)',
          letterSpacing: 0.3,
        }}>
          {stageLabels[stage]}
        </span>
      </div>

      {/* Stage content */}
      <div style={{
        position: 'relative', zIndex: 2, flex: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        paddingBottom: 16,
      }}>
        {stage === 0 && <UploadStage />}
        {stage === 1 && <SpinnerStage label="Transcribing audio…" sublabel="OpenAI Whisper — word-level accuracy" color="#6366f1" />}
        {stage === 2 && <SpinnerStage label="Analysing with Claude AI…" sublabel="Hook · Caption · Hashtags · Score" color="#a855f7" />}
        {stage === 3 && <ScoreStage />}
        {stage === 4 && <ResultStage />}
      </div>

      {/* Bottom home bar */}
      <div style={{ textAlign: 'center', paddingBottom: 10, flexShrink: 0 }}>
        <div style={{ width: 36, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.2)', display: 'inline-block' }} />
      </div>

      <style>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes wave  { from { transform: scaleY(0.4); } to { transform: scaleY(1); } }
        @keyframes blink { 0%,100% { opacity:1; } 50% { opacity:0; } }
      `}</style>
    </div>
  );
}

// ── Main DemoSection ──────────────────────────────────────────────────────────

export function DemoSection() {
  const [stage, setStage]       = useState(0);
  const [activeTab, setActiveTab] = useState(0);
  const [tabKey, setTabKey]     = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);

  // Drive the phone simulation through stages
  useEffect(() => {
    let s = 0;
    let timer: ReturnType<typeof setTimeout>;

    const advance = () => {
      s = (s + 1) % STAGE_DURATIONS.length;
      setStage(s);
      timer = setTimeout(advance, STAGE_DURATIONS[s]);
    };

    timer = setTimeout(advance, STAGE_DURATIONS[0]);
    return () => clearTimeout(timer);
  }, []);

  // Auto-cycle right-side tabs only after processing is "done"
  useEffect(() => {
    if (!autoPlay) return;
    const t = setInterval(() => {
      setActiveTab(p => (p + 1) % TABS.length);
      setTabKey(k => k + 1);
    }, 3000);
    return () => clearInterval(t);
  }, [autoPlay]);

  const handleTabClick = (i: number) => {
    setAutoPlay(false);
    setActiveTab(i);
    setTabKey(k => k + 1);
  };

  const tab = TABS[activeTab];
  const hookTyped   = useTypewriter(DEMO_HOOK,    activeTab === 0, 22);
  const captionTyped = useTypewriter(DEMO_CAPTION, activeTab === 1, 14);

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
            <TrendingUp size={11} />
            Live Demo
          </span>
          <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, color: '#0f172a', margin: '0 0 12px', letterSpacing: -0.8 }}>
            See what you get — instantly
          </h2>
          <p style={{ color: '#64748b', fontSize: 15, margin: 0 }}>
            Watch the AI pipeline run live — from upload to viral-ready output
          </p>
        </div>

        {/* Demo card */}
        <div className="r-grid-2" style={{ alignItems: 'start' }}>

          {/* ── Left: Animated phone mockup ── */}
          <div className="r-demo-phone" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <PhoneMockup stage={stage} />

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {[
                { label: 'Processing', value: '<30s', note: 'Per video' },
                { label: 'AI Models',  value: '2',    note: 'Whisper + Claude' },
                { label: 'Outputs',    value: '5+',   note: 'Hook · Caption · Tags' },
              ].map(s => (
                <div key={s.label} className="card" style={{ borderRadius: 12, padding: '12px 10px', textAlign: 'center' }}>
                  <p style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: '0 0 2px', letterSpacing: -0.5 }}>{s.value}</p>
                  <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>{s.note}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: Tabbed output with typewriter ── */}
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
                    borderBottom: activeTab === i ? `2px solid ${t.color}` : '2px solid transparent',
                    cursor: 'pointer',
                    fontSize: 11, fontWeight: 600,
                    color: activeTab === i ? t.color : '#94a3b8',
                    transition: 'all 0.15s',
                    marginBottom: activeTab === i ? -1 : 0,
                  }}
                >
                  <span style={{ color: activeTab === i ? t.color : '#94a3b8' }}>{t.icon}</span>
                  <span className="tab-label-text">{t.label}</span>
                </button>
              ))}
            </div>

            {/* Tab label row */}
            <div style={{ padding: '16px 20px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: tab.color }}>{tab.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{tab.label}</span>
              {autoPlay && (
                <span style={{
                  marginLeft: 'auto', fontSize: 10, color: '#94a3b8',
                  background: '#f1f5f9', padding: '2px 8px', borderRadius: 99,
                }}>
                  Auto-playing
                </span>
              )}
            </div>

            {/* Tab content with typewriter effect */}
            <div key={tabKey} className="fade-in" style={{ padding: '14px 20px 20px', minHeight: 230 }}>

              {/* Viral Hook */}
              {activeTab === 0 && (
                <div>
                  <div style={{
                    background: 'linear-gradient(135deg, #f8faff, #f5f3ff)',
                    borderRadius: 12, padding: '18px 20px', marginBottom: 12,
                    border: '1px solid #e0e7ff', position: 'relative',
                  }}>
                    {/* Typing indicator badge */}
                    <span style={{
                      position: 'absolute', top: 10, right: 12,
                      fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
                      color: '#6366f1', background: '#eef2ff',
                      border: '1px solid #c7d2fe', borderRadius: 99, padding: '2px 7px',
                    }}>
                      Claude AI
                    </span>
                    <p style={{ fontSize: 19, fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1.4, letterSpacing: -0.3, paddingRight: 60 }}>
                      "{hookTyped}
                      <span style={{ animation: hookTyped.length < DEMO_HOOK.length ? 'blink 0.8s step-end infinite' : 'none', opacity: hookTyped.length < DEMO_HOOK.length ? 1 : 0 }}>|</span>"
                    </p>
                  </div>
                  <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
                    Optimised to stop the scroll in the first 3 seconds
                  </p>
                </div>
              )}

              {/* Caption */}
              {activeTab === 1 && (
                <div>
                  <div style={{
                    background: '#fafafa', borderRadius: 12, padding: '14px 16px', marginBottom: 12,
                    border: '1px solid #f1f5f9', position: 'relative',
                  }}>
                    <span style={{
                      position: 'absolute', top: 10, right: 12,
                      fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
                      color: '#a855f7', background: '#fdf4ff',
                      border: '1px solid #e9d5ff', borderRadius: 99, padding: '2px 7px',
                    }}>
                      Claude AI
                    </span>
                    <p style={{ fontSize: 14, color: '#334155', margin: 0, lineHeight: 1.7, paddingRight: 56 }}>
                      {captionTyped}
                      <span style={{ animation: captionTyped.length < DEMO_CAPTION.length ? 'blink 0.8s step-end infinite' : 'none', opacity: captionTyped.length < DEMO_CAPTION.length ? 1 : 0 }}>|</span>
                    </p>
                  </div>
                  <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
                    {captionTyped.length} characters · includes call-to-action
                  </p>
                </div>
              )}

              {/* Hashtags */}
              {activeTab === 2 && (
                <div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 12 }}>
                    {DEMO_HASHTAGS.map((tag, i) => (
                      <span
                        key={i}
                        className="tag-pill"
                        style={{
                          opacity: 0,
                          animation: `fadeSlideIn 0.3s ease forwards`,
                          animationDelay: `${i * 80}ms`,
                        }}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                  <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
                    {DEMO_HASHTAGS.length} trending hashtags tailored to your content
                  </p>
                </div>
              )}

              {/* Subtitles */}
              {activeTab === 3 && (
                <div>
                  <div style={{
                    background: '#f8fafc', borderRadius: 10, overflow: 'hidden',
                    border: '1px solid #f1f5f9', marginBottom: 12,
                  }}>
                    {DEMO_SUBTITLES.map((s, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex', gap: 12, padding: '8px 12px', alignItems: 'flex-start',
                          borderBottom: i < DEMO_SUBTITLES.length - 1 ? '1px solid #f1f5f9' : 'none',
                          opacity: 0,
                          animation: `fadeSlideIn 0.35s ease forwards`,
                          animationDelay: `${i * 140}ms`,
                        }}
                      >
                        <span style={{
                          fontSize: 10, color: '#a5b4fc', fontFamily: 'ui-monospace, monospace',
                          flexShrink: 0, paddingTop: 2, fontWeight: 700,
                        }}>
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

        {/* How it works */}
        <div style={{ marginTop: 64 }}>
          <h3 style={{ textAlign: 'center', fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 32px', letterSpacing: -0.5 }}>
            How it works
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            {[
              { step: '01', title: 'Upload',     desc: 'Drop any video up to 500 MB — MP4, MOV, WebM and more',            color: '#4f46e5' },
              { step: '02', title: 'Transcribe', desc: 'OpenAI Whisper converts speech to text with word-level timestamps', color: '#7c3aed' },
              { step: '03', title: 'Generate',   desc: 'Claude AI crafts a viral hook, punchy caption and hashtag set',    color: '#db2777' },
              { step: '04', title: 'Publish',    desc: 'Copy your content, download the SRT, or burn subtitles in',        color: '#f97316' },
            ].map(s => (
              <div key={s.step} className="card card-hover" style={{ borderRadius: 16, padding: 20, position: 'relative', overflow: 'hidden' }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: s.color, marginBottom: 10, letterSpacing: 1, opacity: 0.6 }}>
                  STEP {s.step}
                </div>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>{s.title}</p>
                <p style={{ fontSize: 13, color: '#64748b', margin: 0, lineHeight: 1.5 }}>{s.desc}</p>
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

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .tab-label-text { display: none; }
        @media (min-width: 480px) { .tab-label-text { display: inline; } }
      `}</style>
    </section>
  );
}
