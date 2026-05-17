import { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  TrendingUp, TrendingDown, Target, Award, ChevronDown, ChevronUp,
  Loader2, BookOpen, Calendar, Lightbulb, BarChart3, Minus, Sparkles,
} from 'lucide-react';
import { api } from '../api';
import type { EvaluationListItem, EvaluationStats, EvaluationDetail, StudyPlan } from '../types';

const CHART_W = 700;
const CHART_H = 200;
const CHART_PAD = { top: 20, right: 20, bottom: 30, left: 35 };

function formatDate(dateStr: string | null) {
  if (!dateStr) return '未知日期';
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function ScoreChart({ scores }: { scores: number[] }) {
  if (scores.length === 0) {
    return (
      <div style={chartStyles.emptyChart}>
        <BarChart3 size={40} color="var(--text-tertiary)" />
        <p style={chartStyles.emptyChartText}>暂无评估数据，完成模拟面试后这里会显示分数趋势</p>
      </div>
    );
  }

  const w = CHART_W - CHART_PAD.left - CHART_PAD.right;
  const h = CHART_H - CHART_PAD.top - CHART_PAD.bottom;

  const points = scores.map((s, i) => {
    const x = scores.length === 1 ? w / 2 : (i / (scores.length - 1)) * w;
    const y = h - (s / 100) * h;
    return `${x + CHART_PAD.left},${y + CHART_PAD.top}`;
  });

  const polylinePoints = points.join(' ');

  const gridLines = [25, 50, 75].map(v => {
    const y = h - (v / 100) * h + CHART_PAD.top;
    return (
      <g key={v}>
        <line x1={CHART_PAD.left} y1={y} x2={CHART_W - CHART_PAD.right} y2={y} stroke="var(--border-primary)" strokeDasharray="4,4" />
        <text x={CHART_PAD.left - 6} y={y + 4} textAnchor="end" fontSize="11" fill="var(--text-tertiary)">{v}</text>
      </g>
    );
  });

  return (
    <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} style={chartStyles.svg}>
      {/* Y axis labels */}
      <text x={12} y={CHART_PAD.top + 4} textAnchor="start" fontSize="11" fill="var(--text-tertiary)">100</text>
      {gridLines}
      <text x={12} y={CHART_H - 4} textAnchor="start" fontSize="11" fill="var(--text-tertiary)">0</text>

      {/* Data line */}
      {scores.length > 1 && (
        <polyline points={polylinePoints} fill="none" stroke="var(--accent-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      )}

      {/* Data points */}
      {points.map((pt, i) => {
        const [cx, cy] = pt.split(',').map(Number);
        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r="4" fill="var(--bg-card)" stroke="var(--accent-primary)" strokeWidth="2" />
            <text x={cx} y={cy - 10} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--text-primary)">{scores[i]}</text>
          </g>
        );
      })}

      {/* X axis labels */}
      {scores.map((_, i) => {
        const x = scores.length === 1 ? w / 2 + CHART_PAD.left : (i / (scores.length - 1)) * w + CHART_PAD.left;
        return (
          <text key={i} x={x} y={CHART_H - 8} textAnchor="middle" fontSize="10" fill="var(--text-tertiary)">#{i + 1}</text>
        );
      })}
    </svg>
  );
}

const chartStyles: Record<string, React.CSSProperties> = {
  svg: {
    width: '100%',
    maxWidth: CHART_W,
    height: 'auto',
    background: 'var(--bg-secondary)',
    borderRadius: 8,
  },
  emptyChart: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
    background: 'var(--bg-secondary)',
    borderRadius: 8,
    gap: 12,
  },
  emptyChartText: {
    fontSize: 13,
    color: 'var(--text-tertiary)',
    margin: 0,
  },
};

