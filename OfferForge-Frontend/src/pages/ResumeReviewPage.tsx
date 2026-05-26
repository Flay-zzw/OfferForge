import { useState, useRef } from 'react';
import { Loader2, Sparkles, Upload, FileText, X, File, Image, FileSpreadsheet, AlertCircle, Target, TrendingUp, ThumbsUp, ThumbsDown, FilePenLine, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../api';
import type { ResumeReviewResponse } from '../types';

const ACCEPTED_TYPES = '.pdf,.docx,.doc,.png,.jpg,.jpeg,.bmp,.tiff,.tif,.webp';
const MAX_SIZE = 20 * 1024 * 1024;

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileTypeIcon({ filename }: { filename: string }) {
  const ext = filename.split('.').pop()?.toLowerCase();
  const iconProps = { size: 20, color: 'var(--accent-primary)' };
  if (ext === 'pdf') return <FileText {...iconProps} />;
  if (['doc', 'docx'].includes(ext || '')) return <FileSpreadsheet {...iconProps} />;
  if (['png', 'jpg', 'jpeg', 'bmp', 'tiff', 'tif', 'webp'].includes(ext || '')) return <Image {...iconProps} />;
  return <File {...iconProps} />;
}

function scoreColor(score: number): string {
  if (score >= 80) return 'var(--success)';
  if (score >= 60) return 'var(--warning)';
  return 'var(--danger)';
}

function scoreBg(score: number): string {
  if (score >= 80) return 'var(--bg-success)';
  if (score >= 60) return 'var(--bg-warning)';
  return 'var(--bg-danger)';
}

const priorityConfig: Record<string, { label: string; bg: string; color: string }> = {
  high: { label: '高优先级', bg: 'var(--bg-danger)', color: 'var(--danger)' },
  medium: { label: '中优先级', bg: 'var(--bg-warning)', color: 'var(--warning)' },
  low: { label: '低优先级', bg: 'var(--bg-success)', color: 'var(--success)' },
};

function DimensionBar({ name, score, comment }: { name: string; score: number; comment: string }) {
  return (
    <div style={styles.dimItem}>
      <div style={styles.dimHeader}>
        <span style={styles.dimName}>{name}</span>
        <span style={{ ...styles.dimScore, color: scoreColor(score) }}>{score}</span>
      </div>
      <div style={styles.barTrack}>
        <div style={{ ...styles.barFill, width: `${score}%`, backgroundColor: scoreColor(score) }} />
      </div>
      <p style={styles.dimComment}>{comment}</p>
    </div>
  );
}

export default function ResumeReviewPage() {
  const [file, setFile] = useState<File | null>(null);
  const [targetPosition, setTargetPosition] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResumeReviewResponse | null>(null);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['high']));
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleSection = (key: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

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

  const handleReview = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.reviewResume(file, targetPosition || undefined);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '简历评审失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setError('');
    setExpandedSections(new Set(['high']));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.loadingContainer}>
          <Loader2 size={48} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-primary)' }} />
          <p style={styles.loadingText}>AI 正在评审你的简历...</p>
          <p style={styles.loadingHint}>从多个维度分析并给出修改建议</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>简历修改</h1>
          <p style={styles.subtitle}>上传简历，AI 多维度评分并给出具体修改建议，提升简历竞争力</p>
        </div>

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
                  <div style={styles.fileIconBox}><FileTypeIcon filename={file.name} /></div>
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
              onClick={handleReview}
              disabled={!file || loading}
            >
              <Sparkles size={18} />
              开始评审
            </button>

            {error && (
              <div style={styles.errorBox}><AlertCircle size={16} /><p style={styles.errorText}>{error}</p></div>
            )}
          </div>
        )}

        {result && (
          <div>
            {/* Overall score */}
            <div style={styles.scoreCard}>
              <div style={styles.scoreCircle}><span style={{ ...styles.scoreNumber, color: scoreColor(result.overall_score) }}>{result.overall_score}</span><span style={styles.scoreUnit}>分</span></div>
              <div style={styles.scoreLabel}>综合评分</div>
            </div>

            {/* Dimension scores */}
            <div style={styles.sectionCard}>
              <div style={styles.sectionHeader}>
                <TrendingUp size={18} color="var(--accent-primary)" />
                <h3 style={styles.sectionTitle}>各维度评分</h3>
              </div>
              <div style={styles.dimensionsList}>
                {result.dimensions.map((dim, i) => (
                  <DimensionBar key={i} name={dim.name} score={dim.score} comment={dim.comment} />
                ))}
              </div>
            </div>

            {/* Position match */}
            {result.position_match && (
              <div style={styles.sectionCard}>
                <div style={styles.sectionHeader}>
                  <Target size={18} color="var(--accent-primary)" />
                  <h3 style={styles.sectionTitle}>岗位匹配度</h3>
                  <span style={{ ...styles.matchScoreBadge, backgroundColor: scoreBg(result.position_match.score), color: scoreColor(result.position_match.score) }}>
                    {result.position_match.score}% 匹配
                  </span>
                </div>
                <div style={styles.matchGrid}>
                  <div>
                    <p style={styles.matchLabel}><ThumbsUp size={13} /> 已匹配技能</p>
                    <div style={styles.tagList}>
                      {result.position_match.matched.map((s, i) => (
                        <span key={i} style={styles.matchedTag}>{s}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p style={styles.matchLabel}><ThumbsDown size={13} /> 缺失技能</p>
                    <div style={styles.tagList}>
                      {result.position_match.missing.map((s, i) => (
                        <span key={i} style={styles.missingTag}>{s}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <p style={styles.matchAdvice}>{result.position_match.advice}</p>
              </div>
            )}

            {/* Strengths */}
            <div style={styles.sectionCard}>
              <div style={styles.sectionHeader}>
                <ThumbsUp size={18} color="var(--success)" />
                <h3 style={styles.sectionTitle}>简历亮点</h3>
              </div>
              <ul style={styles.list}>
                {result.strengths.map((s, i) => (
                  <li key={i} style={styles.listItemGood}>{s}</li>
                ))}
              </ul>
            </div>

            {/* Weaknesses */}
            <div style={styles.sectionCard}>
              <div style={styles.sectionHeader}>
                <ThumbsDown size={18} color="var(--danger)" />
                <h3 style={styles.sectionTitle}>待改进项</h3>
              </div>
              <ul style={styles.list}>
                {result.weaknesses.map((w, i) => (
                  <li key={i} style={styles.listItemBad}>{w}</li>
                ))}
              </ul>
            </div>

            {/* Suggestions grouped by priority */}
            <div style={styles.sectionCard}>
              <div style={styles.sectionHeader}>
                <FilePenLine size={18} color="var(--accent-primary)" />
                <h3 style={styles.sectionTitle}>修改建议</h3>
                <span style={styles.suggestionCount}>{result.suggestions.length} 条</span>
              </div>
              {(['high', 'medium', 'low'] as const).map(priority => {
                const items = result.suggestions.filter(s => s.priority === priority);
                if (items.length === 0) return null;
                const pc = priorityConfig[priority];
                const isExpanded = expandedSections.has(priority);
                return (
                  <div key={priority} style={styles.priorityGroup}>
                    <button
                      style={styles.priorityToggle}
                      onClick={() => toggleSection(priority)}
                    >
                      <span style={{ ...styles.priorityBadge, backgroundColor: pc.bg, color: pc.color }}>{pc.label}</span>
                      <span style={styles.priorityCount}>{items.length} 条</span>
                      <span style={{ marginLeft: 'auto' }}>{isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
                    </button>
                    {isExpanded && (
                      <div style={styles.suggestionsList}>
                        {items.map((sug, i) => (
                          <div key={i} style={styles.suggestionItem}>
                            <div style={styles.suggestionTop}>
                              <span style={styles.suggestionSection}>{sug.section}</span>
                            </div>
                            {sug.original_text && (
                              <div style={styles.originalTextBox}>
                                <span style={styles.originalLabel}>原文：</span>
                                <span style={styles.originalText}>{sug.original_text}</span>
                              </div>
                            )}
                            <div style={styles.issueRow}>
                              <AlertCircle size={13} color="var(--warning)" />
                              <span style={styles.issueText}>{sug.issue}</span>
                            </div>
                            <p style={styles.suggestionText}>{sug.suggestion}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Summary */}
            <div style={styles.sectionCard}>
              <div style={styles.sectionHeader}>
                <FileText size={18} color="var(--accent-primary)" />
                <h3 style={styles.sectionTitle}>改进总结</h3>
              </div>
              <p style={styles.summaryText}>{result.summary}</p>
            </div>

            <button style={styles.resetBtn} onClick={handleReset}>
              <Upload size={16} />
              重新评审
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
  // Score card
  scoreCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '36px 24px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border-primary)',
    borderRadius: 12,
    marginBottom: 20,
  },
  scoreCircle: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 8,
  },
  scoreNumber: {
    fontSize: 56,
    fontWeight: 800,
    lineHeight: 1,
    letterSpacing: '-0.02em',
  },
  scoreUnit: {
    fontSize: 18,
    fontWeight: 600,
    color: 'var(--text-tertiary)',
  },
  scoreLabel: {
    fontSize: 14,
    color: 'var(--text-tertiary)',
    fontWeight: 500,
  },
  // Sections
  sectionCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-primary)',
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: 'var(--text-primary)',
    margin: 0,
    flex: 1,
  },
  // Dimensions
  dimensionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  dimItem: {},
  dimHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  dimName: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  dimScore: {
    fontSize: 16,
    fontWeight: 700,
  },
  barTrack: {
    height: 8,
    borderRadius: 4,
    background: 'var(--bg-tertiary)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
    transition: 'width 0.6s ease',
  },
  dimComment: {
    fontSize: 12,
    color: 'var(--text-tertiary)',
    margin: '6px 0 0 0',
  },
  // Position match
  matchScoreBadge: {
    fontSize: 12,
    fontWeight: 700,
    padding: '2px 10px',
    borderRadius: 10,
  },
  matchGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 16,
    marginBottom: 14,
  },
  matchLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    margin: '0 0 8px 0',
  },
  tagList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
  },
  matchedTag: {
    padding: '3px 10px',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--success)',
    background: 'var(--bg-success)',
    border: '1px solid var(--success)',
  },
  missingTag: {
    padding: '3px 10px',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--danger)',
    background: 'var(--bg-danger)',
    border: '1px solid var(--danger)',
  },
  matchAdvice: {
    fontSize: 13,
    color: 'var(--text-secondary)',
    lineHeight: 1.6,
    margin: 0,
    padding: '10px 12px',
    background: 'var(--bg-secondary)',
    borderRadius: 8,
  },
  // Lists
  list: {
    margin: 0,
    paddingLeft: 18,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  listItemGood: {
    fontSize: 14,
    color: 'var(--success)',
    lineHeight: 1.6,
  },
  listItemBad: {
    fontSize: 14,
    color: 'var(--danger)',
    lineHeight: 1.6,
  },
  // Suggestions
  suggestionCount: {
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--text-tertiary)',
    background: 'var(--bg-tertiary)',
    padding: '2px 8px',
    borderRadius: 10,
  },
  priorityGroup: {
    marginBottom: 12,
    borderBottom: '1px solid var(--border-primary)',
    paddingBottom: 8,
  },
  priorityToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    padding: '6px 0',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    color: 'var(--text-secondary)',
  },
  priorityBadge: {
    padding: '2px 10px',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
  },
  priorityCount: {
    fontSize: 12,
    color: 'var(--text-tertiary)',
  },
  suggestionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    paddingBottom: 8,
  },
  suggestionItem: {
    padding: '12px 14px',
    background: 'var(--bg-secondary)',
    borderRadius: 8,
    border: '1px solid var(--border-primary)',
  },
  suggestionTop: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  suggestionSection: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--accent-primary)',
    background: 'var(--bg-accent)',
    padding: '2px 8px',
    borderRadius: 4,
  },
  originalTextBox: {
    marginBottom: 8,
    padding: '6px 10px',
    background: 'var(--bg-tertiary)',
    borderRadius: 6,
    borderLeft: '3px solid var(--text-tertiary)',
  },
  originalLabel: {
    fontSize: 11,
    color: 'var(--text-tertiary)',
    fontWeight: 500,
  },
  originalText: {
    fontSize: 12,
    color: 'var(--text-secondary)',
    fontStyle: 'italic',
  },
  issueRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  issueText: {
    fontSize: 13,
    color: 'var(--warning)',
    fontWeight: 600,
    lineHeight: 1.4,
  },
  suggestionText: {
    fontSize: 13,
    color: 'var(--text-secondary)',
    lineHeight: 1.6,
    margin: 0,
    paddingLeft: 21,
  },
  // Summary
  summaryText: {
    fontSize: 14,
    color: 'var(--text-secondary)',
    lineHeight: 1.8,
    margin: 0,
    whiteSpace: 'pre-wrap',
  },
  resetBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    width: '100%',
    marginTop: 8,
    marginBottom: 32,
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