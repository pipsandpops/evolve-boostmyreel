import { useState } from 'react';
import { Mail, KeyRound, X, CheckCircle } from 'lucide-react';
import { api } from '../services/api';

interface Props {
  onClose: () => void;
  onRecovered: (userId: string) => void;
}

export function RecoverAccessModal({ onClose, onRecovered }: Props) {
  const [step, setStep]     = useState<'email' | 'otp'>('email');
  const [email, setEmail]   = useState('');
  const [code, setCode]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState(false);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await api.requestOtp(email.trim().toLowerCase());
      setStep('otp');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await api.verifyOtp(email.trim().toLowerCase(), code.trim());
      // Restore userId in both localStorage and cookie
      localStorage.setItem('bmr_userId', res.userId);
      document.cookie = `bmr_uid=${encodeURIComponent(res.userId)};max-age=${365*24*3600};path=/;SameSite=Lax`;
      setSuccess(true);
      setTimeout(() => { onRecovered(res.userId); }, 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid or expired OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{
        background: 'white', borderRadius: 20, padding: 36,
        width: '100%', maxWidth: 400,
        boxShadow: '0 32px 80px rgba(0,0,0,0.2)',
        position: 'relative',
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: 16, right: 16,
          background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8',
        }}>
          <X size={18} />
        </button>

        {success ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <CheckCircle size={48} color="#10b981" style={{ margin: '0 auto 16px' }} />
            <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>PRO Access Restored!</div>
            <div style={{ fontSize: 14, color: '#64748b', marginTop: 8 }}>Reloading your session…</div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              {step === 'email' ? <Mail size={22} color="#4f46e5" /> : <KeyRound size={22} color="#4f46e5" />}
              <span style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
                {step === 'email' ? 'Recover PRO Access' : 'Enter OTP'}
              </span>
            </div>
            <p style={{ fontSize: 14, color: '#64748b', marginBottom: 24 }}>
              {step === 'email'
                ? 'Enter the email you used when you paid. We\'ll send a one-time code.'
                : `We sent a 6-digit code to ${email}. Enter it below.`}
            </p>

            {step === 'email' ? (
              <form onSubmit={handleRequestOtp}>
                <input
                  type="email" placeholder="your@email.com" value={email} required
                  onChange={e => setEmail(e.target.value)} autoFocus
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 10,
                    border: '1px solid #e2e8f0', fontSize: 14, marginBottom: 12,
                    outline: 'none', boxSizing: 'border-box',
                  }}
                />
                {error && <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 10 }}>{error}</div>}
                <button type="submit" disabled={loading} style={{
                  width: '100%', padding: '11px 0', borderRadius: 10,
                  background: 'linear-gradient(135deg, #4f46e5, #db2777)',
                  color: 'white', border: 'none', cursor: 'pointer',
                  fontSize: 14, fontWeight: 600, opacity: loading ? 0.7 : 1,
                }}>
                  {loading ? 'Sending…' : 'Send Code'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp}>
                <input
                  type="text" placeholder="6-digit code" value={code} required
                  onChange={e => setCode(e.target.value)} autoFocus maxLength={6}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 10,
                    border: '1px solid #e2e8f0', fontSize: 20, letterSpacing: 8,
                    textAlign: 'center', marginBottom: 12,
                    outline: 'none', boxSizing: 'border-box',
                  }}
                />
                {error && <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 10 }}>{error}</div>}
                <button type="submit" disabled={loading} style={{
                  width: '100%', padding: '11px 0', borderRadius: 10,
                  background: 'linear-gradient(135deg, #4f46e5, #db2777)',
                  color: 'white', border: 'none', cursor: 'pointer',
                  fontSize: 14, fontWeight: 600, opacity: loading ? 0.7 : 1,
                }}>
                  {loading ? 'Verifying…' : 'Restore Access'}
                </button>
                <button type="button" onClick={() => { setStep('email'); setError(''); setCode(''); }} style={{
                  width: '100%', marginTop: 8, padding: '8px 0',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 13, color: '#64748b',
                }}>
                  ← Use different email
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
