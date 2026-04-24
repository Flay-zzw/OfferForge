import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Trash2, Sparkles } from 'lucide-react';
import { api } from '../api';
import type { ChatRequest } from '../types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history: ChatRequest['history'] = messages.map((m) => ({ role: m.role, content: m.content }));
      const res = await api.chat({ message: trimmed, history });
      const assistantMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: res.reply };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `抱歉，请求出错了：${err instanceof Error ? err.message : '未知错误'}`,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => setMessages([]);

  return (
    <div style={styles.page}>
      <div style={styles.chatCard}>
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.avatar}>
              <Sparkles size={20} color="var(--accent-primary)" />
            </div>
            <div>
              <h1 style={styles.title}>OfferForge AI</h1>
              <p style={styles.subtitle}>你的专属面试辅导助手</p>
            </div>
          </div>
          {messages.length > 0 && (
            <button style={styles.clearBtn} onClick={clearChat} title="清空对话">
              <Trash2 size={15} />
            </button>
          )}
        </div>

        <div style={styles.messagesArea}>
          {messages.length === 0 && (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>
                <Bot size={32} color="var(--accent-primary)" />
              </div>
              <h2 style={styles.emptyTitle}>有什么可以帮你的？</h2>
              <p style={styles.emptyDesc}>
                我可以帮你解答面试问题、分析面经、模拟面试场景。
              </p>
              <div style={styles.suggestions}>
                {[
                  '如何准备系统设计面试？',
                  'React 的 virtual DOM 原理是什么？',
                  '介绍一下你最强的项目',
                ].map((s) => (
                  <button key={s} style={styles.suggestionBtn} onClick={() => setInput(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                ...styles.messageRow,
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              {msg.role === 'assistant' && (
                <div style={styles.avatarBot}>
                  <Bot size={16} />
                </div>
              )}
              <div
                style={{
                  ...styles.messageBubble,
                  ...(msg.role === 'user' ? styles.userBubble : styles.botBubble),
                }}
              >
                {msg.content}
              </div>
              {msg.role === 'user' && (
                <div style={styles.avatarUser}>
                  <User size={16} />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div style={{ ...styles.messageRow, justifyContent: 'flex-start' }}>
              <div style={styles.avatarBot}>
                <Bot size={16} />
              </div>
              <div style={{ ...styles.messageBubble, ...styles.botBubble }}>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div style={styles.inputArea}>
          <div style={styles.inputWrapper}>
            <textarea
              ref={inputRef}
              style={styles.textarea}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入问题，Shift+Enter 换行..."
              rows={1}
              disabled={loading}
            />
            <button
              style={{
                ...styles.sendBtn,
                ...(input.trim() && !loading ? styles.sendBtnActive : {}),
              }}
              onClick={handleSend}
              disabled={!input.trim() || loading}
            >
              <Send size={17} />
            </button>
          </div>
          <p style={styles.hint}>AI 辅助，答案仅供参考</p>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    padding: '28px 20px 20px',
    background: 'var(--bg-secondary)',
  },
  chatCard: {
    width: '100%',
    maxWidth: 780,
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg-card)',
    borderRadius: 'var(--radius-xl)',
    border: '1px solid var(--border-primary)',
    boxShadow: 'var(--shadow-lg)',
    overflow: 'hidden',
    minHeight: 560,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px 16px',
    borderBottom: '1px solid var(--border-primary)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: '50%',
    background: 'var(--accent-primary-light)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: 700,
    color: 'var(--text-primary)',
    margin: 0,
  },
  subtitle: {
    fontSize: 13,
    color: 'var(--text-tertiary)',
    margin: 0,
    marginTop: 2,
  },
  clearBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 34,
    height: 34,
    border: '1px solid var(--border-primary)',
    borderRadius: 'var(--radius-sm)',
    background: 'transparent',
    color: 'var(--text-tertiary)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  messagesArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px 24px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    gap: 10,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: '50%',
    background: 'var(--accent-primary-light)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 600,
    color: 'var(--text-primary)',
    margin: 0,
  },
  emptyDesc: {
    fontSize: 14,
    color: 'var(--text-tertiary)',
    textAlign: 'center',
    maxWidth: 360,
    lineHeight: 1.7,
    margin: 0,
  },
  suggestions: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 12,
  },
  suggestionBtn: {
    padding: '7px 16px',
    border: '1px solid var(--border-primary)',
    borderRadius: 'var(--radius-xl)',
    background: 'var(--bg-secondary)',
    color: 'var(--text-secondary)',
    fontSize: 13,
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  messageRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
  },
  avatarBot: {
    width: 30,
    height: 30,
    borderRadius: '50%',
    background: 'var(--accent-primary-light)',
    color: 'var(--accent-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  avatarUser: {
    width: 30,
    height: 30,
    borderRadius: '50%',
    background: 'var(--accent-primary)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  messageBubble: {
    maxWidth: '72%',
    padding: '10px 15px',
    borderRadius: 'var(--radius-lg)',
    fontSize: 14,
    lineHeight: 1.75,
    wordBreak: 'break-word',
  },
  userBubble: {
    background: 'var(--accent-primary)',
    color: '#ffffff',
    borderBottomRightRadius: 4,
  },
  botBubble: {
    background: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-primary)',
    borderBottomLeftRadius: 4,
  },
  inputArea: {
    padding: '12px 24px 20px',
    borderTop: '1px solid var(--border-primary)',
  },
  inputWrapper: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 10,
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-primary)',
    borderRadius: 'var(--radius-lg)',
    padding: '10px 10px 10px 16px',
    transition: 'border-color var(--transition-fast)',
  },
  textarea: {
    flex: 1,
    border: 'none',
    outline: 'none',
    background: 'transparent',
    color: 'var(--text-primary)',
    fontSize: 14,
    lineHeight: 1.6,
    resize: 'none',
    minHeight: 24,
    maxHeight: 120,
    padding: '4px 0',
  },
  sendBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-tertiary)',
    color: 'var(--text-tertiary)',
    transition: 'all var(--transition-fast)',
    flexShrink: 0,
  },
  sendBtnActive: {
    background: 'var(--accent-primary)',
    color: '#ffffff',
  },
  hint: {
    fontSize: 11,
    color: 'var(--text-tertiary)',
    textAlign: 'center',
    marginTop: 8,
    margin: '8px 0 0',
  },
};
