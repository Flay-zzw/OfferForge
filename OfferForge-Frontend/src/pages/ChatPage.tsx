import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Trash2, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { api } from '../api';
import type { ChatRequest } from '../types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const codeTheme: Record<string, React.CSSProperties> = {
  'code[class*="language-"]': { color: '#e2e8f0', background: 'none', fontFamily: 'Consolas, monospace', fontSize: '13px', textAlign: 'left', whiteSpace: 'pre', wordSpacing: 'normal', wordBreak: 'normal', wordWrap: 'normal', lineHeight: '1.7' },
  'pre[class*="language-"]': { color: '#e2e8f0', background: '#1e293b', padding: '16px', borderRadius: '10px', overflow: 'auto', fontSize: '13px', lineHeight: '1.7' },
  comment: { color: '#64748b' },
  prolog: { color: '#64748b' },
  doctype: { color: '#64748b' },
  cdata: { color: '#64748b' },
  punctuation: { color: '#94a3b8' },
  property: { color: '#818cf8' },
  tag: { color: '#f87171' },
  boolean: { color: '#fb923c' },
  number: { color: '#fb923c' },
  constant: { color: '#fb923c' },
  symbol: { color: '#fb923c' },
  deleted: { color: '#f87171' },
  selector: { color: '#4ade80' },
  'attr-name': { color: '#4ade80' },
  string: { color: '#4ade80' },
  char: { color: '#4ade80' },
  builtin: { color: '#4ade80' },
  inserted: { color: '#4ade80' },
  operator: { color: '#94a3b8' },
  entity: { color: '#fbbf24', cursor: 'help' },
  url: { color: '#38bdf8' },
  variable: { color: '#e2e8f0' },
  atrule: { color: '#818cf8' },
  'attr-value': { color: '#4ade80' },
  function: { color: '#818cf8' },
  'class-name': { color: '#fbbf24' },
  keyword: { color: '#c084fc' },
  regex: { color: '#fb923c' },
  important: { color: '#f87171', fontWeight: 'bold' },
  bold: { fontWeight: 'bold' },
  italic: { fontStyle: 'italic' },
};

