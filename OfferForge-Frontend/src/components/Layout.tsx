import { useState, useRef, useEffect } from 'react';
import { MessageSquare, BookOpen, Sun, Moon, Flame, FileText, Briefcase, User, LogOut, ChevronDown } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth, getDefaultAvatar } from '../contexts/AuthContext';
import type { ReactNode } from 'react';

interface LayoutProps {
  activeTab: 'chat' | 'questions' | 'parse' | 'mock-interview';
  onTabChange: (tab: 'chat' | 'questions' | 'parse' | 'mock-interview') => void;
  onLoginClick: () => void;
  children: ReactNode;
}

export default function Layout({ activeTab, onTabChange, onLoginClick, children }: LayoutProps) {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  const avatarUrl = user?.avatar || (user ? getDefaultAvatar(user.nickname || user.account) : '');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <Flame size={26} color="var(--accent-primary)" strokeWidth={2.5} />
          <span style={styles.logoText}>OfferForge</span>
          <span style={styles.logoSub}>面试锻造坊</span>
        </div>
        <div style={styles.headerCenter}>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'chat' ? styles.tabActive : {}),
            }}
            onClick={() => onTabChange('chat')}
          >
            <MessageSquare size={16} />
            <span>AI 对话</span>
          </button>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'questions' ? styles.tabActive : {}),
            }}
            onClick={() => onTabChange('questions')}
          >
            <BookOpen size={16} />
            <span>题库</span>
          </button>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'parse' ? styles.tabActive : {}),
            }}
            onClick={() => onTabChange('parse')}
          >
            <FileText size={16} />
            <span>解析面经</span>
          </button>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'mock-interview' ? styles.tabActive : {}),
            }}
            onClick={() => onTabChange('mock-interview')}
          >
            <Briefcase size={16} />
            <span>模拟面试</span>
          </button>
        </div>
        <div style={styles.headerRight}>
          <button style={styles.themeBtn} onClick={toggleTheme} title="切换主题">
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          {user ? (
            <div style={styles.userArea} ref={menuRef}>
              <button style={styles.userBtn} onClick={() => setMenuOpen(!menuOpen)}>
                <img
                  src={avatarUrl}
                  alt=""
                  style={styles.userAvatar}
                  onError={e => {
                    (e.target as HTMLImageElement).src = getDefaultAvatar(user.nickname || user.account);
                  }}
                />
                <span style={styles.userName}>{user.nickname || user.account}</span>
                <ChevronDown size={14} style={{ transition: 'transform 0.2s', transform: menuOpen ? 'rotate(180deg)' : 'none' }} />
              </button>
              {menuOpen && (
                <div style={styles.dropdown}>
                  <div style={styles.dropdownHeader}>
                    <img src={avatarUrl} alt="" style={styles.dropdownAvatar} />
                    <div>
                      <p style={styles.dropdownName}>{user.nickname || user.account}</p>
                      <p style={styles.dropdownAccount}>@{user.account}</p>
                    </div>
                  </div>
                  <div style={styles.dropdownDivider} />
                  <button
                    style={styles.dropdownItem}
                    onClick={() => { logout(); setMenuOpen(false); }}
                  >
                    <LogOut size={15} />
                    <span>退出登录</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button style={styles.loginBtn} onClick={onLoginClick}>
              <User size={16} />
              <span>登录</span>
            </button>
          )}
        </div>
      </header>
      <main style={styles.main}>{children}</main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    height: 60,
    minHeight: 60,
    background: 'var(--bg-card)',
    borderBottom: '1px solid var(--border-primary)',
    boxShadow: 'var(--shadow-sm)',
    zIndex: 100,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  logoText: {
    fontSize: 20,
    fontWeight: 700,
    background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '-0.02em',
  },
  logoSub: {
    fontSize: 12,
    color: 'var(--text-tertiary)',
    fontWeight: 400,
    marginLeft: 2,
  },
  headerCenter: {
    display: 'flex',
    gap: 4,
    background: 'var(--bg-tertiary)',
    padding: 4,
    borderRadius: 'var(--radius-md)',
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 20px',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    fontSize: 14,
    fontWeight: 500,
    color: 'var(--text-secondary)',
    background: 'transparent',
    transition: 'all var(--transition-fast)',
  },
  tabActive: {
    background: 'var(--bg-card)',
    color: 'var(--accent-primary)',
    boxShadow: 'var(--shadow-sm)',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  themeBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    border: '1px solid var(--border-primary)',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-secondary)',
    color: 'var(--text-secondary)',
    transition: 'all var(--transition-fast)',
    cursor: 'pointer',
  },
  loginBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 18px',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
    transition: 'all var(--transition-fast)',
  },
  // User area
  userArea: {
    position: 'relative',
  },
  userBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '4px 12px 4px 4px',
    border: '1px solid var(--border-primary)',
    borderRadius: 'var(--radius-md)',
    background: 'var(--bg-secondary)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  userAvatar: {
    width: 30,
    height: 30,
    borderRadius: 8,
    objectFit: 'cover',
  },
  userName: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-primary)',
    maxWidth: 80,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  // Dropdown
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: 0,
    width: 220,
    background: 'var(--bg-card)',
    border: '1px solid var(--border-primary)',
    borderRadius: 12,
    boxShadow: '0 16px 32px rgba(0, 0, 0, 0.15)',
    zIndex: 200,
    overflow: 'hidden',
  },
  dropdownHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '14px 16px',
  },
  dropdownAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    objectFit: 'cover',
  },
  dropdownName: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text-primary)',
    margin: 0,
  },
  dropdownAccount: {
    fontSize: 12,
    color: 'var(--text-tertiary)',
    margin: 0,
    marginTop: 2,
  },
  dropdownDivider: {
    height: 1,
    background: 'var(--border-primary)',
    margin: '0 12px',
  },
  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    padding: '10px 16px',
    border: 'none',
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: 13,
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  main: {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
};