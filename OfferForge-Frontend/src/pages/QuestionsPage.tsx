import { useState, useEffect, useCallback } from 'react';
import {
  Loader2,
  Building2,
  Signal,
  ChevronRight,
} from 'lucide-react';
import { api } from '../api';
import type { Question } from '../types';
import QuestionDetail from './QuestionDetail';

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filterCompany, setFilterCompany] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');

  const companies = [...new Set(questions.filter(q => q.company).map(q => q.company))].sort();

  const fetchQuestions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getQuestions({
        company: filterCompany || undefined,
        difficulty: filterDifficulty || undefined,
      });
      setQuestions(data);
    } catch (err) {
      console.error('Failed to fetch questions:', err);
    } finally {
      setLoading(false);
    }
  }, [filterCompany, filterDifficulty]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const handleDelete = async (id: number) => {
    try {
      await api.deleteQuestion(id);
      setQuestions((prev) => prev.filter((q) => q.id !== id));
      if (selectedId === id) setSelectedId(null);
    } catch (err) {
      console.error('Failed to delete question:', err);
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

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const selectedQuestion = questions.find((q) => q.id === selectedId) || null;

  return (
    <div style={styles.container}>
      <div style={styles.layout}>
        <aside style={styles.sidebar}>
          <div style={styles.filters}>
            <select
              style={styles.select}
              value={filterCompany}
              onChange={(e) => setFilterCompany(e.target.value)}
            >
              <option value="">全部公司</option>
              {companies.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select
              style={styles.select}
              value={filterDifficulty}
              onChange={(e) => setFilterDifficulty(e.target.value)}
            >
              <option value="">全部难度</option>
              <option value="简单">简单</option>
              <option value="中等">中等</option>
              <option value="困难">困难</option>
            </select>
          </div>

          <div style={styles.listArea}>
            {loading ? (
              <div style={styles.loadingState}>
                <Loader2 size={28} color="var(--accent-primary)" style={{ animation: 'spin 1s linear infinite' }} />
                <p style={styles.loadingText}>加载中...</p>
              </div>
            ) : questions.length === 0 ? (
              <div style={styles.emptyState}>
                <p style={styles.emptyDesc}>暂无题目</p>
              </div>
            ) : (
              questions.map((q) => {
                const dc = difficultyColor(q.difficulty);
                const isSelected = selectedId === q.id;
                return (
                  <button
                    key={q.id}
                    style={{
                      ...styles.listItem,
                      ...(isSelected ? styles.listItemSelected : {}),
                    }}
                    onClick={() => setSelectedId(q.id)}
                  >
                    <div style={styles.listItemTop}>
                      <span
                        style={{
                          ...styles.difficultyBadge,
                          background: dc.bg,
                          color: dc.color,
                        }}
                      >
                        {q.difficulty}
                      </span>
                      <span style={styles.listItemQuestion}>
                        {q.question.length > 60 ? q.question.slice(0, 60) + '...' : q.question}
                      </span>
                    </div>
                    <div style={styles.listItemBottom}>
                      {q.company && (
                        <span style={styles.companyBadge}>
                          <Building2 size={11} />
                          {q.company}
                        </span>
                      )}
                      <span style={styles.dateText}>{formatDate(q.created_at)}</span>
                      <ChevronRight size={14} color="var(--text-tertiary)" style={{ marginLeft: 'auto' }} />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <main style={styles.detailArea}>
          {selectedQuestion ? (
            <QuestionDetail
              question={selectedQuestion}
              onDelete={() => handleDelete(selectedQuestion.id)}
            />
          ) : (
            <div style={styles.placeholder}>
              <Signal size={40} color="var(--text-tertiary)" />
              <p style={{ color: 'var(--text-tertiary)', fontSize: 15, marginTop: 12 }}>
                从左侧选择一个题目查看详情
              </p>
            </div>
          )}
        </main>
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
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: 'var(--bg-secondary)',
  },
  layout: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  sidebar: {
    width: 360,
    minWidth: 280,
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg-card)',
    borderRight: '1px solid var(--border-primary)',
    padding: '14px 14px',
    gap: 12,
  },
  filters: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  },
  select: {
    padding: '8px 12px',
    border: '1px solid var(--border-primary)',
    borderRadius: '10px',
    background: 'var(--bg-input)',
    color: 'var(--text-primary)',
    fontSize: 13,
    outline: 'none',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  listArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '4px 0',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  loadingState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: 'var(--text-tertiary)',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  emptyDesc: {
    fontSize: 14,
    color: 'var(--text-tertiary)',
  },
  listItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    padding: '14px 16px',
    border: '1px solid var(--border-primary)',
    borderRadius: '14px',
    background: 'var(--bg-card)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
    textAlign: 'left',
    width: '100%',
    marginBottom: 6,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
  },
  listItemSelected: {
    background: 'var(--accent-primary-light)',
    borderColor: 'var(--accent-primary)',
    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.15)',
  },
  listItemTop: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
  },
  difficultyBadge: {
    padding: '4px 10px',
    borderRadius: '8px',
    fontSize: 12,
    fontWeight: 600,
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  listItemQuestion: {
    fontSize: 14,
    color: 'var(--text-primary)',
    fontWeight: 600,
    lineHeight: 1.5,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
  listItemBottom: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  companyBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 10px',
    borderRadius: '8px',
    background: 'linear-gradient(135deg, var(--accent-primary-light) 0%, rgba(139, 92, 246, 0.1) 100%)',
    color: 'var(--accent-primary)',
    fontSize: 12,
    fontWeight: 500,
    whiteSpace: 'nowrap',
  },
  dateText: {
    fontSize: 11,
    color: 'var(--text-tertiary)',
    whiteSpace: 'nowrap',
  },
  detailArea: {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  placeholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
};
