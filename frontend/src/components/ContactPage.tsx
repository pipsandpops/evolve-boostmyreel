import { useState } from 'react';
import {
  ArrowLeft, Mail, MessageSquare, Send, CheckCircle2,
  Instagram, Linkedin, Youtube, Twitter, Zap, Clock, Headphones,
} from 'lucide-react';

interface ContactPageProps {
  onBack: () => void;
}

type SendState = 'idle' | 'sending' | 'success';

interface FormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
}

const SUBJECTS = [
  'General Question',
  'Technical Support',
  'Billing / Payments',
  'Feature Request',
  'Partnership',
  'Other',
];

export function ContactPage({ onBack }: ContactPageProps) {
  const [form, setForm]         = useState<FormData>({ name: '', email: '', subject: '', message: '' });
  const [errors, setErrors]     = useState<FormErrors>({});
  const [sendState, setSendState] = useState<SendState>('idle');

  const set = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!form.name.trim())                      e.name    = 'Name is required';
    if (!form.email.trim() || !form.email.includes('@')) e.email = 'Valid email is required';
    if (!form.subject)                          e.subject = 'Please select a subject';
    if (form.message.trim().length < 10)        e.message = 'Message must be at least 10 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSendState('sending');

    // ── Replace this block with a real API call, e.g. Formspree:
    // await fetch('https://formspree.io/f/YOUR_FORM_ID', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(form),
    // });
    await new Promise(r => setTimeout(r, 1400));

    setSendState('success');
  };

  // ── Success screen ────────────────────────────────────────────────────────
  if (sendState === 'success') {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div className="card" style={{ maxWidth: 460, width: '100%', borderRadius: 24, padding: '48px 36px', textAlign: 'center' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', margin: '0 auto 24px',
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(79,70,229,0.3)',
          }}>
            <CheckCircle2 size={34} color="white" strokeWidth={2} />
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: '0 0 10px', letterSpacing: -0.5 }}>
            Message sent!
          </h2>
          <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 8px', lineHeight: 1.6 }}>
            Thanks, <strong style={{ color: '#0f172a' }}>{form.name}</strong>. We've received your message
            and will reply to <strong style={{ color: '#0f172a' }}>{form.email}</strong> within 24 hours.
          </p>
          <p style={{ color: '#94a3b8', fontSize: 13, margin: '0 0 32px' }}>
            In the meantime, feel free to upload another video and boost it!
          </p>
          <button onClick={onBack} className="btn-primary" style={{ width: '100%', padding: 13, fontSize: 15 }}>
            Back to ReelBooster
          </button>
        </div>
      </div>
    );
  }

  // ── Main page ─────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>

      {/* Top bar */}
      <div style={{
        background: 'white', borderBottom: '1px solid #e2e8f0',
        padding: '0 24px', height: 60,
        display: 'flex', alignItems: 'center', gap: 14,
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button onClick={onBack} className="btn-secondary" style={{ padding: '7px 14px', fontSize: 13 }}>
          <ArrowLeft size={14} /> Back
        </button>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Contact Us</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b' }}>
          <Headphones size={14} color="#4f46e5" />
          We reply within 24 hours
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px 64px' }}>

        {/* Hero text */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#eef2ff', color: '#4f46e5',
            padding: '4px 14px', borderRadius: 99, fontSize: 12, fontWeight: 600,
            border: '1px solid #c7d2fe', marginBottom: 14,
          }}>
            <MessageSquare size={12} />
            Get in Touch
          </span>
          <h1 style={{
            fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 800,
            color: '#0f172a', margin: '0 0 12px', letterSpacing: -0.8, lineHeight: 1.2,
          }}>
            We'd love to hear from you
          </h1>
          <p style={{ color: '#64748b', fontSize: 15, margin: 0, lineHeight: 1.6 }}>
            Have a question, feedback, or want to partner with us? Drop us a message.
          </p>
        </div>

        {/* Two-column layout */}
        <div className="r-grid-2" style={{ alignItems: 'start', gap: 28 }}>

          {/* ── Left: Form ─────────────────────────────────────────────── */}
          <div className="card" style={{ borderRadius: 20, padding: 28 }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', margin: '0 0 20px', letterSpacing: -0.3 }}>
              Send a message
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              <Field label="Full Name" error={errors.name}>
                <input
                  placeholder="Rahul Sharma"
                  value={form.name}
                  onChange={set('name')}
                  style={inputStyle(!!errors.name)}
                />
              </Field>

              <Field label="Email Address" error={errors.email}>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={set('email')}
                  style={inputStyle(!!errors.email)}
                />
              </Field>

              <Field label="Subject" error={errors.subject}>
                <select
                  value={form.subject}
                  onChange={set('subject')}
                  style={{ ...inputStyle(!!errors.subject), appearance: 'none', cursor: 'pointer' }}
                >
                  <option value="">Select a subject…</option>
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>

              <Field label="Message" error={errors.message}>
                <textarea
                  placeholder="Tell us how we can help…"
                  rows={5}
                  value={form.message}
                  onChange={set('message')}
                  style={{ ...inputStyle(!!errors.message), resize: 'vertical', lineHeight: 1.6, minHeight: 120 }}
                />
                <p style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0 0', textAlign: 'right' }}>
                  {form.message.length} / 1000
                </p>
              </Field>

            </div>

            <button
              onClick={handleSubmit}
              disabled={sendState === 'sending'}
              className="btn-primary"
              style={{ width: '100%', padding: '13px', fontSize: 15, borderRadius: 12, marginTop: 24 }}
            >
              {sendState === 'sending' ? (
                <>
                  <span style={{ display: 'inline-block', animation: 'spin 0.9s linear infinite', lineHeight: 0 }}>
                    <Send size={15} />
                  </span>
                  Sending…
                </>
              ) : (
                <>
                  <Send size={15} />
                  Send Message
                </>
              )}
            </button>
          </div>

          {/* ── Right: Info panel ───────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Contact details */}
            <div className="card" style={{ borderRadius: 20, padding: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 16px' }}>
                Contact Details
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  {
                    icon: <Mail size={16} color="#4f46e5" />,
                    label: 'Email',
                    value: 'support@reelbooster.in',
                    href: 'mailto:support@reelbooster.in',
                  },
                  {
                    icon: <Clock size={16} color="#7c3aed" />,
                    label: 'Response time',
                    value: 'Within 24 hours',
                    href: null,
                  },
                  {
                    icon: <Zap size={16} color="#db2777" />,
                    label: 'Support hours',
                    value: 'Mon – Sat, 9 AM – 7 PM IST',
                    href: null,
                  },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                      background: '#f8fafc', border: '1px solid #e2e8f0',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {item.icon}
                    </div>
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {item.label}
                      </p>
                      {item.href ? (
                        <a href={item.href} style={{ fontSize: 13, color: '#4f46e5', fontWeight: 600, textDecoration: 'none' }}>
                          {item.value}
                        </a>
                      ) : (
                        <p style={{ fontSize: 13, color: '#334155', fontWeight: 500, margin: 0 }}>{item.value}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Social links */}
            <div className="card" style={{ borderRadius: 20, padding: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 14px' }}>
                Follow Us
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { icon: <Instagram size={16} />, label: 'Instagram',  handle: '@reelbooster',     color: '#e1306c', bg: '#fff1f5', href: '#' },
                  { icon: <Linkedin size={16} />,  label: 'LinkedIn',   handle: 'ReelBooster',      color: '#0a66c2', bg: '#eff6ff', href: '#' },
                  { icon: <Youtube size={16} />,   label: 'YouTube',    handle: 'ReelBooster Tips', color: '#ff0000', bg: '#fff5f5', href: '#' },
                  { icon: <Twitter size={16} />,   label: 'Twitter / X',handle: '@reelbooster_ai',  color: '#0f172a', bg: '#f8fafc', href: '#' },
                ].map(s => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 14px', borderRadius: 12,
                      background: s.bg, border: '1px solid #e2e8f0',
                      textDecoration: 'none', transition: 'transform 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'translateX(3px)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'translateX(0)'}
                  >
                    <span style={{ color: s.color }}>{s.icon}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', margin: 0 }}>{s.label}</p>
                      <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>{s.handle}</p>
                    </div>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>→</span>
                  </a>
                ))}
              </div>
            </div>

            {/* FAQ teaser */}
            <div style={{
              background: 'linear-gradient(135deg, #f5f3ff, #fdf2f8)',
              border: '1px solid #e9d5ff',
              borderRadius: 16, padding: '18px 20px',
            }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#6d28d9', margin: '0 0 6px' }}>
                💡 Quick answers
              </p>
              <p style={{ fontSize: 12, color: '#7c3aed', margin: '0 0 12px', lineHeight: 1.5 }}>
                Most questions are answered instantly in our About section — check it out before sending!
              </p>
              <button
                onClick={onBack}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 600, color: '#7c3aed',
                  padding: 0, textDecoration: 'underline',
                }}
              >
                ← Go to About section
              </button>
            </div>

          </div>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── helpers ───────────────────────────────────────────────────────────────────

function inputStyle(hasError: boolean): React.CSSProperties {
  return {
    width: '100%', padding: '11px 14px', borderRadius: 10, fontSize: 14,
    border: `1.5px solid ${hasError ? '#fca5a5' : '#e2e8f0'}`,
    background: hasError ? '#fff1f2' : 'white',
    color: '#0f172a', outline: 'none',
    transition: 'border-color 0.15s',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
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
