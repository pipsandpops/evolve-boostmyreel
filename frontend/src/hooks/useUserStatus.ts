import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

export interface UserStatus {
  isPaid: boolean;
  plan: string;
}

/** Get or create a persistent userId stored in localStorage. */
function getOrCreateUserId(): string {
  const key = 'bmr_userId';
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export function useUserStatus() {
  const [userId]  = useState<string>(() => getOrCreateUserId());
  const [status, setStatus]   = useState<UserStatus>({ isPaid: false, plan: 'free' });
  const [loading, setLoading] = useState(true);

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
