import { useEffect, useState, useCallback } from 'react';
import { Gift, Copy, Check, Users, Zap, X } from 'lucide-react';
import { api } from '../services/api';

interface Props {
  userId: string;
  onClose: () => void;
}

interface ReferralData {
  referralUrl: string;
  credits: number;
  stats: { total: number; pending: number; successful: number };
}

const MILESTONES = [
  { count: 1,  reward: '+3 extra videos/day for 7 days' },
  { count: 3,  reward: '1 month Starter plan free' },
  { count: 5,  reward: '1 month Creator plan free' },
  { count: 10, reward: '50% off Pro — lifetime' },
];

export function ReferralPanel({ userId, onClose }: Props) {
  const [data, setData]       = useState<ReferralData | null>(null);
  const [copied, setCopied]   = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getReferralLink(userId)
      .then(res => setData({ referralUrl: res.referralUrl, credits: res.credits, stats: res.stats }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  const copyLink = useCallback(() => {
    if (!data) return;
    navigator.clipboard.writeText(data.referralUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }, [data]);

  const shareWhatsApp = useCallback(() => {
    if (!data) return;
    const text = encodeURIComponent(
      `I'm using BoostMyReel to go viral on Instagram — try it free! 🚀\n${data.referralUrl}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }, [data]);

  const successful = data?.stats.successful ?? 0;
  const nextMilestone = MILESTONES.find(m => m.count > successful);
  const progressPct = nextMilestone
    ? Math.min(100, Math.round((successful / nextMilestone.count) * 100))
    : 100;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }} onClick={onClose}>
      <div style={{
        background: 'white', borderRadius: 20, padding: 28,
        width: '100%', maxWidth: 480,
        boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 12,
              background: 'linear-gradient(135deg, #4f46e5, #db2777)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Gift size={18} color="white" />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Refer & Earn</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>Share BoostMyReel, earn Boost Credits</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8' }}>Loading…</div>
        ) : (
          <>
            {/* Credits balance */}
            <div style={{
              background: 'linear-gradient(135deg, #eef2ff, #fdf2f8)',
              border: '1px solid #c7d2fe', borderRadius: 12, padding: '12px 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 20,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Zap size={16} color="#4f46e5" fill="#4f46e5" />
                <span style={{ fontSize: 14, fontWeight: 600, color: '#4f46e5' }}>Boost Credits</span>
              </div>
              <span style={{ fontSize: 22, fontWeight: 800, color: '#4f46e5' }}>{data?.credits ?? 0}</span>
            </div>

            {/* Referral link */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Your referral link
              </div>
              <div style={{
                display: 'flex', gap: 8, alignItems: 'center',
                background: '#f8fafc', border: '1px solid #e2e8f0',
                borderRadius: 10, padding: '10px 12px',
              }}>
                <span style={{ flex: 1, fontSize: 13, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {data?.referralUrl}
                </span>
                <button onClick={copyLink} style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: copied ? '#10b981' : '#4f46e5', color: 'white',
                  fontSize: 12, fontWeight: 600, transition: 'background 0.2s', flexShrink: 0,
                }}>
                  {copied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
                </button>
              </div>
            </div>

            {/* Share button */}
            <button onClick={shareWhatsApp} style={{
              width: '100%', padding: '11px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: '#25d366', color: 'white', fontSize: 14, fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              marginBottom: 20,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.554 4.118 1.524 5.847L0 24l6.302-1.505A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.007-1.37l-.36-.213-3.737.892.933-3.636-.234-.373A9.818 9.818 0 1112 21.818z"/>
              </svg>
              Share on WhatsApp
            </button>

            {/* Stats */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 20,
            }}>
              {[
                { label: 'Total', value: data?.stats.total ?? 0, color: '#475569' },
                { label: 'Pending', value: data?.stats.pending ?? 0, color: '#f59e0b' },
                { label: 'Earned', value: data?.stats.successful ?? 0, color: '#10b981' },
              ].map(s => (
                <div key={s.label} style={{
                  background: '#f8fafc', border: '1px solid #e2e8f0',
                  borderRadius: 10, padding: '10px 8px', textAlign: 'center',
                }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Milestone progress */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Milestone Rewards
              </div>
              {MILESTONES.map(m => {
                const done = successful >= m.count;
                return (
                  <div key={m.count} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 0',
                    borderBottom: '1px solid #f1f5f9',
                    opacity: done ? 1 : 0.55,
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                      background: done ? 'linear-gradient(135deg, #4f46e5, #db2777)' : '#e2e8f0',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700,
                      color: done ? 'white' : '#94a3b8',
                    }}>
                      {done ? '✓' : m.count}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{m.reward}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>{m.count} successful referral{m.count > 1 ? 's' : ''}</div>
                    </div>
                    {!done && nextMilestone?.count === m.count && (
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#4f46e5' }}>Next</span>
                    )}
                  </div>
                );
              })}

              {/* Progress bar toward next milestone */}
              {nextMilestone && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 11, color: '#94a3b8' }}>
                    <span>{successful} / {nextMilestone.count} referrals</span>
                    <span>{progressPct}%</span>
                  </div>
                  <div style={{ height: 6, background: '#e2e8f0', borderRadius: 99 }}>
                    <div style={{
                      height: '100%', borderRadius: 99,
                      width: `${progressPct}%`,
                      background: 'linear-gradient(90deg, #4f46e5, #db2777)',
                      transition: 'width 0.6s ease',
                    }} />
                  </div>
                </div>
              )}
            </div>

            {/* How it works */}
            <div style={{
              marginTop: 18, padding: '10px 14px', borderRadius: 10,
              background: '#f0fdf4', border: '1px solid #bbf7d0',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Users size={13} color="#16a34a" />
                <span style={{ fontSize: 12, fontWeight: 600, color: '#16a34a' }}>How it works</span>
              </div>
              <p style={{ fontSize: 12, color: '#15803d', margin: 0, lineHeight: 1.6 }}>
                Share your link → friend uploads their first video → you earn <strong>5 Boost Credits</strong>.
                Your friend gets <strong>1 extra free video</strong> on their first day.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
