import { useState, useCallback } from 'react';
import { api } from '../services/api';
import type { AgentMessage, AgentToolCall } from '../types';

export interface ChatEntry {
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: AgentToolCall[];
  isLoading?: boolean;
}

interface UseAgentChatResult {
  entries: ChatEntry[];
  isLoading: boolean;
  error: string | null;
  send: (text: string) => Promise<void>;
  clear: () => void;
}

export function useAgentChat(userId?: string | null): UseAgentChatResult {
  const [entries, setEntries]       = useState<ChatEntry[]>([]);
  const [apiMessages, setApiMessages] = useState<AgentMessage[]>([]);
  const [isLoading, setLoading]     = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const send = useCallback(async (text: string) => {
    const userMsg: AgentMessage = { role: 'user', content: text };
    const nextMessages = [...apiMessages, userMsg];

    setEntries(prev => [
      ...prev,
      { role: 'user', content: text },
      { role: 'assistant', content: '', isLoading: true },
    ]);
    setApiMessages(nextMessages);
    setLoading(true);
    setError(null);

    try {
      const res = await api.agentChat(nextMessages, userId ?? undefined);

      setApiMessages(prev => [...prev, { role: 'assistant', content: res.reply }]);
      setEntries(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: res.reply,
          toolCalls: res.toolCalls,
          isLoading: false,
        };
        return updated;
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Agent error.';
      setError(msg);
      setEntries(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: `Error: ${msg}`, isLoading: false };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  }, [apiMessages, userId]);

  const clear = useCallback(() => {
    setEntries([]);
    setApiMessages([]);
    setError(null);
  }, []);

  return { entries, isLoading, error, send, clear };
}
