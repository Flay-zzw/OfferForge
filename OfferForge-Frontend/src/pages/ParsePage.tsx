import { useState } from 'react';
import { FileText, Loader2, Sparkles, Building2, CheckCircle, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { api } from '../api';

export default function ParsePage() {
  const [parseCompany, setParseCompany] = useState('');
  const [parseContent, setParseContent] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parsedResults, setParsedResults] = useState<{ question: string; difficulty: string; answer: string }[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleParse = async () => {
    if (!parseContent.trim()) return;
    setParsing(true);
    setError('');
    setSuccess(false);
    setParsedResults([]);
    try {
      const result = await api.parseInterview({
        content: parseContent,
        company: parseCompany,
      });
      if (result.questions.length > 0) {
        setParsedResults(result.questions);
        setSuccess(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '解析失败，请重试');
    } finally {
      setParsing(false);
    }
  };

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

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerIcon}>
            <FileText size={28} color="var(--accent-primary)" />
          </div>
          <div>
            <h1 style={styles.title}>解析面经</h1>
            <p style={styles.subtitle}>粘贴面试经历，AI 自动拆分为独立题目</p>
          </div>
        </div>

        <div style={styles.content}>
          <div style={styles.inputSection}>
            <div style={styles.formGroup}>
              <label style={styles.label}>
                <Building2 size={14} />
                公司名称（可选）
              </label>
              <input
                style={styles.formInput}
                placeholder="例如：字节跳动、腾讯、阿里巴巴..."
                value={parseCompany}
                onChange={(e) => setParseCompany(e.target.value)}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                <FileText size={14} />
                面经内容
              </label>
              <textarea
                style={styles.formTextarea}
                placeholder={`粘贴你的面试经历内容...

例如：
一面问了我系统设计，设计一个短链接系统
二面问了很多八股文，比如HashMap的原理、CAP定理
三面是HR面，问了期望薪资和入职时间

AI会自动识别并拆分成独立的面试题目。`}
                value={parseContent}
                onChange={(e) => setParseContent(e.target.value)}
                rows={12}
              />
            </div>

            <button
              style={{
                ...styles.parseBtn,
                ...(parseContent.trim() && !parsing ? styles.parseBtnActive : {}),
              }}
              onClick={handleParse}
              disabled={!parseContent.trim() || parsing}
            >
              {parsing ? (
                <>
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  解析中，请稍候...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  开始解析
                </>
              )}
            </button>

            {error && (
              <div style={styles.errorBox}>
                <AlertCircle size={16} />
                <p style={styles.errorText}>{error}</p>
              </div>
            )}
          </div>

          {success && parsedResults.length > 0 && (
            <div style={styles.resultSection}>
              <div style={styles.resultHeader}>
                <CheckCircle size={20} color="var(--success)" />
                <h2 style={styles.resultTitle}>解析成功！共提取 {parsedResults.length} 道题目</h2>
              </div>
              <div style={styles.questionList}>
                {parsedResults.map((q, index) => {
                  const dc = difficultyColor(q.difficulty);
                  return (
                    <div key={index} style={styles.questionCard}>
                      <div style={styles.questionTop}>
                        <span
                          style={{
                            ...styles.difficultyBadge,
                            background: dc.bg,
                            color: dc.color,
                          }}
                        >
                          {q.difficulty}
                        </span>
                      </div>
                      <p style={styles.questionText}>{q.question}</p>
                      {q.answer && (
                        <details style={styles.answerDetails}>
                          <summary style={styles.answerSummary}>查看参考答案</summary>
                          <div style={styles.answerContent}>
                            <ReactMarkdown>{q.answer}</ReactMarkdown>
                          </div>
                        </details>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
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
    padding: '32px 24px',
    background: 'linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%)',
  },
  container: {
    width: '100%',
    maxWidth: 720,
    background: 'var(--bg-card)',
    borderRadius: '20px',
    border: '1px solid var(--border-primary)',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '28px 32px 24px',
    borderBottom: '1px solid var(--border-primary)',
    background: 'linear-gradient(135deg, var(--accent-primary-light) 0%, transparent 60%)',
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: '16px',
    background: 'linear-gradient(135deg, var(--accent-primary-light) 0%, rgba(139, 92, 246, 0.1) 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid var(--accent-primary)',
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: 'var(--text-primary)',
    margin: 0,
    letterSpacing: '-0.02em',
  },
  subtitle: {
    fontSize: 14,
    color: 'var(--text-tertiary)',
    margin: 0,
    marginTop: 4,
  },
  content: {
    padding: '28px 32px 32px',
  },
  inputSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  formInput: {
    width: '100%',
    padding: '12px 16px',
    border: '2px solid var(--border-primary)',
    borderRadius: '12px',
    background: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    fontSize: 15,
    outline: 'none',
    transition: 'all var(--transition-fast)',
  },
  formTextarea: {
    width: '100%',
    padding: '14px 16px',
    border: '2px solid var(--border-primary)',
    borderRadius: '12px',
    background: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    fontSize: 14,
    outline: 'none',
    resize: 'vertical',
    lineHeight: 1.7,
    minHeight: 200,
    transition: 'all var(--transition-fast)',
  },
  parseBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '14px 28px',
    border: 'none',
    borderRadius: '12px',
    background: 'var(--bg-tertiary)',
    color: 'var(--text-tertiary)',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'not-allowed',
    transition: 'all var(--transition-fast)',
  },
  parseBtnActive: {
    background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
    color: '#ffffff',
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(99, 102, 241, 0.4)',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    padding: '14px 16px',
    borderRadius: '12px',
    background: 'var(--danger-light)',
    border: '1px solid var(--danger)',
  },
  errorText: {
    fontSize: 14,
    color: 'var(--danger)',
    margin: 0,
    lineHeight: 1.5,
  },
  resultSection: {
    marginTop: 32,
    padding: '24px',
    borderRadius: '16px',
    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(16, 185, 129, 0.02) 100%)',
    border: '1px solid var(--success)',
  },
  resultHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: 'var(--success)',
    margin: 0,
  },
  questionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  questionCard: {
    padding: '16px 18px',
    borderRadius: '12px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border-primary)',
  },
  questionTop: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  difficultyBadge: {
    padding: '4px 12px',
    borderRadius: '8px',
    fontSize: 12,
    fontWeight: 600,
  },
  questionText: {
    fontSize: 15,
    color: 'var(--text-primary)',
    lineHeight: 1.7,
    margin: 0,
    marginBottom: 12,
  },
  answerDetails: {
    marginTop: 10,
    padding: '10px 14px',
    borderRadius: '8px',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-primary)',
  },
  answerSummary: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--accent-primary)',
    cursor: 'pointer',
    userSelect: 'none',
  },
  answerContent: {
    marginTop: 10,
    fontSize: 14,
    color: 'var(--text-secondary)',
    lineHeight: 1.7,
  },
};