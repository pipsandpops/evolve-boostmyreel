import { useState, useCallback, useEffect } from 'react';
import { Shield, Users, TrendingUp, GitBranch, RefreshCw } from 'lucide-react';

interface PaidUser {
  userId: string;
  plan: string;
  paymentId: string | null;
  orderId: string | null;
  paidAt: string;
  expiresAt: string | null;
  isExpired: boolean;
}

interface AdminData {
  paidUsers: PaidUser[];
  stats: {
    totalPaid: number;
    totalReferrals: number;
    successfulReferrals: number;
  };
}

const PLAN_COLORS: Record<string, string> = {
  starter: '#f59e0b',
  creator: '#4f46e5',
  pro:     '#db2777',
};

export function AdminPage() {
  const [data, setData]       = useState<AdminData | null>(null);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/users');
      if (!res.ok) { setError('Server error.'); return; }
      setData(await res.json());
    } catch {
      setError('Network error.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading && !data) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#94a3b8', fontSize: 15 }}>Loading…</span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#ef4444', fontSize: 15 }}>{error}</span>
      </div>
    );
  }

  if (!data) return null;

  const { paidUsers, stats } = data;

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', padding: '32px 24px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Shield size={22} color="#4f46e5" />
            <span style={{ fontSize: 20, fontWeight: 700, color: 'white' }}>BoostMyReel Admin</span>
          </div>
          <button onClick={fetchData} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: '#1e293b', border: '1px solid #334155',
            color: '#94a3b8', borderRadius: 8, padding: '7px 14px',
            cursor: 'pointer', fontSize: 13,
          }}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        {/* Stats cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 28 }}>
          {[
            { icon: <Users size={18} color="#4f46e5" />,     label: 'Paid Users',           value: stats.totalPaid,          bg: '#1e1b4b' },
            { icon: <GitBranch size={18} color="#f59e0b" />, label: 'Referrals',             value: stats.totalReferrals,     bg: '#1c1500' },
            { icon: <TrendingUp size={18} color="#db2777" />,label: 'Successful Referrals',  value: stats.successfulReferrals,bg: '#1f0a14' },
          ].map(c => (
            <div key={c.label} style={{
              background: c.bg, border: '1px solid #334155',
              borderRadius: 12, padding: '16px 18px',
            }}>
              {c.icon}
              <div style={{ fontSize: 26, fontWeight: 800, color: 'white', marginTop: 8 }}>{c.value}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{c.label}</div>
            </div>
          ))}
        </div>

        {/* Paid users table */}
        <div style={{
          background: '#1e293b', border: '1px solid #334155',
          borderRadius: 14, overflow: 'hidden',
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #334155' }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: 'white' }}>
              Paid Users ({paidUsers.length})
            </span>
          </div>

          {paidUsers.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#475569' }}>No paid users yet.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155' }}>
                    {['User ID', 'Plan', 'Paid At', 'Expires', 'Status'].map(h => (
                      <th key={h} style={{
                        padding: '10px 16px', textAlign: 'left',
                        fontSize: 11, fontWeight: 600, color: '#475569',
                        textTransform: 'uppercase', letterSpacing: 0.5,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paidUsers.map((u, i) => (
                    <tr key={u.userId} style={{
                      borderBottom: i < paidUsers.length - 1 ? '1px solid #1e293b' : 'none',
                      background: i % 2 === 0 ? 'transparent' : '#0f172a20',
                    }}>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12, color: '#94a3b8' }}>
                        {u.userId.slice(0, 8)}…{u.userId.slice(-4)}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700,
                          background: `${PLAN_COLORS[u.plan] ?? '#64748b'}22`,
                          color: PLAN_COLORS[u.plan] ?? '#94a3b8',
                          textTransform: 'capitalize',
                        }}>
                          {u.plan}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: '#cbd5e1' }}>
                        {new Date(u.paidAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: '#cbd5e1' }}>
                        {u.expiresAt
                          ? new Date(u.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                          : '—'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700,
                          background: u.isExpired ? '#7f1d1d33' : '#052e1633',
                          color: u.isExpired ? '#ef4444' : '#10b981',
                        }}>
                          {u.isExpired ? 'Expired' : 'Active'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
