import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { MessageCircle, X, Send, Loader, Wrench, Mail, Crown } from 'lucide-react';
import { useAgentChat, type ChatEntry } from '../hooks/useAgentChat';

interface AgentChatProps {
  userId?: string | null;
  isPaidUser?: boolean;
  currentJobId?: string | null;
}

const SUGGESTED_PROMPTS = [
  'How do I improve my viral score?',
  'What makes a great Instagram hook?',
  'Give me a content strategy for fitness creators',
  'What hashtags work best for food videos?',
];

const TOOL_LABELS: Record<string, string> = {
  get_job_status:           'Checked job status',
  get_analysis_result:      'Retrieved analysis results',
  generate_captions:        'Generated captions',
  analyze_viral_score:      'Calculated viral score',
  suggest_content_strategy: 'Applied content strategy context',
};

const LS_CONTACT_KEY = 'bmr_agent_contact';
const FREE_MSG_LIMIT = 1;

// ── Helpers ───────────────────────────────────────────────────────────────────

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

function isValidPhone(v: string) {
  return /^\+?[\d\s\-()]{7,15}$/.test(v.trim());
}

// ── Sub-components ────────────────────────────────────────────────────────────

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
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
      <div style={{
        maxWidth: '80%',
        background: isUser ? 'linear-gradient(135deg, #4f46e5, #7c3aed)' : '#f8fafc',
        color: isUser ? 'white' : '#1e293b',
        borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        padding: '10px 14px', fontSize: 13, lineHeight: 1.5,
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
                {entry.toolCalls.map((tc, i) => <ToolBadge key={i} toolName={tc.toolName} />)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Contact gate ──────────────────────────────────────────────────────────────

interface ContactGateProps {
  onVerified: (contact: string) => void;
}

function ContactGate({ onVerified }: ContactGateProps) {
  const [value, setValue]   = useState('');
  const [error, setError]   = useState('');

  const handleSubmit = (e: { preventDefault(): void }) => {
    e.preventDefault();
    const v = value.trim();
    if (!v) { setError('Please enter your email or mobile number.'); return; }
    if (!isValidEmail(v) && !isValidPhone(v)) {
      setError('Enter a valid email address or mobile number.');
      return;
    }
    localStorage.setItem(LS_CONTACT_KEY, v);
    onVerified(v);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '24px 20px' }}>
      <div style={{
        width: 48, height: 48, borderRadius: '50%',
        background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 16px',
      }}>
        <Mail size={22} color="#7c3aed" />
      </div>

      <h3 style={{ textAlign: 'center', fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>
        Before we chat…
      </h3>
      <p style={{ textAlign: 'center', fontSize: 13, color: '#64748b', margin: '0 0 24px', lineHeight: 1.5 }}>
        Enter your email or mobile number to get started with your AI growth coach.
      </p>

      <form onSubmit={handleSubmit}>
        <input
          autoFocus
          type="text"
          placeholder="email@example.com or +91 98765 43210"
          value={value}
          onChange={e => { setValue(e.target.value); setError(''); }}
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 10,
            border: `1px solid ${error ? '#fca5a5' : '#e2e8f0'}`,
            fontSize: 13, outline: 'none', boxSizing: 'border-box',
            background: error ? '#fff5f5' : 'white',
          }}
        />
        {error && (
          <p style={{ color: '#ef4444', fontSize: 12, margin: '6px 0 0' }}>{error}</p>
        )}
        <button type="submit" style={{
          width: '100%', marginTop: 14, padding: '11px 0', borderRadius: 10,
          background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
          color: 'white', border: 'none', cursor: 'pointer',
          fontSize: 14, fontWeight: 600,
        }}>
          Start Chatting
        </button>
      </form>

      <p style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8', margin: '12px 0 0' }}>
        We'll never share your contact info.
      </p>
    </div>
  );
}

// ── Upgrade prompt ────────────────────────────────────────────────────────────

function UpgradePrompt() {
  return (
    <div style={{
      margin: '8px 14px 12px',
      background: 'linear-gradient(135deg, #faf5ff, #f0f9ff)',
      border: '1px solid #ddd6fe', borderRadius: 14, padding: '14px 16px',
      textAlign: 'center',
    }}>
      <Crown size={20} color="#7c3aed" style={{ marginBottom: 8 }} />
      <div style={{ fontSize: 13, fontWeight: 700, color: '#4c1d95', marginBottom: 4 }}>
        Upgrade to PRO
      </div>
      <div style={{ fontSize: 12, color: '#6d28d9', marginBottom: 12, lineHeight: 1.5 }}>
        You've used your free message. Upgrade for unlimited AI coaching.
      </div>
      <a
        href="/?page=payment"
        style={{
          display: 'inline-block', padding: '8px 20px', borderRadius: 20,
          background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
          color: 'white', fontSize: 12, fontWeight: 700, textDecoration: 'none',
        }}
      >
        Upgrade Now
      </a>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function AgentChat({ userId, isPaidUser = false, currentJobId }: AgentChatProps) {
  const [open, setOpen]         = useState(false);
  const [text, setText]         = useState('');
  const [contact, setContact]   = useState<string | null>(
    () => localStorage.getItem(LS_CONTACT_KEY)
  );
  const [msgsSent, setMsgsSent] = useState(0);

  const hitLimit    = !isPaidUser && msgsSent >= FREE_MSG_LIMIT;
  const showGate    = !contact;

  const { entries, isLoading, send, clear } = useAgentChat(userId);
  const bottomRef    = useRef<HTMLDivElement>(null);
  const textareaRef  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries]);

  useEffect(() => {
    if (open && !showGate) textareaRef.current?.focus();
  }, [open, showGate]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || isLoading || hitLimit) return;
    setText('');

    const message = currentJobId && !trimmed.includes(currentJobId)
      ? `[Context: current job ${currentJobId}] ${trimmed}`
      : trimmed;

    setMsgsSent(n => n + 1);
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
      <style>{`
        @keyframes dotBounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40%            { transform: scale(1);   opacity: 1;   }
        }
        @keyframes chatSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
      `}</style>

      {/* Chat window */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 84, right: 20, zIndex: 1000,
          width: 350, height: 520,
          background: 'white', borderRadius: 20,
          boxShadow: '0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(79,70,229,0.12)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          animation: 'chatSlideUp 0.2s ease',
          border: '1px solid #e2e8f0',
        }}>

          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            padding: '14px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexShrink: 0,
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
                <div style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>
                  AI Assistant
                  {isPaidUser && (
                    <span style={{
                      marginLeft: 6, fontSize: 10, background: 'rgba(255,255,255,0.2)',
                      borderRadius: 10, padding: '1px 6px', verticalAlign: 'middle',
                    }}>PRO</span>
                  )}
                </div>
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
                color: 'white', borderRadius: 8, padding: '4px 8px',
                display: 'flex', alignItems: 'center',
              }}>
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Gate or chat */}
          {showGate ? (
            <ContactGate onVerified={c => setContact(c)} />
          ) : (
            <>
              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 0' }}>
                {entries.length === 0 ? (
                  <div>
                    {!isPaidUser && (
                      <div style={{
                        background: '#fefce8', border: '1px solid #fde68a',
                        borderRadius: 10, padding: '8px 12px', marginBottom: 14,
                        fontSize: 12, color: '#92400e', textAlign: 'center',
                      }}>
                        Free plan: <strong>1 message</strong>. Upgrade for unlimited.
                      </div>
                    )}
                    <p style={{ color: '#64748b', fontSize: 13, textAlign: 'center', margin: '8px 0 16px' }}>
                      Ask me anything about growing your Instagram Reels!
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {SUGGESTED_PROMPTS.map(p => (
                        <button key={p} onClick={() => handlePrompt(p)} style={{
                          background: '#f8fafc', border: '1px solid #e2e8f0',
                          borderRadius: 12, padding: '8px 12px',
                          fontSize: 12, color: '#475569', cursor: 'pointer',
                          textAlign: 'left', fontWeight: 500,
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

              {/* Upgrade prompt after limit hit */}
              {hitLimit && <UpgradePrompt />}

              {/* Input */}
              {!hitLimit && (
                <div style={{ padding: 12, borderTop: '1px solid #e2e8f0', flexShrink: 0 }}>
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
                        ? <Loader size={16} color="#94a3b8" />
                        : <Send size={16} color={text.trim() ? 'white' : '#94a3b8'} />
                      }
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
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
