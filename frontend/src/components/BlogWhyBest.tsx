import { ArrowLeft, Zap, CheckCircle2, XCircle, Trophy, Target, Layers, Globe, ShieldCheck, Star, Quote, TrendingUp, Sparkles } from 'lucide-react';
import { ShareBar } from './ShareBar';

interface BlogWhyBestProps {
  onBack: () => void;
  onFounderStory: () => void;
  onGetStarted: () => void;
}

export function BlogWhyBest({ onBack, onFounderStory, onGetStarted }: BlogWhyBestProps) {
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
        <span style={{ fontSize: 13, color: '#94a3b8', marginLeft: 4 }}>— Product Deep Dive</span>
      </div>

      <div style={{ maxWidth: 780, margin: '0 auto', padding: '48px 24px 80px' }}>

        {/* Category badge */}
        <div style={{ marginBottom: 20 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#fef3c7', color: '#d97706',
            padding: '5px 14px', borderRadius: 99, fontSize: 12, fontWeight: 700,
            border: '1px solid #fde68a', letterSpacing: 0.3,
          }}>
            <Trophy size={11} fill="#d97706" /> PRODUCT ANALYSIS
          </span>
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: 'clamp(26px, 4.5vw, 44px)', fontWeight: 900,
          color: '#0f172a', margin: '0 0 20px', letterSpacing: -1.5, lineHeight: 1.15,
        }}>
          Why BoostMyReel Wins —{' '}
          <span style={{
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed, #db2777)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            And Why Other Tools Fall Short
          </span>
        </h1>

        {/* Meta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 36, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 42, height: 42, borderRadius: '50%',
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed, #db2777)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, color: 'white', fontWeight: 700,
            }}>R</div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>Rohan</p>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Founder, BoostMyReel</p>
            </div>
          </div>
          <span style={{ color: '#e2e8f0' }}>|</span>
          <span style={{ fontSize: 13, color: '#94a3b8' }}>March 2026</span>
          <span style={{ color: '#e2e8f0' }}>|</span>
          <span style={{ fontSize: 13, color: '#94a3b8' }}>10 min read</span>
        </div>

        {/* Hero pull quote */}
        <div style={{
          background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
          borderRadius: 20, padding: '28px 32px', marginBottom: 44,
          border: '1px solid rgba(99,102,241,0.3)',
          position: 'relative',
        }}>
          <Quote size={32} color="rgba(165,180,252,0.4)" style={{ position: 'absolute', top: 20, left: 24 }} />
          <p style={{
            fontSize: 'clamp(15px, 2.2vw, 19px)', fontWeight: 600,
            color: 'white', lineHeight: 1.65, margin: 0, paddingLeft: 16, fontStyle: 'italic',
          }}>
            "Most tools give you one piece of the puzzle. BoostMyReel gives you the complete picture —
            from viral score prediction to ready-to-post reels — all in one place, built specifically
            for the Indian creator."
          </p>
        </div>

        <div style={{ lineHeight: 1.8, color: '#374151' }}>

          {/* Section 1: The Landscape */}
          <SH icon={<Layers size={20} />} color="#6366f1" bg="#eef2ff" title="The Fragmented Tool Landscape" />
          <p style={para}>
            If you're a content creator trying to grow on Instagram or YouTube Shorts today,
            you've probably tried at least 3 or 4 different tools. A caption generator here.
            A hashtag finder there. A subtitle burner for your desktop. A separate app for
            video cropping. A different platform for analytics.
          </p>
          <p style={para}>
            This fragmentation costs creators an average of <strong>2–4 hours per week</strong> just
            in tool-switching, file transfers, and re-doing work that one tool does slightly differently
            from another. Worse, none of these tools talk to each other — so you get generic captions
            that don't match your video's tone, hashtags that are too broad, and subtitles that
            drift out of sync.
          </p>
          <p style={{ ...para, marginBottom: 36 }}>
            BoostMyReel was built to end that fragmentation. But to understand why it wins,
            you first need to understand exactly where each category of existing tool fails.
          </p>

          {/* Competitor type breakdown */}
          <SH icon={<Target size={20} />} color="#f59e0b" bg="#fffbeb" title="Where Existing Tools Fall Short" />

          {/* Competitor 1 */}
          <CompetitorBlock
            type="Western AI Writing Platforms"
            emoji="✍️"
            whatTheyDo="Generate captions, hooks, and marketing copy using GPT-based models"
            gaps={[
              'Priced in USD ($49–$99/month) — unaffordable for most Indian creators',
              'No video context — you have to describe your video in text for it to generate anything',
              'Zero understanding of Indian English, code-switching, or regional tonality',
              'No subtitle generation, no video processing, no reel cropping',
              'Require a full monthly subscription before you can test if it works for you',
              'No viral score — no way to know if your content will actually perform',
            ]}
          />

          {/* Competitor 2 */}
          <CompetitorBlock
            type="Subtitle-Only Tools"
            emoji="💬"
            whatTheyDo="Transcribe your video and overlay captions — nothing more"
            gaps={[
              'Only solve one problem in a 10-step workflow',
              'No hook, caption, or hashtag generation',
              'No 9:16 cropping or vertical format optimization',
              'No engagement scoring or viral potential analysis',
              'Most charge per-minute of video processed — expensive for long-form content',
              'Auto-generated subtitles often fail on Indian accents and mixed-language speech',
            ]}
          />

          {/* Competitor 3 */}
          <CompetitorBlock
            type="Generic Social Media Schedulers with AI Add-ons"
            emoji="📅"
            whatTheyDo="Schedule posts with a basic AI caption helper bolted on"
            gaps={[
              '"AI" is surface-level — template fills with your product name, not genuine creative writing',
              'No video analysis — they can\'t read what\'s in your video',
              'No auto reel generation or scene detection',
              'Primarily built for brands and agencies, not individual creators',
              'Expensive team-focused pricing; solo creator plans are heavily restricted',
              'No subtitle generation, no viral scoring, no Instagram analytics integration',
            ]}
          />

          {/* Competitor 4 */}
          <CompetitorBlock
            type="Mobile-First Video Editor Apps"
            emoji="📱"
            whatTheyDo="Manual editing with basic AI filters, stickers, and auto-captions"
            gaps={[
              'Require you to manually edit every clip — no automation',
              'AI features are cosmetic (filters, transitions) not strategic (what performs best)',
              'No hook or caption writing — you still need to write your own copy',
              'Auto-captions are basic and don\'t understand your content contextually',
              'No viral score, no hashtag intelligence, no engagement analysis',
              'Can\'t generate 5 clips from 1 long video automatically',
            ]}
          />

          {/* Competitor 5 */}
          <CompetitorBlock
            type="Standalone Hashtag Generator Tools"
            emoji="#️⃣"
            whatTheyDo="Suggest hashtags based on keywords you manually type in"
            gaps={[
              'You type keywords — they don\'t analyze your actual video content',
              'No context means generic, over-saturated hashtags that don\'t drive discovery',
              'Solve only 1 of 10+ tasks a creator needs to publish',
              'No Indian-specific niche hashtag intelligence',
              'No integration with captions, subtitles, or performance prediction',
              'Free versions are severely limited; paid versions rarely justify the cost alone',
            ]}
          />

          {/* Section 3: What BMR does differently */}
          <SH icon={<Trophy size={20} />} color="#10b981" bg="#f0fdf4" title="What BoostMyReel Does Differently" />
          <p style={para}>
            BoostMyReel isn't trying to do one thing better than everyone else.
            It's trying to make the <em>entire creator workflow</em> faster — from raw video to
            published post — without requiring you to leave a single platform or
            spend more than 30 seconds on any step.
          </p>

          {/* Feature highlight cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, marginBottom: 36 }}>
            {[
              {
                icon: '🧠', title: 'Viral Score Predictor',
                desc: 'The only tool that tells you HOW viral your video is likely to be before you post — scored 0–100 by Claude AI.',
                badge: 'Unique to BMR',
                badgeColor: '#10b981', badgeBg: '#f0fdf4',
              },
              {
                icon: '🎬', title: 'Auto Reel Generator',
                desc: '1 long video → 5 ready-to-post vertical reels. Scene detection, engagement ranking, 9:16 crop, AI titles — fully automated.',
                badge: 'No competitor offers this',
                badgeColor: '#4f46e5', badgeBg: '#eef2ff',
              },
              {
                icon: '🔥', title: 'Hook + Caption + Hashtags',
                desc: 'All three — generated together from your actual video transcript by Claude. Context-aware, not template-based.',
                badge: 'Context-aware AI',
                badgeColor: '#8b5cf6', badgeBg: '#f5f3ff',
              },
              {
                icon: '📊', title: 'Instagram Analytics Integration',
                desc: 'Connect your Instagram for personalised view predictions based on your real follower count and engagement history.',
                badge: 'Personalised predictions',
                badgeColor: '#db2777', badgeBg: '#fdf2f8',
              },
              {
                icon: '🖼️', title: 'Image Growth Engine',
                desc: 'Upload carousel images and get post scores, caption suggestions, and visual optimization tips — not just for video creators.',
                badge: 'Multi-format',
                badgeColor: '#f97316', badgeBg: '#fff7ed',
              },
              {
                icon: '📝', title: 'Subtitle Burn-in',
                desc: 'Whisper-powered transcription + automatic subtitle overlay — burned directly into your video, frame-accurate.',
                badge: 'Whisper AI accuracy',
                badgeColor: '#0ea5e9', badgeBg: '#f0f9ff',
              },
            ].map(f => (
              <div key={f.title} style={{
                background: 'white', border: '1px solid #e2e8f0',
                borderRadius: 16, padding: '18px 16px',
              }}>
                <div style={{ fontSize: 26, marginBottom: 10 }}>{f.icon}</div>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>{f.title}</p>
                <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 10px', lineHeight: 1.5 }}>{f.desc}</p>
                <span style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: 0.3,
                  color: f.badgeColor, background: f.badgeBg,
                  border: `1px solid ${f.badgeColor}40`,
                  borderRadius: 99, padding: '2px 8px',
                }}>
                  {f.badge}
                </span>
              </div>
            ))}
          </div>

          {/* Section 4: Comparison table */}
          <SH icon={<TrendingUp size={20} />} color="#7c3aed" bg="#f5f3ff" title="Feature-by-Feature Comparison" />
          <p style={{ ...para, marginBottom: 20 }}>
            Here's how BoostMyReel stacks up against the five categories of tools creators
            currently use — and why combining all of them still doesn't match what BMR does out of the box.
          </p>

          <div style={{ overflowX: 'auto', marginBottom: 44 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600, fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'linear-gradient(135deg, #1e1b4b, #312e81)' }}>
                  <th style={{ ...th, textAlign: 'left', borderRadius: '10px 0 0 0' }}>Feature</th>
                  <th style={{ ...th, background: 'rgba(99,102,241,0.4)', borderRadius: '0 0 0 0' }}>
                    ⚡ BoostMyReel
                  </th>
                  <th style={th}>AI Writing Tools</th>
                  <th style={th}>Subtitle Tools</th>
                  <th style={th}>Video Editors</th>
                  <th style={{ ...th, borderRadius: '0 10px 0 0' }}>Schedulers</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Viral Score Prediction',        true,  false, false, false, false],
                  ['AI Hook Writing (video-aware)',  true,  false, false, false, false],
                  ['AI Caption Generation',          true,  true,  false, false, 'partial'],
                  ['Hashtag Intelligence',           true,  'partial', false, false, 'partial'],
                  ['Auto Subtitle Burn-in',          true,  false, true,  'partial', false],
                  ['Auto Reel Generator (1→5)',      true,  false, false, false, false],
                  ['9:16 Auto Crop',                 true,  false, false, true,  false],
                  ['Scene Detection + Ranking',      true,  false, false, false, false],
                  ['Instagram Analytics',            true,  false, false, false, true],
                  ['Image Post Analysis',            true,  false, false, false, false],
                  ['View Prediction by Follower Tier', true, false, false, false, false],
                  ['Indian Accent Recognition',      true,  false, 'partial', false, false],
                  ['UPI / ₹ Pricing',                true,  false, false, false, false],
                  ['No Account Needed to Start',     true,  false, false, true,  false],
                  ['Pay per Use (from ₹49)',         true,  false, false, false, false],
                ].map((row, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#f8fafc' }}>
                    <td style={{ ...td, fontWeight: 600, color: '#0f172a' }}>{row[0] as string}</td>
                    {(row.slice(1) as (boolean | string)[]).map((val, j) => (
                      <td key={j} style={{
                        ...td,
                        textAlign: 'center',
                        background: j === 0
                          ? (i % 2 === 0 ? 'rgba(99,102,241,0.05)' : 'rgba(99,102,241,0.08)')
                          : undefined,
                        fontWeight: j === 0 ? 700 : 400,
                      }}>
                        {val === true   && <CheckCircle2 size={16} color="#10b981" fill="#f0fdf4" strokeWidth={2.5} />}
                        {val === false  && <XCircle size={16} color="#cbd5e1" fill="#f8fafc" strokeWidth={2} />}
                        {val === 'partial' && <span style={{ fontSize: 16 }}>〜</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 8 }}>
              〜 = partial support only &nbsp;·&nbsp; Based on publicly available information as of March 2026
            </p>
          </div>

          {/* Section 5: India-first */}
          <SH icon={<Globe size={20} />} color="#f97316" bg="#fff7ed" title="The India-First Advantage" />
          <p style={para}>
            This is where the gap becomes most visible. The tools most creators currently use
            were designed in the United States, for a US audience, in standard American English.
            They work reasonably well if you're a lifestyle creator in New York.
            For a creator in Mumbai, Bangalore, or Jaipur — they often fail in subtle but damaging ways.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 32 }}>
            {[
              {
                icon: '🎙️',
                title: 'Accent-aware transcription',
                desc: 'Whisper AI trained on multilingual data outperforms competitors on Indian English, Hindi, Tamil, Telugu and code-mixed speech.',
              },
              {
                icon: '💰',
                title: 'Rupee pricing & UPI',
                desc: 'No dollar conversion, no international card required. Pay via UPI starting at ₹49 — less than a coffee.',
              },
              {
                icon: '📡',
                title: 'Mobile-network optimised',
                desc: 'Chunked uploads + Vercel edge proxy means the app works reliably on Jio and Airtel mobile data, not just WiFi.',
              },
              {
                icon: '🧠',
                title: 'Cultural context in AI copy',
                desc: 'Claude generates hooks and captions that resonate with Indian audiences — not generic Western marketing speak.',
              },
            ].map(f => (
              <div key={f.title} style={{
                background: 'white', border: '1px solid #fed7aa',
                borderRadius: 14, padding: '16px 14px',
              }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>{f.icon}</div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>{f.title}</p>
                <p style={{ fontSize: 12, color: '#64748b', margin: 0, lineHeight: 1.5 }}>{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Section 6: The real cost of alternatives */}
          <SH icon={<ShieldCheck size={20} />} color="#db2777" bg="#fdf2f8" title="The Real Cost of Using Alternatives" />
          <p style={para}>
            Let's do an honest calculation. If a creator tried to replicate BoostMyReel's full
            feature set by combining the best individual tools available:
          </p>

          <div style={{
            background: 'white', border: '1px solid #e2e8f0',
            borderRadius: 16, overflow: 'hidden', marginBottom: 20,
          }}>
            {[
              { tool: 'AI caption & hook writer', cost: '₹1,200–₹3,500/month', note: 'Basic plan, USD pricing' },
              { tool: 'Subtitle generation & burn-in tool', cost: '₹400–₹800/month', note: 'Per-minute pricing, Indian accent issues' },
              { tool: 'Hashtag research tool', cost: '₹300–₹600/month', note: 'Standalone tool, no video context' },
              { tool: 'Video cropping / editing app', cost: '₹200–₹500/month', note: 'Manual work still required' },
              { tool: 'Social analytics platform', cost: '₹800–₹2,000/month', note: 'Enterprise-focused pricing' },
            ].map((r, i) => (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '1fr auto',
                padding: '14px 18px', gap: 12, alignItems: 'center',
                borderBottom: i < 4 ? '1px solid #f1f5f9' : 'none',
                background: i % 2 === 0 ? 'white' : '#f8fafc',
              }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', margin: '0 0 2px' }}>{r.tool}</p>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{r.note}</p>
                </div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#e11d48', margin: 0, whiteSpace: 'nowrap' }}>{r.cost}</p>
              </div>
            ))}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr auto',
              padding: '16px 18px', gap: 12, alignItems: 'center',
              background: '#fff1f2', borderTop: '2px solid #fecdd3',
            }}>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#be123c', margin: 0 }}>Total monthly cost of alternatives</p>
              <p style={{ fontSize: 16, fontWeight: 900, color: '#be123c', margin: 0 }}>₹2,900–₹7,400/month</p>
            </div>
          </div>

          {/* vs BMR pricing */}
          <div style={{
            background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)',
            border: '2px solid #86efac', borderRadius: 16,
            padding: '20px 24px', marginBottom: 44,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16,
          }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#065f46', margin: '0 0 4px' }}>
                BoostMyReel — everything above, in one place
              </p>
              <p style={{ fontSize: 12, color: '#059669', margin: 0 }}>
                All features · No tool-switching · Built for Indian creators · UPI accepted
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 22, fontWeight: 900, color: '#059669', margin: 0 }}>From ₹49</p>
              <p style={{ fontSize: 11, color: '#6ee7b7', margin: 0 }}>per use · or ₹499/month Pro</p>
            </div>
          </div>

          {/* Section 7: Why we win */}
          <SH icon={<Sparkles size={20} />} color="#4f46e5" bg="#eef2ff" title="The 5 Reasons BoostMyReel Wins" />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 44 }}>
            {[
              {
                num: '01',
                title: 'Complete workflow, not a single feature',
                desc: 'From raw video to viral score, AI hook, caption, hashtags, subtitle burn-in, and 5 ready-to-post reels — everything happens in one place. Competitors solve one step. We solve all of them.',
                color: '#4f46e5',
              },
              {
                num: '02',
                title: 'AI that actually understands your video',
                desc: 'We don\'t ask you to describe your video in a text box. We transcribe it with Whisper, analyse the content with Claude, and generate creative assets that are genuinely specific to what\'s in your video.',
                color: '#7c3aed',
              },
              {
                num: '03',
                title: 'The only platform that predicts virality before you post',
                desc: 'Our Viral Score engine scores your content on hook strength, engagement potential, pacing, and keyword density — then tells you how many views you can realistically expect based on your follower tier.',
                color: '#8b5cf6',
              },
              {
                num: '04',
                title: 'Auto Reel Generator — no competitor comes close',
                desc: 'Upload one long video. Get back 5 ranked, cropped, titled, and subtitle-burned reels ready to post. Scene detection, motion scoring, and AI title generation — fully automated in under 5 minutes.',
                color: '#db2777',
              },
              {
                num: '05',
                title: 'Priced for real creators, not enterprises',
                desc: '₹49 gets you a full single-use boost. ₹499/month unlocks everything. No USD conversion, no hidden fees, no annual commitment. UPI, cards, and net banking all supported.',
                color: '#f97316',
              },
            ].map(r => (
              <div key={r.num} style={{
                display: 'flex', gap: 18, background: 'white',
                border: '1px solid #e2e8f0', borderRadius: 16, padding: '20px 22px',
                borderLeft: `4px solid ${r.color}`,
              }}>
                <div style={{
                  fontSize: 12, fontWeight: 900, color: r.color,
                  letterSpacing: -0.5, flexShrink: 0, paddingTop: 2,
                  opacity: 0.4,
                }}>
                  {r.num}
                </div>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>{r.title}</p>
                  <p style={{ fontSize: 13, color: '#64748b', margin: 0, lineHeight: 1.65 }}>{r.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Closing */}
          <div style={{
            background: 'linear-gradient(160deg, #0f172a, #1e1b4b)',
            borderRadius: 20, padding: '32px 28px', marginBottom: 44,
            border: '1px solid rgba(99,102,241,0.25)', textAlign: 'center',
          }}>
            <div style={{ fontSize: 36, marginBottom: 14 }}>🏆</div>
            <p style={{ fontSize: 'clamp(15px, 2vw, 19px)', fontWeight: 700, color: 'white', margin: '0 0 12px', lineHeight: 1.5 }}>
              The creator who wins in 2026 isn't the one who works the hardest.<br />
              It's the one who works the <em style={{ color: '#a5b4fc' }}>smartest</em>.
            </p>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', margin: '0 0 24px', lineHeight: 1.65 }}>
              BoostMyReel gives you the AI infrastructure to produce more content,
              reach more people, and grow faster — without burning out on post-production.
            </p>
            <button onClick={onGetStarted} className="btn-primary" style={{ padding: '12px 36px', fontSize: 15 }}>
              <Zap size={16} fill="white" /> Try it Free — No Signup Needed
            </button>
          </div>

          {/* Share */}
          <ShareBar
            title="Why BoostMyReel Wins — And Why Other Tools Fall Short"
            description="A full competitor comparison: 15 features, 5 tool categories, and why BoostMyReel is the only all-in-one AI reel tool built for Indian creators."
            url="https://boostmyreel.com/og/blog-why-best"
          />

          {/* Read next */}
          <div style={{
            marginTop: 20, background: 'white', border: '1px solid #e2e8f0',
            borderRadius: 16, padding: '20px 24px',
          }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 14px' }}>
              Read Next
            </p>
            <button
              onClick={onFounderStory}
              style={{
                display: 'flex', alignItems: 'center', gap: 16, width: '100%',
                background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left',
              }}
            >
              <div style={{
                width: 52, height: 52, borderRadius: 12, flexShrink: 0,
                background: 'linear-gradient(135deg, #4f46e5, #db2777)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Star size={22} color="white" fill="white" />
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 2px' }}>
                  From Frustration to Viral Reels: How I Built BoostMyReel
                </p>
                <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Founder's Story · 8 min read</p>
              </div>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function CompetitorBlock({ type, emoji, whatTheyDo, gaps }: {
  type: string;
  emoji: string;
  whatTheyDo: string;
  gaps: string[];
}) {
  return (
    <div style={{
      background: 'white', border: '1px solid #e2e8f0',
      borderRadius: 16, padding: '20px 22px', marginBottom: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <span style={{ fontSize: 24 }}>{emoji}</span>
        <div>
          <p style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', margin: 0 }}>{type}</p>
          <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>{whatTheyDo}</p>
        </div>
      </div>
      <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: 0.5, textTransform: 'uppercase', margin: '0 0 10px' }}>
        What they miss
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {gaps.map((g, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <XCircle size={14} color="#f87171" fill="#fff1f2" strokeWidth={2} style={{ flexShrink: 0, marginTop: 2 }} />
            <p style={{ fontSize: 13, color: '#374151', margin: 0, lineHeight: 1.5 }}>{g}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SH({ icon, color, bg, title }: { icon: React.ReactNode; color: string; bg: string; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, marginTop: 44 }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
        background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {icon}
      </div>
      <h2 style={{ fontSize: 'clamp(16px, 2.5vw, 22px)', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: -0.4 }}>
        {title}
      </h2>
    </div>
  );
}

const para: React.CSSProperties = {
  fontSize: 15, color: '#374151', lineHeight: 1.85, margin: '0 0 20px',
};

const th: React.CSSProperties = {
  padding: '12px 14px', color: 'white', fontWeight: 700,
  fontSize: 11, letterSpacing: 0.3, textAlign: 'center',
  textTransform: 'uppercase',
};

const td: React.CSSProperties = {
  padding: '10px 14px', color: '#374151',
  borderBottom: '1px solid #f1f5f9',
  fontSize: 13,
};
