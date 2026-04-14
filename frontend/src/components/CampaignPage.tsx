import { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { CampaignDetail, CampaignLeaderboardEntry } from '../types';
import { Trophy, Users, Clock, ExternalLink, Check, Zap } from 'lucide-react';

interface Props {
  joinCode: string;
  userId: string;
  brandUserId?: string;
  onBack: () => void;
}

const PLATFORMS = ['Instagram', 'YouTube', 'TikTok'];

function timeLeft(endsAt: string) {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return 'Ended';
  const days    = Math.floor(diff / 86_400_000);
  const hours   = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  if (days > 0)  return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}

function getVoterToken() {
  return localStorage.getItem('bmr_voter_token') ?? (() => {
    const t = crypto.randomUUID();
    localStorage.setItem('bmr_voter_token', t);
    return t;
  })();
}

export default function CampaignPage({ joinCode, userId, brandUserId, onBack }: Props) {
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const [showSubmit, setShowSubmit]       = useState(false);
  const [handle, setHandle]               = useState('');
  const [reelUrl, setReelUrl]             = useState('');
  const [platform, setPlatform]           = useState('Instagram');
  const [paymentHandle, setPaymentHandle] = useState('');
  const [submitting, setSubmitting]       = useState(false);
  const [submitMsg, setSubmitMsg]         = useState<string | null>(null);
  const [myEntryId, setMyEntryId]         = useState<string | null>(null);

  const [voting, setVoting]     = useState<string | null>(null);
  const [votedFor, setVotedFor] = useState<string | null>(null);
  const [voteMsg, setVoteMsg]   = useState<string | null>(null);

  const [markingPaid, setMarkingPaid] = useState(false);
  const [paidMsg, setPaidMsg]         = useState<string | null>(null);

  const isBrand = !!brandUserId && brandUserId === campaign?.brandUserId;

  useEffect(() => {
    load();
    const iv = setInterval(load, 30_000);
    return () => clearInterval(iv);
  }, [joinCode]);

  async function load() {
    try {
      const data = await api.getCampaignByJoinCode(joinCode);
      setCampaign(data);
    } catch {
      setError('Campaign not found.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!handle.trim() || !reelUrl.trim()) return;
    setSubmitting(true);
    setSubmitMsg(null);
    try {
      const res = await api.joinCampaign(campaign!.id, {
        creatorHandle: handle.startsWith('@') ? handle : `@${handle}`,
        reelUrl,
        platform,
        creatorUserId: userId,
        paymentHandle: paymentHandle || undefined,
      });
      setMyEntryId(res.entryId);
      setSubmitMsg('✅ Entry submitted! Share the campaign link to get votes.');
      setShowSubmit(false);
      await load();
    } catch (err: unknown) {
      setSubmitMsg(err instanceof Error ? err.message : 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVote(entryId: string) {
    if (votedFor || voting) return;
    setVoting(entryId);
    setVoteMsg(null);
    try {
      const res = await api.voteCampaign(campaign!.id, entryId, getVoterToken());
      if (res.voted) {
        setVotedFor(entryId);
        setVoteMsg('✅ Your vote has been recorded!');
        await load();
      } else {
        setVoteMsg('You have already voted in this campaign.');
      }
    } catch {
      setVoteMsg('You have already voted in this campaign.');
    } finally {
      setVoting(null);
    }
  }

  async function handleMarkPaid() {
    if (!brandUserId || !campaign) return;
    setMarkingPaid(true);
    setPaidMsg(null);
    try {
      await api.markCampaignPaid(campaign.id, brandUserId);
      setPaidMsg('✅ Campaign marked as paid out!');
      await load();
    } catch {
      setPaidMsg('Failed to mark as paid.');
    } finally {
      setMarkingPaid(false);
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#64748b', fontSize: 15 }}>Loading campaign…</p>
    </div>
  );

  if (error || !campaign) return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <p style={{ color: '#dc2626', fontSize: 15, fontWeight: 600 }}>{error ?? 'Campaign not found.'}</p>
      <button onClick={onBack} style={ghostBtn}>← Back</button>
    </div>
  );

  const isActive  = campaign.status === 'Active';
  const isEnded   = campaign.status === 'Ended';
  const isPaidOut = campaign.status === 'PaidOut';
  const winner    = campaign.entries.find(e => e.entryId === campaign.winnerEntryId);

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '32px 20px' }}>
        <button onClick={onBack} style={{ ...ghostBtn, marginBottom: 24 }}>← Back</button>

        {/* Campaign hero card */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, padding: '28px 28px 24px', marginBottom: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ flex: 1 }}>
              {/* Status badges */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{
                  fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20,
                  background: isActive ? '#dcfce7' : isPaidOut ? '#ede9fe' : '#fef3c7',
                  color:      isActive ? '#15803d' : isPaidOut ? '#6d28d9' : '#b45309',
                }}>
                  {isActive ? '🟢 LIVE' : isPaidOut ? '✅ PAID OUT' : '🏁 ENDED'}
                </span>
                {campaign.themeHashtag && (
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#7c3aed', background: '#f5f3ff', padding: '4px 12px', borderRadius: 20 }}>
                    {campaign.themeHashtag}
                  </span>
                )}
              </div>

              <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>{campaign.title}</h1>
              <p style={{ fontSize: 13, color: '#64748b', marginBottom: campaign.description ? 10 : 0 }}>
                by <strong style={{ color: '#334155' }}>{campaign.brandName}</strong>
              </p>
              {campaign.description && (
                <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.6, marginTop: 6 }}>{campaign.description}</p>
              )}
            </div>

            {/* Prize */}
            <div style={{ background: '#fffbeb', border: '1.5px solid #fcd34d', borderRadius: 12, padding: '16px 20px', textAlign: 'center', flexShrink: 0 }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#b45309' }}>
                {campaign.prizeCurrency} {campaign.prizeAmount.toLocaleString()}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#92400e', marginTop: 2 }}>Prize</div>
              {campaign.prizeDescription && (
                <div style={{ fontSize: 11, color: '#b45309', marginTop: 4 }}>{campaign.prizeDescription}</div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 24, marginTop: 20, fontSize: 13, color: '#475569', flexWrap: 'wrap', borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
              <Users size={15} style={{ color: '#4f46e5' }} /> {campaign.entryCount} / {campaign.maxEntries} entries
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
              <Clock size={15} style={{ color: '#0891b2' }} /> {timeLeft(campaign.endsAt)}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
              <Trophy size={15} style={{ color: '#d97706' }} /> Pure audience vote
            </span>
          </div>

          {/* Guidelines */}
          {campaign.contentGuidelines && (
            <div style={{ marginTop: 16, padding: '12px 16px', background: '#f8fafc', borderRadius: 10, fontSize: 13, color: '#334155', borderLeft: '4px solid #7c3aed' }}>
              <strong style={{ color: '#0f172a' }}>Guidelines: </strong>{campaign.contentGuidelines}
            </div>
          )}
        </div>

        {/* Winner banner */}
        {(isEnded || isPaidOut) && winner && (
          <div style={{ background: '#fffbeb', border: '1.5px solid #fcd34d', borderRadius: 14, padding: '18px 22px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ fontSize: 40 }}>🏆</div>
            <div>
              <p style={{ fontWeight: 800, fontSize: 16, color: '#92400e' }}>Winner: {winner.creatorHandle}</p>
              <p style={{ fontSize: 13, color: '#b45309', marginTop: 2 }}>
                {winner.votes.toLocaleString()} votes · {isPaidOut ? 'Prize paid ✅' : 'Prize pending'}
              </p>
            </div>
            <a href={winner.reelUrl} target="_blank" rel="noreferrer"
              style={{ marginLeft: 'auto', color: '#7c3aed', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
            >
              Watch <ExternalLink size={13} />
            </a>
          </div>
        )}

        {/* Brand: mark paid */}
        {isBrand && isEnded && !isPaidOut && (
          <div style={{ background: '#f5f3ff', border: '1.5px solid #7c3aed', borderRadius: 14, padding: '20px 24px', marginBottom: 24 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#3b0764', marginBottom: 8 }}>Campaign has ended</p>
            {winner && (
              <p style={{ fontSize: 14, color: '#4c1d95', marginBottom: 16 }}>
                Winner: <strong>{winner.creatorHandle}</strong> · {winner.votes.toLocaleString()} votes
              </p>
            )}
            <p style={{ fontSize: 13, color: '#5b21b6', marginBottom: 16 }}>
              Transfer the prize to the winner, then click below to mark it as paid.
            </p>
            <button onClick={handleMarkPaid} disabled={markingPaid} style={primaryBtn}>
              {markingPaid ? 'Marking…' : '✅ Mark Prize as Paid'}
            </button>
            {paidMsg && <p style={{ fontSize: 13, marginTop: 10, color: '#15803d', fontWeight: 600 }}>{paidMsg}</p>}
          </div>
        )}

        {/* Submit entry */}
        {isActive && !myEntryId && (
          <div style={{ marginBottom: 28 }}>
            {!showSubmit ? (
              <button onClick={() => setShowSubmit(true)} style={{ ...primaryBtn, width: '100%', fontSize: 15, padding: '16px 20px' }}>
                🎬 Submit Your Reel to Win {campaign.prizeCurrency} {campaign.prizeAmount.toLocaleString()}
              </button>
            ) : (
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '24px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 20 }}>Submit Your Entry</h3>
                <form onSubmit={handleSubmit}>
                  <label style={labelStyle}>
                    Your @handle *
                    <input style={inputStyle} placeholder="@yourhandle" value={handle} onChange={e => setHandle(e.target.value)} required />
                  </label>
                  <label style={labelStyle}>
                    Reel / Video URL *
                    <input style={inputStyle} placeholder="https://www.instagram.com/reel/..." value={reelUrl} onChange={e => setReelUrl(e.target.value)} required />
                  </label>
                  <label style={labelStyle}>
                    Platform
                    <select style={inputStyle} value={platform} onChange={e => setPlatform(e.target.value)}>
                      {PLATFORMS.map(p => <option key={p}>{p}</option>)}
                    </select>
                  </label>
                  <label style={labelStyle}>
                    UPI / Payment Handle <span style={{ color: '#94a3b8', fontWeight: 400 }}>(for prize payout if you win)</span>
                    <input style={inputStyle} placeholder="yourname@upi" value={paymentHandle} onChange={e => setPaymentHandle(e.target.value)} />
                  </label>
                  {submitMsg && (
                    <p style={{ color: submitMsg.startsWith('✅') ? '#15803d' : '#dc2626', fontSize: 13, background: submitMsg.startsWith('✅') ? '#f0fdf4' : '#fef2f2', padding: '8px 12px', borderRadius: 8, marginBottom: 12 }}>
                      {submitMsg}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button type="submit" disabled={submitting} style={primaryBtn}>{submitting ? 'Submitting…' : 'Submit Entry'}</button>
                    <button type="button" onClick={() => setShowSubmit(false)} style={ghostBtn}>Cancel</button>
                  </div>
                </form>
              </div>
            )}
            {submitMsg && !showSubmit && (
              <p style={{ color: '#15803d', fontSize: 13, fontWeight: 600, marginTop: 10, textAlign: 'center', background: '#f0fdf4', padding: '10px', borderRadius: 8 }}>
                {submitMsg}
              </p>
            )}
          </div>
        )}

        {/* Leaderboard */}
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Trophy size={18} style={{ color: '#d97706' }} />
            Leaderboard
            <span style={{ fontSize: 13, color: '#64748b', fontWeight: 400 }}>({campaign.entryCount} entries)</span>
          </h2>

          {campaign.entries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🎬</div>
              <p style={{ color: '#475569', fontWeight: 600, fontSize: 15 }}>No entries yet — be the first to submit!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {campaign.entries.map(entry => (
                <EntryCard
                  key={entry.entryId}
                  entry={entry}
                  isActive={isActive}
                  votedFor={votedFor}
                  voting={voting}
                  myEntryId={myEntryId}
                  onVote={handleVote}
                />
              ))}
            </div>
          )}

          {voteMsg && (
            <p style={{ fontSize: 13, fontWeight: 600, color: votedFor ? '#15803d' : '#475569', marginTop: 14, textAlign: 'center', background: votedFor ? '#f0fdf4' : '#f8fafc', padding: '10px', borderRadius: 8 }}>
              {voteMsg}
            </p>
          )}
        </div>

        {/* Share */}
        {isActive && (
          <div style={{ marginTop: 32, textAlign: 'center', padding: '20px', background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0' }}>
            <p style={{ fontSize: 14, color: '#475569', marginBottom: 12, fontWeight: 600 }}>Know a creator who should join? Share this campaign:</p>
            <button
              onClick={() => navigator.clipboard.writeText(window.location.href)}
              style={{ ...ghostBtn, fontSize: 13 }}
            >
              📋 Copy Campaign Link
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Entry Card ─────────────────────────────────────────────────────────────────

function EntryCard({
  entry, isActive, votedFor, voting, myEntryId, onVote,
}: {
  entry: CampaignLeaderboardEntry;
  isActive: boolean;
  votedFor: string | null;
  voting: string | null;
  myEntryId: string | null;
  onVote: (id: string) => void;
}) {
  const isWinner  = entry.isWinner;
  const hasVoted  = !!votedFor;
  const votedThis = votedFor === entry.entryId;
  const isMyEntry = myEntryId === entry.entryId;

  const medal = entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`;

  return (
    <div style={{
      background: isWinner ? '#fffbeb' : '#fff',
      border: `1.5px solid ${isWinner ? '#fcd34d' : votedThis ? '#7c3aed' : '#e2e8f0'}`,
      borderRadius: 12,
      padding: '16px 18px',
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    }}>
      <div style={{ fontSize: 22, minWidth: 36, textAlign: 'center', fontWeight: 700, color: '#334155' }}>{medal}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 800, fontSize: 15, color: '#0f172a' }}>{entry.creatorHandle}</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#475569', background: '#f1f5f9', padding: '2px 8px', borderRadius: 20 }}>
            {entry.platform}
          </span>
          {isMyEntry && <span style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed' }}>Your entry</span>}
        </div>
        <div style={{ fontSize: 14, color: '#475569', marginTop: 4 }}>
          <strong style={{ color: '#d97706', fontSize: 15 }}>{entry.votes.toLocaleString()}</strong> votes
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <a href={entry.reelUrl} target="_blank" rel="noreferrer"
          style={{ color: '#64748b', display: 'flex', alignItems: 'center' }}
        >
          <ExternalLink size={15} />
        </a>
        {isActive && !isMyEntry && (
          votedThis ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: '#7c3aed', background: '#f5f3ff', padding: '6px 12px', borderRadius: 8 }}>
              <Check size={13} /> Voted
            </span>
          ) : (
            <button
              onClick={() => onVote(entry.entryId)}
              disabled={hasVoted || voting === entry.entryId}
              style={{
                background: hasVoted ? '#f1f5f9' : 'linear-gradient(135deg,#7c3aed,#4f46e5)',
                color: hasVoted ? '#94a3b8' : '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 700,
                cursor: hasVoted ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {voting === entry.entryId ? '…' : <><Zap size={12} /> Vote</>}
            </button>
          )
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
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 700,
  color: '#334155',
  marginBottom: 14,
};
