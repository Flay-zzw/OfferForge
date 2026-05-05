import { useState, useRef, useCallback } from 'react';
import { Loader2, Sparkles, Briefcase, AlertCircle, CheckCircle, Lightbulb, Tags, Upload, FileText, X, Trash2, File, Image, FileSpreadsheet } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { api } from '../api';

const ACCEPTED_TYPES = '.pdf,.docx,.doc,.png,.jpg,.jpeg,.bmp,.tiff,.tif,.webp';
const MAX_SIZE = 20 * 1024 * 1024; // 20MB

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ filename }: { filename: string }) {
  const ext = filename.split('.').pop()?.toLowerCase();
  const iconProps = { size: 20, color: 'var(--accent-primary)' };
  if (ext === 'pdf') return <FileText {...iconProps} />;
  if (['doc', 'docx'].includes(ext || '')) return <FileSpreadsheet {...iconProps} />;
  if (['png', 'jpg', 'jpeg', 'bmp', 'tiff', 'tif', 'webp'].includes(ext || '')) return <Image {...iconProps} />;
  return <File {...iconProps} />;
}

export default function MockInterviewPage() {
  const [targetPosition, setTargetPosition] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<{
    predicted_questions: { question: string; difficulty: string; category: string; reason: string }[];
    overall_analysis: string;
  } | null>(null);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((f: File): string | null => {
    const ext = '.' + f.name.split('.').pop()?.toLowerCase();
    const allowed = ACCEPTED_TYPES.split(',');
    if (!allowed.includes(ext)) return `不支持的格式: ${ext}，请上传 PDF / Word / 图片文件`;
    if (f.size > MAX_SIZE) return `文件过大 (${formatSize(f.size)})，请上传小于 20MB 的文件`;
    if (f.size === 0) return '文件为空';
    return null;
  }, []);

  const handleFileSelect = useCallback((f: File) => {
    const err = validateFile(f);
    if (err) {
      setError(err);
      setFile(null);
      return;
    }
    setError('');
    setFile(f);
    setResult(null);
  }, [validateFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFileSelect(f);
  }, [handleFileSelect]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFileSelect(f);
  };

  const removeFile = () => {
    setFile(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setAnalyzing(true);
    setError('');
    setResult(null);
    try {
      const data = await api.analyzeResumeFile(file, targetPosition || undefined);
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
            <p style={styles.subtitle}>上传简历（PDF / Word / 图片），AI 自动分析并预测面试题</p>
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

            {/* File Upload Zone */}
            <div style={styles.formGroup}>
              <label style={styles.label}>
                <Upload size={14} />
                上传简历
              </label>

              {!file ? (
                <div
                  style={{
                    ...styles.dropZone,
                    ...(dragOver ? styles.dropZoneActive : {}),
                  }}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPTED_TYPES}
                    onChange={handleInputChange}
                    style={{ display: 'none' }}
                  />
                  <div style={styles.dropIcon}>
                    <Upload size={32} color="var(--accent-primary)" />
                  </div>
                  <p style={styles.dropText}>
                    拖拽文件到此处，或<span style={styles.dropLink}>点击选择</span>
                  </p>
                  <p style={styles.dropHint}>
                    支持 PDF / Word / 图片格式，最大 20MB
                  </p>
                </div>
              ) : (
                <div style={styles.fileCard}>
                  <div style={styles.fileIconBox}>
                    <FileIcon filename={file.name} />
                  </div>
                  <div style={styles.fileInfo}>
                    <p style={styles.fileName}>{file.name}</p>
                    <p style={styles.fileSize}>{formatSize(file.size)}</p>
                  </div>
                  <button style={styles.removeBtn} onClick={removeFile} title="移除文件">
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>

            <button
              style={{
                ...styles.analyzeBtn,
                ...(file && !analyzing ? styles.analyzeBtnActive : {}),
              }}
              onClick={handleAnalyze}
              disabled={!file || analyzing}
            >
              {analyzing ? (
                <>
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  AI 正在分析简历...
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

              <h3 style={styles.questionSectionTitle}>预测面试题</h3>
              <div style={styles.questionList}>
                {result.predicted_questions.map((q, index) => {
                  const dc = difficultyColor(q.difficulty);
                  return (
                    <div key={index} style={styles.questionCard}>
                      <div style={styles.questionNumber}>#{index + 1}</div>
                      <div style={styles.questionBody}>
                        <div style={styles.questionTop}>
                          <span style={{ ...styles.badge, background: dc.bg, color: dc.color }}>
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
  dropZone: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: '48px 24px',
    border: '2px dashed var(--border-primary)',
    borderRadius: '16px',
    background: 'var(--bg-secondary)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  dropZoneActive: {
    borderColor: 'var(--accent-primary)',
    background: 'var(--accent-primary-light)',
  },
  dropIcon: {
    width: 64,
    height: 64,
    borderRadius: '50%',
    background: 'var(--accent-primary-light)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropText: {
    fontSize: 15,
    color: 'var(--text-primary)',
    margin: 0,
  },
  dropLink: {
    color: 'var(--accent-primary)',
    fontWeight: 600,
    textDecoration: 'underline',
  },
  dropHint: {
    fontSize: 12,
    color: 'var(--text-tertiary)',
    margin: 0,
  },
  fileCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '14px 18px',
    borderRadius: '14px',
    border: '2px solid var(--accent-primary)',
    background: 'var(--accent-primary-light)',
  },
  fileIconBox: {
    width: 44,
    height: 44,
    borderRadius: '12px',
    background: 'var(--bg-card)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid var(--border-primary)',
    flexShrink: 0,
  },
  fileInfo: {
    flex: 1,
    minWidth: 0,
  },
  fileName: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text-primary)',
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  fileSize: {
    fontSize: 12,
    color: 'var(--text-tertiary)',
    margin: 0,
    marginTop: 2,
  },
  removeBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    borderRadius: '8px',
    border: 'none',
    background: 'var(--bg-card)',
    color: 'var(--text-tertiary)',
    cursor: 'pointer',
    flexShrink: 0,
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
