import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Loader2, Sparkles, Briefcase, AlertCircle, CheckCircle,
  Upload, FileText, X, File, Image, FileSpreadsheet, Send, Bot, User,
  ChevronRight, RotateCcw, Star, TrendingUp, BookOpen, Target, Mic, MicOff,
} from 'lucide-react';

declare global {
  interface SpeechRecognition extends EventTarget {
    lang: string;
    interimResults: boolean;
    continuous: boolean;
    start(): void;
    stop(): void;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    onend: (() => void) | null;
  }

  interface Window {
    SpeechRecognition: { new(): SpeechRecognition } | undefined;
    webkitSpeechRecognition: { new(): SpeechRecognition } | undefined;
  }
}
import ReactMarkdown from 'react-markdown';
import { api } from '../api';
import type { InterviewMessage, InterviewEvaluateResponse } from '../types';

type Step = 'upload' | 'review' | 'interviewing' | 'evaluating' | 'completed';

const ACCEPTED_TYPES = '.pdf,.docx,.doc,.png,.jpg,.jpeg,.bmp,.tiff,.tif,.webp';
const MAX_SIZE = 20 * 1024 * 1024; // 20MB
const STEPS = [
  { key: 'upload' as Step, label: '上传简历' },
  { key: 'review' as Step, label: '确认内容' },
  { key: 'interviewing' as Step, label: '模拟面试' },
  { key: 'evaluating' as Step, label: '面试评估' },
  { key: 'completed' as Step, label: '评估结果' },
];

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
  const [step, setStep] = useState<Step>('upload');
  const [targetPosition, setTargetPosition] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [resumeMarkdown, setResumeMarkdown] = useState('');
  const [resumeRaw, setResumeRaw] = useState('');
  const [messages, setMessages] = useState<InterviewMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [evaluation, setEvaluation] = useState<InterviewEvaluateResponse | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const accumulatedRef = useRef('');

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Focus input when entering interview step
  useEffect(() => {
    if (step === 'interviewing' && !loading) {
      inputRef.current?.focus();
    }
  }, [step, loading]);

  // Init SpeechRecognition
  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;
    setSpeechSupported(true);

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = 'zh-CN';
    recognition.interimResults = true;
    recognition.continuous = false;

    let accumulated = accumulatedRef; // survives across recognition restarts within a recording session

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          accumulated.current += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      setInput(accumulated.current + interim);
    };

    recognition.onerror = (event: Event) => {
      const e = event as SpeechRecognitionErrorEvent;
      if (e.error === 'no-speech') return; // don't stop, let onend restart
      if (e.error === 'aborted') {
        // aborted by stopRecording — don't restart
        return;
      }
      console.warn('Speech recognition error:', e.error);
    };

    recognition.onend = () => {
      // If still in recording mode, auto-restart to keep listening
      if (recognitionRef.current && isRecordingRef.current) {
        try {
          recognitionRef.current.start();
        } catch {
          // can't restart right now, try again shortly
          setTimeout(() => {
            if (recognitionRef.current && isRecordingRef.current) {
              try { recognitionRef.current.start(); } catch { /* give up */ }
            }
          }, 300);
        }
      } else {
        setIsRecording(false);
      }
    };

    recognitionRef.current = recognition;
  }, []);

  // Keep a ref mirror of isRecording so the onend closure always reads the latest value
  const isRecordingRef = useRef(false);
  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);

  const startRecording = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) return;
    accumulatedRef.current = '';
    setInput('');
    try {
      rec.start();
      setIsRecording(true);
    } catch {
      // already started, ignore
    }
  }, []);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  }, []);

  const toggleRecording = useCallback(() => {
    if (isRecording) stopRecording();
    else startRecording();
  }, [isRecording, startRecording, stopRecording]);

  // ---------- File helpers ----------
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
    if (err) { setError(err); setFile(null); return; }
    setError('');
    setFile(f);
  }, [validateFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFileSelect(f);
  }, [handleFileSelect]);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFileSelect(f);
  };

  const removeFile = () => {
    setFile(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ---------- Step 1: Extract resume ----------
  const handleExtract = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.extractResume(file, targetPosition || undefined);
      setResumeMarkdown(data.resume_markdown);
      setResumeRaw(data.resume_raw);
      setStep('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : '简历提取失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // ---------- Step 2 → 3: Start interview ----------
  const handleStartInterview = async () => {
    setStep('interviewing');
    setMessages([]);
    setLoading(true);
    try {
      const res = await api.interviewChat({
        resume_text: resumeRaw,
        conversation_history: [],
        target_position: targetPosition || undefined,
      });
      const firstMsg: InterviewMessage = { role: 'interviewer', content: res.message };
      setMessages([firstMsg]);
    } catch (err) {
      setError(err instanceof Error ? err.message : '面试启动失败');
      setStep('review');
    } finally {
      setLoading(false);
    }
  };

  // ---------- Step 3: Send answer ----------
  const handleSendAnswer = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg: InterviewMessage = { role: 'user', content: trimmed };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    accumulatedRef.current = '';
    setLoading(true);

    try {
      const history = updatedMessages.map(m => ({ role: m.role, content: m.content }));
      const res = await api.interviewChat({
        resume_text: resumeRaw,
        conversation_history: history,
        target_position: targetPosition || undefined,
      });

      const aiMsg: InterviewMessage = { role: 'interviewer', content: res.message };
      setMessages(prev => [...prev, aiMsg]);

      if (res.is_complete) {
        setStep('evaluating');
        handleEvaluate([...updatedMessages, aiMsg]);
      }
    } catch (err) {
      const errMsg: InterviewMessage = {
        role: 'interviewer',
        content: `抱歉，出错了：${err instanceof Error ? err.message : '未知错误'}，请重试。`,
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  // ---------- Step 3 → 4: End interview & evaluate ----------
  const handleEndInterview = () => {
    setStep('evaluating');
    handleEvaluate(messages);
  };

  const handleEvaluate = async (msgs: InterviewMessage[]) => {
    try {
      const history = msgs.map(m => ({ role: m.role, content: m.content }));
      const result = await api.evaluateInterview({
        resume_text: resumeRaw,
        conversation_history: history,
        target_position: targetPosition || undefined,
      });
      setEvaluation(result);
      setStep('completed');
    } catch (err) {
      setError(err instanceof Error ? err.message : '评估失败');
      setStep('interviewing'); // allow retry
    }
  };

  // ---------- Reset ----------
  const handleReset = () => {
    setStep('upload');
    setFile(null);
    setResumeMarkdown('');
    setResumeRaw('');
    setMessages([]);
    setInput('');
    setEvaluation(null);
    setError('');
    setTargetPosition('');
  };

  // ---------- Derived ----------
  const userAnswerCount = messages.filter(m => m.role === 'user' && m.content.trim()).length;
  const interviewerMsgCount = messages.filter(m => m.role === 'interviewer').length;
  const canEndInterview = userAnswerCount >= 3;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendAnswer();
    }
  };

  // ---------- Step Indicator ----------
  const currentStepIndex = STEPS.findIndex(s => s.key === step);

  // ========== RENDER ==========
  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerIcon}>
            <Briefcase size={28} color="var(--accent-primary)" />
          </div>
          <div>
            <h1 style={styles.title}>AI 模拟面试</h1>
            <p style={styles.subtitle}>上传简历，AI 面试官将进行多轮追问式模拟面试</p>
          </div>
        </div>

        {/* Step Indicator */}
        <div style={styles.stepBar}>
          {STEPS.map((s, i) => (
            <div key={s.key} style={{ ...styles.stepItem, ...(i <= currentStepIndex ? styles.stepItemActive : {}) }}>
              <div style={{ ...styles.stepDot, ...(i <= currentStepIndex ? styles.stepDotActive : {}) }}>
                {i < currentStepIndex ? <CheckCircle size={14} /> : <span>{i + 1}</span>}
              </div>
              <span style={{ ...styles.stepLabel, ...(i <= currentStepIndex ? styles.stepLabelActive : {}) }}>
                {s.label}
              </span>
              {i < STEPS.length - 1 && (
                <ChevronRight size={14} color={i < currentStepIndex ? 'var(--accent-primary)' : 'var(--border-primary)'} style={{ margin: '0 8px' }} />
              )}
            </div>
          ))}
        </div>

        {/* Content Area */}
        <div style={styles.content}>
          {/* ========== STEP: UPLOAD ========== */}
          {step === 'upload' && (
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
                onClick={handleExtract}
                disabled={!file || loading}
              >
                {loading ? (
                  <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />AI 正在提取简历内容...</>
                ) : (
                  <><Sparkles size={18} />提取并格式化</>
                )}
              </button>

              {error && (
                <div style={styles.errorBox}><AlertCircle size={16} /><p style={styles.errorText}>{error}</p></div>
              )}
            </div>
          )}

          {/* ========== STEP: REVIEW ========== */}
          {step === 'review' && (
            <div>
              <div style={styles.reviewHeader}>
                <CheckCircle size={20} color="var(--success)" />
                <h2 style={styles.reviewTitle}>简历内容提取完成</h2>
              </div>
              <p style={styles.reviewHint}>请确认以下内容是否正确。如果内容有误，请返回重新上传更清晰的文件。</p>
              <div style={styles.markdownPreview}>
                <ReactMarkdown>{resumeMarkdown}</ReactMarkdown>
              </div>
              <div style={styles.reviewActions}>
                <button style={styles.secondaryBtn} onClick={() => { setStep('upload'); setError(''); }}>
                  返回重新上传
                </button>
                <button style={{ ...styles.primaryBtn, ...styles.primaryBtnActive }} onClick={handleStartInterview} disabled={loading}>
                  {loading ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />启动中...</> : <><Sparkles size={18} />开始面试</>}
                </button>
              </div>
            </div>
          )}

          {/* ========== STEP: INTERVIEWING ========== */}
          {step === 'interviewing' && (
            <div style={styles.interviewContainer}>
              {/* Progress bar */}
              <div style={styles.progressBar}>
                <div style={styles.progressInfo}>
                  <span>第 {interviewerMsgCount} 轮交流</span>
                  <span style={styles.progressHint}>目标约 15 轮（含追问）</span>
                </div>
                <div style={styles.progressTrack}>
                  <div style={{ ...styles.progressFill, width: `${Math.min((interviewerMsgCount / 15) * 100, 100)}%` }} />
                </div>
                <div style={styles.progressActions}>
                  <button
                    style={{ ...styles.endBtn, ...(canEndInterview ? styles.endBtnActive : {}) }}
                    onClick={handleEndInterview}
                    disabled={!canEndInterview}
                    title={canEndInterview ? '结束面试并查看评估' : `至少需要回答 3 个问题才能结束（当前 ${userAnswerCount} 个）`}
                  >
                    结束面试
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div style={styles.messagesArea}>
                {messages.length === 0 && loading && (
                  <div style={styles.emptyState}>
                    <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-primary)' }} />
                    <p style={{ color: 'var(--text-secondary)', marginTop: 12 }}>AI 面试官正在准备问题...</p>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div key={i} style={{ ...styles.messageRow, justifyContent: msg.role === 'interviewer' ? 'flex-start' : 'flex-end' }}>
                    {msg.role === 'interviewer' && (
                      <div style={styles.avatarBot}><Bot size={16} /></div>
                    )}
                    <div style={{ ...styles.messageBubble, ...(msg.role === 'interviewer' ? styles.botBubble : styles.userBubble) }}>
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                    {msg.role === 'user' && (
                      <div style={styles.avatarUser}><User size={16} /></div>
                    )}
                  </div>
                ))}
                {loading && (
                  <div style={{ ...styles.messageRow, justifyContent: 'flex-start' }}>
                    <div style={styles.avatarBot}><Bot size={16} /></div>
                    <div style={{ ...styles.messageBubble, ...styles.botBubble }}>
                      <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div style={styles.inputArea}>
                <div style={{ ...styles.inputWrapper, ...(isRecording ? styles.inputWrapperRecording : {}) }}>
                  <textarea
                    ref={inputRef}
                    style={styles.textarea}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isRecording ? '正在聆听... 请说话' : '输入你的回答，Shift+Enter 换行，或点击麦克风语音输入'}
                    rows={1}
                    disabled={loading}
                  />
                  {speechSupported && (
                    <button
                      style={{ ...styles.micBtn, ...(isRecording ? styles.micBtnActive : {}) }}
                      onClick={toggleRecording}
                      disabled={loading}
                      title={isRecording ? '停止录音' : '语音输入'}
                    >
                      {isRecording ? <MicOff size={17} /> : <Mic size={17} />}
                    </button>
                  )}
                  <button
                    style={{ ...styles.sendBtn, ...(input.trim() && !loading ? styles.sendBtnActive : {}) }}
                    onClick={handleSendAnswer}
                    disabled={!input.trim() || loading}
                  >
                    <Send size={17} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========== STEP: EVALUATING ========== */}
          {step === 'evaluating' && (
            <div style={styles.evaluatingState}>
              <div style={styles.evalSpinner}>
                <Loader2 size={48} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-primary)' }} />
              </div>
              <h2 style={styles.evalTitle}>AI 正在评估你的面试表现...</h2>
              <p style={styles.evalDesc}>正在分析你的回答深度、准确性、表达能力等多个维度</p>
            </div>
          )}

          {/* ========== STEP: COMPLETED ========== */}
          {step === 'completed' && evaluation && (
            <div>
              {/* Score */}
              <div style={styles.scoreSection}>
                <div style={{
                  ...styles.scoreCircle,
                  borderColor: evaluation.overall_score >= 80 ? 'var(--success)' : evaluation.overall_score >= 60 ? 'var(--warning)' : 'var(--danger)',
                  color: evaluation.overall_score >= 80 ? 'var(--success)' : evaluation.overall_score >= 60 ? 'var(--warning)' : 'var(--danger)',
                }}>
                  <span style={styles.scoreNumber}>{evaluation.overall_score}</span>
                  <span style={styles.scoreLabel}>综合评分</span>
                </div>
                <p style={styles.scoreDesc}>
                  {evaluation.overall_score >= 90 ? '表现优秀！回答深入且有见地' :
                   evaluation.overall_score >= 75 ? '表现良好！大部分回答有深度' :
                   evaluation.overall_score >= 60 ? '表现一般，还有提升空间' :
                   '需要继续努力，加强准备'}
                </p>
              </div>

              {/* Strengths */}
              <div style={styles.resultCard}>
                <div style={styles.resultCardHeader}>
                  <Star size={18} color="var(--success)" />
                  <h3 style={{ ...styles.resultCardTitle, color: 'var(--success)' }}>优势亮点</h3>
                </div>
                <ul style={styles.resultList}>
                  {evaluation.strengths.map((s, i) => <li key={i} style={styles.resultItem}>{s}</li>)}
                </ul>
              </div>

              {/* Weaknesses */}
              <div style={styles.resultCard}>
                <div style={styles.resultCardHeader}>
                  <Target size={18} color="var(--warning)" />
                  <h3 style={{ ...styles.resultCardTitle, color: 'var(--warning)' }}>待改进</h3>
                </div>
                <ul style={styles.resultList}>
                  {evaluation.weaknesses.map((w, i) => <li key={i} style={styles.resultItem}>{w}</li>)}
                </ul>
              </div>

              {/* Learning Path */}
              <div style={styles.resultCard}>
                <div style={styles.resultCardHeader}>
                  <TrendingUp size={18} color="var(--accent-primary)" />
                  <h3 style={{ ...styles.resultCardTitle, color: 'var(--accent-primary)' }}>学习路线</h3>
                </div>
                <ol style={{ ...styles.resultList, listStyleType: 'decimal', paddingLeft: 20 }}>
                  {evaluation.learning_path.map((lp, i) => <li key={i} style={styles.resultItem}>{lp}</li>)}
                </ol>
              </div>

              {/* Detailed Feedback */}
              <div style={styles.resultCard}>
                <div style={styles.resultCardHeader}>
                  <BookOpen size={18} color="var(--accent-secondary)" />
                  <h3 style={{ ...styles.resultCardTitle, color: 'var(--accent-secondary)' }}>详细评估报告</h3>
                </div>
                <div style={styles.detailedFeedback}>
                  <ReactMarkdown>{evaluation.detailed_feedback}</ReactMarkdown>
                </div>
              </div>

              {/* Reset */}
              <div style={styles.resetSection}>
                <button style={{ ...styles.primaryBtn, ...styles.primaryBtnActive }} onClick={handleReset}>
                  <RotateCcw size={18} /> 重新开始
                </button>
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
        @keyframes micPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.6); }
          50% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
        }
      `}</style>
    </div>
  );
}

// ========== STYLES ==========
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
    maxWidth: 860,
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
    fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em',
  },
  subtitle: {
    fontSize: 14, color: 'var(--text-tertiary)', margin: 0, marginTop: 4,
  },

  // Step indicator
  stepBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px 24px',
    borderBottom: '1px solid var(--border-primary)',
    background: 'var(--bg-secondary)',
    flexWrap: 'wrap',
    gap: 4,
  },
  stepItem: {
    display: 'flex', alignItems: 'center', gap: 6,
  },
  stepItemActive: {},
  stepDot: {
    width: 24, height: 24, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 12, fontWeight: 600,
    background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)',
    border: '2px solid var(--border-primary)',
  },
  stepDotActive: {
    background: 'var(--accent-primary)', color: '#fff', borderColor: 'var(--accent-primary)',
  },
  stepLabel: {
    fontSize: 13, fontWeight: 500, color: 'var(--text-tertiary)',
  },
  stepLabelActive: {
    color: 'var(--text-primary)', fontWeight: 600,
  },

  content: {
    padding: '28px 32px 32px',
  },

  // Upload step
  inputSection: {
    display: 'flex', flexDirection: 'column', gap: 20,
  },
  formGroup: {
    display: 'flex', flexDirection: 'column', gap: 8,
  },
  label: {
    display: 'flex', alignItems: 'center', gap: 6,
    fontSize: 14, fontWeight: 600, color: 'var(--text-primary)',
  },
  formInput: {
    width: '100%', padding: '12px 16px',
    border: '2px solid var(--border-primary)', borderRadius: '12px',
    background: 'var(--bg-secondary)', color: 'var(--text-primary)',
    fontSize: 15, outline: 'none', transition: 'all var(--transition-fast)',
  },
  dropZone: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: 12, padding: '48px 24px',
    border: '2px dashed var(--border-primary)', borderRadius: '16px',
    background: 'var(--bg-secondary)', cursor: 'pointer', transition: 'all var(--transition-fast)',
  },
  dropZoneActive: {
    borderColor: 'var(--accent-primary)', background: 'var(--accent-primary-light)',
  },
  dropIcon: {
    width: 64, height: 64, borderRadius: '50%',
    background: 'var(--accent-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  dropText: { fontSize: 15, color: 'var(--text-primary)', margin: 0 },
  dropLink: { color: 'var(--accent-primary)', fontWeight: 600, textDecoration: 'underline' },
  dropHint: { fontSize: 12, color: 'var(--text-tertiary)', margin: 0 },
  fileCard: {
    display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
    borderRadius: '14px', border: '2px solid var(--accent-primary)', background: 'var(--accent-primary-light)',
  },
  fileIconBox: {
    width: 44, height: 44, borderRadius: '12px', background: 'var(--bg-card)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '1px solid var(--border-primary)', flexShrink: 0,
  },
  fileInfo: { flex: 1, minWidth: 0 },
  fileName: { fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  fileSize: { fontSize: 12, color: 'var(--text-tertiary)', margin: 0, marginTop: 2 },
  removeBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 32, height: 32, borderRadius: '8px', border: 'none',
    background: 'var(--bg-card)', color: 'var(--text-tertiary)', cursor: 'pointer', flexShrink: 0,
  },

  // Buttons
  primaryBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: '14px 28px', border: 'none', borderRadius: '12px',
    background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)',
    fontSize: 15, fontWeight: 600, cursor: 'not-allowed', transition: 'all var(--transition-fast)',
  },
  primaryBtnActive: {
    background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
    color: '#ffffff', cursor: 'pointer', boxShadow: '0 4px 16px rgba(99, 102, 241, 0.4)',
  },
  secondaryBtn: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '12px 24px', border: '2px solid var(--border-primary)', borderRadius: '12px',
    background: 'var(--bg-card)', color: 'var(--text-secondary)',
    fontSize: 15, fontWeight: 500, cursor: 'pointer', transition: 'all var(--transition-fast)',
  },
  errorBox: {
    display: 'flex', alignItems: 'flex-start', gap: 10, padding: '14px 16px',
    borderRadius: '12px', background: 'var(--danger-light)', border: '1px solid var(--danger)',
  },
  errorText: { fontSize: 14, color: 'var(--danger)', margin: 0, lineHeight: 1.5 },

  // Review step
  reviewHeader: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 },
  reviewTitle: { fontSize: 16, fontWeight: 600, color: 'var(--success)', margin: 0 },
  reviewHint: { fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 16, lineHeight: 1.6 },
  markdownPreview: {
    padding: '20px 24px', borderRadius: '14px',
    background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
    fontSize: 14, lineHeight: 1.8, color: 'var(--text-primary)',
    maxHeight: 400, overflowY: 'auto', marginBottom: 20,
  },
  reviewActions: {
    display: 'flex', justifyContent: 'flex-end', gap: 12,
  },

  // Interview step
  interviewContainer: {
    display: 'flex', flexDirection: 'column', height: 520,
  },
  progressBar: {
    padding: '12px 0 16px', borderBottom: '1px solid var(--border-primary)', marginBottom: 16,
  },
  progressInfo: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
    fontSize: 14, fontWeight: 600, color: 'var(--text-primary)',
  },
  progressHint: { fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 400 },
  progressTrack: {
    height: 6, borderRadius: 3, background: 'var(--bg-tertiary)', overflow: 'hidden',
  },
  progressFill: {
    height: '100%', borderRadius: 3,
    background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))',
    transition: 'width 0.5s ease',
  },
  progressActions: {
    display: 'flex', justifyContent: 'flex-end', marginTop: 10,
  },
  endBtn: {
    padding: '6px 16px', border: '1px solid var(--border-primary)', borderRadius: '8px',
    background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)',
    fontSize: 13, fontWeight: 500, cursor: 'not-allowed', transition: 'all var(--transition-fast)',
  },
  endBtnActive: {
    background: 'var(--danger-light)', borderColor: 'var(--danger)',
    color: 'var(--danger)', cursor: 'pointer',
  },

  // Chat area
  messagesArea: {
    flex: 1, overflowY: 'auto', padding: '0 4px 16px',
    display: 'flex', flexDirection: 'column', gap: 16,
  },
  emptyState: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: 60, gap: 8,
  },
  messageRow: {
    display: 'flex', alignItems: 'flex-start', gap: 10,
  },
  avatarBot: {
    width: 34, height: 34, borderRadius: '50%',
    background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
    color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, marginTop: 2, boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
  },
  avatarUser: {
    width: 34, height: 34, borderRadius: '50%',
    background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
    color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, marginTop: 2, boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
  },
  messageBubble: {
    maxWidth: '80%', padding: '12px 18px', borderRadius: '16px',
    fontSize: 14, lineHeight: 1.7, wordBreak: 'break-word',
  },
  userBubble: {
    background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
    color: '#ffffff', borderBottomRightRadius: 6,
    boxShadow: '0 3px 10px rgba(99, 102, 241, 0.3)',
  },
  botBubble: {
    background: 'var(--bg-secondary)', color: 'var(--text-primary)',
    border: '1px solid var(--border-primary)', borderBottomLeftRadius: 6,
  },

  // Input
  inputArea: { paddingTop: 8, borderTop: '1px solid var(--border-primary)' },
  inputWrapper: {
    display: 'flex', alignItems: 'flex-end', gap: 10,
    background: 'var(--bg-secondary)', border: '2px solid var(--border-primary)',
    borderRadius: '16px', padding: '10px 10px 10px 18px',
    transition: 'border-color var(--transition-fast)',
  },
  textarea: {
    flex: 1, border: 'none', outline: 'none', background: 'transparent',
    color: 'var(--text-primary)', fontSize: 14, lineHeight: 1.6,
    resize: 'none', minHeight: 22, maxHeight: 120, padding: '4px 0',
  },
  sendBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 38, height: 38, border: 'none', borderRadius: '12px',
    background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)',
    transition: 'all var(--transition-fast)', flexShrink: 0,
  },
  sendBtnActive: {
    background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
    color: '#ffffff', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
  },

  // Mic button
  micBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 38, height: 38, border: 'none', borderRadius: '12px',
    background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)',
    transition: 'all var(--transition-fast)', flexShrink: 0, cursor: 'pointer',
  },
  micBtnActive: {
    background: 'var(--danger)',
    color: '#ffffff',
    boxShadow: '0 0 0 0 rgba(239, 68, 68, 0.6)',
    animation: 'micPulse 1.5s ease-in-out infinite',
  },
  inputWrapperRecording: {
    borderColor: 'var(--danger)',
    boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.15)',
  },

  // Evaluating step
  evaluatingState: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: 80, gap: 16,
  },
  evalSpinner: {
    width: 80, height: 80, borderRadius: '50%',
    background: 'var(--accent-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  evalTitle: { fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', margin: 0 },
  evalDesc: { fontSize: 14, color: 'var(--text-tertiary)', margin: 0 },

  // Results step
  scoreSection: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0 28px', gap: 12,
  },
  scoreCircle: {
    width: 120, height: 120, borderRadius: '50%',
    border: '4px solid', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    background: 'var(--bg-card)',
  },
  scoreNumber: { fontSize: 40, fontWeight: 800, lineHeight: 1 },
  scoreLabel: { fontSize: 12, fontWeight: 600, marginTop: 2 },
  scoreDesc: { fontSize: 15, fontWeight: 500, color: 'var(--text-secondary)', margin: 0 },

  resultCard: {
    padding: '20px 24px', borderRadius: '14px',
    background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
    marginBottom: 16,
  },
  resultCardHeader: {
    display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
  },
  resultCardTitle: { fontSize: 15, fontWeight: 700, margin: 0 },
  resultList: {
    margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8,
  },
  resultItem: {
    fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7,
  },
  detailedFeedback: {
    fontSize: 14, lineHeight: 1.8, color: 'var(--text-primary)',
  },
  resetSection: {
    display: 'flex', justifyContent: 'center', paddingTop: 8,
  },
};