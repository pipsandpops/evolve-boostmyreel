import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import type { BattleScoreResult, BattleSummary, ChallengeStatus, PrizePoolSummary } from '../types';
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

function DeadlineBanner({ deadline }: { deadline: string }) {
  const secsLeft = Math.max(0, Math.floor((new Date(deadline).getTime() - Date.now()) / 1000));
  const past = secsLeft === 0;
  return (
    <div className={`rounded-xl px-4 py-2 text-xs flex items-center gap-2 ${
      past ? 'bg-red-900/40 border border-red-500/30 text-red-300' : 'bg-orange-900/30 border border-orange-500/30 text-orange-300'
    }`}>
      {past ? '🚫 Submission deadline has passed — late entries auto-forfeit' : `⏰ Submit deadline: ${formatTime(secsLeft)} remaining`}
    </div>
  );
}

function MetricGrid({
  metrics,
  onChange,
  platform,
}: {
  metrics: Record<string, number>;
  onChange: (vals: Record<string, number>) => void;
  platform: string;
}) {
  const fields = platform === 'YouTube'
    ? ['views', 'likes', 'comments', 'followers']
    : ['views', 'likes', 'comments', 'saves', 'shares', 'followers'];
  return (
    <div className={`grid gap-2 ${fields.length === 4 ? 'grid-cols-2' : 'grid-cols-3'}`}>
      {fields.map(k => (
        <div key={k}>
          <label className="block text-xs text-slate-400 mb-1 capitalize">{k}</label>
          <input type="number" min={0} value={metrics[k] ?? 0}
            onChange={e => onChange({ ...metrics, [k]: parseInt(e.target.value) || 0 })}
            className="w-full bg-slate-700 border border-slate-600 focus:border-purple-500 text-white rounded-lg px-2 py-1.5 text-sm outline-none transition-colors" />
        </div>
      ))}
    </div>
  );
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
  prize,
  onBack,
}: {
  battleId: string;
  userId: string;
  prize?: string | null;
  onBack: () => void;
}) {
  const [scores, setScores]           = useState<BattleScoreResult['battle'] | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [prizePool, setPrizePool]     = useState<PrizePoolSummary | null>(null);
  const [entryId, setEntryId]         = useState<string | null>(null);
  const [submitting, setSubmitting]   = useState(false);
  const [voted, setVoted]             = useState(false);
  const [voteMsg, setVoteMsg]         = useState('');
  const [metricSaving, setMetricSaving] = useState(false);
  const pollRef                       = useRef<ReturnType<typeof setInterval> | null>(null);

  // Multi-platform submission state
  const [igUrl, setIgUrl]             = useState('');
  const [ytUrl, setYtUrl]             = useState('');
  const [igHandle, setIgHandle]       = useState('');
  const [ytHandle, setYtHandle]       = useState('');
  const [submitPlatform, setSubmitPlatform] = useState<'Instagram' | 'YouTube' | 'Both'>('Instagram');
  const [validationStatus, setValidationStatus] = useState<string | null>(null);

  // Per-platform metrics state
  const [igMetrics, setIgMetrics]     = useState({ views: 0, likes: 0, comments: 0, saves: 0, shares: 0, followers: 0 });
  const [ytMetrics, setYtMetrics]     = useState({ views: 0, likes: 0, comments: 0, saves: 0, shares: 0, followers: 0 });
  const [metricPlatform, setMetricPlatform] = useState<'Instagram' | 'YouTube'>('Instagram');

  const load = useCallback(async () => {
    try {
      const data = await api.getBattleScores(battleId);
      setScores(data);
      // Init submit platform from battle platform
      if (data.platform === 'YouTube') setSubmitPlatform('YouTube');
      else if (data.platform === 'Both') setSubmitPlatform('Both');
      // Restore entryId from scores so the metrics form survives a page refresh
      if (!entryId) {
        if (data.challenger.userId === userId && data.audienceVotes.challengerEntryId)
          setEntryId(data.audienceVotes.challengerEntryId);
        else if (data.opponent.userId === userId && data.audienceVotes.opponentEntryId)
          setEntryId(data.audienceVotes.opponentEntryId);
      }
      // Restore validation status
      const myScore = data.challenger.userId === userId ? data.challenger : data.opponent;
      if (myScore.validationStatus && myScore.validationStatus !== 'Skipped')
        setValidationStatus(myScore.validationStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load battle.');
    } finally {
      setLoading(false);
    }
  }, [battleId, userId, entryId]);

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, 30_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [load]);

  useEffect(() => {
    api.getPrizePoolSummary(battleId).then(p => { if (p.hasPrizePool) setPrizePool(p); }).catch(() => {});
  }, [battleId]);

  async function submitEntry() {
    const needsIg = submitPlatform === 'Instagram' || submitPlatform === 'Both';
    const needsYt = submitPlatform === 'YouTube'   || submitPlatform === 'Both';
    if (needsIg && !igUrl.trim()) { setError('Instagram Reel URL is required.'); return; }
    if (needsYt && !ytUrl.trim()) { setError('YouTube Shorts URL is required.'); return; }
    setError(null);
    setSubmitting(true);
    try {
      const res = await api.submitBattleEntry(battleId, userId, {
        platform:        submitPlatform,
        instagramUrl:    needsIg ? igUrl.trim() : undefined,
        youtubeUrl:      needsYt ? ytUrl.trim() : undefined,
        instagramHandle: igHandle || undefined,
        youtubeHandle:   ytHandle || undefined,
      });
      setEntryId(res.entryId);
      setValidationStatus(res.validationStatus);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit entry.');
    } finally {
      setSubmitting(false);
    }
  }

  async function saveMetrics(platform: 'Instagram' | 'YouTube') {
    if (!entryId) return;
    const m = platform === 'YouTube' ? ytMetrics : igMetrics;
    setMetricSaving(true);
    try {
      await api.recordBattleMetrics(battleId, userId, entryId, m, platform);
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

      {/* Sponsored prize pool banner */}
      {prizePool?.hasPrizePool && prizePool.totalAmount ? (
        <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🏆</span>
            <div>
              <p className="text-yellow-300 font-bold text-sm">
                Sponsored Prize Pool — {prizePool.currency} {prizePool.totalAmount.toLocaleString()}
              </p>
              <p className="text-xs text-slate-400">
                {prizePool.status === 'Held' ? '💰 Funds held in escrow' :
                 prizePool.status === 'Distributed' ? '✅ Prizes distributed' :
                 prizePool.status === 'Distributing' ? '⏳ Processing payouts…' :
                 '⏳ Awaiting payment'}
              </p>
            </div>
          </div>
          {prizePool.split && (
            <div className="grid grid-cols-4 gap-1 text-center text-xs">
              <div className="bg-slate-700/50 rounded-lg p-2">
                <p className="text-yellow-300 font-bold">{prizePool.currency} {prizePool.split.winner.toLocaleString()}</p>
                <p className="text-slate-400">🥇 Winner</p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-2">
                <p className="text-yellow-300 font-bold">{prizePool.currency} {prizePool.split.runnerUp.toLocaleString()}</p>
                <p className="text-slate-400">🥈 Runner-up</p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-2">
                <p className="text-yellow-300 font-bold">{prizePool.currency} {prizePool.split.voters.toLocaleString()}</p>
                <p className="text-slate-400">🗳️ Voters</p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-2">
                <p className="text-slate-400 font-bold">{prizePool.currency} {prizePool.split.platform.toLocaleString()}</p>
                <p className="text-slate-400">⚙️ Platform</p>
              </div>
            </div>
          )}
          {prizePool.nonCashPrizes && (
            <div className="mt-2 text-xs text-slate-400">
              <span className="font-semibold text-slate-300">+ Non-cash: </span>{prizePool.nonCashPrizes}
            </div>
          )}
          {prizePool.status === 'Distributed' && prizePool.distributions && prizePool.distributions.length > 0 && (
            <div className="mt-3 space-y-1">
              <p className="text-xs text-green-400 font-semibold mb-1">✅ Payouts</p>
              {prizePool.distributions.map((d, i) => (
                <div key={i} className="flex justify-between text-xs text-slate-300">
                  <span>{d.recipientType}{d.userId ? ` · ${d.userId.slice(0, 8)}` : ''}</span>
                  <span className="text-yellow-300">{prizePool.currency} {d.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : prize ? (
        <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-2xl p-3 flex items-center gap-3">
          <span className="text-2xl">🏆</span>
          <div>
            <p className="text-yellow-300 font-bold text-sm">Prize at Stake</p>
            <p className="text-yellow-200 text-sm">{prize}</p>
          </div>
        </div>
      ) : null}

      {/* Score cards */}
      <div className="grid grid-cols-2 gap-4">
        {[{ score: challenger, votes: audienceVotes.challengerVotes, entryId: audienceVotes.challengerEntryId },
          { score: opponent,   votes: audienceVotes.opponentVotes,   entryId: audienceVotes.opponentEntryId }].map(({ score, votes, entryId: eid }, i) => (
          <div key={i} className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-white font-bold">@{score.handle || `user_${score.userId.slice(0, 6)}`}</p>
                <p className="text-xs text-slate-400">
                  {score.metricSource === 'none' ? 'awaiting metrics' : `via ${score.metricSource}`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-purple-400">{score.score.toFixed(0)}</p>
                <p className="text-xs text-slate-400">{scores.platform === 'Both' ? 'combined pts' : 'pts'}</p>
              </div>
            </div>

            {/* Platform breakdown for Both battles */}
            {scores.platform === 'Both' && (score.instagramScore != null || score.youTubeScore != null) && (
              <div className="grid grid-cols-3 gap-1 mb-3 text-center">
                <div className="bg-slate-700/50 rounded-lg py-1">
                  <p className="text-purple-300 font-bold text-sm">{(score.instagramScore ?? 0).toFixed(0)}</p>
                  <p className="text-slate-400 text-xs">📸 IG</p>
                </div>
                <div className="bg-slate-700/50 rounded-lg py-1">
                  <p className="text-red-300 font-bold text-sm">{(score.youTubeScore ?? 0).toFixed(0)}</p>
                  <p className="text-slate-400 text-xs">▶️ YT</p>
                </div>
                <div className="bg-purple-900/40 rounded-lg py-1">
                  <p className="text-purple-300 font-bold text-sm">{score.score.toFixed(0)}</p>
                  <p className="text-slate-400 text-xs">🔥 Total</p>
                </div>
              </div>
            )}

            <div className="space-y-1.5 mb-3">
              <ScoreBar label="Views"    value={score.deltaViews}    max={Math.max(challenger.deltaViews,    opponent.deltaViews,    1)} />
              <ScoreBar label="Likes"    value={score.deltaLikes}    max={Math.max(challenger.deltaLikes,    opponent.deltaLikes,    1)} />
              <ScoreBar label="Comments" value={score.deltaComments} max={Math.max(challenger.deltaComments, opponent.deltaComments, 1)} />
              {scores.platform !== 'YouTube' && (
                <>
                  <ScoreBar label="Saves"  value={score.deltaSaves}  max={Math.max(challenger.deltaSaves,  opponent.deltaSaves,  1)} />
                  <ScoreBar label="Shares" value={score.deltaShares} max={Math.max(challenger.deltaShares, opponent.deltaShares, 1)} />
                </>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">🗳 {votes} votes</span>
              {status === 'Active' && !voted && eid && (
                <button onClick={() => vote(eid)}
                  className="text-xs bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded-lg transition-colors">
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
              ? (challenger.handle || `user_${challenger.userId.slice(0, 6)}`)
              : (opponent.handle   || `user_${opponent.userId.slice(0, 6)}`)}
          </p>
        </div>
      )}

      {/* Submission deadline banner */}
      {isParticipant && status === 'Active' && !myEntry && scores.submissionDeadlineAt && (
        <DeadlineBanner deadline={scores.submissionDeadlineAt} />
      )}

      {/* Submit entry */}
      {isParticipant && status === 'Active' && !myEntry && (
        <div className="bg-slate-800/60 border border-purple-500/30 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-3">Submit Your Content</h3>

          {/* Platform tabs — only shown if battle allows multiple */}
          {(scores.platform === 'Both') && (
            <div className="flex gap-2 mb-4">
              {(['Instagram', 'YouTube', 'Both'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setSubmitPlatform(p)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    submitPlatform === p
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                  }`}
                >
                  {p === 'Instagram' ? '📸 Instagram' : p === 'YouTube' ? '▶️ YouTube' : '🌐 Both'}
                </button>
              ))}
            </div>
          )}

          <div className="space-y-3">
            {/* Instagram fields */}
            {(submitPlatform === 'Instagram' || submitPlatform === 'Both') && (
              <>
                <input type="url" placeholder="📸 Instagram Reel URL *"
                  value={igUrl} onChange={e => setIgUrl(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 focus:border-purple-500 text-white placeholder-slate-400 rounded-xl px-4 py-3 outline-none transition-colors text-sm" />
                <input type="text" placeholder="@instagram_handle (optional)"
                  value={igHandle} onChange={e => setIgHandle(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 focus:border-purple-500 text-white placeholder-slate-400 rounded-xl px-4 py-2 outline-none transition-colors text-sm" />
              </>
            )}

            {/* YouTube fields */}
            {(submitPlatform === 'YouTube' || submitPlatform === 'Both') && (
              <>
                {submitPlatform === 'Both' && <hr className="border-slate-600" />}
                <input type="url" placeholder="▶️ YouTube Shorts URL *"
                  value={ytUrl} onChange={e => setYtUrl(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 focus:border-red-500 text-white placeholder-slate-400 rounded-xl px-4 py-3 outline-none transition-colors text-sm" />
                <input type="text" placeholder="@youtube_handle (optional)"
                  value={ytHandle} onChange={e => setYtHandle(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 focus:border-red-500 text-white placeholder-slate-400 rounded-xl px-4 py-2 outline-none transition-colors text-sm" />
              </>
            )}

            {error && <p className="text-red-400 text-xs">{error}</p>}

            <button onClick={submitEntry} disabled={submitting}
              className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors">
              {submitting ? 'Submitting…' : submitPlatform === 'Both' ? '🌐 Submit to Both Platforms' : `Submit ${submitPlatform === 'YouTube' ? '▶️ YouTube' : '📸 Instagram'} Content`}
            </button>
          </div>
        </div>
      )}

      {/* Validation status badge */}
      {isParticipant && validationStatus && validationStatus !== 'Skipped' && (
        <div className={`rounded-xl px-4 py-2 text-xs flex items-center gap-2 ${
          validationStatus === 'Approved' ? 'bg-green-900/30 border border-green-500/30 text-green-300' :
          validationStatus === 'Rejected' ? 'bg-red-900/30 border border-red-500/30 text-red-300' :
          'bg-yellow-900/30 border border-yellow-500/30 text-yellow-300'
        }`}>
          {validationStatus === 'Approved' ? '✅' : validationStatus === 'Rejected' ? '❌' : '⏳'}
          <span>Content validation: <strong>{validationStatus}</strong></span>
        </div>
      )}

      {/* How scoring works */}
      {isParticipant && status === 'Active' && (
        <div className="bg-blue-900/20 border border-blue-500/20 rounded-2xl p-4">
          <p className="text-blue-300 text-sm font-semibold mb-1">📊 How scoring works</p>
          <p className="text-slate-400 text-xs leading-relaxed">
            Scores are based on <strong className="text-slate-300">growth since you submitted</strong>.
            Open your Reel/Short, check current stats, and enter them below — the app calculates the delta automatically.
            {scores.platform === 'Both' && ' For Both-platform battles, enter stats for each platform separately.'}
          </p>
        </div>
      )}

      {/* Manual metrics */}
      {isParticipant && status === 'Active' && myEntry && (
        <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-1">📈 Update Your Metrics</h3>

          {/* Platform tab selector for Both battles */}
          {scores.platform === 'Both' && (
            <div className="flex gap-2 mb-3">
              {(['Instagram', 'YouTube'] as const).map(p => (
                <button key={p} onClick={() => setMetricPlatform(p)}
                  className={`flex-1 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    metricPlatform === p ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                  }`}>
                  {p === 'Instagram' ? '📸 Instagram' : '▶️ YouTube'}
                </button>
              ))}
            </div>
          )}

          <p className="text-xs text-slate-400 mb-3">
            Enter your <strong>current</strong> {scores.platform === 'Both' ? metricPlatform : scores.platform} stats — max 2 updates per 4 hours
          </p>
          <MetricGrid
            metrics={scores.platform === 'Both' && metricPlatform === 'YouTube' ? ytMetrics : igMetrics}
            onChange={vals => {
              type M = typeof igMetrics;
              if (scores.platform === 'Both' && metricPlatform === 'YouTube') setYtMetrics(vals as M);
              else setIgMetrics(vals as M);
            }}
            platform={scores.platform === 'Both' ? metricPlatform : (scores.platform as 'Instagram' | 'YouTube')}
          />
          <button
            onClick={() => saveMetrics(scores.platform === 'Both' ? metricPlatform : (scores.platform as 'Instagram' | 'YouTube'))}
            disabled={metricSaving}
            className="w-full bg-slate-600 hover:bg-slate-500 disabled:opacity-50 text-white font-semibold py-2 rounded-xl transition-colors text-sm mt-3"
          >
            {metricSaving ? 'Saving…' : `Save ${scores.platform === 'Both' ? metricPlatform : scores.platform} Metrics`}
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
  const [activePrize, setActivePrize]       = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<BattleSummary[]>([]);
  const [loadingLb, setLoadingLb]     = useState(true);
  const [pendingChallenge, setPendingChallenge] = useState<ChallengeStatus | null>(null);
  const [accepting, setAccepting]     = useState(false);

  // Resolve initial challenge/battle from URL param
  useEffect(() => {
    if (!initialChallengeId) return;
    api.getBattle(initialChallengeId).then(res => {
      if (res.type === 'challenge') {
        const c = res as ChallengeStatus;
        setPendingChallenge(c);
        setActivePrize(c.prizeDescription ?? null);
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
      setActivePrize(pendingChallenge.prizeDescription ?? null);
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
            {/* ContentClash meta */}
            <div className="flex flex-wrap justify-center gap-2 mb-3 text-xs">
              {pendingChallenge.platform && (
                <span className="bg-slate-700 text-slate-300 px-2 py-1 rounded-full">
                  {pendingChallenge.platform === 'Instagram' ? '📸' : pendingChallenge.platform === 'YouTube' ? '▶️' : '🌐'} {pendingChallenge.platform}
                </span>
              )}
              {pendingChallenge.durationHours && (
                <span className="bg-slate-700 text-slate-300 px-2 py-1 rounded-full">
                  ⏱ {pendingChallenge.durationHours === 168 ? '7 Days' : `${pendingChallenge.durationHours}h`}
                </span>
              )}
              {pendingChallenge.themeHashtag && (
                <span className="bg-purple-900/50 text-purple-300 px-2 py-1 rounded-full font-semibold">
                  #{pendingChallenge.themeHashtag}
                </span>
              )}
            </div>

            {pendingChallenge.prizePoolAmount && (
              <div className="inline-flex items-center gap-2 bg-yellow-900/30 border border-yellow-500/30 rounded-xl px-4 py-2 mb-3">
                <span>🏆</span>
                <span className="text-yellow-300 font-bold text-sm">
                  Prize Pool: {pendingChallenge.prizeCurrency} {pendingChallenge.prizePoolAmount.toLocaleString()}
                </span>
              </div>
            )}
            {!pendingChallenge.prizePoolAmount && pendingChallenge.prizeDescription && (
              <div className="inline-flex items-center gap-2 bg-yellow-900/30 border border-yellow-500/30 rounded-xl px-4 py-2 mb-3">
                <span>🏆</span>
                <span className="text-yellow-300 font-semibold text-sm">Prize: {pendingChallenge.prizeDescription}</span>
              </div>
            )}
            {pendingChallenge.contentGuidelines && (
              <div className="bg-blue-900/20 border border-blue-500/20 rounded-xl p-3 mb-3 text-left">
                <p className="text-blue-300 text-xs font-semibold mb-1">📋 Content Guidelines</p>
                <p className="text-slate-300 text-xs">{pendingChallenge.contentGuidelines}</p>
              </div>
            )}
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
            prize={activePrize}
            onBack={() => { setView('home'); setActiveBattleId(null); setActivePrize(null); }}
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
                        onClick={() => { setActiveBattleId(battle.battleId); setActivePrize(null); setView('battle'); }}
                        className="w-full bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700 hover:border-purple-500/40 rounded-2xl p-4 text-left transition-all"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-semibold">@{battle.challengerHandle || `user_${battle.battleId.slice(0, 5)}`}</span>
                            <span className="text-slate-400 text-sm">vs</span>
                            <span className="text-white font-semibold">@{battle.opponentHandle || `user_${battle.battleId.slice(5, 10)}`}</span>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${battle.status === 'Active' ? 'bg-green-500/20 text-green-400' : 'bg-slate-600/40 text-slate-400'}`}>
                            {battle.status === 'Active' ? formatTime(timeLeft) : battle.status}
                          </span>
                        </div>
                        <div className="flex gap-4">
                          <div className="flex-1">
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="text-slate-400 text-xs">@{battle.challengerHandle || 'player 1'}</span>
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
                              <span className="text-slate-400 text-xs">@{battle.opponentHandle || 'player 2'}</span>
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
