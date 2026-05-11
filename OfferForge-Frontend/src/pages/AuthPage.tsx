import { useState } from 'react';
import { Flame, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface AuthPageProps {
  onClose: () => void;
}

export default function AuthPage({ onClose }: AuthPageProps) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!account.trim()) { setError('请输入账号'); return; }
    if (password.length < 6) { setError('密码至少 6 位'); return; }

    setLoading(true);
    setError('');
    try {
      if (mode === 'login') {
        await login(account.trim(), password);
      } else {
        await register(account.trim(), password, nickname.trim() || undefined);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  };

  const switchMode = () => {
    setMode(prev => prev === 'login' ? 'register' : 'login');
    setError('');
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.card} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={styles.logo}>
            <Flame size={24} color="var(--accent-primary)" strokeWidth={2.5} />
          </div>
          <h2 style={styles.title}>OfferForge</h2>
          <p style={styles.subtitle}>登录后解锁全部 AI 功能</p>
        </div>

        {/* Mode tabs */}
        <div style={styles.tabBar}>
          <button
            style={{ ...styles.tab, ...(mode === 'login' ? styles.tabActive : {}) }}
            onClick={() => setMode('login')}
          >
            登录
          </button>
          <button
            style={{ ...styles.tab, ...(mode === 'register' ? styles.tabActive : {}) }}
            onClick={() => setMode('register')}
          >
            注册
          </button>
        </div>

        <div style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>账号</label>
            <input
              style={styles.input}
              placeholder="请输入账号"
              value={account}
              onChange={e => setAccount(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          </div>

          {mode === 'register' && (
            <div style={styles.field}>
              <label style={styles.label}>昵称（可选）</label>
              <input
                style={styles.input}
                placeholder="给自己取个名字"
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
          )}

          <div style={styles.field}>
            <label style={styles.label}>密码</label>
            <div style={styles.pwdWrapper}>
              <input
                style={{ ...styles.input, paddingRight: 44 }}
                type={showPwd ? 'text' : 'password'}
                placeholder="至少 6 位密码"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button
                style={styles.pwdToggle}
                onClick={() => setShowPwd(!showPwd)}
                type="button"
              >
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div style={styles.errorBox}>
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          <button
            style={{ ...styles.submitBtn, ...(!loading ? styles.submitBtnActive : {}) }}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />处理中...</>
            ) : (
              mode === 'login' ? '登录' : '注册'
            )}
          </button>

          <p style={styles.switchHint}>
            {mode === 'login' ? '还没有账号？' : '已有账号？'}
            <button style={styles.switchBtn} onClick={switchMode}>
              {mode === 'login' ? '立即注册' : '去登录'}
            </button>
          </p>

          <button style={styles.guestBtn} onClick={onClose}>
            游客模式浏览（部分功能受限）
          </button>
        </div>

        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(4px)',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    background: 'var(--bg-card)',
    borderRadius: 20,
    border: '1px solid var(--border-primary)',
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.2)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '32px 28px 24px',
    background: 'linear-gradient(135deg, var(--accent-primary-light) 0%, transparent 60%)',
    borderBottom: '1px solid var(--border-primary)',
  },
  logo: {
    width: 52,
    height: 52,
    borderRadius: 14,
    background: 'linear-gradient(135deg, var(--accent-primary-light) 0%, rgba(139, 92, 246, 0.1) 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid var(--accent-primary)',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: 0,
    letterSpacing: '-0.02em',
  },
  subtitle: {
    fontSize: 13,
    color: 'var(--text-tertiary)',
    margin: 0,
    marginTop: 6,
  },
  tabBar: {
    display: 'flex',
    gap: 4,
    padding: '4px',
    margin: '20px 28px 0',
    background: 'var(--bg-tertiary)',
    borderRadius: 10,
  },
  tab: {
    flex: 1,
    padding: '10px 0',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    background: 'transparent',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  tabActive: {
    background: 'var(--bg-card)',
    color: 'var(--accent-primary)',
    boxShadow: 'var(--shadow-sm)',
  },
  form: {
    padding: '24px 28px 28px',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    border: '2px solid var(--border-primary)',
    borderRadius: 10,
    background: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    fontSize: 14,
    outline: 'none',
    transition: 'border-color var(--transition-fast)',
  },
  pwdWrapper: {
    position: 'relative',
  },
  pwdToggle: {
    position: 'absolute',
    right: 4,
    top: '50%',
    transform: 'translateY(-50%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    border: 'none',
    borderRadius: 8,
    background: 'transparent',
    color: 'var(--text-tertiary)',
    cursor: 'pointer',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 14px',
    borderRadius: 10,
    background: 'var(--danger-light)',
    border: '1px solid var(--danger)',
    color: 'var(--danger)',
    fontSize: 13,
  },
  submitBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '13px 0',
    border: 'none',
    borderRadius: 10,
    background: 'var(--bg-tertiary)',
    color: 'var(--text-tertiary)',
    fontSize: 15,
    fontWeight: 600,
    transition: 'all var(--transition-fast)',
    marginTop: 4,
  },
  submitBtnActive: {
    background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
    color: '#ffffff',
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(99, 102, 241, 0.4)',
  },
  switchHint: {
    textAlign: 'center',
    fontSize: 13,
    color: 'var(--text-tertiary)',
    margin: 0,
  },
  switchBtn: {
    border: 'none',
    background: 'transparent',
    color: 'var(--accent-primary)',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    marginLeft: 4,
    padding: 0,
  },
  guestBtn: {
    width: '100%',
    padding: '10px 0',
    border: 'none',
    borderRadius: 10,
    background: 'transparent',
    color: 'var(--text-tertiary)',
    fontSize: 13,
    cursor: 'pointer',
  },
};