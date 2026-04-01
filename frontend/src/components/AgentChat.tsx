import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { MessageCircle, X, Send, Loader, Wrench } from 'lucide-react';
import { useAgentChat, type ChatEntry } from '../hooks/useAgentChat';

interface AgentChatProps {
  userId?: string | null;
  currentJobId?: string | null;
}

const SUGGESTED_PROMPTS = [
  'How do I improve my viral score?',
  'What makes a great Instagram hook?',
  'Give me a content strategy for fitness creators',
  'What hashtags work best for food videos?',
];

const TOOL_LABELS: Record<string, string> = {
  get_job_status:          'Checked job status',
  get_analysis_result:     'Retrieved analysis results',
  generate_captions:       'Generated captions',
  analyze_viral_score:     'Calculated viral score',
  suggest_content_strategy:'Applied content strategy context',
};

function ToolBadge({ toolName }: { toolName: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: '#ede9fe', color: '#5b21b6', borderRadius: 20,
      fontSize: 11, fontWeight: 600, padding: '2px 8px', marginTop: 4,
    }}>
      <Wrench size={10} />
      {TOOL_LABELS[toolName] ?? toolName}
    </span>
  );
}

function MessageBubble({ entry }: { entry: ChatEntry }) {
  const isUser = entry.role === 'user';

  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 10,
    }}>
      <div style={{
        maxWidth: '80%',
        background: isUser
          ? 'linear-gradient(135deg, #4f46e5, #7c3aed)'
          : '#f8fafc',
        color: isUser ? 'white' : '#1e293b',
        borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        padding: '10px 14px',
        fontSize: 13,
        lineHeight: 1.5,
        boxShadow: isUser ? 'none' : '0 1px 4px rgba(0,0,0,0.08)',
        border: isUser ? 'none' : '1px solid #e2e8f0',
      }}>
        {entry.isLoading ? (
          <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {[0, 1, 2].map(i => (
              <span key={i} style={{
                width: 6, height: 6, borderRadius: '50%', background: '#94a3b8',
                animation: `dotBounce 1.2s ease-in-out ${i * 0.2}s infinite`,
              }} />
            ))}
          </span>
        ) : (
          <>
            <span style={{ whiteSpace: 'pre-wrap' }}>{entry.content}</span>
            {entry.toolCalls && entry.toolCalls.length > 0 && (
              <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {entry.toolCalls.map((tc, i) => (
                  <ToolBadge key={i} toolName={tc.toolName} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function AgentChat({ userId, currentJobId }: AgentChatProps) {
  const [open, setOpen]     = useState(false);
  const [text, setText]     = useState('');
  const { entries, isLoading, send, clear } = useAgentChat(userId);
  const bottomRef           = useRef<HTMLDivElement>(null);
  const textareaRef         = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries]);

  // Focus textarea when opened
  useEffect(() => {
    if (open) textareaRef.current?.focus();
  }, [open]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    setText('');

    // Prepend job context if there's an active job the user hasn't mentioned
    const message = currentJobId && !trimmed.includes(currentJobId)
      ? `[Context: current job ${currentJobId}] ${trimmed}`
      : trimmed;

    await send(message);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePrompt = (prompt: string) => {
    setText(prompt);
    textareaRef.current?.focus();
  };

  return (
    <>
      {/* Dot-bounce animation keyframes */}
      <style>{`
        @keyframes dotBounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
        @keyframes chatSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Chat window */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 84, right: 20, zIndex: 1000,
          width: 350, height: 520,
          background: 'white',
          borderRadius: 20,
          boxShadow: '0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(79,70,229,0.12)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          animation: 'chatSlideUp 0.2s ease',
          border: '1px solid #e2e8f0',
        }}>

          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            padding: '14px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <MessageCircle size={16} color="white" />
              </div>
              <div>
                <div style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>AI Assistant</div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>Powered by Claude</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {entries.length > 0 && (
                <button onClick={clear} style={{
                  background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer',
                  color: 'white', borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 600,
                }}>
                  Clear
                </button>
              )}
              <button onClick={() => setOpen(false)} style={{
                background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer',
                color: 'white', borderRadius: 8, padding: '4px 8px', display: 'flex', alignItems: 'center',
              }}>
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 0' }}>
            {entries.length === 0 ? (
              <div>
                <p style={{ color: '#64748b', fontSize: 13, textAlign: 'center', margin: '16px 0 20px' }}>
                  Ask me anything about growing your Instagram Reels!
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {SUGGESTED_PROMPTS.map(p => (
                    <button key={p} onClick={() => handlePrompt(p)} style={{
                      background: '#f8fafc', border: '1px solid #e2e8f0',
                      borderRadius: 12, padding: '8px 12px',
                      fontSize: 12, color: '#475569', cursor: 'pointer',
                      textAlign: 'left', fontWeight: 500,
                      transition: 'background 0.15s',
                    }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f1f5f9')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#f8fafc')}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              entries.map((entry, i) => <MessageBubble key={i} entry={entry} />)
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: 12, borderTop: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <textarea
                ref={textareaRef}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything… (Ctrl+Enter to send)"
                rows={2}
                style={{
                  flex: 1, resize: 'none', border: '1px solid #e2e8f0',
                  borderRadius: 12, padding: '8px 12px', fontSize: 13,
                  fontFamily: 'inherit', color: '#1e293b', outline: 'none',
                  lineHeight: 1.5,
                }}
              />
              <button
                onClick={handleSend}
                disabled={!text.trim() || isLoading}
                style={{
                  width: 38, height: 38, borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: text.trim() && !isLoading
                    ? 'linear-gradient(135deg, #4f46e5, #7c3aed)'
                    : '#e2e8f0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, transition: 'background 0.15s',
                }}
              >
                {isLoading
                  ? <Loader size={16} color="#94a3b8" style={{ animation: 'spin 1s linear infinite' }} />
                  : <Send size={16} color={text.trim() ? 'white' : '#94a3b8'} />
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        title="AI Assistant"
        style={{
          position: 'fixed', bottom: 20, right: 20, zIndex: 1001,
          width: 52, height: 52, borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: open
            ? '#e2e8f0'
            : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(79,70,229,0.35)',
          transition: 'background 0.2s, transform 0.2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.08)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
      >
        {open
          ? <X size={20} color="#475569" />
          : <MessageCircle size={22} color="white" />
        }
      </button>
    </>
  );
}