export default function ProgressPage() {
  const [stats, setStats] = useState<EvaluationStats | null>(null);
  const [evaluations, setEvaluations] = useState<EvaluationListItem[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [detailCache, setDetailCache] = useState<Record<number, EvaluationDetail>>({});
  const [studyPlan, setStudyPlan] = useState<StudyPlan | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoadingStats(true);
    setError('');
    try {
      const [s, evals] = await Promise.all([
        api.getEvaluationStats(),
        api.getEvaluations(),
      ]);
      setStats(s);
      setEvaluations(evals);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载评估数据失败');
    } finally {
      setLoadingStats(false);
    }
  };

  const toggleExpand = useCallback(async (id: number) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (!detailCache[id]) {
      setLoadingDetail(true);
      try {
        const detail = await api.getEvaluation(id);
        setDetailCache(prev => ({ ...prev, [id]: detail }));
      } catch {
        // ignore detail fetch errors
      } finally {
        setLoadingDetail(false);
      }
    }
  }, [expandedId, detailCache]);

  const handleGeneratePlan = async () => {
    setLoadingPlan(true);
    setError('');
    try {
      const plan = await api.generateStudyPlan();
      setStudyPlan(plan);
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成学习计划失败');
    } finally {
      setLoadingPlan(false);
    }
  };

  // Loading
  if (loadingStats) {
    return (
      <div style={styles.page}>
        <div style={styles.loadingContainer}>
          <Loader2 size={48} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-primary)' }} />
          <p style={styles.loadingText}>加载评估数据...</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (!stats || stats.total_count === 0) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.header}>
            <h1 style={styles.title}>学习进度</h1>
            <p style={styles.subtitle}>追踪模拟面试表现，查看成长轨迹</p>
          </div>
          <div style={styles.emptyState}>
            <BarChart3 size={56} color="var(--text-tertiary)" />
            <p style={styles.emptyTitle}>还没有评估记录</p>
            <p style={styles.emptyHint}>完成一次模拟面试后，评估结果会自动保存到这里。请前往「模拟面试」标签页开始练习。</p>
          </div>
        </div>
      </div>
    );
  }

  const trendIcon = stats.score_change !== null ? (
    stats.score_change > 0 ? <TrendingUp size={18} color="var(--success)" /> :
    stats.score_change < 0 ? <TrendingDown size={18} color="var(--danger)" /> :
    <Minus size={18} color="var(--text-tertiary)" />
  ) : null;

  const trendText = stats.score_change !== null
    ? (stats.score_change > 0 ? `+${stats.score_change}` : `${stats.score_change}`)
    : '—';

  const trendColor = stats.score_change !== null
    ? (stats.score_change > 0 ? 'var(--success)' : stats.score_change < 0 ? 'var(--danger)' : 'var(--text-tertiary)')
    : 'var(--text-tertiary)';

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>学习进度</h1>
          <p style={styles.subtitle}>追踪模拟面试表现，查看成长轨迹</p>
        </div>

        {/* Stats Row */}
        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <Target size={20} color="var(--accent-primary)" />
            <div>
              <p style={styles.statValue}>{stats.total_count}</p>
              <p style={styles.statLabel}>总面试次数</p>
            </div>
          </div>
          <div style={styles.statCard}>
            <Award size={20} color="var(--accent-secondary)" />
            <div>
              <p style={styles.statValue}>{stats.average_score}</p>
              <p style={styles.statLabel}>平均分</p>
            </div>
          </div>
          <div style={styles.statCard}>
            <TrendingUp size={20} color="var(--success)" />
            <div>
              <p style={styles.statValue}>{stats.latest_score}</p>
              <p style={styles.statLabel}>最新分数</p>
            </div>
          </div>
          <div style={styles.statCard}>
            {trendIcon}
            <div>
              <p style={{ ...styles.statValue, color: trendColor }}>{trendText}</p>
              <p style={styles.statLabel}>分数变化</p>
            </div>
          </div>
        </div>

        {/* Score Trend Chart */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <BarChart3 size={18} color="var(--text-secondary)" />
            <h3 style={styles.sectionTitle}>分数趋势</h3>
          </div>
          <ScoreChart scores={stats.scores} />
        </div>

        {/* Evaluation History */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <Calendar size={18} color="var(--text-secondary)" />
            <h3 style={styles.sectionTitle}>评估记录</h3>
          </div>
          <div style={styles.evalList}>
            {evaluations.map(ev => {
              const isExpanded = expandedId === ev.id;
              const detail = detailCache[ev.id];
              const scoreColor = ev.overall_score >= 80 ? 'var(--success)' : ev.overall_score >= 60 ? 'var(--warning)' : 'var(--danger)';

              return (
                <div key={ev.id} style={styles.evalCard}>
                  <button style={styles.evalCardHeader} onClick={() => toggleExpand(ev.id)}>
                    <div style={styles.evalCardLeft}>
                      <span style={{ ...styles.evalScore, color: scoreColor, borderColor: scoreColor }}>
                        {ev.overall_score}
                      </span>
                      <div>
                        <p style={styles.evalDate}>{formatDate(ev.created_at)}</p>
                        {ev.target_position && <p style={styles.evalPosition}>{ev.target_position}</p>}
                      </div>
                    </div>
                    <div style={styles.evalCardRight}>
                      <div style={styles.evalMiniTags}>
                        {ev.strengths.slice(0, 2).map((s, i) => (
                          <span key={i} style={styles.evalMiniTag}>{s}</span>
                        ))}
                      </div>
                      {isExpanded ? <ChevronUp size={18} color="var(--text-tertiary)" /> : <ChevronDown size={18} color="var(--text-tertiary)" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div style={styles.evalExpanded}>
                      {loadingDetail && !detail ? (
                        <div style={styles.detailLoading}><Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /></div>
                      ) : detail ? (
                        <div>
                          <div style={styles.detailSection}>
                            <p style={styles.detailHeading}>优势</p>
                            <ul style={styles.detailList}>
                              {detail.strengths.map((s, i) => <li key={i} style={styles.detailItem}>{s}</li>)}
                            </ul>
                          </div>
                          <div style={styles.detailSection}>
                            <p style={{ ...styles.detailHeading, color: 'var(--warning)' }}>待提升</p>
                            <ul style={styles.detailList}>
                              {detail.weaknesses.map((w, i) => <li key={i} style={styles.detailItem}>{w}</li>)}
                            </ul>
                          </div>
                          {detail.learning_path.length > 0 && (
                            <div style={styles.detailSection}>
                              <p style={{ ...styles.detailHeading, color: 'var(--accent-primary)' }}>学习路径</p>
                              <ol style={styles.detailList}>
                                {detail.learning_path.map((lp, i) => <li key={i} style={styles.detailItem}>{lp}</li>)}
                              </ol>
                            </div>
                          )}
                          {detail.detailed_feedback && (
                            <div style={styles.detailSection}>
                              <p style={styles.detailHeading}>详细反馈</p>
                              <div style={styles.feedbackMd}>
                                <ReactMarkdown>{detail.detailed_feedback}</ReactMarkdown>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Study Plan */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <BookOpen size={18} color="var(--text-secondary)" />
            <h3 style={styles.sectionTitle}>AI 学习计划</h3>
          </div>

          {!studyPlan ? (
            <button
              style={{ ...styles.planBtn, ...(loadingPlan ? {} : styles.planBtnActive) }}
              onClick={handleGeneratePlan}
              disabled={loadingPlan}
            >
              {loadingPlan ? (
                <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />AI 正在分析你的评估记录...</>
              ) : (
                <><Sparkles size={18} />生成个性化学习计划</>
              )}
            </button>
          ) : (
            <div style={styles.planContent}>
              {/* Focus Areas */}
              <div style={styles.planSection}>
                <h4 style={styles.planSectionTitle}>
                  <Target size={16} color="var(--danger)" />
                  高优先级聚焦领域
                </h4>
                <div style={styles.focusCards}>
                  {studyPlan.focus_areas.map((area, i) => (
                    <div key={i} style={styles.focusCard}>
                      <span style={styles.focusNum}>{i + 1}</span>
                      <p style={styles.focusText}>{area}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Weekly Plan */}
              <div style={styles.planSection}>
                <h4 style={styles.planSectionTitle}>
                  <Calendar size={16} color="var(--accent-primary)" />
                  7日学习计划
                </h4>
                <div style={styles.weekList}>
                  {studyPlan.weekly_plan.map((wp, i) => (
                    <div key={i} style={styles.weekItem}>
                      <span style={styles.weekDay}>{wp.day}</span>
                      <p style={styles.weekTask}>{wp.task}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Long-term Goals */}
              <div style={styles.planSection}>
                <h4 style={styles.planSectionTitle}>
                  <TrendingUp size={16} color="var(--success)" />
                  30天长期目标
                </h4>
                <ul style={styles.goalList}>
                  {studyPlan.long_term_goals.map((g, i) => (
                    <li key={i} style={styles.goalItem}>{g}</li>
                  ))}
                </ul>
              </div>

              {/* Resources */}
              <div style={styles.planSection}>
                <h4 style={styles.planSectionTitle}>
                  <Lightbulb size={16} color="var(--accent-secondary)" />
                  推荐学习资源
                </h4>
                <ul style={styles.goalList}>
                  {studyPlan.resource_recommendations.map((r, i) => (
                    <li key={i} style={styles.goalItem}>{r}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div style={styles.errorBox}>
            <p style={styles.errorText}>{error}</p>
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
  },
  // Empty
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '60px 20px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border-primary)',
    borderRadius: 12,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: 'var(--text-primary)',
    margin: 0,
  },
  emptyHint: {
    fontSize: 14,
    color: 'var(--text-tertiary)',
    margin: 0,
    textAlign: 'center',
    maxWidth: 380,
    lineHeight: 1.6,
  },
  // Stats
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 12,
    marginBottom: 28,
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: 'var(--bg-card)',
    border: '1px solid var(--border-primary)',
    borderRadius: 10,
    padding: '16px 18px',
  },
  statValue: {
    fontSize: 22,
    fontWeight: 700,
    color: 'var(--text-primary)',
    margin: 0,
    lineHeight: 1.2,
  },
  statLabel: {
    fontSize: 12,
    color: 'var(--text-tertiary)',
    margin: 0,
    marginTop: 2,
  },
  // Sections
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: 'var(--text-primary)',
    margin: 0,
  },
  // Eval list
  evalList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  evalCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-primary)',
    borderRadius: 10,
    overflow: 'hidden',
  },
  evalCardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: '12px 16px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    textAlign: 'left',
  },
  evalCardLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  evalScore: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    borderRadius: 10,
    border: '2px solid',
    fontSize: 15,
    fontWeight: 700,
  },
  evalDate: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-primary)',
    margin: 0,
  },
  evalPosition: {
    fontSize: 12,
    color: 'var(--text-tertiary)',
    margin: 0,
    marginTop: 2,
  },
  evalCardRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  evalMiniTags: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    alignItems: 'flex-end',
  },
  evalMiniTag: {
    fontSize: 11,
    color: 'var(--text-tertiary)',
    maxWidth: 200,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  evalExpanded: {
    padding: '0 16px 16px',
    borderTop: '1px solid var(--border-primary)',
    paddingTop: 14,
  },
  detailLoading: {
    display: 'flex',
    justifyContent: 'center',
    padding: 20,
  },
  detailSection: {
    marginBottom: 14,
  },
  detailHeading: {
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--success)',
    margin: 0,
    marginBottom: 6,
  },
  detailList: {
    margin: 0,
    paddingLeft: 18,
  },
  detailItem: {
    fontSize: 13,
    color: 'var(--text-secondary)',
    marginBottom: 4,
    lineHeight: 1.5,
  },
  feedbackMd: {
    fontSize: 13,
    color: 'var(--text-secondary)',
    lineHeight: 1.6,
  },
  // Study plan
  planBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    padding: '14px 0',
    border: 'none',
    borderRadius: 10,
    background: 'var(--bg-tertiary)',
    color: 'var(--text-tertiary)',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  planBtnActive: {
    background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
    color: '#fff',
    boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
  },
  planContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  planSection: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-primary)',
    borderRadius: 10,
    padding: 18,
  },
  planSectionTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 14,
    fontWeight: 700,
    color: 'var(--text-primary)',
    margin: 0,
    marginBottom: 12,
  },
  focusCards: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  focusCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    padding: '10px 12px',
    background: 'var(--bg-secondary)',
    borderRadius: 8,
  },
  focusNum: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 22,
    height: 22,
    borderRadius: 6,
    background: 'var(--danger)',
    color: '#fff',
    fontSize: 12,
    fontWeight: 700,
    flexShrink: 0,
  },
  focusText: {
    fontSize: 13,
    color: 'var(--text-primary)',
    margin: 0,
    lineHeight: 1.5,
  },
  weekList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  weekItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    padding: '8px 12px',
    background: 'var(--bg-secondary)',
    borderRadius: 8,
  },
  weekDay: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 40,
    height: 26,
    borderRadius: 6,
    background: 'var(--accent-primary)',
    color: '#fff',
    fontSize: 12,
    fontWeight: 600,
    flexShrink: 0,
  },
  weekTask: {
    fontSize: 13,
    color: 'var(--text-primary)',
    margin: 0,
    lineHeight: 1.5,
  },
  goalList: {
    margin: 0,
    paddingLeft: 18,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  goalItem: {
    fontSize: 13,
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
  },
  // Error
  errorBox: {
    padding: '10px 14px',
    background: 'var(--bg-danger)',
    border: '1px solid var(--danger)',
    borderRadius: 'var(--radius-sm)',
    marginTop: 16,
  },
  errorText: {
    fontSize: 13,
    color: 'var(--danger)',
    margin: 0,
  },
};