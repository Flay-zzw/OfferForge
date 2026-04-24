import { MessageSquare, BookOpen, Sun, Moon, Flame } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import type { ReactNode } from 'react';

interface LayoutProps {
  activeTab: 'chat' | 'questions';
  onTabChange: (tab: 'chat' | 'questions') => void;
  children: ReactNode;
}

export default function Layout({ activeTab, onTabChange, children }: LayoutProps) {
  const { theme, toggleTheme } = useTheme();

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
        </div>
        <div style={styles.headerRight}>
          <button style={styles.themeBtn} onClick={toggleTheme} title="切换主题">
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
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
  },
  main: {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
};
