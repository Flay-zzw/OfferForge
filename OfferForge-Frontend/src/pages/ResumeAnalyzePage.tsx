import { useState, useRef } from 'react';
import { Loader2, Sparkles, Upload, FileText, X, File, Image, FileSpreadsheet, AlertCircle, Target, BookOpen, ChevronRight } from 'lucide-react';
import { api } from '../api';
import Markdown from '../components/Markdown';
import type { ResumeAnalyzeResponse } from '../types';

const ACCEPTED_TYPES = '.pdf,.docx,.doc,.png,.jpg,.jpeg,.bmp,.tiff,.tif,.webp';
const MAX_SIZE = 20 * 1024 * 1024;

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

const difficultyColors: Record<string, { bg: string; text: string; border: string }> = {
  '简单': { bg: 'var(--bg-success)', text: 'var(--success)', border: 'var(--success)' },
  '中等': { bg: 'var(--bg-warning)', text: 'var(--warning)', border: 'var(--warning)' },
  '困难': { bg: 'var(--bg-danger)', text: 'var(--danger)', border: 'var(--danger)' },
};

export default function ResumeAnalyzePage() {
  const [file, setFile] = useState<File | null>(null);
  const [targetPosition, setTargetPosition] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResumeAnalyzeResponse | null>(null);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFileSelect(f);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFileSelect(f);
  };

  const handleFileSelect = (f: File) => {
    const allowed = ACCEPTED_TYPES.split(',').map(t => t.trim().replace('.', ''));
    const ext = f.name.split('.').pop()?.toLowerCase();
    if (!ext || !allowed.includes(ext)) {
      setError('不支持的文件格式，请上传 PDF / Word / 图片文件');
      return;
    }
    if (f.size > MAX_SIZE) {
      setError('文件大小超过 20MB 限制');
      return;
    }
    setFile(f);
    setError('');
    setResult(null);
  };

  const removeFile = () => {
    setFile(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.analyzeResumeFile(file, targetPosition || undefined);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '简历分析失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Loading state
  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.loadingContainer}>
          <Loader2 size={48} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-primary)' }} />
          <p style={styles.loadingText}>AI 正在分析你的简历...</p>
          <p style={styles.loadingHint}>预测面试官可能会问的问题</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>简历分析</h1>
          <p style={styles.subtitle}>上传简历，AI 分析并预测面试官可能会问的问题，帮你提前准备</p>
        </div>

        {/* Upload area (when no result) */}
        {!result && (
          <div style={styles.card}>
            <div style={styles.formGroup}>
              <label style={styles.label}>
                <Target size={14} />
                目标岗位（可选）
              </label>
              <input
                style={styles.formInput}
                placeholder="例如：Java 后端开发、前端工程师、算法工程师..."
                value={targetPosition}
                onChange={e => setTargetPosition(e.target.value)}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                <Upload size={14} />
                上传简历
              </label>

              {!file ? (
                <div
                  style={{ ...styles.dropZone, ...(dragOver ? styles.dropZoneActive : {}) }}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input ref={fileInputRef} type="file" accept={ACCEPTED_TYPES} onChange={handleInputChange} style={{ display: 'none' }} />
                  <div style={styles.dropIcon}>
                    <Upload size={32} color="var(--accent-primary)" />
                  </div>
                  <p style={styles.dropText}>拖拽文件到此处，或<span style={styles.dropLink}>点击选择</span></p>
                  <p style={styles.dropHint}>支持 PDF / Word / 图片格式，最大 20MB</p>
                </div>
              ) : (
                <div style={styles.fileCard}>
                  <div style={styles.fileIconBox}><FileIcon filename={file.name} /></div>
                  <div style={styles.fileInfo}>
                    <p style={styles.fileName}>{file.name}</p>
                    <p style={styles.fileSize}>{formatSize(file.size)}</p>
                  </div>
                  <button style={styles.removeBtn} onClick={removeFile} title="移除文件"><X size={16} /></button>
                </div>
              )}
            </div>

            <button
              style={{ ...styles.primaryBtn, ...(file && !loading ? styles.primaryBtnActive : {}) }}
              onClick={handleAnalyze}
              disabled={!file || loading}
            >
              <Sparkles size={18} />
              开始分析
            </button>

            {error && (
              <div style={styles.errorBox}><AlertCircle size={16} /><p style={styles.errorText}>{error}</p></div>
            )}
          </div>
        )}

        {/* Results */}
        {result && (
          <div>
            {/* Overall analysis card */}
            <div style={styles.analysisCard}>
              <div style={styles.analysisHeader}>
                <BookOpen size={20} color="var(--accent-primary)" />
                <h3 style={styles.analysisTitle}>整体分析</h3>
              </div>
              <div style={styles.analysisText}>
                <Markdown>{result.overall_analysis}</Markdown>
              </div>
            </div>

            {/* Predicted questions */}
            <h3 style={styles.questionsTitle}>
              预测面试题
              <span style={styles.questionCount}>{result.predicted_questions.length} 题</span>
            </h3>

            <div style={styles.questionsGrid}>
              {result.predicted_questions.map((q, i) => {
                const dc = difficultyColors[q.difficulty] || difficultyColors['中等'];
                return (
                  <div key={i} style={styles.questionCard}>
                    <div style={styles.questionHeader}>
                      <span style={styles.questionIndex}>#{i + 1}</span>
                      <div style={styles.badges}>
                        <span style={{
                          ...styles.difficultyBadge,
                          backgroundColor: dc.bg,
                          color: dc.text,
                          borderColor: dc.border,
                        }}>
                          {q.difficulty}
                        </span>
                        <span style={styles.categoryBadge}>{q.category}</span>
                      </div>
                    </div>
                    <p style={styles.questionText}>{q.question}</p>
                    <div style={styles.reasonRow}>
                      <Target size={13} color="var(--text-tertiary)" />
                      <p style={styles.reasonText}>{q.reason}</p>
                    </div>
                    <div style={styles.questionFooter}>
                      <ChevronRight size={14} color="var(--text-tertiary)" />
                      <span style={styles.questionFooterText}>面试高频预测题</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <button style={styles.resetBtn} onClick={handleReset}>
              <Upload size={16} />
              重新分析
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    flex: 1,
    overflow: 'auto',
    background: 'var(--bg-primary)',
  },
  container: {
    maxWidth: 860,
    margin: '0 auto',
    padding: '32px 24px',
  },
  header: {
    marginBottom: 28,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: 'var(--text-primary)',
    margin: 0,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: 'var(--text-tertiary)',
    margin: 0,
  },
  card: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-primary)',
    borderRadius: 12,
    padding: 28,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginBottom: 8,
  },
  formInput: {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid var(--border-primary)',
    borderRadius: 'var(--radius-sm)',
    fontSize: 14,
    color: 'var(--text-primary)',
    background: 'var(--bg-secondary)',
    outline: 'none',
    boxSizing: 'border-box',
  },
  dropZone: {
    border: '2px dashed var(--border-primary)',
    borderRadius: 12,
    padding: '40px 20px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  dropZoneActive: {
    borderColor: 'var(--accent-primary)',
    background: 'rgba(99, 102, 241, 0.04)',
  },
  dropIcon: {
    marginBottom: 12,
  },
  dropText: {
    fontSize: 14,
    color: 'var(--text-secondary)',
    margin: 0,
    marginBottom: 8,
  },
  dropLink: {
    color: 'var(--accent-primary)',
    fontWeight: 600,
    cursor: 'pointer',
  },
  dropHint: {
    fontSize: 12,
    color: 'var(--text-tertiary)',
    margin: 0,
  },
  fileCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-primary)',
    borderRadius: 'var(--radius-sm)',
  },
  fileIconBox: {
    width: 40,
    height: 40,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-tertiary)',
    borderRadius: 8,
  },
  fileInfo: {
    flex: 1,
    minWidth: 0,
  },
  fileName: {
    fontSize: 13,
    fontWeight: 500,
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
    width: 28,
    height: 28,
    border: 'none',
    borderRadius: 6,
    background: 'transparent',
    color: 'var(--text-tertiary)',
    cursor: 'pointer',
  },
  primaryBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    padding: '12px 0',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-tertiary)',
    color: 'var(--text-tertiary)',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  primaryBtnActive: {
    background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
    color: '#fff',
    boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    padding: '10px 14px',
    background: 'var(--bg-danger)',
    border: '1px solid var(--danger)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--danger)',
  },
  errorText: {
    fontSize: 13,
    margin: 0,
  },
  // Loading
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 120,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginTop: 24,
    marginBottom: 8,
  },
  loadingHint: {
    fontSize: 14,
    color: 'var(--text-tertiary)',
    margin: 0,
  },
  // Results
  analysisCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-primary)',
    borderRadius: 12,
    padding: 24,
    marginBottom: 28,
  },
  analysisHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  analysisTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: 'var(--text-primary)',
    margin: 0,
  },
  analysisText: {
    margin: 0,
  },
  questionsTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    fontSize: 18,
    fontWeight: 700,
    color: 'var(--text-primary)',
    margin: 0,
    marginBottom: 16,
  },
  questionCount: {
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--text-tertiary)',
    background: 'var(--bg-tertiary)',
    padding: '2px 8px',
    borderRadius: 10,
  },
  questionsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  questionCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-primary)',
    borderRadius: 10,
    padding: 20,
    transition: 'border-color var(--transition-fast)',
  },
  questionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  questionIndex: {
    fontSize: 12,
    fontWeight: 700,
    color: 'var(--text-tertiary)',
  },
  badges: {
    display: 'flex',
    gap: 6,
  },
  difficultyBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
    border: '1px solid',
  },
  categoryBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 500,
    color: 'var(--accent-primary)',
    background: 'var(--bg-accent)',
    border: '1px solid var(--accent-primary)',
  },
  questionText: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text-primary)',
    margin: 0,
    marginBottom: 10,
    lineHeight: 1.6,
  },
  reasonRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 6,
    padding: '8px 10px',
    background: 'var(--bg-secondary)',
    borderRadius: 6,
  },
  reasonText: {
    fontSize: 12,
    color: 'var(--text-tertiary)',
    margin: 0,
    lineHeight: 1.5,
    fontStyle: 'italic',
  },
  questionFooter: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    paddingTop: 10,
    borderTop: '1px solid var(--border-primary)',
  },
  questionFooterText: {
    fontSize: 11,
    color: 'var(--text-tertiary)',
  },
  resetBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    width: '100%',
    marginTop: 24,
    padding: '12px 0',
    border: '1px solid var(--border-primary)',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-card)',
    color: 'var(--text-secondary)',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
};