import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

export interface UserStatus {
  isPaid: boolean;
  plan: string;
}

const LS_KEY     = 'bmr_userId';
const COOKIE_KEY = 'bmr_uid';
const COOKIE_MAX_AGE = 365 * 24 * 3600; // 1 year

function readCookie(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_KEY}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function persistUserId(id: string) {
  localStorage.setItem(LS_KEY, id);
  document.cookie = `${COOKIE_KEY}=${encodeURIComponent(id)};max-age=${COOKIE_MAX_AGE};path=/;SameSite=Lax`;
}

/** Get or create a persistent userId.
 *  Stored in both localStorage AND a 1-year cookie so clearing localStorage
 *  never wipes the PRO status — the cookie restores it on next visit. */
function getOrCreateUserId(): { userId: string; isNew: boolean } {
  // 1. Try localStorage
  const fromLS = localStorage.getItem(LS_KEY);
  if (fromLS) {
    persistUserId(fromLS); // keep cookie in sync
    return { userId: fromLS, isNew: false };
  }
  // 2. Fall back to cookie (survives localStorage clears)
  const fromCookie = readCookie();
  if (fromCookie) {
    localStorage.setItem(LS_KEY, fromCookie);
    return { userId: fromCookie, isNew: false };
  }
  // 3. Brand new user
  const id = crypto.randomUUID();
  persistUserId(id);
  return { userId: id, isNew: true };
}

/** If the user arrived via ?ref=<referrerId> register the referral.
 *  Retries on each page load until confirmed (idempotent on the server). */
function captureReferral(userId: string): void {
  const code = new URLSearchParams(window.location.search).get('ref');
  if (!code) return;
  if (code === userId) return; // self-referral

  // Mark as referred for the welcome banner
  localStorage.setItem('bmr_referred', 'true');

  // Keep retrying until the server confirms (server is idempotent)
  api.registerReferral(userId, code)
    .then(() => localStorage.setItem('bmr_ref_done', '1'))
    .catch(() => {}); // will retry on next page load
}

export function useUserStatus() {
  const [{ userId }] = useState(() => getOrCreateUserId());
  const [status, setStatus] = useState<UserStatus>({ isPaid: false, plan: 'free' });
  const [loading, setLoading] = useState(true);

  // Capture referral code once on mount
  useEffect(() => {
    captureReferral(userId);
  }, [userId]);

  const refresh = useCallback(async () => {
    try {
      const s = await api.getUserStatus(userId);
      setStatus(s);
    } catch {
      // keep free status on network error
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { userId, status, loading, refresh };
}
