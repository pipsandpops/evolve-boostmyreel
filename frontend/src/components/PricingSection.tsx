import { Check, X, Zap, Sparkles } from 'lucide-react';

export interface Plan {
  id: string;
  name: string;
  price: number;
  unit: string;
  description: string;
  features: string[];
  highlight: boolean;
  badge?: string;
  icon: React.ReactNode;
  color: string;
}

// Only the paid plan is passed to onSelectPlan / payment flow
export const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 99,
    unit: 'per month',
    description: 'For creators who want to grow consistently every week.',
    features: [
      '15 video boosts / month',
      'AI viral hook + caption',
      'Hashtag generator',
      'Auto subtitles (SRT)',
      'Subtitle burn-in',
      'URL reel analysis',
      'Priority processing',
      'Email support',
    ],
    highlight: true,
    badge: 'Best Value',
    icon: <Zap size={20} />,
    color: '#7c3aed',
  },
];

const FREE_FEATURES_YES = [
  '1 free video boost',
  'AI viral hook + caption',
  'Hashtag generator',
  'Auto subtitles (SRT)',
];

const FREE_FEATURES_NO = [
  'Subtitle burn-in',
  'URL reel analysis',
  'Priority processing',
];

interface PricingSectionProps {
  onSelectPlan: (plan: Plan) => void;
  onStartFree?: () => void;
}

export function PricingSection({ onSelectPlan, onStartFree }: PricingSectionProps) {
  const starter = PLANS[0];

  return (
    <section style={{ padding: '80px 24px', background: '#ffffff' }} id="pricing">
      <div style={{ maxWidth: 820, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#fdf4ff', color: '#a855f7',
            padding: '4px 14px', borderRadius: 99, fontSize: 12, fontWeight: 600,
            border: '1px solid #e9d5ff', marginBottom: 14,
          }}>
            <Sparkles size={11} />
            Simple Pricing — No Surprises
          </span>
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 800, color: '#0f172a', margin: '0 0 12px', letterSpacing: -0.8 }}>
            Start free. Upgrade when you're ready.
          </h2>
          <p style={{ color: '#64748b', fontSize: 15, margin: 0 }}>
            No credit card needed to start. Cancel anytime.
          </p>
        </div>

        {/* Two-plan grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'stretch' }}>

          {/* ── Free card ── */}
          <div className="card" style={{ borderRadius: 20, padding: 32, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{
                width: 42, height: 42, borderRadius: 12,
                background: '#f1f5f9',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Sparkles size={20} color="#64748b" />
              </div>
              <p style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', margin: 0 }}>Free</p>
            </div>

            <div style={{ marginBottom: 6 }}>
              <span style={{ fontSize: 42, fontWeight: 900, color: '#0f172a', letterSpacing: -2 }}>₹0</span>
            </div>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 24px', lineHeight: 1.5 }}>
              Try it once, no commitment. See the magic before you pay.
            </p>

            <button
              onClick={onStartFree}
              className="btn-secondary"
              style={{ width: '100%', padding: '12px', fontSize: 14, borderRadius: 12, marginBottom: 24 }}
            >
              Start for Free
            </button>

            <div style={{ height: 1, background: '#f1f5f9', marginBottom: 20 }} />

            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 11, flex: 1 }}>
              {FREE_FEATURES_YES.map(f => (
                <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                    background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Check size={11} color="#16a34a" strokeWidth={2.5} />
                  </div>
                  <span style={{ fontSize: 13, color: '#475569' }}>{f}</span>
                </li>
              ))}
              {FREE_FEATURES_NO.map(f => (
                <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                    background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <X size={11} color="#dc2626" strokeWidth={2.5} />
                  </div>
                  <span style={{ fontSize: 13, color: '#94a3b8', textDecoration: 'line-through' }}>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Starter card ── */}
          <div
            className="card"
            style={{
              borderRadius: 20, padding: 32, position: 'relative', overflow: 'hidden',
              border: '2px solid #7c3aed',
              boxShadow: '0 8px 40px rgba(124,58,237,0.18)',
              display: 'flex', flexDirection: 'column',
            }}
          >
            {/* Badge */}
            <div style={{
              position: 'absolute', top: 16, right: 16,
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              color: 'white', fontSize: 11, fontWeight: 700,
              padding: '3px 10px', borderRadius: 99,
            }}>
              {starter.badge}
            </div>

            {/* Glow blob */}
            <div style={{
              position: 'absolute', top: -40, right: -40,
              width: 160, height: 160, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{
                width: 42, height: 42, borderRadius: 12,
                background: '#ede9fe',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#7c3aed',
              }}>
                {starter.icon}
              </div>
              <p style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', margin: 0 }}>{starter.name}</p>
            </div>

            <div style={{ marginBottom: 6 }}>
              <span style={{ fontSize: 42, fontWeight: 900, color: '#0f172a', letterSpacing: -2 }}>₹{starter.price}</span>
              <span style={{ fontSize: 14, color: '#94a3b8', fontWeight: 500, marginLeft: 4 }}>{starter.unit}</span>
            </div>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 24px', lineHeight: 1.5 }}>
              {starter.description}
            </p>

            <button
              onClick={() => onSelectPlan(starter)}
              className="btn-primary"
              style={{ width: '100%', padding: '12px', fontSize: 14, borderRadius: 12, marginBottom: 24 }}
            >
              Get Starter — ₹99/mo
            </button>

            <div style={{ height: 1, background: '#ede9fe', marginBottom: 20 }} />

            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 11, flex: 1 }}>
              {starter.features.map(f => (
                <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                    background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Check size={11} color="#7c3aed" strokeWidth={2.5} />
                  </div>
                  <span style={{ fontSize: 13, color: '#475569' }}>{f}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* Responsive: stack on mobile */}
        <style>{`
          @media (max-width: 600px) {
            #pricing .r-pricing-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>

        {/* Footer */}
        <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 12, marginTop: 28 }}>
          All prices in Indian Rupees (₹) · Secure payments via UPI & card · Cancel anytime
        </p>

      </div>
    </section>
  );
}
