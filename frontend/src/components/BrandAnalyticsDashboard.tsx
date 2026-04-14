import { useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import type { BrandRoiAnalytics } from '../types';

interface Props {
  battleId: string;
  brandUserId: string;
  onBack: () => void;
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function fmtCurrency(n: number) {
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export default function BrandAnalyticsDashboard({ battleId, brandUserId, onBack }: Props) {
  const [data, setData]     = useState<BrandRoiAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);
  const printRef            = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    api.getBrandRoi(battleId, brandUserId)
      .then(setData)
      .catch(e => setError(e?.message ?? 'Failed to load analytics'))
      .finally(() => setLoading(false));
  }, [battleId, brandUserId]);

  function handlePrint() {
    window.print();
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#888' }}>
        Loading analytics…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <p style={{ color: '#f87171', marginBottom: 16 }}>
          {error ?? 'Analytics not found.'}
        </p>
        <button onClick={onBack} style={btnStyle}>← Back</button>
      </div>
    );
  }

  const b = data.benchmark;

  return (
    <>
      {/* Print-only styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; color: #000 !important; }
        }
      `}</style>

      <div ref={printRef} style={{ maxWidth: 860, margin: '0 auto', padding: '24px 16px', color: '#e2e8f0' }}>

        {/* Header */}
        <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <button onClick={onBack} style={{ ...btnStyle, padding: '6px 14px', fontSize: 13 }}>← Back</button>
          <button onClick={handlePrint} style={{ ...btnStyle, background: '#3b82f6', padding: '6px 14px', fontSize: 13 }}>
            Download PDF
          </button>
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
          Campaign ROI Report
        </h1>
        <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 4 }}>
          {data.battleTitle ?? data.battleId}
          {data.themeHashtag && <> · <span style={{ color: '#7c3aed' }}>{data.themeHashtag}</span></>}
        </p>
        <p style={{ color: '#64748b', fontSize: 12, marginBottom: 28 }}>
          Status: <strong style={{ color: '#34d399' }}>{data.status}</strong>
          &nbsp;·&nbsp;
          {new Date(data.startedAt).toLocaleDateString()} – {new Date(data.endsAt).toLocaleDateString()}
        </p>

        {/* Benchmark banner */}
        <div style={{
          background: b.multiplier >= 2 ? 'linear-gradient(135deg,#4c1d95,#6d28d9)'
                    : b.multiplier >= 1 ? 'linear-gradient(135deg,#065f46,#047857)'
                    : 'linear-gradient(135deg,#1e3a5f,#1e40af)',
          borderRadius: 12,
          padding: '20px 24px',
          marginBottom: 28,
        }}>
          <span style={{ fontSize: 28, marginRight: 10 }}>{b.badge}</span>
          <span style={{ fontSize: 15, fontWeight: 600 }}>{b.verdict}</span>
          <div style={{ marginTop: 8, fontSize: 12, color: '#cbd5e1' }}>
            Industry avg ({b.industry}): {b.avgEngagementRate} &nbsp;·&nbsp; Your rate: {b.yourEngagementRate}
          </div>
        </div>

        {/* Reach */}
        <Section title="Reach">
          <Metric label="Page Views"       value={fmt(data.totalPageViews)} />
          <Metric label="Unique Visitors"  value={fmt(data.uniqueVisitors)} />
          <Metric label="Instagram Reach"  value={fmt(data.instagramReach)} />
          <Metric label="YouTube Reach"    value={fmt(data.youTubeReach)} />
          <Metric label="Total Reach"      value={fmt(data.totalReach)} highlight />
        </Section>

        {/* Engagement */}
        <Section title="Engagement">
          <Metric label="Total Votes"       value={fmt(data.totalVotes)} />
          <Metric label="Boosts Purchased"  value={String(data.totalBoostsPurchased)} />
          <Metric label="Boost Revenue"     value={fmtCurrency(data.totalBoostRevenue)} />
          <Metric label="Shares"            value={fmt(data.totalShares)} />
          <Metric label="Likes (delta)"     value={fmt(data.totalLikes)} />
          <Metric label="Comments (delta)"  value={fmt(data.totalComments)} />
          <Metric label="Engagement Rate"   value={data.engagementRate} highlight />
        </Section>

        {/* Brand */}
        <Section title="Brand Value">
          <Metric label="Hashtag Uses (est.)"   value={fmt(data.hashtagUsageEstimate)} />
          <Metric label="Estimated EMV"          value={fmtCurrency(data.estimatedEMV)} highlight />
          <Metric label="Cost Per Engagement"    value={fmtCurrency(data.costPerEngagement)} />
          <Metric label="Prize Pool Spend"       value={fmtCurrency(data.prizePoolSpend)} />
        </Section>

        <p style={{ fontSize: 11, color: '#475569', marginTop: 32, textAlign: 'center' }}>
          Generated by BoostMyReel · EMV calculated using industry-standard engagement value weights
        </p>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: 14, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
        {title}
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
        {children}
      </div>
    </div>
  );
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{
      background: highlight ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.04)',
      border: `1px solid ${highlight ? '#7c3aed' : 'rgba(255,255,255,0.08)'}`,
      borderRadius: 10,
      padding: '14px 16px',
    }}>
      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: highlight ? '#a78bfa' : '#f1f5f9' }}>{value}</div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.12)',
  color: '#e2e8f0',
  borderRadius: 8,
  padding: '8px 18px',
  cursor: 'pointer',
  fontSize: 14,
};
