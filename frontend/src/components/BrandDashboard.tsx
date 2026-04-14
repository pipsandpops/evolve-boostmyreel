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
  if (s === 'Active')  return '#16a34a';
  if (s === 'PaidOut') return '#7c3aed';
  return '#d97706';
}
function statusBg(s: string) {
  if (s === 'Active')  return '#dcfce7';
  if (s === 'PaidOut') return '#ede9fe';
  return '#fef3c7';
}

export default function BrandDashboard({ userId, onViewCampaign, onViewAnalytics, onBack }: Props) {
  const [campaigns, setCampaigns]     = useState<CampaignSummary[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showForm, setShowForm]       = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [created, setCreated]         = useState<{ joinCode: string; joinUrl: string } | null>(null);

  const [form, setForm] = useState<Omit<CreateCampaignPayload, 'brandUserId'>>({
    brandName:         '',
    title:             '',
    description:       '',
    themeHashtag:      '',
    contentGuidelines: '',
    prizeAmount:       0,
    prizeCurrency:     'INR',
    prizeDescription:  '',
    durationHours:     168,
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
        brandUserId:   userId,
        prizeAmount:   Number(form.prizeAmount),
        durationHours: Number(form.durationHours),
        themeHashtag:  form.themeHashtag?.startsWith('#') ? form.themeHashtag : form.themeHashtag ? `#${form.themeHashtag}` : undefined,
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
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <button onClick={onBack} style={ghostBtn}>← Back</button>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', marginTop: 12, marginBottom: 4 }}>
              Brand Dashboard
            </h1>
            <p style={{ color: '#475569', fontSize: 14 }}>Create campaigns, invite creators, track performance</p>
          </div>
          <button
            onClick={() => { setShowForm(true); setCreated(null); setCreateError(null); }}
            style={{ ...primaryBtn, display: 'flex', alignItems: 'center', gap: 6, marginTop: 12 }}
          >
            <Plus size={16} /> New Campaign
          </button>
        </div>

        {/* Create campaign form */}
        {showForm && (
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 28, marginBottom: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.07)' }}>
            {created ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>Campaign Created!</h2>
                <p style={{ color: '#475569', fontSize: 14, marginBottom: 20 }}>Share this link with creators to invite submissions:</p>
                <div style={{ background: '#f5f3ff', border: '1.5px solid #7c3aed', borderRadius: 10, padding: '14px 18px', marginBottom: 20 }}>
                  <code style={{ fontSize: 14, color: '#5b21b6', wordBreak: 'break-all', fontWeight: 600 }}>
                    {joinBase}{created.joinCode}
                  </code>
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                  <button onClick={() => navigator.clipboard.writeText(`${joinBase}${created.joinCode}`)} style={primaryBtn}>
                    📋 Copy Link
                  </button>
                  <button onClick={() => { setShowForm(false); setCreated(null); }} style={ghostBtn}>
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreate}>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 24 }}>New Brand Campaign</h2>

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
                  <textarea style={{ ...inputStyle, height: 80, resize: 'vertical' }} placeholder="What this campaign is about..." value={form.description} onChange={field('description')} />
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
                  <textarea style={{ ...inputStyle, height: 80, resize: 'vertical' }} placeholder="E.g. Must feature our product, 30–60 sec reel, use hashtag..." value={form.contentGuidelines} onChange={field('contentGuidelines')} />
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
                  Prize Description <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span>
                  <input style={inputStyle} placeholder="e.g. ₹10,000 + brand merchandise kit" value={form.prizeDescription} onChange={field('prizeDescription')} />
                </label>

                {createError && (
                  <p style={{ color: '#dc2626', fontSize: 13, marginTop: 4, background: '#fef2f2', padding: '8px 12px', borderRadius: 8 }}>
                    {createError}
                  </p>
                )}

                <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
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
          <p style={{ color: '#64748b', textAlign: 'center', padding: 60, fontSize: 15 }}>Loading your campaigns…</p>
        ) : campaigns.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>📣</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>No campaigns yet</h3>
            <p style={{ color: '#64748b', marginBottom: 24, fontSize: 14 }}>Create your first campaign and start inviting creators</p>
            <button
              onClick={() => { setShowForm(true); setCreated(null); setCreateError(null); }}
              style={{ ...primaryBtn, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Plus size={16} /> Create First Campaign
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {campaigns.map(c => (
              <div key={c.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '20px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Status + hashtag */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: statusColor(c.status), background: statusBg(c.status), padding: '3px 10px', borderRadius: 20 }}>
                        {c.status === 'Active' ? '🟢' : c.status === 'PaidOut' ? '✅' : '🏁'} {c.status}
                      </span>
                      {c.themeHashtag && (
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#7c3aed', background: '#f5f3ff', padding: '2px 8px', borderRadius: 20 }}>
                          {c.themeHashtag}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>{c.title}</h3>

                    {/* Stats row */}
                    <div style={{ display: 'flex', gap: 18, fontSize: 13, color: '#334155', flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600 }}>
                        <Trophy size={14} style={{ color: '#d97706' }} />
                        {c.prizeCurrency} {c.prizeAmount.toLocaleString()}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Users size={14} style={{ color: '#4f46e5' }} />
                        {c.entryCount} / 20 entries
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <BarChart2 size={14} style={{ color: '#0891b2' }} />
                        {c.totalVotes.toLocaleString()} votes
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Clock size={14} style={{ color: '#64748b' }} />
                        Ends {new Date(c.endsAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Join link */}
                    <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <code style={{ fontSize: 12, color: '#475569', background: '#f1f5f9', padding: '3px 8px', borderRadius: 6, wordBreak: 'break-all' }}>
                        {joinBase}{c.joinCode}
                      </code>
                      <button
                        onClick={() => navigator.clipboard.writeText(`${joinBase}${c.joinCode}`)}
                        style={{ fontSize: 12, fontWeight: 600, color: '#7c3aed', background: 'none', border: 'none', cursor: 'pointer', padding: 0, whiteSpace: 'nowrap' }}
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                    <button
                      onClick={() => onViewCampaign(c.joinCode)}
                      style={{ ...outlineBtn, display: 'flex', alignItems: 'center', gap: 5 }}
                    >
                      <ExternalLink size={13} /> View
                    </button>
                    <button
                      onClick={() => onViewAnalytics(c.id)}
                      style={{ ...outlineBtn, display: 'flex', alignItems: 'center', gap: 5 }}
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
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const primaryBtn: React.CSSProperties = {
  background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
  color: '#fff',
  border: 'none',
  borderRadius: 10,
  padding: '11px 22px',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
};

const ghostBtn: React.CSSProperties = {
  background: '#fff',
  color: '#334155',
  border: '1.5px solid #cbd5e1',
  borderRadius: 10,
  padding: '8px 16px',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
};

const outlineBtn: React.CSSProperties = {
  background: '#fff',
  color: '#334155',
  border: '1.5px solid #e2e8f0',
  borderRadius: 8,
  padding: '7px 14px',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#fff',
  border: '1.5px solid #e2e8f0',
  borderRadius: 8,
  color: '#0f172a',
  padding: '10px 12px',
  fontSize: 14,
  marginTop: 6,
  boxSizing: 'border-box',
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 700,
  color: '#334155',
  marginBottom: 14,
};

const grid2: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 16,
};
