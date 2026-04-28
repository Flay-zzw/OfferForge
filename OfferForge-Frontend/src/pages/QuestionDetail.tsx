import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { Building2, Calendar, Signal, Trash2, Link as LinkIcon } from 'lucide-react';
import type { Question } from '../types';

interface Props {
  question: Question;
  onDelete: () => void;
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

export default function QuestionDetail({ question, onDelete }: Props) {
  const difficultyColor = (d: string) => {
    switch (d) {
      case '简单':
        return { bg: 'var(--success-light)', color: 'var(--success)' };
      case '困难':
        return { bg: 'var(--danger-light)', color: 'var(--danger)' };
      default:
        return { bg: 'var(--warning-light)', color: 'var(--warning)' };
    }
  };

  const dc = difficultyColor(question.difficulty);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/questions/${question.id}`;
    navigator.clipboard.writeText(url).catch(() => {});
  };

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <div style={styles.header}>
          <div style={styles.metaRow}>
            {question.company && (
              <a
                href={`#company-${question.company}`}
                style={styles.metaBadge}
                onClick={(e) => {
                  e.preventDefault();
                  const event = new CustomEvent('filter-company', { detail: question.company });
                  window.dispatchEvent(event);
                }}
              >
                <Building2 size={13} />
                {question.company}
              </a>
            )}
            <span
              style={{
                ...styles.difficultyBadge,
                background: dc.bg,
                color: dc.color,
              }}
            >
              <Signal size={12} />
              {question.difficulty}
            </span>
            <span style={styles.dateBadge}>
              <Calendar size={12} />
              {formatDate(question.created_at)}
            </span>
          </div>

          <div style={styles.actions}>
            <button style={styles.actionBtn} onClick={handleCopyLink} title="复制链接">
              <LinkIcon size={15} />
              复制链接
            </button>
            <button style={{ ...styles.actionBtn, ...styles.deleteBtn }} onClick={onDelete} title="删除">
              <Trash2 size={15} />
              删除
            </button>
          </div>
        </div>

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>
            <Signal size={14} />
            题目
          </h3>
          <div style={styles.questionBox}>
            <ReactMarkdown
              components={{
                h1: ({ children }) => <h1 style={{ ...markdownStyles.h1 }}>{children}</h1>,
                h2: ({ children }) => <h2 style={{ ...markdownStyles.h2 }}>{children}</h2>,
                h3: ({ children }) => <h3 style={{ ...markdownStyles.h3 }}>{children}</h3>,
                p: ({ children }) => <p style={{ ...markdownStyles.p }}>{children}</p>,
                ul: ({ children }) => <ul style={{ ...markdownStyles.ul }}>{children}</ul>,
                ol: ({ children }) => <ol style={{ ...markdownStyles.ol }}>{children}</ol>,
                li: ({ children }) => <li style={{ ...markdownStyles.li }}>{children}</li>,
                blockquote: ({ children }) => <blockquote style={{ ...markdownStyles.blockquote }}>{children}</blockquote>,
                strong: ({ children }) => <strong style={{ ...markdownStyles.strong }}>{children}</strong>,
                em: ({ children }) => <em style={{ ...markdownStyles.em }}>{children}</em>,
                code: ({ node, className, children, ...props }) => {
                  const match = /language-(\w+)/.exec(className || '');
                  const isInline = !match && !className;
                  return !isInline && match ? (
                    <SyntaxHighlighter
                      style={codeTheme as Record<string, React.CSSProperties>}
                      language={match[1]}
                      PreTag="div"
                      customStyle={{
                        margin: '1.2em 0',
                        borderRadius: '12px',
                        background: '#1e293b',
                      }}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={className} style={{ ...markdownStyles.inlineCode }} {...props}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {question.question}
            </ReactMarkdown>
          </div>
        </div>

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>
            <Signal size={14} />
            参考答案
          </h3>
          <div style={styles.answerBox}>
            {question.answer ? (
              <ReactMarkdown
                components={{
                  h1: ({ children }) => <h1 style={{ ...markdownStyles.h1 }}>{children}</h1>,
                  h2: ({ children }) => <h2 style={{ ...markdownStyles.h2 }}>{children}</h2>,
                  h3: ({ children }) => <h3 style={{ ...markdownStyles.h3 }}>{children}</h3>,
                  p: ({ children }) => <p style={{ ...markdownStyles.p }}>{children}</p>,
                  ul: ({ children }) => <ul style={{ ...markdownStyles.ul }}>{children}</ul>,
                  ol: ({ children }) => <ol style={{ ...markdownStyles.ol }}>{children}</ol>,
                  li: ({ children }) => <li style={{ ...markdownStyles.li }}>{children}</li>,
                  blockquote: ({ children }) => <blockquote style={{ ...markdownStyles.blockquote }}>{children}</blockquote>,
                  strong: ({ children }) => <strong style={{ ...markdownStyles.strong }}>{children}</strong>,
                  em: ({ children }) => <em style={{ ...markdownStyles.em }}>{children}</em>,
                  code({ node, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    const isInline = !match && !className;
                    return !isInline && match ? (
                      <SyntaxHighlighter
                        style={codeTheme as Record<string, React.CSSProperties>}
                        language={match[1]}
                        PreTag="div"
                        customStyle={{
                          margin: '1.2em 0',
                          borderRadius: '12px',
                          background: '#1e293b',
                        }}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    ) : (
                      <code className={className} style={{ ...markdownStyles.inlineCode }} {...props}>
                        {children}
                      </code>
                    );
                  },
                  a({ href, children }) {
                    return (
                      <a
                        href={href}
                        style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {children}
                      </a>
                    );
                  },
                }}
              >
                {question.answer}
              </ReactMarkdown>
            ) : (
              <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                暂无参考答案
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const markdownStyles: Record<string, React.CSSProperties> = {
  h1: { fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginTop: 24, marginBottom: 16, lineHeight: 1.4 },
  h2: { fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginTop: 20, marginBottom: 12, lineHeight: 1.4, borderBottom: '1px solid var(--border-primary)', paddingBottom: 8 },
  h3: { fontSize: 16, fontWeight: 600, color: 'var(--accent-primary)', marginTop: 16, marginBottom: 10, lineHeight: 1.4 },
  p: { marginTop: 0, marginBottom: 14, lineHeight: 1.8 },
  ul: { paddingLeft: 24, marginTop: 0, marginBottom: 14 },
  ol: { paddingLeft: 24, marginTop: 0, marginBottom: 14 },
  li: { marginBottom: 8, lineHeight: 1.7 },
  blockquote: { borderLeft: '4px solid var(--accent-primary)', paddingLeft: 16, marginLeft: 0, color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: 14 },
  strong: { fontWeight: 700, color: 'var(--text-primary)' },
  em: { fontStyle: 'italic', color: 'var(--text-secondary)' },
  inlineCode: { background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: 4, fontSize: 13, fontFamily: 'Consolas, monospace', color: 'var(--accent-secondary)' },
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: '100%',
    overflowY: 'auto',
    background: 'linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%)',
  },
  content: {
    maxWidth: 880,
    margin: '0 auto',
    padding: '32px 36px 56px',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 28,
    gap: 20,
    padding: '20px 24px',
    background: 'var(--bg-card)',
    borderRadius: '18px',
    border: '1px solid var(--border-primary)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)',
  },
  metaRow: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
  },
  metaBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 14px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, var(--accent-primary-light) 0%, rgba(139, 92, 246, 0.1) 100%)',
    color: 'var(--accent-primary)',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: 'none',
    transition: 'all var(--transition-fast)',
    border: '1px solid var(--accent-primary)',
  },
  difficultyBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 14px',
    borderRadius: '10px',
    fontSize: 13,
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  dateBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 14px',
    borderRadius: '10px',
    background: 'var(--bg-tertiary)',
    color: 'var(--text-secondary)',
    fontSize: 13,
    whiteSpace: 'nowrap',
    fontWeight: 500,
  },
  actions: {
    display: 'flex',
    gap: 10,
    flexShrink: 0,
  },
  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    border: '1px solid var(--border-primary)',
    borderRadius: '10px',
    background: 'var(--bg-card)',
    color: 'var(--text-secondary)',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
    whiteSpace: 'nowrap',
  },
  deleteBtn: {
    color: 'var(--danger)',
    borderColor: 'var(--danger-light)',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: 14,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  questionBox: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-primary)',
    borderRadius: '16px',
    padding: '22px 26px',
    fontSize: 15,
    lineHeight: 1.85,
    color: 'var(--text-primary)',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
  },
  answerBox: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-primary)',
    borderRadius: '16px',
    padding: '22px 26px',
    fontSize: 15,
    lineHeight: 1.85,
    color: 'var(--text-primary)',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
  },
};
