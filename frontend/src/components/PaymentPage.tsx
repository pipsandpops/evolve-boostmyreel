import { useState } from 'react';
import { ArrowLeft, CreditCard, Smartphone, Lock, Check, ShieldCheck } from 'lucide-react';
import type { Plan } from './PricingSection';
import { api } from '../services/api';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: any;
  }
}

interface PaymentPageProps {
  plan: Plan;
  userId: string;
  onBack: () => void;
  onSuccess?: () => void;
}

type PayState = 'idle' | 'processing' | 'success' | 'error';

const GST_RATE = 0.18;

export function PaymentPage({ plan, userId, onBack, onSuccess }: PaymentPageProps) {
  const [payState, setPayState]   = useState<PayState>('idle');
  const [paymentId, setPaymentId] = useState('');
  const [errMsg, setErrMsg]       = useState('');
  const [name, setName]           = useState('');
  const [email, setEmail]         = useState('');
  const [nameErr, setNameErr]     = useState('');
  const [emailErr, setEmailErr]   = useState('');

  const gst   = Math.round(plan.price * GST_RATE);
  const total = plan.price + gst;

  // ── validate contact fields ───────────────────────────────────────
  const validate = () => {
    let ok = true;
    if (!name.trim()) { setNameErr('Name is required'); ok = false; } else setNameErr('');
    if (!email.trim() || !email.includes('@')) { setEmailErr('Valid email is required'); ok = false; } else setEmailErr('');
    return ok;
  };

  // ── open Razorpay checkout ─────────────────────────────────────────
  const handlePay = async () => {
    if (!validate()) return;
    setPayState('processing');

    try {
      // 1. Create order on backend → get real orderId + keyId
      const order = await api.createOrder(userId, plan.id);

      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'BoostMyReel',
        description: `${plan.name} Plan – ${plan.unit}`,
        order_id: order.orderId,
        prefill: { name, email },
        theme: { color: '#6366f1' },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          try {
            // 2. Verify payment signature on backend → store user as paid
            await api.verifyPayment(
              userId,
              response.razorpay_payment_id,
              response.razorpay_order_id,
              response.razorpay_signature,
              plan.id,
              email,
            );
            setPaymentId(response.razorpay_payment_id);
            setPayState('success');
            onSuccess?.();
          } catch {
            setErrMsg('Payment received but verification failed. Contact support.');
            setPayState('error');
          }
        },
        modal: { ondismiss: () => setPayState('idle') },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (resp: { error: { description: string } }) => {
        setErrMsg(resp.error?.description ?? 'Payment failed. Please try again.');
        setPayState('error');
      });
      rzp.open();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not start payment. Try again.';
      setErrMsg(msg);
      setPayState('error');
    }
  };

  // ── SUCCESS ──────────────────────────────────────────────────────────
  if (payState === 'success') {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div className="card" style={{ maxWidth: 460, width: '100%', borderRadius: 24, padding: '48px 36px', textAlign: 'center' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', margin: '0 auto 24px',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(16,185,129,0.3)',
          }}>
            <Check size={34} color="white" strokeWidth={2.5} />
          </div>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: '0 0 10px', letterSpacing: -0.5 }}>
            Payment Successful!
          </h2>
          <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 28px', lineHeight: 1.6 }}>
            You're now on the <strong style={{ color: '#0f172a' }}>{plan.name}</strong> plan.
            A receipt has been sent to <strong style={{ color: '#0f172a' }}>{email}</strong>.
          </p>

          {/* Receipt */}
          <div style={{ background: '#f8fafc', borderRadius: 14, padding: '16px 20px', marginBottom: 28, border: '1px solid #e2e8f0', textAlign: 'left' }}>
            {[
              { label: 'Plan',        value: plan.name },
              { label: 'Amount paid', value: `₹${total}` },
              { label: 'Payment ID',  value: paymentId },
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: '#64748b' }}>{r.label}</span>
                <span style={{ fontSize: r.label === 'Payment ID' ? 11 : 13, fontWeight: 600, color: '#0f172a', fontFamily: r.label === 'Payment ID' ? 'monospace' : 'inherit' }}>{r.value}</span>
              </div>
            ))}
          </div>

          <button onClick={onBack} className="btn-primary" style={{ width: '100%', padding: '13px', fontSize: 15 }}>
            Start Boosting Videos
          </button>
        </div>
      </div>
    );
  }

  // ── MAIN FORM ─────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>

      {/* Top bar */}
      <div style={{
        background: 'white', borderBottom: '1px solid #e2e8f0',
        padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', gap: 14,
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button onClick={onBack} className="btn-secondary" style={{ padding: '7px 14px', fontSize: 13 }}>
          <ArrowLeft size={14} /> Back
        </button>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Complete your purchase</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b' }}>
          <ShieldCheck size={14} color="#10b981" />
          Secured by Razorpay
        </div>
      </div>

      <div className="r-payment-grid" style={{ maxWidth: 820, margin: '0 auto', padding: '36px 24px' }}>

        {/* Left: contact + pay */}
        <div className="card" style={{ borderRadius: 20, padding: 28 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 6px', letterSpacing: -0.4 }}>
            Your details
          </h2>
          <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 22px' }}>
            We'll send the receipt to your email.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 28 }}>
            <Field label="Full Name" error={nameErr}>
              <input
                placeholder="Rahul Sharma"
                value={name}
                onChange={e => setName(e.target.value)}
                style={inputStyle(!!nameErr)}
              />
            </Field>
            <Field label="Email Address" error={emailErr}>
              <input
                placeholder="you@example.com"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={inputStyle(!!emailErr)}
              />
            </Field>
          </div>

          {/* Payment methods preview */}
          <div style={{ background: '#f8fafc', borderRadius: 14, padding: '16px 18px', marginBottom: 24, border: '1px solid #f1f5f9' }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#475569', margin: '0 0 12px', letterSpacing: 0.3 }}>
              ACCEPTED PAYMENT METHODS
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {[
                { icon: <CreditCard size={13} />, label: 'Credit / Debit Card', color: '#6366f1' },
                { icon: <Smartphone size={13} />, label: 'UPI (GPay, PhonePe, Paytm…)', color: '#10b981' },
              ].map(m => (
                <div key={m.label} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'white', border: '1px solid #e2e8f0', borderRadius: 8,
                  padding: '6px 12px', fontSize: 12, fontWeight: 500, color: '#475569',
                }}>
                  <span style={{ color: m.color }}>{m.icon}</span>
                  {m.label}
                </div>
              ))}
            </div>
            <p style={{ fontSize: 11, color: '#94a3b8', margin: '10px 0 0' }}>
              Razorpay securely handles your card and UPI details — we never see them.
            </p>
          </div>

          {/* Error */}
          {payState === 'error' && (
            <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
              <p style={{ fontSize: 13, color: '#be123c', margin: 0, fontWeight: 500 }}>⚠ {errMsg}</p>
            </div>
          )}

          {/* Pay button */}
          <button
            onClick={handlePay}
            disabled={payState === 'processing'}
            className="btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: 16, borderRadius: 14 }}
          >
            <Lock size={15} />
            {payState === 'processing' ? 'Opening payment…' : `Pay ₹${total} via Razorpay`}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 14 }}>
            <ShieldCheck size={13} color="#10b981" />
            <span style={{ fontSize: 12, color: '#94a3b8' }}>
              Payments processed by Razorpay · PCI-DSS compliant · SSL encrypted
            </span>
          </div>

        </div>

        {/* Right: Order summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          <div className="card" style={{ borderRadius: 20, padding: 22 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 16px' }}>Order Summary</h3>

            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16,
              background: '#f8fafc', borderRadius: 12, padding: '12px 14px',
              border: '1px solid #f1f5f9',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: `${plan.color}18`, color: plan.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                {plan.icon}
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>{plan.name} Plan</p>
                <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>{plan.unit}</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: '#64748b' }}>Price</span>
                <span style={{ fontSize: 13, color: '#0f172a', fontWeight: 500 }}>₹{plan.price}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: '#64748b' }}>GST (18%)</span>
                <span style={{ fontSize: 13, color: '#0f172a', fontWeight: 500 }}>₹{gst}</span>
              </div>
            </div>

            <div style={{ height: 1, background: '#f1f5f9', marginBottom: 12 }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Total</span>
              <span style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', letterSpacing: -0.5 }}>₹{total}</span>
            </div>
          </div>

          {/* What you get */}
          <div className="card" style={{ borderRadius: 20, padding: 22 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: '0 0 12px' }}>What's included</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
              {plan.features.map(f => (
                <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Check size={12} color="#10b981" strokeWidth={2.5} />
                  <span style={{ fontSize: 12, color: '#475569' }}>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { icon: <ShieldCheck size={13} />, text: 'SSL Encrypted', color: '#10b981' },
              { icon: <Lock size={13} />, text: 'PCI Compliant', color: '#6366f1' },
            ].map(b => (
              <div key={b.text} style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                background: 'white', border: '1px solid #e2e8f0', borderRadius: 10,
                padding: '8px 10px', fontSize: 11, fontWeight: 600, color: '#475569',
              }}>
                <span style={{ color: b.color }}>{b.icon}</span>
                {b.text}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

// ── helpers ──────────────────────────────────────────────────────────────────

function inputStyle(hasError: boolean): React.CSSProperties {
  return {
    width: '100%', padding: '11px 14px', borderRadius: 10, fontSize: 14,
    border: `1.5px solid ${hasError ? '#fca5a5' : '#e2e8f0'}`,
    background: hasError ? '#fff1f2' : 'white',
    color: '#0f172a', outline: 'none',
    transition: 'border-color 0.15s',
    boxSizing: 'border-box',
  };
}

function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6, letterSpacing: 0.2 }}>
        {label}
      </label>
      {children}
      {error && <p style={{ fontSize: 11, color: '#e11d48', margin: '5px 0 0', fontWeight: 500 }}>⚠ {error}</p>}
    </div>
  );
}
