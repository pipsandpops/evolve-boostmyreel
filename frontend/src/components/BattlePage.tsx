import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import type { BattleScoreResult, BattleSummary, ChallengeStatus } from '../types';
import { BattleChallengePage } from './BattleChallengePage';

interface Props {
  userId: string;
  challengeId?: string; // set when navigating to /battle/:id
  onBack: () => void;
}

type View = 'home' | 'create' | 'battle';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${h}h ${m}m ${s}s`;
}

function ScoreBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 50;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-16 text-slate-400 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-10 text-right text-slate-300">{value.toLocaleString()}</span>
    </div>
  );
}

// ── BattleArena ───────────────────────────────────────────────────────────────

function BattleArena({
  battleId,
  userId,
  onBack,
}: {
  battleId: string;
  userId: string;
  onBack: () => void;
}) {
  const [scores, setScores]           = useState<BattleScoreResult['battle'] | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [reelUrl, setReelUrl]         = useState('');
  const [handle, setHandle]           = useState('');
  const [entryId, setEntryId]         = useState<string | null>(null);
  const [submitting, setSubmitting]   = useState(false);
  const [metrics, setMetrics]         = useState({ views: 0, likes: 0, comments: 0, saves: 0, shares: 0, followers: 0 });
  const [metricSaving, setMetricSaving] = useState(false);
  const [voted, setVoted]             = useState(false);
  const [voteMsg, setVoteMsg]         = useState('');
  const pollRef                       = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.getBattleScores(battleId);
      setScores(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load battle.');
    } finally {
      setLoading(false);
    }
  }, [battleId]);

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, 30_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [load]);

  async function submitEntry() {
    if (!reelUrl.trim()) return;
    setSubmitting(true);
    try {
      const res = await api.submitBattleEntry(battleId, userId, reelUrl.trim(), handle || undefined);
      setEntryId(res.entryId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit entry.');
    } finally {
      setSubmitting(false);
    }
  }

  async function saveMetrics() {
    if (!entryId) return;
    setMetricSaving(true);
    try {
      await api.recordBattleMetrics(battleId, userId, entryId, metrics);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save metrics.');
    } finally {
      setMetricSaving(false);
    }
  }

  async function vote(targetEntryId: string) {
    const token = localStorage.getItem('bmr_voter_token') ?? (() => {
      const t = crypto.randomUUID();
      localStorage.setItem('bmr_voter_token', t);
      return t;
    })();
    try {
      const res = await api.voteBattle(battleId, targetEntryId, token);
      setVoted(true);
      setVoteMsg(res.message);
      await load();
    } catch (err) {
      setVoteMsg(err instanceof Error ? err.message : 'Vote failed.');
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500" />
    </div>
  );

  if (error) return (
    <div className="text-center py-12">
      <p className="text-red-400 mb-4">{error}</p>
      <button onClick={onBack} className="text-slate-400 hover:text-white text-sm">← Back</button>
    </div>
  );

  if (!scores) return null;

  const { challenger, opponent, audienceVotes, timeLeftSeconds, status } = scores;
  const isMyChallenger = userId === challenger.userId;
  const isMyOpponent   = userId === opponent.userId;
  const isParticipant  = isMyChallenger || isMyOpponent;
  const myEntry        = entryId;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-slate-400 hover:text-white text-sm transition-colors">← Back</button>
        <div className={`px-3 py-1 rounded-full text-xs font-semibold ${status === 'Active' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-slate-600/40 text-slate-400 border border-slate-600'}`}>
          {status === 'Active' ? `⏱ ${formatTime(timeLeftSeconds)}` : `✓ ${status}`}
        </div>
      </div>

      {/* Score cards */}
      <div className="grid grid-cols-2 gap-4">
        {[{ score: challenger, votes: audienceVotes.challengerVotes, entryId: audienceVotes.challengerEntryId },
          { score: opponent,   votes: audienceVotes.opponentVotes,   entryId: audienceVotes.opponentEntryId }].map(({ score, votes, entryId: eid }, i) => (
          <div key={i} className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-white font-bold">@{score.handle || score.userId.slice(0, 8)}</p>
                <p className="text-xs text-slate-400">{score.metricSource}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-purple-400">{score.score.toFixed(0)}</p>
                <p className="text-xs text-slate-400">pts</p>
              </div>
            </div>

            <div className="space-y-1.5 mb-3">
              <ScoreBar label="Views"    value={score.deltaViews}    max={Math.max(challenger.deltaViews,    opponent.deltaViews,    1)} />
              <ScoreBar label="Likes"    value={score.deltaLikes}    max={Math.max(challenger.deltaLikes,    opponent.deltaLikes,    1)} />
              <ScoreBar label="Comments" value={score.deltaComments} max={Math.max(challenger.deltaComments, opponent.deltaComments, 1)} />
              <ScoreBar label="Saves"    value={score.deltaSaves}    max={Math.max(challenger.deltaSaves,    opponent.deltaSaves,    1)} />
              <ScoreBar label="Shares"   value={score.deltaShares}   max={Math.max(challenger.deltaShares,   opponent.deltaShares,   1)} />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">🗳 {votes} votes</span>
              {status === 'Active' && !voted && eid && (
                <button
                  onClick={() => vote(eid)}
                  className="text-xs bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded-lg transition-colors"
                >
                  Vote
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {voteMsg && (
        <p className="text-center text-sm text-purple-300">{voteMsg}</p>
      )}

      {/* Winner banner */}
      {status !== 'Active' && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 text-center">
          <p className="text-yellow-400 font-bold text-lg">
            🏆 Winner: @{challenger.score >= opponent.score
              ? (challenger.handle || challenger.userId.slice(0, 8))
              : (opponent.handle   || opponent.userId.slice(0, 8))}
          </p>
        </div>
      )}

      {/* Submit entry */}
      {isParticipant && status === 'Active' && !myEntry && (
        <div className="bg-slate-800/60 border border-purple-500/30 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-3">Submit Your Reel</h3>
          <div className="space-y-3">
            <input
              type="url"
              placeholder="Instagram Reel URL"
              value={reelUrl}
              onChange={e => setReelUrl(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 focus:border-purple-500 text-white placeholder-slate-400 rounded-xl px-4 py-3 outline-none transition-colors text-sm"
            />
            <input
              type="text"
              placeholder="Your Instagram handle (optional)"
              value={handle}
              onChange={e => setHandle(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 focus:border-purple-500 text-white placeholder-slate-400 rounded-xl px-4 py-2 outline-none transition-colors text-sm"
            />
            <button
              onClick={submitEntry}
              disabled={submitting || !reelUrl.trim()}
              className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors"
            >
              {submitting ? 'Submitting…' : 'Submit Reel'}
            </button>
          </div>
        </div>
      )}

      {/* Manual metrics */}
      {isParticipant && status === 'Active' && myEntry && (
        <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-1">Update Metrics</h3>
          <p className="text-xs text-slate-400 mb-3">Max 2 updates per 4 hours</p>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {(['views','likes','comments','saves','shares','followers'] as const).map(k => (
              <div key={k}>
                <label className="block text-xs text-slate-400 mb-1 capitalize">{k}</label>
                <input
                  type="number"
                  min={0}
                  value={metrics[k]}
                  onChange={e => setMetrics(m => ({ ...m, [k]: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-slate-700 border border-slate-600 focus:border-purple-500 text-white rounded-lg px-2 py-1.5 text-sm outline-none transition-colors"
                />
              </div>
            ))}
          </div>
          <button
            onClick={saveMetrics}
            disabled={metricSaving}
            className="w-full bg-slate-600 hover:bg-slate-500 disabled:opacity-50 text-white font-semibold py-2 rounded-xl transition-colors text-sm"
          >
            {metricSaving ? 'Saving…' : 'Save Metrics'}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main BattlePage ───────────────────────────────────────────────────────────

export function BattlePage({ userId, challengeId: initialChallengeId, onBack }: Props) {
  const [view, setView]               = useState<View>(initialChallengeId ? 'battle' : 'home');
  const [activeBattleId, setActiveBattleId] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<BattleSummary[]>([]);
  const [loadingLb, setLoadingLb]     = useState(true);
  const [pendingChallenge, setPendingChallenge] = useState<ChallengeStatus | null>(null);
  const [accepting, setAccepting]     = useState(false);

  // Resolve initial challenge/battle from URL param
  useEffect(() => {
    if (!initialChallengeId) return;
    api.getBattle(initialChallengeId).then(res => {
      if (res.type === 'challenge') {
        setPendingChallenge(res as ChallengeStatus);
      } else {
        const battle = (res as BattleScoreResult).battle;
        setActiveBattleId(battle.battleId);
        setView('battle');
      }
    }).catch(() => {});
  }, [initialChallengeId]);

  useEffect(() => {
    api.getBattleLeaderboard(10)
      .then(setLeaderboard)
      .finally(() => setLoadingLb(false));
  }, []);

  async function acceptChallenge() {
    if (!pendingChallenge) return;
    setAccepting(true);
    try {
      const res = await api.acceptChallenge(pendingChallenge.challengeId, userId);
      setActiveBattleId(res.battleId);
      setPendingChallenge(null);
      setView('battle');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to accept challenge.');
    } finally {
      setAccepting(false);
    }
  }

  async function declineChallenge() {
    if (!pendingChallenge) return;
    await api.declineChallenge(pendingChallenge.challengeId).catch(() => {});
    setPendingChallenge(null);
    setView('home');
  }

  if (view === 'create') {
    return <BattleChallengePage userId={userId} onBack={() => setView('home')} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-2xl mx-auto px-4 py-8">

        <button onClick={onBack} className="text-slate-400 hover:text-white text-sm mb-6 flex items-center gap-1 transition-colors">
          ← Back to Home
        </button>

        {/* Challenge accept banner */}
        {pendingChallenge && (
          <div className="bg-purple-900/60 border border-purple-500/40 rounded-2xl p-6 mb-6 text-center">
            <div className="text-4xl mb-3">⚔️</div>
            <h2 className="text-xl font-bold text-white mb-1">You've been challenged!</h2>
            <p className="text-slate-300 mb-2">
              @{pendingChallenge.opponentHandle} challenges you to a 24hr Reel Battle
            </p>
            {pendingChallenge.trashTalkMsg && (
              <p className="text-purple-300 italic text-sm mb-4">"{pendingChallenge.trashTalkMsg}"</p>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={acceptChallenge}
                disabled={accepting}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl transition-all"
              >
                {accepting ? 'Accepting…' : '⚔️ Accept'}
              </button>
              <button
                onClick={declineChallenge}
                className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2.5 rounded-xl transition-colors"
              >
                Decline
              </button>
            </div>
          </div>
        )}

        {view === 'battle' && activeBattleId ? (
          <BattleArena
            battleId={activeBattleId}
            userId={userId}
            onBack={() => { setView('home'); setActiveBattleId(null); }}
          />
        ) : (
          <>
            {/* Header */}
            <div className="text-center mb-8">
              <div className="text-5xl mb-3">⚔️</div>
              <h1 className="text-3xl font-bold text-white">Reel Streak Battles</h1>
              <p className="text-slate-400 mt-2">24-hour creator battles — who gets more views wins</p>
            </div>

            {/* CTA */}
            <button
              onClick={() => setView('create')}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-4 rounded-2xl transition-all transform hover:scale-[1.02] active:scale-[0.98] mb-8 text-lg"
            >
              ⚔️ Challenge a Creator
            </button>

            {/* Leaderboard */}
            <div>
              <h2 className="text-white font-bold text-lg mb-4">🔥 Live Battles</h2>
              {loadingLb ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
                </div>
              ) : leaderboard.length === 0 ? (
                <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-8 text-center">
                  <p className="text-slate-400">No active battles yet.</p>
                  <p className="text-slate-500 text-sm mt-1">Be the first to challenge a creator!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {leaderboard.map(battle => {
                    const timeLeft = Math.max(0, Math.floor((new Date(battle.endsAt).getTime() - Date.now()) / 1000));
                    return (
                      <button
                        key={battle.battleId}
                        onClick={() => { setActiveBattleId(battle.battleId); setView('battle'); }}
                        className="w-full bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700 hover:border-purple-500/40 rounded-2xl p-4 text-left transition-all"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-semibold">@{battle.challengerHandle || 'creator'}</span>
                            <span className="text-slate-400 text-sm">vs</span>
                            <span className="text-white font-semibold">@{battle.opponentHandle || 'creator'}</span>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${battle.status === 'Active' ? 'bg-green-500/20 text-green-400' : 'bg-slate-600/40 text-slate-400'}`}>
                            {battle.status === 'Active' ? formatTime(timeLeft) : battle.status}
                          </span>
                        </div>
                        <div className="flex gap-4">
                          <div className="flex-1">
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="text-slate-400 text-xs">@{battle.challengerHandle || 'challenger'}</span>
                              <span className="text-purple-400 font-bold">{battle.challengerScore.toFixed(0)} pts</span>
                            </div>
                            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-purple-500 rounded-full"
                                style={{ width: `${Math.max(0, Math.min(100, battle.challengerScore / Math.max(battle.challengerScore + battle.opponentScore, 1) * 100))}%` }}
                              />
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="text-slate-400 text-xs">@{battle.opponentHandle || 'opponent'}</span>
                              <span className="text-pink-400 font-bold">{battle.opponentScore.toFixed(0)} pts</span>
                            </div>
                            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-pink-500 rounded-full"
                                style={{ width: `${Math.max(0, Math.min(100, battle.opponentScore / Math.max(battle.challengerScore + battle.opponentScore, 1) * 100))}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
