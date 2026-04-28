import { useState } from 'react';
import { FileText, Loader2, Sparkles, Briefcase, AlertCircle, CheckCircle, Lightbulb, Tags } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { api } from '../api';

export default function MockInterviewPage() {
  const [targetPosition, setTargetPosition] = useState('');
  const [resumeContent, setResumeContent] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<{
    predicted_questions: { question: string; difficulty: string; category: string; reason: string }[];
    overall_analysis: string;
  } | null>(null);
  const [error, setError] = useState('');

  const handleAnalyze = async () => {
    if (!resumeContent.trim()) return;
    setAnalyzing(true);
    setError('');
    setResult(null);
    try {
      const data = await api.analyzeResume({
        resume_content: resumeContent,
        target_position: targetPosition || undefined,
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '分析失败，请重试');
    } finally {
      setAnalyzing(false);
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
            <Briefcase size={28} color="var(--accent-primary)" />
          </div>
          <div>
            <h1 style={styles.title}>AI 模拟面试</h1>
            <p style={styles.subtitle}>上传简历，AI 分析并预测面试官可能问到的问题</p>
          </div>
        </div>

        <div style={styles.content}>
          {/* Input Section */}
          <div style={styles.inputSection}>
            <div style={styles.formGroup}>
              <label style={styles.label}>
                <Briefcase size={14} />
                目标岗位（可选）
              </label>
              <input
                style={styles.formInput}
                placeholder="例如：Java 后端开发、前端工程师、算法工程师..."
                value={targetPosition}
                onChange={(e) => setTargetPosition(e.target.value)}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                <FileText size={14} />
                简历内容
              </label>
              <textarea
                style={styles.formTextarea}
                placeholder={`粘贴你的简历内容...

例如：
教育背景：
- 北京大学 计算机科学与技术 本科 2020-2024

技能：
- 熟练掌握 Java、Spring Boot、MySQL、Redis
- 了解微服务架构、Docker、Kubernetes

项目经历：
1. 电商平台后端开发（2023.06-2023.12）
   - 使用 Spring Cloud 实现微服务架构
   - 设计并实现了订单、支付、库存等核心模块
   - 使用 Redis 做缓存，QPS 提升 300%

2. 即时通讯系统（2024.01-2024.06）
   - 基于 WebSocket 实现实时消息推送
   - 使用 Netty 处理高并发连接
   - 消息可靠性送达率 99.99%

AI 会分析你的简历，预测面试可能被问到的问题。`}
                value={resumeContent}
                onChange={(e) => setResumeContent(e.target.value)}
                rows={14}
              />
            </div>

            <button
              style={{
                ...styles.analyzeBtn,
                ...(resumeContent.trim() && !analyzing ? styles.analyzeBtnActive : {}),
              }}
              onClick={handleAnalyze}
              disabled={!resumeContent.trim() || analyzing}
            >
              {analyzing ? (
                <>
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  AI 分析中...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  AI 预测面试题
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

          {/* Results Section */}
          {result && (
            <div style={styles.resultSection}>
              {/* Overall Analysis */}
              <div style={styles.overallCard}>
                <div style={styles.overallHeader}>
                  <CheckCircle size={20} color="var(--success)" />
                  <h2 style={styles.overallTitle}>
                    分析完成！共预测 {result.predicted_questions.length} 道面试题
                  </h2>
                </div>
                <div style={styles.overallContent}>
                  <div style={styles.overallLabel}>
                    <Lightbulb size={14} />
                    整体评估与建议
                  </div>
                  <ReactMarkdown>{result.overall_analysis}</ReactMarkdown>
                </div>
              </div>

              {/* Predicted Questions */}
              <h3 style={styles.questionSectionTitle}>预测面试题</h3>
              <div style={styles.questionList}>
                {result.predicted_questions.map((q, index) => {
                  const dc = difficultyColor(q.difficulty);
                  return (
                    <div key={index} style={styles.questionCard}>
                      <div style={styles.questionNumber}>#{index + 1}</div>
                      <div style={styles.questionBody}>
                        <div style={styles.questionTop}>
                          <span
                            style={{
                              ...styles.badge,
                              background: dc.bg,
                              color: dc.color,
                            }}
                          >
                            {q.difficulty}
                          </span>
                          {q.category && (
                            <span style={styles.categoryBadge}>
                              <Tags size={11} />
                              {q.category}
                            </span>
                          )}
                        </div>
                        <p style={styles.questionText}>{q.question}</p>
                        {q.reason && (
                          <div style={styles.reasonBox}>
                            <span style={styles.reasonLabel}>预测依据：</span>
                            {q.reason}
                          </div>
                        )}
                      </div>
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
    maxWidth: 820,
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
    minHeight: 250,
    transition: 'all var(--transition-fast)',
  },
  analyzeBtn: {
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
  analyzeBtnActive: {
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

  // Results Section
  resultSection: {
    marginTop: 32,
  },
  overallCard: {
    padding: '24px',
    borderRadius: '16px',
    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(16, 185, 129, 0.02) 100%)',
    border: '1px solid var(--success)',
    marginBottom: 28,
  },
  overallHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  overallTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: 'var(--success)',
    margin: 0,
  },
  overallContent: {
    padding: '16px 20px',
    borderRadius: '12px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border-primary)',
    fontSize: 14,
    lineHeight: 1.8,
    color: 'var(--text-secondary)',
  },
  overallLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 12,
  },
  questionSectionTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: 14,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  questionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  questionCard: {
    display: 'flex',
    gap: 16,
    padding: '18px 20px',
    borderRadius: '14px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border-primary)',
    transition: 'all var(--transition-fast)',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
  },
  questionNumber: {
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--accent-primary)',
    minWidth: 32,
    paddingTop: 2,
  },
  questionBody: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  questionTop: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  badge: {
    padding: '4px 12px',
    borderRadius: '8px',
    fontSize: 12,
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  categoryBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 10px',
    borderRadius: '8px',
    background: 'var(--accent-primary-light)',
    color: 'var(--accent-primary)',
    fontSize: 12,
    fontWeight: 500,
    whiteSpace: 'nowrap',
  },
  questionText: {
    fontSize: 15,
    color: 'var(--text-primary)',
    lineHeight: 1.7,
    fontWeight: 600,
    margin: 0,
  },
  reasonBox: {
    padding: '10px 14px',
    borderRadius: '8px',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-primary)',
    fontSize: 13,
    color: 'var(--text-secondary)',
    lineHeight: 1.7,
  },
  reasonLabel: {
    fontWeight: 600,
    color: 'var(--accent-primary)',
  },
};
