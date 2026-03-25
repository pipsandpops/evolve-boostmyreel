import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

export interface UserStatus {
  isPaid: boolean;
  plan: string;
}

/** Get or create a persistent userId stored in localStorage.
 *  Returns { userId, isNew } so we know whether to capture a referral code. */
function getOrCreateUserId(): { userId: string; isNew: boolean } {
  const key = 'bmr_userId';
  const existing = localStorage.getItem(key);
  if (existing) return { userId: existing, isNew: false };
  const id = crypto.randomUUID();
  localStorage.setItem(key, id);
  return { userId: id, isNew: true };
}

/** If the user arrived via ?ref=CODE register the referral once. */
function captureReferral(userId: string): void {
  if (localStorage.getItem('bmr_ref_done')) return;
  const code = new URLSearchParams(window.location.search).get('ref');
  if (!code) return;

  // Mark as referred (used by welcome banner)
  localStorage.setItem('bmr_referred', 'true');
  localStorage.setItem('bmr_ref_done', '1');

  // Fire-and-forget — errors are silently ignored
  api.registerReferral(userId, code).catch(() => {});
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