const mdStyles: Record<string, React.CSSProperties> = {
  h1: { fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginTop: 20, marginBottom: 14, lineHeight: 1.4 },
  h2: { fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginTop: 18, marginBottom: 10, lineHeight: 1.4, borderBottom: '1px solid var(--border-primary)', paddingBottom: 7 },
  h3: { fontSize: 15, fontWeight: 600, color: 'var(--accent-primary)', marginTop: 14, marginBottom: 8, lineHeight: 1.4 },
  h4: { fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginTop: 12, marginBottom: 6, lineHeight: 1.4 },
  p: { marginTop: 0, marginBottom: 12, lineHeight: 1.75 },
  ul: { paddingLeft: 22, marginTop: 0, marginBottom: 12 },
  ol: { paddingLeft: 22, marginTop: 0, marginBottom: 12 },
  li: { marginBottom: 6, lineHeight: 1.7 },
  blockquote: { borderLeft: '3px solid var(--accent-primary)', paddingLeft: 14, marginLeft: 0, color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: 12 },
  strong: { fontWeight: 700, color: 'var(--text-primary)' },
  em: { fontStyle: 'italic', color: 'var(--text-secondary)' },
  inlineCode: { background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: 4, fontSize: 13, fontFamily: 'Consolas, monospace', color: 'var(--accent-secondary)' },
  a: { color: 'var(--accent-primary)', textDecoration: 'underline' },
  hr: { border: 'none', borderTop: '1px solid var(--border-primary)', margin: '16px 0' },
  table: { width: '100%', borderCollapse: 'collapse', marginBottom: 12 },
  th: { border: '1px solid var(--border-primary)', padding: '8px 12px', background: 'var(--bg-tertiary)', textAlign: 'left', fontWeight: 600 },
  td: { border: '1px solid var(--border-primary)', padding: '8px 12px' },
};

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
                {msg.role === 'assistant' ? (
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => <h1 style={mdStyles.h1}>{children}</h1>,
                      h2: ({ children }) => <h2 style={mdStyles.h2}>{children}</h2>,
                      h3: ({ children }) => <h3 style={mdStyles.h3}>{children}</h3>,
                      h4: ({ children }) => <h4 style={mdStyles.h4}>{children}</h4>,
                      p: ({ children }) => <p style={mdStyles.p}>{children}</p>,
                      ul: ({ children }) => <ul style={mdStyles.ul}>{children}</ul>,
                      ol: ({ children }) => <ol style={mdStyles.ol}>{children}</ol>,
                      li: ({ children }) => <li style={mdStyles.li}>{children}</li>,
                      blockquote: ({ children }) => <blockquote style={mdStyles.blockquote}>{children}</blockquote>,
                      strong: ({ children }) => <strong style={mdStyles.strong}>{children}</strong>,
                      em: ({ children }) => <em style={mdStyles.em}>{children}</em>,
                      hr: () => <hr style={mdStyles.hr} />,
                      a: ({ href, children }) => (
                        <a href={href} style={mdStyles.a} target="_blank" rel="noopener noreferrer">
                          {children}
                        </a>
                      ),
                      table: ({ children }) => <table style={mdStyles.table}>{children}</table>,
                      th: ({ children }) => <th style={mdStyles.th}>{children}</th>,
                      td: ({ children }) => <td style={mdStyles.td}>{children}</td>,
                      code: ({ node, className, children, ...props }) => {
                        const match = /language-(\w+)/.exec(className || '');
                        const isInline = !match && !className;
                        return !isInline && match ? (
                          <SyntaxHighlighter
                            style={codeTheme as Record<string, React.CSSProperties>}
                            language={match[1]}
                            PreTag="div"
                            customStyle={{
                              margin: '1em 0',
                              borderRadius: '10px',
                              background: '#1e293b',
                            }}
                          >
                            {String(children).replace(/\n$/, '')}
                          </SyntaxHighlighter>
                        ) : (
                          <code className={className} style={mdStyles.inlineCode} {...props}>
                            {children}
                          </code>
                        );
                      },
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                ) : (
                  msg.content
                )}
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
    padding: '32px 24px 24px',
    background: 'linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%)',
  },
  chatCard: {
    width: '100%',
    maxWidth: 900,
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg-card)',
    borderRadius: '24px',
    border: '1px solid var(--border-primary)',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
    overflow: 'hidden',
    minHeight: 680,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '24px 28px 20px',
    borderBottom: '1px solid var(--border-primary)',
    background: 'linear-gradient(135deg, var(--accent-primary-light) 0%, transparent 60%)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: 'var(--text-primary)',
    margin: 0,
    letterSpacing: '-0.02em',
  },
  subtitle: {
    fontSize: 14,
    color: 'var(--text-tertiary)',
    margin: 0,
    marginTop: 3,
  },
  clearBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 38,
    height: 38,
    border: '1px solid var(--border-primary)',
    borderRadius: '10px',
    background: 'var(--bg-card)',
    color: 'var(--text-tertiary)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  messagesArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '28px 28px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
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
    gap: 12,
  },
  avatarBot: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 4,
    boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
  },
  avatarUser: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 4,
    boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
  },
  messageBubble: {
    maxWidth: '75%',
    padding: '14px 18px',
    borderRadius: '18px',
    fontSize: 15,
    lineHeight: 1.8,
    wordBreak: 'break-word',
  },
  userBubble: {
    background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
    color: '#ffffff',
    borderBottomRightRadius: 6,
    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
  },
  botBubble: {
    background: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-primary)',
    borderBottomLeftRadius: 6,
  },
  inputArea: {
    padding: '16px 28px 24px',
    borderTop: '1px solid var(--border-primary)',
  },
  inputWrapper: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 12,
    background: 'var(--bg-secondary)',
    border: '2px solid var(--border-primary)',
    borderRadius: '20px',
    padding: '12px 12px 12px 20px',
    transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)',
  },
  textarea: {
    flex: 1,
    border: 'none',
    outline: 'none',
    background: 'transparent',
    color: 'var(--text-primary)',
    fontSize: 15,
    lineHeight: 1.6,
    resize: 'none',
    minHeight: 26,
    maxHeight: 140,
    padding: '5px 0',
  },
  sendBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 42,
    height: 42,
    border: 'none',
    borderRadius: '14px',
    background: 'var(--bg-tertiary)',
    color: 'var(--text-tertiary)',
    transition: 'all var(--transition-fast)',
    flexShrink: 0,
  },
  sendBtnActive: {
    background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
    color: '#ffffff',
    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
  },
  hint: {
    fontSize: 11,
    color: 'var(--text-tertiary)',
    textAlign: 'center',
    marginTop: 8,
    margin: '8px 0 0',
  },
};
