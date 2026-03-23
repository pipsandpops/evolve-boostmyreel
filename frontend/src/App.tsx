import { useState, useEffect } from 'react';
import './index.css';
import { useVideoUpload } from './hooks/useVideoUpload';
import { useUserStatus } from './hooks/useUserStatus';
import { VideoUploader } from './components/VideoUploader';
import { ProcessingStatus } from './components/ProcessingStatus';
import { ResultsPanel } from './components/ResultsPanel';
import { DemoSection } from './components/DemoSection';
import { PricingSection, type Plan } from './components/PricingSection';
import { AboutSection } from './components/AboutSection';
import { PaymentPage } from './components/PaymentPage';
import { ContactPage } from './components/ContactPage';
import { ImageAnalysisPage } from './components/image/ImageAnalysisPage';
import { AutoReelPage } from './components/autoreels/AutoReelPage';
import { Sparkles, RotateCcw, Zap, FileText, Hash, Captions, Menu, X, ImagePlus, Clapperboard } from 'lucide-react';

type Page = 'home' | 'payment' | 'contact' | 'image-analysis' | 'auto-reel';

function App() {
  const { state, jobId, jobStatus, progressPercent, result, error, upload, reset } = useVideoUpload();
  const isIdle = state === 'idle';
  const isWorking = state === 'uploading' || state === 'polling';

  const [page, setPage] = useState<Page>('home');
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { userId, status, refresh: refreshUserStatus } = useUserStatus();
  const isPaidUser = status.isPaid;

  // ── Instagram OAuth callback ───────────────────────────────────────
  const [igToast, setIgToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const igResult = params.get('ig_result');
    if (!igResult) return;

    // Clean the URL so refreshing doesn't re-trigger
    window.history.replaceState({}, '', window.location.pathname);

    if (igResult === 'success') {
      const user = params.get('ig_user') ?? '';
      setIgToast({ type: 'success', msg: `Instagram connected: @${user}` });
    } else if (igResult === 'denied') {
      setIgToast({ type: 'error', msg: 'Instagram connection was cancelled.' });
    } else {
      const msg = params.get('ig_msg') ?? 'Could not connect Instagram. Please try again.';
      setIgToast({ type: 'error', msg });
    }

    const timer = setTimeout(() => setIgToast(null), 5000);
    return () => clearTimeout(timer);
  }, []);

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    setPage('payment');
    window.scrollTo(0, 0);
  };

  const handlePaymentBack = () => {
    setPage('home');
    setSelectedPlan(null);
    setTimeout(() => scrollTo('pricing'), 100);
  };

  // ── Contact page ──────────────────────────────────────────────────
  if (page === 'contact') {
    return <ContactPage onBack={() => { setPage('home'); window.scrollTo(0, 0); }} />;
  }

  // ── Image Analysis page ────────────────────────────────────────────
  if (page === 'image-analysis') {
    return (
      <ImageAnalysisPage
        isPaidUser={isPaidUser}
        onBack={() => { setPage('home'); window.scrollTo(0, 0); }}
        onUpgrade={() => { setPage('payment'); setSelectedPlan(null); setTimeout(() => scrollTo('pricing'), 100); }}
      />
    );
  }

  // ── Auto Reel Generator page ───────────────────────────────────────
  if (page === 'auto-reel') {
    return (
      <AutoReelPage
        isPaidUser={isPaidUser}
        userId={userId}
        onBack={() => { setPage('home'); window.scrollTo(0, 0); }}
        onUpgrade={() => { setPage('payment'); setSelectedPlan(null); setTimeout(() => scrollTo('pricing'), 100); }}
      />
    );
  }

  // ── Payment page ──────────────────────────────────────────────────
  if (page === 'payment' && selectedPlan) {
    return (
      <PaymentPage
        plan={selectedPlan}
        userId={userId}
        onBack={handlePaymentBack}
        onSuccess={async () => { await refreshUserStatus(); setPage('home'); window.scrollTo(0, 0); }}
      />
    );
  }

  // ── Main page ─────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', display: 'flex', flexDirection: 'column' }}>

      {/* ── Instagram OAuth toast ── */}
      {igToast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          zIndex: 2000, padding: '12px 20px', borderRadius: 12,
          background: igToast.type === 'success' ? '#064e3b' : '#7f1d1d',
          border: `1px solid ${igToast.type === 'success' ? '#10b981' : '#ef4444'}`,
          color: 'white', fontSize: 14, fontWeight: 600,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          display: 'flex', alignItems: 'center', gap: 8,
          animation: 'toastIn 0.3s ease',
          whiteSpace: 'nowrap',
        }}>
          {igToast.type === 'success' ? '✅' : '⚠️'} {igToast.msg}
        </div>
      )}

      {/* ── Nav ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(14px)',
        borderBottom: '1px solid #e2e8f0',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

          {/* Logo */}
          <button
            onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 10 }}
          >
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed, #db2777)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(79,70,229,0.35)',
            }}>
              <Zap size={17} color="white" fill="white" />
            </div>
            <span style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', letterSpacing: -0.5 }}>
              Boost<span className="gradient-text">MyReel</span>
            </span>
          </button>

          {/* Desktop nav links */}
          <div className="nav-links">
            {[
              { label: 'Features', id: 'demo' },
              { label: 'Pricing', id: 'pricing' },
              { label: 'About', id: 'about' },
            ].map(l => (
              <button key={l.id} onClick={() => scrollTo(l.id)} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '6px 14px', borderRadius: 8,
                fontSize: 14, fontWeight: 500, color: '#475569',
                transition: 'all 0.15s',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#0f172a'; (e.currentTarget as HTMLElement).style.background = '#f8fafc'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#475569'; (e.currentTarget as HTMLElement).style.background = 'none'; }}
              >
                {l.label}
              </button>
            ))}
            <button onClick={() => { setPage('contact'); window.scrollTo(0, 0); }} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '6px 14px', borderRadius: 8,
              fontSize: 14, fontWeight: 500, color: '#475569',
              transition: 'all 0.15s',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#0f172a'; (e.currentTarget as HTMLElement).style.background = '#f8fafc'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#475569'; (e.currentTarget as HTMLElement).style.background = 'none'; }}
            >
              Contact
            </button>
            {/* Image analysis CTA */}
            <button onClick={() => { setPage('image-analysis'); window.scrollTo(0, 0); }} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'linear-gradient(135deg, #7c3aed15, #a855f715)',
              border: '1px solid #c4b5fd', cursor: 'pointer',
              padding: '6px 14px', borderRadius: 8,
              fontSize: 14, fontWeight: 600, color: '#7c3aed',
              transition: 'all 0.15s',
            }}>
              <ImagePlus size={14} /> Images
            </button>
            {/* Auto Reel Generator CTA */}
            <button onClick={() => { setPage('auto-reel'); window.scrollTo(0, 0); }} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'linear-gradient(135deg, #4f46e510, #db277710)',
              border: '1px solid #fda4af', cursor: 'pointer',
              padding: '6px 14px', borderRadius: 8,
              fontSize: 14, fontWeight: 600, color: '#db2777',
              transition: 'all 0.15s',
            }}>
              <Clapperboard size={14} /> Auto Reels
            </button>
          </div>

          {/* Right actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {(state === 'complete' || state === 'error') && (
              <button onClick={reset} className="btn-secondary" style={{ padding: '7px 14px', fontSize: 13 }}>
                <RotateCcw size={13} />
                New Video
              </button>
            )}
            <button
              onClick={() => scrollTo('pricing')}
              className="btn-primary nav-cta-desktop"
              style={{ padding: '8px 18px', fontSize: 13 }}
            >
              Get Started
            </button>
            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(o => !o)}
              className="btn-secondary mobile-menu-btn"
              style={{ padding: '7px 9px' }}
            >
              {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div style={{ borderTop: '1px solid #e2e8f0', background: 'white', padding: '8px 24px 16px' }}>
            {[
              { label: 'Features', id: 'demo' },
              { label: 'Pricing', id: 'pricing' },
              { label: 'About', id: 'about' },
            ].map(l => (
              <button key={l.id} onClick={() => scrollTo(l.id)} style={{
                display: 'block', width: '100%', textAlign: 'left',
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '10px 0', fontSize: 15, fontWeight: 500, color: '#475569',
              }}>
                {l.label}
              </button>
            ))}
            <button onClick={() => { setMobileMenuOpen(false); setPage('contact'); window.scrollTo(0, 0); }} style={{
              display: 'block', width: '100%', textAlign: 'left',
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '10px 0', fontSize: 15, fontWeight: 500, color: '#475569',
            }}>
              Contact
            </button>
            <button onClick={() => { setMobileMenuOpen(false); setPage('image-analysis'); window.scrollTo(0, 0); }} style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left',
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '10px 0', fontSize: 15, fontWeight: 600, color: '#7c3aed',
            }}>
              <ImagePlus size={15} /> Image Analysis
            </button>
            <button onClick={() => { setMobileMenuOpen(false); setPage('auto-reel'); window.scrollTo(0, 0); }} style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left',
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '10px 0', fontSize: 15, fontWeight: 600, color: '#db2777',
            }}>
              <Clapperboard size={15} /> Auto Reel Generator
            </button>
          </div>
        )}
      </nav>

      <main style={{ flex: 1 }}>

        {/* ── Hero + Upload ── */}
        {(isIdle || isWorking) && (
          <section style={{
            background: 'linear-gradient(180deg, #f8faff 0%, #ffffff 100%)',
            padding: '56px 24px 48px',
          }}>
            <div style={{ maxWidth: 680, margin: '0 auto' }}>

              {isIdle && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                    <span className="badge" style={{ background: '#eef2ff', color: '#4f46e5', border: '1px solid #c7d2fe' }}>
                      <Sparkles size={12} />
                      AI-Powered Content Generator
                    </span>
                  </div>

                  <h1 style={{
                    textAlign: 'center', fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 800,
                    color: '#0f172a', margin: '0 0 14px', letterSpacing: -1.5, lineHeight: 1.15,
                  }}>
                    Turn videos into{' '}
                    <span className="gradient-text">viral content</span>
                  </h1>
                  <p style={{ textAlign: 'center', fontSize: 17, color: '#64748b', margin: '0 0 36px', lineHeight: 1.6 }}>
                    Upload any video and get a scroll-stopping hook, engaging caption,
                    trending hashtags and auto-subtitles — in seconds.
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 36 }}>
                    {[
                      { icon: <Zap size={13} />, label: 'Viral Hook' },
                      { icon: <FileText size={13} />, label: 'AI Caption' },
                      { icon: <Hash size={13} />, label: 'Hashtags' },
                      { icon: <Captions size={13} />, label: 'Auto Subtitles' },
                    ].map(f => (
                      <span key={f.label} className="badge" style={{ background: 'white', color: '#475569', border: '1px solid #e2e8f0', gap: 5 }}>
                        <span style={{ color: '#7c3aed' }}>{f.icon}</span>
                        {f.label}
                      </span>
                    ))}
                  </div>
                </>
              )}

              <VideoUploader onUpload={upload} isUploading={state === 'uploading'} />

              {isWorking && (
                <div style={{ marginTop: 24 }}>
                  <ProcessingStatus jobStatus={jobStatus} progressPercent={progressPercent} />
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Error ── */}
        {state === 'error' && (
          <section style={{ padding: '64px 24px' }}>
            <div style={{
              maxWidth: 480, margin: '0 auto',
              background: '#fff1f2', border: '1px solid #fecdd3',
              borderRadius: 16, padding: 32, textAlign: 'center',
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: '#ffe4e6', margin: '0 auto 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
              }}>😕</div>
              <p style={{ color: '#be123c', fontWeight: 700, fontSize: 16, margin: '0 0 6px' }}>Processing failed</p>
              <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 24px', lineHeight: 1.5 }}>{error}</p>
              <button onClick={reset} className="btn-primary" style={{ padding: '10px 28px', fontSize: 14 }}>Try Again</button>
            </div>
          </section>
        )}

        {/* ── Results ── */}
        {state === 'complete' && result && jobId && (
          <section style={{ padding: '32px 24px 64px' }}>
            <div style={{ maxWidth: 1100, margin: '0 auto' }}>
              <ResultsPanel
                result={result}
                jobId={jobId}
                userId={userId}
                isPaidUser={isPaidUser}
                onUpgrade={() => { setPage('payment'); setSelectedPlan(null); setTimeout(() => scrollTo('pricing'), 100); }}
              />
            </div>
          </section>
        )}

        {/* ── Sections visible only on idle ── */}
        {isIdle && (
          <>
            <div id="demo"><DemoSection /></div>
            <div id="pricing"><PricingSection onSelectPlan={handleSelectPlan} /></div>
            <div id="about"><AboutSection /></div>
          </>
        )}

      </main>

      {/* ── Footer ── */}
      <footer style={{ borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: 'linear-gradient(135deg, #4f46e5, #7c3aed, #db2777)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Zap size={13} color="white" fill="white" />
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>BoostMyReel</span>
            </div>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              {[
                { label: 'Features', id: 'demo' },
                { label: 'Pricing', id: 'pricing' },
                { label: 'About', id: 'about' },
              ].map(l => (
                <button key={l.id} onClick={() => scrollTo(l.id)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 13, color: '#64748b', fontWeight: 500, padding: 0,
                }}>
                  {l.label}
                </button>
              ))}
              <button onClick={() => { setPage('contact'); window.scrollTo(0, 0); }} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, color: '#64748b', fontWeight: 500, padding: 0,
              }}>
                Contact
              </button>
            </div>
            <p style={{ color: '#94a3b8', fontSize: 12, margin: 0 }}>
              © 2025 BoostMyReel · Powered by Whisper + Claude AI
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}

export default App;
