import { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { CampaignDetail, CampaignLeaderboardEntry } from '../types';
import { Trophy, Users, Clock, ExternalLink, Check, Zap } from 'lucide-react';

interface Props {
  joinCode: string;
  userId: string;              // viewer's device/user id
  brandUserId?: string;        // set if the viewer is the brand owner
  onBack: () => void;
}

const PLATFORMS = ['Instagram', 'YouTube', 'TikTok'];

function timeLeft(endsAt: string) {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return 'Ended';
  const days    = Math.floor(diff / 86_400_000);
  const hours   = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  if (days > 0) return `${days}d ${hours}h left`;
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

  // Submit form
  const [showSubmit, setShowSubmit]   = useState(false);
  const [handle, setHandle]           = useState('');
  const [reelUrl, setReelUrl]         = useState('');
  const [platform, setPlatform]       = useState('Instagram');
  const [paymentHandle, setPaymentHandle] = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [submitMsg, setSubmitMsg]     = useState<string | null>(null);
  const [myEntryId, setMyEntryId]     = useState<string | null>(null);

  // Voting
  const [voting, setVoting]     = useState<string | null>(null);   // entryId being voted
  const [votedFor, setVotedFor] = useState<string | null>(null);
  const [voteMsg, setVoteMsg]   = useState<string | null>(null);

  // Brand actions
  const [markingPaid, setMarkingPaid] = useState(false);
  const [paidMsg, setPaidMsg]         = useState<string | null>(null);

  const isBrand = brandUserId === campaign?.brandUserId;

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
        setVoteMsg('Vote recorded!');
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

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>Loading campaign…</div>;
  if (error || !campaign) return (
    <div style={{ textAlign: 'center', padding: 60 }}>
      <p style={{ color: '#f87171', marginBottom: 16 }}>{error ?? 'Not found.'}</p>
      <button onClick={onBack} style={ghostBtn}>← Back</button>
    </div>
  );

  const isActive  = campaign.status === 'Active';
  const isEnded   = campaign.status === 'Ended';
  const isPaidOut = campaign.status === 'PaidOut';
  const winner    = campaign.entries.find(e => e.entryId === campaign.winnerEntryId);

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '24px 16px', color: '#e2e8f0' }}>
      <button onClick={onBack} style={{ ...ghostBtn, marginBottom: 20 }}>← Back</button>

      {/* Campaign hero */}
      <div style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.2),rgba(79,70,229,0.1))', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 18, padding: '24px 24px 20px', marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                background: isActive ? '#34d39922' : isPaidOut ? '#a78bfa22' : '#f59e0b22',
                color:      isActive ? '#34d399'   : isPaidOut ? '#a78bfa'   : '#f59e0b',
              }}>
                {isActive ? '🟢 LIVE' : isPaidOut ? '✅ PAID OUT' : '🏁 ENDED'}
              </span>
              {campaign.themeHashtag && (
                <span style={{ fontSize: 13, color: '#7c3aed', fontWeight: 600 }}>{campaign.themeHashtag}</span>
              )}
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>{campaign.title}</h1>
            <p style={{ fontSize: 13, color: '#94a3b8' }}>by <strong style={{ color: '#e2e8f0' }}>{campaign.brandName}</strong></p>
            {campaign.description && <p style={{ fontSize: 14, color: '#94a3b8', marginTop: 8, lineHeight: 1.5 }}>{campaign.description}</p>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#fbbf24' }}>
              {campaign.prizeCurrency} {campaign.prizeAmount.toLocaleString()}
            </div>
            <div style={{ fontSize: 12, color: '#64748b' }}>Prize</div>
            {campaign.prizeDescription && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{campaign.prizeDescription}</div>}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 20, marginTop: 16, fontSize: 13, color: '#94a3b8', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Users size={14} /> {campaign.entryCount} / {campaign.maxEntries} entries</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Clock size={14} /> {timeLeft(campaign.endsAt)}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Trophy size={14} /> Pure audience vote</span>
        </div>

        {campaign.contentGuidelines && (
          <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, fontSize: 13, color: '#94a3b8', borderLeft: '3px solid #7c3aed' }}>
            <strong style={{ color: '#e2e8f0' }}>Guidelines: </strong>{campaign.contentGuidelines}
          </div>
        )}
      </div>

      {/* Winner banner */}
      {(isEnded || isPaidOut) && winner && (
        <div style={{ background: 'linear-gradient(135deg,#78350f,#92400e)', border: '1px solid #d97706', borderRadius: 14, padding: '16px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: 36 }}>🏆</div>
          <div>
            <p style={{ fontWeight: 700, fontSize: 15, color: '#fbbf24' }}>Winner: {winner.creatorHandle}</p>
            <p style={{ fontSize: 13, color: '#d97706' }}>{winner.votes.toLocaleString()} votes · {isPaidOut ? 'Prize paid ✅' : 'Prize pending'}</p>
          </div>
          <a href={winner.reelUrl} target="_blank" rel="noreferrer" style={{ marginLeft: 'auto', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
            Watch <ExternalLink size={13} />
          </a>
        </div>
      )}

      {/* Brand controls */}
      {isBrand && (isEnded) && !isPaidOut && (
        <div style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 14, padding: '16px 20px', marginBottom: 20 }}>
          <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Campaign has ended. Pay the winner and mark it as paid out.</p>
          {winner && (
            <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 12 }}>
              Winner: <strong style={{ color: '#e2e8f0' }}>{winner.creatorHandle}</strong>
              {winner.votes > 0 && <> · {winner.votes.toLocaleString()} votes</>}
            </p>
          )}
          <button onClick={handleMarkPaid} disabled={markingPaid} style={primaryBtn}>
            {markingPaid ? 'Marking…' : '✅ Mark Prize as Paid'}
          </button>
          {paidMsg && <p style={{ fontSize: 13, marginTop: 8, color: '#34d399' }}>{paidMsg}</p>}
        </div>
      )}

      {/* Submit entry */}
      {isActive && !myEntryId && (
        <div style={{ marginBottom: 24 }}>
          {!showSubmit ? (
            <button onClick={() => setShowSubmit(true)} style={{ ...primaryBtn, width: '100%', fontSize: 15, padding: '14px 20px' }}>
              🎬 Submit Your Reel
            </button>
          ) : (
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Submit Your Entry</h3>
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
                  Payment Handle <span style={{ color: '#64748b', fontWeight: 400 }}>(UPI / bank — for prize payout)</span>
                  <input style={inputStyle} placeholder="yourname@upi" value={paymentHandle} onChange={e => setPaymentHandle(e.target.value)} />
                </label>
                {submitMsg && <p style={{ color: submitMsg.startsWith('✅') ? '#34d399' : '#f87171', fontSize: 13, marginBottom: 8 }}>{submitMsg}</p>}
                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <button type="submit" disabled={submitting} style={primaryBtn}>{submitting ? 'Submitting…' : 'Submit Entry'}</button>
                  <button type="button" onClick={() => setShowSubmit(false)} style={ghostBtn}>Cancel</button>
                </div>
              </form>
            </div>
          )}
          {submitMsg && !showSubmit && (
            <p style={{ color: '#34d399', fontSize: 13, marginTop: 8, textAlign: 'center' }}>{submitMsg}</p>
          )}
        </div>
      )}

      {/* Leaderboard */}
      <div>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Trophy size={16} style={{ color: '#fbbf24' }} />
          Leaderboard
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 400 }}>({campaign.entryCount} entries)</span>
        </h2>

        {campaign.entries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🎬</div>
            <p>No entries yet. Be the first to submit!</p>
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
          <p style={{ fontSize: 13, color: votedFor ? '#34d399' : '#94a3b8', marginTop: 12, textAlign: 'center' }}>
            {voteMsg}
          </p>
        )}
      </div>

      {/* Share */}
      {isActive && (
        <div style={{ marginTop: 28, textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 10 }}>Share this campaign with creators:</p>
          <button
            onClick={() => navigator.clipboard.writeText(window.location.href)}
            style={{ ...ghostBtn, fontSize: 13 }}
          >
            📋 Copy Campaign Link
          </button>
        </div>
      )}
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
  const isWinner    = entry.isWinner;
  const hasVoted    = !!votedFor;
  const votedThis   = votedFor === entry.entryId;
  const isMyEntry   = myEntryId === entry.entryId;

  const medalEmoji = entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`;

  return (
    <div style={{
      background: isWinner ? 'rgba(251,191,36,0.08)' : 'rgba(255,255,255,0.04)',
      border: `1px solid ${isWinner ? '#d97706' : votedThis ? '#7c3aed' : 'rgba(255,255,255,0.08)'}`,
      borderRadius: 12,
      padding: '14px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 14,
    }}>
      <div style={{ fontSize: 20, minWidth: 32, textAlign: 'center' }}>{medalEmoji}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>{entry.creatorHandle}</span>
          <span style={{ fontSize: 11, color: '#64748b', background: 'rgba(255,255,255,0.06)', padding: '1px 8px', borderRadius: 20 }}>
            {entry.platform}
          </span>
          {isMyEntry && <span style={{ fontSize: 11, color: '#7c3aed' }}>Your entry</span>}
        </div>
        <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
          <strong style={{ color: '#fbbf24' }}>{entry.votes.toLocaleString()}</strong> votes
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <a
          href={entry.reelUrl}
          target="_blank"
          rel="noreferrer"
          style={{ color: '#64748b', display: 'flex', alignItems: 'center' }}
        >
          <ExternalLink size={15} />
        </a>
        {isActive && !isMyEntry && (
          votedThis ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#7c3aed', fontWeight: 600 }}>
              <Check size={14} /> Voted
            </span>
          ) : (
            <button
              onClick={() => onVote(entry.entryId)}
              disabled={hasVoted || voting === entry.entryId}
              style={{
                background: hasVoted ? 'rgba(255,255,255,0.04)' : 'linear-gradient(135deg,#7c3aed,#4f46e5)',
                color: hasVoted ? '#475569' : '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '7px 14px',
                fontSize: 12,
                fontWeight: 600,
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
  padding: '10px 22px',
  fontSize: 14,
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
