import { useState } from 'react';
import { api } from '../services/api';
import type { CreateChallengeResponse } from '../types';

interface Props {
  userId: string;
  onBack: () => void;
}

export function BattleChallengePage({ userId, onBack }: Props) {
  const [handle, setHandle]       = useState('');
  const [trashTalk, setTrashTalk] = useState('');
  const [email, setEmail]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [result, setResult]       = useState<CreateChallengeResponse | null>(null);
  const [copied, setCopied]       = useState(false);

  async function handleCreate() {
    if (!handle.trim()) { setError('Enter your opponent\'s Instagram handle.'); return; }
    setError(null);
    setLoading(true);
    try {
      const res = await api.createChallenge(userId, handle.trim(), trashTalk || undefined, email || undefined);
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

  if (result) {
    const expiresIn = Math.max(0, Math.round((new Date(result.expiresAt).getTime() - Date.now()) / 3600000));
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800/80 backdrop-blur border border-purple-500/30 rounded-2xl p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">⚔️</div>
          <h2 className="text-2xl font-bold text-white mb-2">Challenge Sent!</h2>
          <p className="text-slate-400 mb-6">
            @{handle.replace('@', '')} has <strong className="text-purple-400">{expiresIn}h</strong> to accept.
          </p>

          {result.trashTalkMsg && (
            <div className="bg-purple-900/40 border border-purple-500/30 rounded-xl p-3 mb-6 text-purple-200 italic text-sm">
              "{result.trashTalkMsg}"
            </div>
          )}

          <div className="flex items-center gap-2 bg-slate-700 rounded-xl p-3 mb-4">
            <span className="text-slate-300 text-sm truncate flex-1">{result.battleLink}</span>
            <button
              onClick={copyLink}
              className="bg-purple-600 hover:bg-purple-500 text-white text-xs px-3 py-1 rounded-lg transition-colors shrink-0"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <a
              href={result.whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              <span>📱</span> WhatsApp
            </a>
            <a
              href={result.instagramDmLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              <span>📸</span> Instagram DM
            </a>
          </div>

          <button onClick={onBack} className="text-slate-400 hover:text-white text-sm transition-colors">
            ← Back to Battles
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800/80 backdrop-blur border border-purple-500/30 rounded-2xl p-8 max-w-md w-full">
        <button onClick={onBack} className="text-slate-400 hover:text-white text-sm mb-6 flex items-center gap-1 transition-colors">
          ← Back
        </button>

        <div className="text-center mb-8">
          <div className="text-5xl mb-3">⚔️</div>
          <h1 className="text-2xl font-bold text-white">Challenge a Creator</h1>
          <p className="text-slate-400 mt-1">24-hour Reel battle — may the best creator win</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Opponent's Instagram Handle *</label>
            <input
              type="text"
              placeholder="@username"
              value={handle}
              onChange={e => setHandle(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 focus:border-purple-500 text-white placeholder-slate-400 rounded-xl px-4 py-3 outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Trash Talk <span className="text-slate-500">(optional, max 100 chars)</span>
            </label>
            <input
              type="text"
              placeholder="Think you can out-reel me? 😏"
              maxLength={100}
              value={trashTalk}
              onChange={e => setTrashTalk(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 focus:border-purple-500 text-white placeholder-slate-400 rounded-xl px-4 py-3 outline-none transition-colors"
            />
            <p className="text-xs text-slate-500 mt-1 text-right">{trashTalk.length}/100</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Opponent's Email <span className="text-slate-500">(optional, for email invite)</span>
            </label>
            <input
              type="email"
              placeholder="opponent@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 focus:border-purple-500 text-white placeholder-slate-400 rounded-xl px-4 py-3 outline-none transition-colors"
            />
          </div>

          {error && (
            <div className="bg-red-900/40 border border-red-500/30 text-red-300 rounded-xl p-3 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {loading ? 'Creating Challenge…' : '⚔️ Send Challenge'}
          </button>
        </div>
      </div>
    </div>
  );
}
