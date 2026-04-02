import { useState } from 'react';
import { api } from '../services/api';
import type { CreateChallengeResponse } from '../types';

interface Props {
  userId: string;
  onBack: () => void;
}

const DURATION_OPTIONS = [
  { label: '24 Hours', value: 24 },
  { label: '48 Hours', value: 48 },
  { label: '7 Days',   value: 168 },
];

const PLATFORM_OPTIONS = [
  { label: '📸 Instagram', value: 'Instagram' },
  { label: '▶️ YouTube',   value: 'YouTube' },
  { label: '🌐 Both',      value: 'Both' },
];

export function BattleChallengePage({ userId, onBack }: Props) {
  // Core
  const [handle, setHandle]         = useState('');
  const [email, setEmail]           = useState('');
  // ContentClash fields
  const [title, setTitle]           = useState('');
  const [duration, setDuration]     = useState(24);
  const [platform, setPlatform]     = useState('Instagram');
  const [hashtag, setHashtag]       = useState('');
  const [prizeAmount, setPrizeAmount] = useState('');
  const [currency, setCurrency]     = useState('INR');
  const [guidelines, setGuidelines] = useState('');
  const [trashTalk, setTrashTalk]   = useState('');
  const [prizeDesc, setPrizeDesc]   = useState('');

  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [result, setResult]         = useState<CreateChallengeResponse | null>(null);
  const [copied, setCopied]         = useState(false);

  async function handleCreate() {
    if (!handle.trim()) { setError("Enter your opponent's Instagram / YouTube handle."); return; }
    setError(null);
    setLoading(true);
    try {
      const res = await api.createChallenge(
        userId, handle.trim(),
        trashTalk || undefined,
        email || undefined,
        prizeDesc || undefined,
        title || undefined,
        duration,
        platform,
        hashtag ? `#${hashtag.replace(/^#/, '')}` : undefined,
        prizeAmount ? parseFloat(prizeAmount) : undefined,
        currency || undefined,
        guidelines || undefined,
      );
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create challenge.');
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    if (!result) return;
    await navigator.clipboard.writeText(result.battleLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Result screen ─────────────────────────────────────────────────────────
  if (result) {
    const expiresIn = Math.max(0, Math.round((new Date(result.expiresAt).getTime() - Date.now()) / 3600000));
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800/80 backdrop-blur border border-purple-500/30 rounded-2xl p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">⚔️</div>
          <h2 className="text-2xl font-bold text-white mb-1">ContentClash Sent!</h2>
          {result.battleTitle && (
            <p className="text-purple-300 font-semibold mb-1">"{result.battleTitle}"</p>
          )}
          <p className="text-slate-400 text-sm mb-4">
            @{handle.replace('@', '')} has <strong className="text-purple-400">{expiresIn}h</strong> to accept ·{' '}
            {DURATION_OPTIONS.find(d => d.value === result.durationHours)?.label ?? `${result.durationHours}h`} battle ·{' '}
            {result.platform}
          </p>

          {result.themeHashtag && (
            <div className="inline-block bg-purple-900/40 border border-purple-500/20 rounded-full px-3 py-1 text-purple-300 text-sm font-semibold mb-3">
              #{result.themeHashtag}
            </div>
          )}

          {result.prizePoolAmount && (
            <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-xl p-3 mb-3 flex items-center justify-center gap-2">
              <span>🏆</span>
              <span className="text-yellow-300 font-bold">
                Prize Pool: {result.prizeCurrency} {result.prizePoolAmount.toLocaleString()}
              </span>
            </div>
          )}

          {result.prizeDescription && !result.prizePoolAmount && (
            <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-xl p-3 mb-3 flex items-center gap-2">
              <span>🏆</span>
              <span className="text-yellow-300 font-semibold text-sm">Prize: {result.prizeDescription}</span>
            </div>
          )}

          {result.contentGuidelines && (
            <div className="bg-blue-900/20 border border-blue-500/20 rounded-xl p-3 mb-3 text-left">
              <p className="text-blue-300 text-xs font-semibold mb-1">📋 Content Guidelines</p>
              <p className="text-slate-300 text-xs">{result.contentGuidelines}</p>
            </div>
          )}

          {result.trashTalkMsg && (
            <div className="bg-purple-900/40 border border-purple-500/30 rounded-xl p-3 mb-4 text-purple-200 italic text-sm">
              "{result.trashTalkMsg}"
            </div>
          )}

          {/* Battle link */}
          <div className="flex items-center gap-2 bg-slate-700 rounded-xl p-3 mb-4">
            <span className="text-slate-300 text-sm truncate flex-1">{result.battleLink}</span>
            <button onClick={copyLink} className="bg-purple-600 hover:bg-purple-500 text-white text-xs px-3 py-1 rounded-lg transition-colors shrink-0">
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>

          {/* Share buttons */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <a href={result.whatsappLink} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-semibold py-3 rounded-xl transition-colors">
              📱 WhatsApp
            </a>
            <a href={result.instagramDmLink} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold py-3 rounded-xl transition-colors">
              📸 Instagram DM
            </a>
          </div>
          {result.youtubeDmLink && (
            <a href={result.youtubeDmLink} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white font-semibold py-3 rounded-xl transition-colors w-full mb-4">
              ▶️ YouTube Channel
            </a>
          )}

          <button onClick={onBack} className="text-slate-400 hover:text-white text-sm transition-colors">← Back to Battles</button>
        </div>
      </div>
    );
  }

  // ── Creation form ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-lg mx-auto px-4 py-8">
        <button onClick={onBack} className="text-slate-400 hover:text-white text-sm mb-6 flex items-center gap-1 transition-colors">← Back</button>

        <div className="text-center mb-8">
          <div className="text-5xl mb-3">⚔️</div>
          <h1 className="text-2xl font-bold text-white">Create a ContentClash</h1>
          <p className="text-slate-400 mt-1 text-sm">Challenge any creator or brand to a viral battle</p>
        </div>

        <div className="space-y-5">

          {/* Opponent */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Opponent Handle *</label>
            <input type="text" placeholder="@username" value={handle} onChange={e => setHandle(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 focus:border-purple-500 text-white placeholder-slate-400 rounded-xl px-4 py-3 outline-none transition-colors" />
          </div>

          {/* Battle Title */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Battle Title</label>
            <input type="text" placeholder='e.g. "Pepsi vs @BeingIndian — Who Rules Summer?"'
              value={title} onChange={e => setTitle(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 focus:border-purple-500 text-white placeholder-slate-400 rounded-xl px-4 py-3 outline-none transition-colors text-sm" />
          </div>

          {/* Duration + Platform */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Duration</label>
              <div className="flex flex-col gap-1.5">
                {DURATION_OPTIONS.map(o => (
                  <button key={o.value} onClick={() => setDuration(o.value)}
                    className={`py-2 rounded-xl text-sm font-semibold transition-colors ${duration === o.value ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Platform</label>
              <div className="flex flex-col gap-1.5">
                {PLATFORM_OPTIONS.map(o => (
                  <button key={o.value} onClick={() => setPlatform(o.value)}
                    className={`py-2 rounded-xl text-sm font-semibold transition-colors ${platform === o.value ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Theme Hashtag */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Theme / Hashtag</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">#</span>
              <input type="text" placeholder="PepsiClash" value={hashtag} onChange={e => setHashtag(e.target.value.replace(/^#/, ''))}
                className="w-full bg-slate-700 border border-slate-600 focus:border-purple-500 text-white placeholder-slate-400 rounded-xl pl-7 pr-4 py-3 outline-none transition-colors" />
            </div>
          </div>

          {/* Prize Pool */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">🏆 Prize Pool Amount <span className="text-slate-500">(optional)</span></label>
            <div className="flex gap-2">
              <select value={currency} onChange={e => setCurrency(e.target.value)}
                className="bg-slate-700 border border-slate-600 text-white rounded-xl px-3 py-3 outline-none text-sm">
                {['INR','USD','EUR','GBP'].map(c => <option key={c}>{c}</option>)}
              </select>
              <input type="number" min={0} placeholder="500" value={prizeAmount} onChange={e => setPrizeAmount(e.target.value)}
                className="flex-1 bg-slate-700 border border-slate-600 focus:border-yellow-500 text-white placeholder-slate-400 rounded-xl px-4 py-3 outline-none transition-colors" />
            </div>
            <p className="text-xs text-slate-500 mt-1">Or describe the prize below (e.g. "Shoutout to 50K followers")</p>
          </div>

          {/* Prize Description (free text) */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Prize Description <span className="text-slate-500">(optional)</span></label>
            <input type="text" placeholder="e.g. ₹500 via UPI + Shoutout" maxLength={100}
              value={prizeDesc} onChange={e => setPrizeDesc(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 focus:border-yellow-500 text-white placeholder-slate-400 rounded-xl px-4 py-3 outline-none transition-colors text-sm" />
          </div>

          {/* Content Guidelines */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">📋 Content Guidelines <span className="text-slate-500">(optional)</span></label>
            <textarea placeholder='e.g. "Reel must feature our product in first 3 seconds. Mention #PepsiClash."'
              rows={3} value={guidelines} onChange={e => setGuidelines(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 focus:border-blue-500 text-white placeholder-slate-400 rounded-xl px-4 py-3 outline-none transition-colors text-sm resize-none" />
          </div>

          {/* Trash Talk */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Trash Talk <span className="text-slate-500">(optional, max 100 chars)</span></label>
            <input type="text" placeholder="Think you can out-reel me? 😏" maxLength={100}
              value={trashTalk} onChange={e => setTrashTalk(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 focus:border-purple-500 text-white placeholder-slate-400 rounded-xl px-4 py-3 outline-none transition-colors text-sm" />
            <p className="text-xs text-slate-500 mt-1 text-right">{trashTalk.length}/100</p>
          </div>

          {/* Opponent Email */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Opponent's Email <span className="text-slate-500">(optional, for email invite)</span></label>
            <input type="email" placeholder="opponent@example.com" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 focus:border-purple-500 text-white placeholder-slate-400 rounded-xl px-4 py-3 outline-none transition-colors text-sm" />
          </div>

          {error && (
            <div className="bg-red-900/40 border border-red-500/30 text-red-300 rounded-xl p-3 text-sm">{error}</div>
          )}

          <button onClick={handleCreate} disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] text-lg">
            {loading ? 'Creating ContentClash…' : '⚔️ Launch ContentClash'}
          </button>

          <p className="text-center text-xs text-slate-500">Challenge expires in 48 hours if not accepted</p>
        </div>
      </div>
    </div>
  );
}
