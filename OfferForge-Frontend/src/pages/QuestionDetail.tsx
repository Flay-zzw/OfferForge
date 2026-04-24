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
          <h3 style={styles.sectionTitle}>题目</h3>
          <div style={styles.questionBox}>
            <ReactMarkdown>{question.question}</ReactMarkdown>
          </div>
        </div>

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>参考答案</h3>
          <div style={styles.answerBox}>
            {question.answer ? (
              <ReactMarkdown
                components={{
                  code({ node, className, children, ...props }) {
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
                      <code className={className} {...props}>
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

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: '100%',
    overflowY: 'auto',
    background: 'var(--bg-secondary)',
  },
  content: {
    maxWidth: 800,
    margin: '0 auto',
    padding: '28px 32px 48px',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 16,
  },
  metaRow: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  metaBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '4px 12px',
    borderRadius: 'var(--radius-xl)',
    background: 'var(--accent-primary-light)',
    color: 'var(--accent-primary)',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    textDecoration: 'none',
    transition: 'all var(--transition-fast)',
  },
  difficultyBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '4px 12px',
    borderRadius: 'var(--radius-xl)',
    fontSize: 13,
    fontWeight: 500,
    whiteSpace: 'nowrap',
  },
  dateBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '4px 12px',
    borderRadius: 'var(--radius-xl)',
    background: 'var(--bg-tertiary)',
    color: 'var(--text-tertiary)',
    fontSize: 12,
    whiteSpace: 'nowrap',
  },
  actions: {
    display: 'flex',
    gap: 8,
    flexShrink: 0,
  },
  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '6px 14px',
    border: '1px solid var(--border-primary)',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-card)',
    color: 'var(--text-secondary)',
    fontSize: 13,
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
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: 10,
  },
  questionBox: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-primary)',
    borderRadius: 'var(--radius-lg)',
    padding: '18px 20px',
    fontSize: 15,
    lineHeight: 1.8,
    color: 'var(--text-primary)',
  },
  answerBox: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-primary)',
    borderRadius: 'var(--radius-lg)',
    padding: '18px 20px',
    fontSize: 14,
    lineHeight: 1.8,
    color: 'var(--text-primary)',
  },
};
