import { Zap, Shield, Sparkles, HeartHandshake, Globe, TrendingUp } from 'lucide-react';

export function AboutSection() {
  return (
    <section style={{ padding: '80px 24px', background: '#f8fafc' }} id="about">
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#ecfdf5', color: '#059669',
            padding: '4px 14px', borderRadius: 99, fontSize: 12, fontWeight: 600,
            border: '1px solid #a7f3d0', marginBottom: 14,
          }}>
            <HeartHandshake size={11} />
            About Us
          </span>
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 800, color: '#0f172a', margin: '0 0 16px', letterSpacing: -0.8 }}>
            Built by creators,{' '}
            <span className="gradient-text">for creators</span>
          </h2>
          <p style={{ color: '#64748b', fontSize: 15, margin: '0 auto', maxWidth: 560, lineHeight: 1.7 }}>
            ReelBooster was born from a simple frustration — spending hours writing captions
            and subtitles for short-form videos. We built the tool we always wanted.
          </p>
        </div>

        {/* Story */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32,
          marginBottom: 56, alignItems: 'center',
        }}>
          <div>
            <h3 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 14px', letterSpacing: -0.4 }}>
              Our story
            </h3>
            <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.8, margin: '0 0 14px' }}>
              In 2024, short-form video became the #1 discovery channel for brands and individual
              creators. Yet most creators still write their captions manually, search for trending
              hashtags by hand, and skip subtitles entirely — losing 80% of viewers who watch with
              sound off.
            </p>
            <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.8, margin: 0 }}>
              We combined <strong style={{ color: '#0f172a' }}>OpenAI Whisper</strong> for
              best-in-class speech transcription and{' '}
              <strong style={{ color: '#0f172a' }}>Anthropic Claude</strong> for viral content
              generation to build a pipeline that turns any raw video into a ready-to-post reel
              in under 30 seconds.
            </p>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {[
              { value: '<30s', label: 'Average processing time' },
              { value: '10+', label: 'Hashtags generated per video' },
              { value: '2 AI', label: 'Models working for you' },
              { value: '₹49', label: 'Starting price per boost' },
            ].map(s => (
              <div key={s.label} className="card" style={{ borderRadius: 16, padding: '20px 16px', textAlign: 'center' }}>
                <p style={{ fontSize: 28, fontWeight: 900, color: '#0f172a', margin: '0 0 4px', letterSpacing: -1 }}>
                  <span className="gradient-text">{s.value}</span>
                </p>
                <p style={{ fontSize: 12, color: '#64748b', margin: 0, lineHeight: 1.4 }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Values */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {[
            {
              icon: <Zap size={20} />, color: '#6366f1', bg: '#eef2ff',
              title: 'Speed first',
              desc: 'We believe your time is your most valuable asset. Every feature is designed to shave seconds off your workflow.',
            },
            {
              icon: <Sparkles size={20} />, color: '#a855f7', bg: '#fdf4ff',
              title: 'AI-native',
              desc: 'Not AI-sprinkled. Our entire pipeline — transcription, hook writing, captions — is powered by state-of-the-art models.',
            },
            {
              icon: <Shield size={20} />, color: '#0ea5e9', bg: '#f0f9ff',
              title: 'Privacy first',
              desc: 'Your videos are processed and deleted within 60 minutes. We never store or use your content for training.',
            },
            {
              icon: <TrendingUp size={20} />, color: '#10b981', bg: '#f0fdf4',
              title: 'Outcome focused',
              desc: 'Every suggestion we generate is optimised for reach, engagement and follows — not just to look impressive.',
            },
            {
              icon: <Globe size={20} />, color: '#f97316', bg: '#fff7ed',
              title: 'Made for India',
              desc: 'Pricing in ₹, UPI support and support in English and Hindi. Built with Indian creators in mind.',
            },
            {
              icon: <HeartHandshake size={20} />, color: '#db2777', bg: '#fdf2f8',
              title: 'Creator-led',
              desc: 'Every decision is made by asking one question: does this make a creator\'s life easier and their content better?',
            },
          ].map(v => (
            <div key={v.title} className="card card-hover" style={{ borderRadius: 16, padding: 22 }}>
              <div style={{
                width: 42, height: 42, borderRadius: 12, marginBottom: 14,
                background: v.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: v.color,
              }}>
                {v.icon}
              </div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>{v.title}</p>
              <p style={{ fontSize: 13, color: '#64748b', margin: 0, lineHeight: 1.6 }}>{v.desc}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
