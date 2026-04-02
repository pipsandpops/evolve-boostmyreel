import { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { CampaignSummary, CreateCampaignPayload } from '../types';
import { Plus, BarChart2, Users, Trophy, Clock, ExternalLink, ChevronRight } from 'lucide-react';

interface Props {
  userId: string;
  onViewCampaign: (joinCode: string) => void;
  onViewAnalytics: (campaignId: string) => void;
  onBack: () => void;
}

const CURRENCIES = ['INR', 'USD', 'AED', 'GBP'];
const DURATIONS  = [
  { label: '24 hours',  value: 24  },
  { label: '3 days',    value: 72  },
  { label: '7 days',    value: 168 },
  { label: '14 days',   value: 336 },
  { label: '30 days',   value: 720 },
];

function statusColor(s: string) {
  if (s === 'Active')  return '#34d399';
  if (s === 'PaidOut') return '#a78bfa';
  return '#f59e0b';
}

export default function BrandDashboard({ userId, onViewCampaign, onViewAnalytics, onBack }: Props) {
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ joinCode: string; joinUrl: string } | null>(null);

  // Form state
  const [form, setForm] = useState<Omit<CreateCampaignPayload, 'brandUserId'>>({
    brandName:        '',
    title:            '',
    description:      '',
    themeHashtag:     '',
    contentGuidelines:'',
    prizeAmount:      0,
    prizeCurrency:    'INR',
    prizeDescription: '',
    durationHours:    168,
  });

  useEffect(() => {
    api.getMyCampaigns(userId)
      .then(setCampaigns)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  function field(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.brandName.trim() || !form.title.trim()) {
      setCreateError('Brand name and campaign title are required.');
      return;
    }
    setSubmitting(true);
    setCreateError(null);
    try {
      const res = await api.createCampaign({
        ...form,
        brandUserId: userId,
        prizeAmount: Number(form.prizeAmount),
        durationHours: Number(form.durationHours),
        themeHashtag: form.themeHashtag?.startsWith('#') ? form.themeHashtag : form.themeHashtag ? `#${form.themeHashtag}` : undefined,
      });
      setCreated({ joinCode: res.joinCode, joinUrl: res.joinUrl });
      const updated = await api.getMyCampaigns(userId);
      setCampaigns(updated);
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create campaign.');
    } finally {
      setSubmitting(false);
    }
  }

  const joinBase = `${window.location.origin}/campaign/`;

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 16px', color: '#e2e8f0' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <button onClick={onBack} style={ghostBtn}>← Back</button>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginTop: 8 }}>Brand Dashboard</h1>
          <p style={{ color: '#64748b', fontSize: 13 }}>Create and manage your creator campaigns</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setCreated(null); setCreateError(null); }}
          style={{ ...primaryBtn, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Plus size={16} /> New Campaign
        </button>
      </div>

      {/* Create campaign form */}
      {showForm && (
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 24, marginBottom: 28 }}>
          {created ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Campaign Created!</h2>
              <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16 }}>Share this link with creators to invite submissions:</p>
              <div style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid #7c3aed', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
                <code style={{ fontSize: 15, color: '#a78bfa', wordBreak: 'break-all' }}>
                  {joinBase}{created.joinCode}
                </code>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button
                  onClick={() => navigator.clipboard.writeText(`${joinBase}${created.joinCode}`)}
                  style={primaryBtn}
                >
                  Copy Link
                </button>
                <button
                  onClick={() => { setShowForm(false); setCreated(null); }}
                  style={ghostBtn}
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleCreate}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>New Brand Campaign</h2>

              <div style={grid2}>
                <label style={labelStyle}>
                  Brand / Company Name *
                  <input style={inputStyle} placeholder="e.g. Pepsi India" value={form.brandName} onChange={field('brandName')} required />
                </label>
                <label style={labelStyle}>
                  Campaign Title *
                  <input style={inputStyle} placeholder="e.g. PepsiClash Summer 2025" value={form.title} onChange={field('title')} required />
                </label>
              </div>

              <label style={labelStyle}>
                Description
                <textarea style={{ ...inputStyle, height: 72, resize: 'vertical' }} placeholder="What this campaign is about..." value={form.description} onChange={field('description')} />
              </label>

              <div style={grid2}>
                <label style={labelStyle}>
                  Theme Hashtag
                  <input style={inputStyle} placeholder="#PepsiClash" value={form.themeHashtag} onChange={field('themeHashtag')} />
                </label>
                <label style={labelStyle}>
                  Duration
                  <select style={inputStyle} value={form.durationHours} onChange={field('durationHours')}>
                    {DURATIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </label>
              </div>

              <label style={labelStyle}>
                Content Guidelines
                <textarea style={{ ...inputStyle, height: 72, resize: 'vertical' }} placeholder="E.g. Must feature our product, 30–60 sec reel, use hashtag..." value={form.contentGuidelines} onChange={field('contentGuidelines')} />
              </label>

              <div style={grid2}>
                <label style={labelStyle}>
                  Prize Amount
                  <input style={inputStyle} type="number" min={0} placeholder="10000" value={form.prizeAmount || ''} onChange={field('prizeAmount')} />
                </label>
                <label style={labelStyle}>
                  Currency
                  <select style={inputStyle} value={form.prizeCurrency} onChange={field('prizeCurrency')}>
                    {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </label>
              </div>

              <label style={labelStyle}>
                Prize Description <span style={{ color: '#64748b', fontWeight: 400 }}>(optional extra details)</span>
                <input style={inputStyle} placeholder="e.g. ₹10,000 + brand merchandise kit" value={form.prizeDescription} onChange={field('prizeDescription')} />
              </label>

              {createError && <p style={{ color: '#f87171', fontSize: 13, marginTop: 4 }}>{createError}</p>}

              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button type="submit" disabled={submitting} style={primaryBtn}>
                  {submitting ? 'Creating…' : 'Create Campaign'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} style={ghostBtn}>Cancel</button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Campaign list */}
      {loading ? (
        <p style={{ color: '#64748b', textAlign: 'center', padding: 40 }}>Loading your campaigns…</p>
      ) : campaigns.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📣</div>
          <p style={{ color: '#64748b', marginBottom: 16 }}>No campaigns yet. Create your first one!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {campaigns.map(c => (
            <div key={c.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: statusColor(c.status), background: `${statusColor(c.status)}22`, padding: '2px 8px', borderRadius: 20 }}>
                      {c.status}
                    </span>
                    {c.themeHashtag && <span style={{ fontSize: 12, color: '#7c3aed' }}>{c.themeHashtag}</span>}
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{c.title}</h3>
                  <div style={{ display: 'flex', gap: 20, fontSize: 12, color: '#94a3b8', flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Trophy size={13} /> {c.prizeCurrency} {c.prizeAmount.toLocaleString()} prize
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Users size={13} /> {c.entryCount} / 20 entries
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <BarChart2 size={13} /> {c.totalVotes.toLocaleString()} votes
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={13} /> Ends {new Date(c.endsAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <code style={{ fontSize: 11, color: '#64748b' }}>{joinBase}{c.joinCode}</code>
                    <button
                      onClick={() => navigator.clipboard.writeText(`${joinBase}${c.joinCode}`)}
                      style={{ fontSize: 10, color: '#7c3aed', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      Copy
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => onViewCampaign(c.joinCode)}
                    style={{ ...ghostBtn, display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}
                  >
                    <ExternalLink size={13} /> View
                  </button>
                  <button
                    onClick={() => onViewAnalytics(c.id)}
                    style={{ ...ghostBtn, display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}
                  >
                    <BarChart2 size={13} /> Analytics
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {campaigns.length > 0 && (
        <button
          onClick={() => { setShowForm(true); setCreated(null); setCreateError(null); }}
          style={{ ...primaryBtn, marginTop: 20, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Plus size={15} /> Create Another Campaign <ChevronRight size={15} />
        </button>
      )}
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const primaryBtn: React.CSSProperties = {
  background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
  color: '#fff',
  border: 'none',
  borderRadius: 10,
  padding: '10px 20px',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
};

const ghostBtn: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  color: '#e2e8f0',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  padding: '8px 16px',
  fontSize: 13,
  cursor: 'pointer',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  color: '#e2e8f0',
  padding: '10px 12px',
  fontSize: 14,
  marginTop: 6,
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: '#94a3b8',
  marginBottom: 14,
};

const grid2: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 16,
};
