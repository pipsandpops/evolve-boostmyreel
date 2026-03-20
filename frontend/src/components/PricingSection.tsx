import { Check, Zap, Star, Infinity } from 'lucide-react';

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

export const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 49,
    unit: 'per request',
    description: 'Perfect for trying out ReelBooster on a single video.',
    features: [
      '1 video boost',
      'AI viral hook',
      'Caption + hashtags',
      'Auto subtitles (SRT)',
      'Subtitle burn-in',
      'Valid for 24 hours',
    ],
    highlight: false,
    icon: <Zap size={20} />,
    color: '#6366f1',
  },
  {
    id: 'creator',
    name: 'Creator',
    price: 199,
    unit: 'per month',
    description: 'For consistent creators who post multiple times a week.',
    features: [
      '30 video boosts / month',
      'AI viral hook',
      'Caption + hashtags',
      'Auto subtitles (SRT)',
      'Subtitle burn-in',
      'Priority processing',
      'Email support',
    ],
    highlight: true,
    badge: 'Most Popular',
    icon: <Star size={20} />,
    color: '#7c3aed',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 499,
    unit: 'per month',
    description: 'Unlimited power for agencies and serious creators.',
    features: [
      'Unlimited video boosts',
      'AI viral hook',
      'Caption + hashtags',
      'Auto subtitles (SRT)',
      'Subtitle burn-in',
      'Priority processing',
      'Dedicated support',
      'API access (coming soon)',
    ],
    highlight: false,
    icon: <Infinity size={20} />,
    color: '#db2777',
  },
];

interface PricingSectionProps {
  onSelectPlan: (plan: Plan) => void;
}

export function PricingSection({ onSelectPlan }: PricingSectionProps) {
  return (
    <section style={{ padding: '80px 24px', background: '#ffffff' }} id="pricing">
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#fdf4ff', color: '#a855f7',
            padding: '4px 14px', borderRadius: 99, fontSize: 12, fontWeight: 600,
            border: '1px solid #e9d5ff', marginBottom: 14,
          }}>
            <Star size={11} fill="#a855f7" />
            Simple Pricing
          </span>
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 800, color: '#0f172a', margin: '0 0 12px', letterSpacing: -0.8 }}>
            Start for just <span className="gradient-text">₹49</span>
          </h2>
          <p style={{ color: '#64748b', fontSize: 15, margin: 0 }}>
            No subscription required. Pay as you go, or save more with a monthly plan.
          </p>
        </div>

        {/* Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, alignItems: 'start' }}>
          {PLANS.map(plan => (
            <div
              key={plan.id}
              className="card"
              style={{
                borderRadius: 20, padding: 28, position: 'relative', overflow: 'hidden',
                border: plan.highlight ? '2px solid #7c3aed' : '1px solid #e2e8f0',
                transform: plan.highlight ? 'scale(1.03)' : 'scale(1)',
                boxShadow: plan.highlight ? '0 8px 40px rgba(124,58,237,0.18)' : undefined,
                transition: 'box-shadow 0.2s, transform 0.2s',
              }}
              onMouseEnter={e => {
                if (!plan.highlight) {
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.1)';
                  (e.currentTarget as HTMLElement).style.transform = 'scale(1.01)';
                }
              }}
              onMouseLeave={e => {
                if (!plan.highlight) {
                  (e.currentTarget as HTMLElement).style.boxShadow = '';
                  (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                }
              }}
            >
              {/* Badge */}
              {plan.badge && (
                <div style={{
                  position: 'absolute', top: 16, right: 16,
                  background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                  color: 'white', fontSize: 11, fontWeight: 700,
                  padding: '3px 10px', borderRadius: 99,
                }}>
                  {plan.badge}
                </div>
              )}

              {/* Icon + name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 12,
                  background: `${plan.color}18`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: plan.color,
                }}>
                  {plan.icon}
                </div>
                <p style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', margin: 0 }}>{plan.name}</p>
              </div>

              {/* Price */}
              <div style={{ marginBottom: 8 }}>
                <span style={{ fontSize: 42, fontWeight: 900, color: '#0f172a', letterSpacing: -2 }}>₹{plan.price}</span>
                <span style={{ fontSize: 14, color: '#94a3b8', fontWeight: 500, marginLeft: 4 }}>{plan.unit}</span>
              </div>
              <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 20px', lineHeight: 1.5 }}>
                {plan.description}
              </p>

              {/* CTA */}
              <button
                onClick={() => onSelectPlan(plan)}
                className={plan.highlight ? 'btn-primary' : 'btn-secondary'}
                style={{ width: '100%', padding: '12px', fontSize: 14, borderRadius: 12, marginBottom: 20 }}
              >
                {plan.id === 'starter' ? 'Pay ₹9 Now' : `Get ${plan.name}`}
              </button>

              {/* Divider */}
              <div style={{ height: 1, background: '#f1f5f9', marginBottom: 16 }} />

              {/* Features */}
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {plan.features.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                      background: `${plan.color}18`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Check size={11} color={plan.color} strokeWidth={2.5} />
                    </div>
                    <span style={{ fontSize: 13, color: '#475569' }}>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 12, marginTop: 28 }}>
          All prices are in Indian Rupees (₹) · Secure payments via card & UPI · Cancel anytime
        </p>

      </div>
    </section>
  );
}
