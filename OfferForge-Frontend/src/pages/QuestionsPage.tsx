import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Plus,
  Loader2,
  Building2,
  Signal,
  X,
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
  const [showParseModal, setShowParseModal] = useState(false);
  const [parseContent, setParseContent] = useState('');
  const [parseCompany, setParseCompany] = useState('');
  const [parsing, setParsing] = useState(false);

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

  const handleParse = async () => {
    if (!parseContent.trim()) return;
    setParsing(true);
    try {
      const result = await api.parseInterview({
        content: parseContent,
        company: parseCompany,
      });
      if (result.questions.length > 0) {
        await fetchQuestions();
        setShowParseModal(false);
        setParseContent('');
        setParseCompany('');
      }
    } catch (err) {
      console.error('Failed to parse interview:', err);
    } finally {
      setParsing(false);
    }
  };

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
          <div style={styles.toolbar}>
            <div style={styles.filters}>
              <div style={styles.searchBox}>
                <Search size={15} style={{ flexShrink: 0 }} color="var(--text-tertiary)" />
                <input
                  style={styles.searchInput}
                  placeholder="搜索公司..."
                  value={filterCompany}
                  onChange={(e) => setFilterCompany(e.target.value)}
                />
                {filterCompany && (
                  <button style={styles.clearFilter} onClick={() => setFilterCompany('')}>
                    <X size={13} />
                  </button>
                )}
              </div>
              <select
                style={styles.select}
                value={filterDifficulty}
                onChange={(e) => setFilterDifficulty(e.target.value)}
              >
                <option value="">全部</option>
                <option value="简单">简单</option>
                <option value="中等">中等</option>
                <option value="困难">困难</option>
              </select>
            </div>
            <button style={styles.addBtn} onClick={() => setShowParseModal(true)}>
              <Plus size={16} />
              <span>解析面经</span>
            </button>
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

      {showParseModal && (
        <div style={styles.modalOverlay} onClick={() => setShowParseModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>解析面经</h3>
              <button style={styles.modalClose} onClick={() => setShowParseModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.formGroup}>
                <label style={styles.label}>公司名称（可选）</label>
                <input
                  style={styles.formInput}
                  placeholder="例如：字节跳动"
                  value={parseCompany}
                  onChange={(e) => setParseCompany(e.target.value)}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>面经内容</label>
                <textarea
                  style={styles.formTextarea}
                  placeholder="粘贴面试经历，AI 会自动拆分为独立题目并生成参考答案..."
                  value={parseContent}
                  onChange={(e) => setParseContent(e.target.value)}
                  rows={10}
                />
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button style={styles.cancelBtn} onClick={() => setShowParseModal(false)}>
                取消
              </button>
              <button
                style={{
                  ...styles.parseBtn,
                  ...(parseContent.trim() && !parsing ? {} : { opacity: 0.5 }),
                }}
                onClick={handleParse}
                disabled={!parseContent.trim() || parsing}
              >
                {parsing ? (
                  <>
                    <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                    解析中...
                  </>
                ) : (
                  '开始解析'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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
  },
  toolbar: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    padding: '14px 14px 10px',
    borderBottom: '1px solid var(--border-primary)',
  },
  filters: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '7px 10px',
    border: '1px solid var(--border-primary)',
    borderRadius: 'var(--radius-md)',
    background: 'var(--bg-input)',
    flex: 1,
    minWidth: 0,
  },
  searchInput: {
    border: 'none',
    outline: 'none',
    background: 'transparent',
    color: 'var(--text-primary)',
    fontSize: 13,
    width: '100%',
  },
  clearFilter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    background: 'transparent',
    color: 'var(--text-tertiary)',
    cursor: 'pointer',
    padding: 2,
  },
  select: {
    padding: '7px 10px',
    border: '1px solid var(--border-primary)',
    borderRadius: 'var(--radius-md)',
    background: 'var(--bg-input)',
    color: 'var(--text-primary)',
    fontSize: 13,
    outline: 'none',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  addBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '8px 14px',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    background: 'var(--accent-primary)',
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
    whiteSpace: 'nowrap',
  },
  listArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
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
    gap: 6,
    padding: '10px 12px',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    background: 'transparent',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
    textAlign: 'left',
    width: '100%',
  },
  listItemSelected: {
    background: 'var(--accent-primary-light)',
  },
  listItemTop: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  difficultyBadge: {
    padding: '2px 8px',
    borderRadius: 'var(--radius-xl)',
    fontSize: 11,
    fontWeight: 500,
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  listItemQuestion: {
    fontSize: 13,
    color: 'var(--text-primary)',
    fontWeight: 500,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  listItemBottom: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  companyBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 3,
    padding: '2px 8px',
    borderRadius: 'var(--radius-xl)',
    background: 'var(--accent-primary-light)',
    color: 'var(--accent-primary)',
    fontSize: 11,
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
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(4px)',
  },
  modal: {
    background: 'var(--bg-card)',
    borderRadius: 'var(--radius-xl)',
    width: '90%',
    maxWidth: 600,
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: 'var(--shadow-xl)',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px 16px',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  modalClose: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    background: 'transparent',
    color: 'var(--text-tertiary)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  modalBody: {
    padding: '0 24px',
    overflowY: 'auto',
    flex: 1,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--text-secondary)',
    marginBottom: 6,
  },
  formInput: {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid var(--border-primary)',
    borderRadius: 'var(--radius-md)',
    background: 'var(--bg-input)',
    color: 'var(--text-primary)',
    fontSize: 14,
    outline: 'none',
    transition: 'border-color var(--transition-fast)',
  },
  formTextarea: {
    width: '100%',
    padding: '12px 14px',
    border: '1px solid var(--border-primary)',
    borderRadius: 'var(--radius-md)',
    background: 'var(--bg-input)',
    color: 'var(--text-primary)',
    fontSize: 14,
    outline: 'none',
    resize: 'vertical',
    lineHeight: 1.6,
    transition: 'border-color var(--transition-fast)',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
    padding: '16px 24px 20px',
  },
  cancelBtn: {
    padding: '8px 20px',
    border: '1px solid var(--border-primary)',
    borderRadius: 'var(--radius-md)',
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: 14,
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  parseBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 24px',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    background: 'var(--accent-primary)',
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
};
