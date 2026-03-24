import { ArrowLeft, Zap, TrendingUp, Lightbulb, Rocket, Heart, Star, Quote, Trophy } from 'lucide-react';

interface BlogPageProps {
  onBack: () => void;
  onGetStarted: () => void;
  onWhyBest: () => void;
}

export function BlogPage({ onBack, onGetStarted, onWhyBest }: BlogPageProps) {
  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>

      {/* Top bar */}
      <div style={{
        background: 'white', borderBottom: '1px solid #e2e8f0',
        padding: '0 24px', height: 60,
        display: 'flex', alignItems: 'center', gap: 14,
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <button onClick={onBack} className="btn-secondary" style={{ padding: '7px 14px', fontSize: 13 }}>
          <ArrowLeft size={14} /> Back
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed, #db2777)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={13} color="white" fill="white" />
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
            Boost<span style={{ background: 'linear-gradient(135deg, #4f46e5, #db2777)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>MyReel</span>
          </span>
        </div>
        <span style={{ fontSize: 13, color: '#94a3b8', marginLeft: 4 }}>— Founder's Story</span>
      </div>

      <div style={{ maxWidth: 780, margin: '0 auto', padding: '48px 24px 80px' }}>

        {/* Category badge */}
        <div style={{ marginBottom: 20 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#eef2ff', color: '#4f46e5',
            padding: '5px 14px', borderRadius: 99, fontSize: 12, fontWeight: 700,
            border: '1px solid #c7d2fe', letterSpacing: 0.3,
          }}>
            <Star size={11} fill="#4f46e5" /> FOUNDER'S STORY
          </span>
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: 'clamp(28px, 4.5vw, 46px)', fontWeight: 900,
          color: '#0f172a', margin: '0 0 20px', letterSpacing: -1.5, lineHeight: 1.15,
        }}>
          From Frustration to{' '}
          <span style={{
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed, #db2777)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            Viral Reels
          </span>
          : How I Built BoostMyReel
        </h1>

        {/* Meta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 36, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 42, height: 42, borderRadius: '50%',
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed, #db2777)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, color: 'white', fontWeight: 700,
            }}>
              R
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>Rohan</p>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Founder, BoostMyReel</p>
            </div>
          </div>
          <span style={{ color: '#e2e8f0' }}>|</span>
          <span style={{ fontSize: 13, color: '#94a3b8' }}>March 2026</span>
          <span style={{ color: '#e2e8f0' }}>|</span>
          <span style={{ fontSize: 13, color: '#94a3b8' }}>8 min read</span>
        </div>

        {/* Hero quote */}
        <div style={{
          background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
          borderRadius: 20, padding: '28px 32px', marginBottom: 44,
          border: '1px solid rgba(99,102,241,0.3)',
          position: 'relative',
        }}>
          <Quote size={32} color="rgba(165,180,252,0.4)" style={{ position: 'absolute', top: 20, left: 24 }} />
          <p style={{
            fontSize: 'clamp(16px, 2.5vw, 21px)', fontWeight: 600,
            color: 'white', lineHeight: 1.6, margin: 0,
            paddingLeft: 16,
            fontStyle: 'italic',
          }}>
            "I spent 3 hours writing captions for a 60-second reel. That weekend, I decided to
            build a tool that could do it in 30 seconds — and BoostMyReel was born."
          </p>
        </div>

        {/* Divider image-like banner */}
        <div style={{
          background: 'linear-gradient(135deg, #eef2ff 0%, #fdf4ff 50%, #fff1f2 100%)',
          borderRadius: 20, padding: '24px 28px', marginBottom: 44,
          border: '1px solid #e2e8f0',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 20,
          textAlign: 'center',
        }}>
          {[
            { icon: '🚀', label: 'Launched', value: '2025' },
            { icon: '🧠', label: 'AI Models', value: '2 (Whisper + Claude)' },
            { icon: '🎬', label: 'Features', value: '4 Core Tools' },
            { icon: '🇮🇳', label: 'Built for', value: 'Indian Creators' },
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontSize: 26, marginBottom: 6 }}>{s.icon}</div>
              <p style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: '0 0 2px' }}>{s.value}</p>
              <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Article body */}
        <div style={{ lineHeight: 1.8, color: '#374151' }}>

          {/* Section 1 */}
          <SectionHeading icon={<Lightbulb size={20} />} color="#f59e0b" bg="#fffbeb" title="The Problem That Started It All" />
          <p style={para}>
            It was a late Sunday evening in early 2024. I had just finished recording a 12-minute video interview
            for my Instagram page — something I'd been excited about all week. Then came the part I dreaded most:
            the post-production.
          </p>
          <p style={para}>
            Write the hook. Think of a caption. Find 15–20 hashtags. Generate subtitles. Crop it to 9:16.
            Come up with a scroll-stopping title. I had done this dozens of times, but that evening it hit me
            differently — <strong>I was spending more time on the packaging than on the content itself.</strong>
          </p>
          <p style={para}>
            I looked around at tools available to Indian creators. Most were built for Western markets,
            priced in dollars, didn't understand the Indian creator economy, and required a monthly subscription
            just to try. I needed something faster, smarter, and affordable — in rupees.
          </p>
          <p style={{ ...para, marginBottom: 36 }}>
            That frustration became the seed. By the following weekend, I had built the first working prototype
            of what would become <strong>BoostMyReel</strong>.
          </p>

          {/* Highlight box */}
          <div style={{
            background: '#f0fdf4', border: '1px solid #bbf7d0',
            borderRadius: 16, padding: '20px 24px', marginBottom: 36,
            borderLeft: '4px solid #10b981',
          }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#065f46', margin: '0 0 6px' }}>The core insight</p>
            <p style={{ fontSize: 14, color: '#047857', margin: 0, lineHeight: 1.7 }}>
              Indian creators produce world-class content but lose hours every week to repetitive tasks
              that have nothing to do with creativity. The bottleneck isn't talent — it's tooling.
            </p>
          </div>

          {/* Section 2 */}
          <SectionHeading icon={<Rocket size={20} />} color="#4f46e5" bg="#eef2ff" title="Building in the Open" />
          <p style={para}>
            I started with a clear constraint: <em>no fluff, no bloated dashboards, no enterprise pricing</em>.
            Just upload your video and get everything you need to post, in under 30 seconds.
          </p>
          <p style={para}>
            The technical stack came together quickly. I chose <strong>OpenAI Whisper</strong> for
            speech-to-text — its accuracy on Hindi-accented English, regional accents, and code-switching
            is unmatched. For the creative layer — hooks, captions, hashtags — I integrated
            <strong> Anthropic Claude</strong>, which consistently produces more nuanced, contextually
            aware content than any other model I tested.
          </p>
          <p style={para}>
            The backend runs on a .NET 9 API deployed on Railway, the frontend on Vercel with a custom
            proxy so the API calls never leave the <strong>boostmyreel.com</strong> domain. This was
            actually critical — I discovered that Indian mobile carriers like Jio and Airtel were blocking
            the raw Railway subdomain on mobile data. Routing everything through Vercel's edge solved it.
          </p>
          <p style={{ ...para, marginBottom: 36 }}>
            Every feature was built from a real pain point. The auto subtitle burn-in came from a
            creator friend who said "80% of my viewers watch on mute — I lose them in the first 3 seconds."
            The viral score predictor came from my own obsession with understanding why some reels
            explode and others don't. The Auto Reel Generator — which turns a single long video into
            5 ready-to-post clips — came after I saw a podcaster manually cut the same interview into
            20 short clips over 4 hours.
          </p>

          {/* Timeline */}
          <div style={{ marginBottom: 44 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 20 }}>
              Build Timeline
            </p>
            {[
              { month: 'Aug 2024', event: 'First prototype — video upload + Whisper transcription', color: '#6366f1' },
              { month: 'Oct 2024', event: 'Claude integration — hooks, captions, hashtags live', color: '#8b5cf6' },
              { month: 'Dec 2024', event: 'Viral Score predictor + Instagram analytics connection', color: '#a855f7' },
              { month: 'Feb 2025', event: 'Razorpay payment integration — first paying customer 🎉', color: '#db2777' },
              { month: 'Mar 2025', event: 'Auto Reel Generator — 1 video → 5 ready-to-post clips', color: '#ec4899' },
              { month: 'Mar 2026', event: 'Image Growth Engine + mobile upload fix + freemium model', color: '#f43f5e' },
            ].map((t, i) => (
              <div key={i} style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{
                    width: 12, height: 12, borderRadius: '50%',
                    background: t.color, marginTop: 4,
                    boxShadow: `0 0 0 3px ${t.color}30`,
                  }} />
                  {i < 5 && <div style={{ width: 2, flex: 1, background: '#e2e8f0', marginTop: 4 }} />}
                </div>
                <div style={{ paddingBottom: 8 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', margin: '0 0 2px', letterSpacing: 0.3 }}>{t.month}</p>
                  <p style={{ fontSize: 14, color: '#374151', margin: 0, lineHeight: 1.5 }}>{t.event}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Section 3 */}
          <SectionHeading icon={<TrendingUp size={20} />} color="#10b981" bg="#f0fdf4" title="The Hardest Moments" />
          <p style={para}>
            The path wasn't clean. There were weeks where the FFmpeg video processor ran out of memory
            mid-job and crashed the server. There were nights debugging why uploads worked perfectly on
            WiFi but silently failed on 5G mobile data (turns out: carrier-level DNS blocking of cloud
            subdomains). There were moments of doubt about whether anyone would pay ₹499/month for a
            tool they could partially replicate manually.
          </p>
          <p style={para}>
            The mobile upload issue taught me the most. I had assumed the problem was a timeout or
            a CORS issue — the usual suspects. It took careful diagnosis to realise that Jio and Airtel
            were silently blocking the <em>railway.app</em> domain on their mobile data networks.
            The fix was elegant: route all API calls server-side through Vercel, so the browser only
            ever sees <em>boostmyreel.com</em>. Problem disappeared instantly.
          </p>
          <p style={{ ...para, marginBottom: 36 }}>
            Those moments of friction — the OOM crashes, the DNS blocks, the payment validation edge
            cases — each one made the product more robust. Every bug that reached a real user was
            fixed within hours, not weeks.
          </p>

          {/* Pull quote */}
          <div style={{
            background: 'linear-gradient(135deg, #fdf4ff, #fce7f3)',
            border: '1px solid #f0abfc', borderRadius: 16,
            padding: '24px 28px', marginBottom: 44, textAlign: 'center',
          }}>
            <p style={{ fontSize: 'clamp(16px, 2vw, 20px)', fontWeight: 700, color: '#86198f', margin: '0 0 10px', lineHeight: 1.5 }}>
              "Every bug that reached a real user was fixed within hours, not weeks.
              That responsiveness became our biggest competitive advantage."
            </p>
            <p style={{ fontSize: 13, color: '#a21caf', margin: 0, fontWeight: 600 }}>— Rohan, Founder</p>
          </div>

          {/* Section 4 */}
          <SectionHeading icon={<Heart size={20} />} color="#db2777" bg="#fdf2f8" title="Why I Built This for India" />
          <p style={para}>
            India has one of the fastest-growing creator economies in the world. Over 80 million
            content creators are active on Instagram and YouTube. Yet the tools they use were mostly
            built in Silicon Valley, priced in USD, and optimised for English-only content.
          </p>
          <p style={para}>
            BoostMyReel is built from the ground up for the Indian creator. UPI payments. Pricing
            that starts at ₹49 — less than a cup of coffee. Support for Indian English accents,
            Hindi-English code-switching, and the visual aesthetics that resonate with Indian
            audiences.
          </p>
          <p style={para}>
            The ₹49 Starter plan was a deliberate choice. I wanted to lower the barrier to entry
            so completely that a student in Tier 2 city could try the full product without hesitation.
            The value has to be undeniable before we ask for a recurring commitment.
          </p>
          <p style={{ ...para, marginBottom: 36 }}>
            I believe the next generation of creator tools will be built in India, by Indians,
            for the world. BoostMyReel is my contribution to that future.
          </p>

          {/* What's next */}
          <div style={{
            background: 'linear-gradient(160deg, #0f172a, #1e1b4b)',
            borderRadius: 20, padding: '32px 28px', marginBottom: 44,
            border: '1px solid rgba(99,102,241,0.25)',
          }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 16 }}>
              What's Next
            </p>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: 'white', margin: '0 0 20px' }}>
              The Roadmap
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { icon: '🔐', title: 'Full Account System', desc: 'JWT-based auth, history, saved analyses' },
                { icon: '📊', title: 'Creator Dashboard', desc: 'Track your growth, quota, and AI-generated insights over time' },
                { icon: '📱', title: 'Mobile App', desc: 'Native iOS + Android for on-the-go reel boosting' },
                { icon: '🌐', title: 'Multi-language Support', desc: 'Hindi, Tamil, Telugu captions and hooks' },
                { icon: '🤝', title: 'Agency / Team Plans', desc: 'Bulk processing, team workspaces, client management' },
              ].map(r => (
                <div key={r.title} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 20, flexShrink: 0, marginTop: 2 }}>{r.icon}</span>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'white', margin: '0 0 2px' }}>{r.title}</p>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: 0 }}>{r.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Closing */}
          <SectionHeading icon={<Zap size={20} />} color="#6366f1" bg="#eef2ff" title="A Note to Every Creator Reading This" />
          <p style={para}>
            If you're a creator spending hours on tasks that should take minutes — this was built for you.
            If you're a founder thinking about building something, the message is simple:
            start with the problem that makes you angry. The one you've complained about a hundred times.
            The one where you've thought "surely someone has fixed this already?"
          </p>
          <p style={para}>
            If no one has, it's your turn.
          </p>
          <p style={{ ...para, marginBottom: 48, fontWeight: 600, color: '#0f172a' }}>
            BoostMyReel started as a weekend project to solve my own frustration. Today it's a full product
            helping creators across India spend less time on packaging and more time on what actually
            matters — making great content.
          </p>

          {/* Author card */}
          <div style={{
            background: 'white', border: '1px solid #e2e8f0',
            borderRadius: 20, padding: '24px 28px',
            display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap',
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed, #db2777)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 26, color: 'white', fontWeight: 800,
            }}>
              R
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <p style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>Rohan</p>
              <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 10px', lineHeight: 1.5 }}>
                Founder of BoostMyReel · Building AI tools for the Indian creator economy ·
                Full-stack developer passionate about turning creator pain into product.
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['AI Product Builder', 'Creator Economy', 'Made in India'].map(tag => (
                  <span key={tag} style={{
                    fontSize: 11, fontWeight: 600, color: '#4f46e5',
                    background: '#eef2ff', border: '1px solid #c7d2fe',
                    borderRadius: 99, padding: '3px 10px',
                  }}>{tag}</span>
                ))}
              </div>
            </div>
          </div>

          {/* CTA */}
          <div style={{
            marginTop: 48, textAlign: 'center',
            background: 'linear-gradient(135deg, #eef2ff, #fdf4ff, #fff1f2)',
            borderRadius: 20, padding: '40px 28px',
            border: '1px solid #e2e8f0',
          }}>
            <div style={{ fontSize: 36, marginBottom: 14 }}>🚀</div>
            <h3 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 10px' }}>
              Try BoostMyReel free today
            </h3>
            <p style={{ fontSize: 14, color: '#64748b', margin: '0 auto 24px', maxWidth: 400, lineHeight: 1.6 }}>
              Upload your first video and see your viral score, AI hook, caption, hashtags
              and auto-subtitles — in under 30 seconds. No signup required.
            </p>
            <button
              onClick={onGetStarted}
              className="btn-primary"
              style={{ padding: '12px 36px', fontSize: 15 }}
            >
              <Zap size={16} fill="white" /> Get Started Free
            </button>
          </div>

          {/* Read Next */}
          <div style={{
            marginTop: 32, background: 'white', border: '1px solid #e2e8f0',
            borderRadius: 16, padding: '20px 24px',
          }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 14px' }}>
              Read Next
            </p>
            <button
              onClick={onWhyBest}
              style={{
                display: 'flex', alignItems: 'center', gap: 16, width: '100%',
                background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left',
              }}
            >
              <div style={{
                width: 52, height: 52, borderRadius: 12, flexShrink: 0,
                background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Trophy size={22} color="white" fill="white" />
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 2px' }}>
                  Why BoostMyReel Wins — And Why Other Tools Fall Short
                </p>
                <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Product Analysis · 10 min read</p>
              </div>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const para: React.CSSProperties = {
  fontSize: 15,
  color: '#374151',
  lineHeight: 1.85,
  margin: '0 0 20px',
};

function SectionHeading({
  icon, color, bg, title,
}: {
  icon: React.ReactNode;
  color: string;
  bg: string;
  title: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, marginTop: 44 }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
        background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {icon}
      </div>
      <h2 style={{ fontSize: 'clamp(17px, 2.5vw, 22px)', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: -0.4 }}>
        {title}
      </h2>
    </div>
  );
}
