import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';

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

const markdownStyles: Record<string, React.CSSProperties> = {
  h1: { fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginTop: 24, marginBottom: 16, lineHeight: 1.4 },
  h2: { fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginTop: 20, marginBottom: 12, lineHeight: 1.4, borderBottom: '1px solid var(--border-primary)', paddingBottom: 8 },
  h3: { fontSize: 16, fontWeight: 600, color: 'var(--accent-primary)', marginTop: 16, marginBottom: 10, lineHeight: 1.4 },
  h4: { fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginTop: 14, marginBottom: 8, lineHeight: 1.4 },
  p: { marginTop: 0, marginBottom: 14, lineHeight: 1.8 },
  ul: { paddingLeft: 24, marginTop: 0, marginBottom: 14 },
  ol: { paddingLeft: 24, marginTop: 0, marginBottom: 14 },
  li: { marginBottom: 8, lineHeight: 1.7 },
  blockquote: { borderLeft: '4px solid var(--accent-primary)', paddingLeft: 16, marginLeft: 0, color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: 14 },
  strong: { fontWeight: 700, color: 'var(--text-primary)' },
  em: { fontStyle: 'italic', color: 'var(--text-secondary)' },
  inlineCode: { background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: 4, fontSize: 13, fontFamily: 'Consolas, monospace', color: 'var(--accent-secondary)' },
  hr: { border: 'none', borderTop: '1px solid var(--border-primary)', margin: '20px 0' },
};

const markdownComponents = {
  h1: ({ children }: any) => <h1 style={{ ...markdownStyles.h1 }}>{children}</h1>,
  h2: ({ children }: any) => <h2 style={{ ...markdownStyles.h2 }}>{children}</h2>,
  h3: ({ children }: any) => <h3 style={{ ...markdownStyles.h3 }}>{children}</h3>,
  h4: ({ children }: any) => <h4 style={{ ...markdownStyles.h4 }}>{children}</h4>,
  p: ({ children }: any) => <p style={{ ...markdownStyles.p }}>{children}</p>,
  ul: ({ children }: any) => <ul style={{ ...markdownStyles.ul }}>{children}</ul>,
  ol: ({ children }: any) => <ol style={{ ...markdownStyles.ol }}>{children}</ol>,
  li: ({ children }: any) => <li style={{ ...markdownStyles.li }}>{children}</li>,
  blockquote: ({ children }: any) => <blockquote style={{ ...markdownStyles.blockquote }}>{children}</blockquote>,
  strong: ({ children }: any) => <strong style={{ ...markdownStyles.strong }}>{children}</strong>,
  em: ({ children }: any) => <em style={{ ...markdownStyles.em }}>{children}</em>,
  hr: () => <hr style={{ ...markdownStyles.hr }} />,
  code: ({ node, className, children, ...props }: any) => {
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
  a: ({ href, children }: any) => (
    <a
      href={href}
      style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
};

interface Props {
  children: string;
}

export default function Markdown({ children }: Props) {
  return (
    <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
      <ReactMarkdown components={markdownComponents}>{children}</ReactMarkdown>
    </div>
  );
}
