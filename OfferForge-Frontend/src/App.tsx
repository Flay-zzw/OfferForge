import { useState, useEffect, useRef } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import ChatPage from './pages/ChatPage';
import QuestionsPage from './pages/QuestionsPage';
import ParsePage from './pages/ParsePage';
import MockInterviewPage from './pages/MockInterviewPage';
import ResumeAnalyzePage from './pages/ResumeAnalyzePage';
import ResumeReviewPage from './pages/ResumeReviewPage';
import ProgressPage from './pages/ProgressPage';
import AuthPage from './pages/AuthPage';
import './styles/global.css';

type Tab = 'chat' | 'questions' | 'parse' | 'mock-interview' | 'resume-analyze' | 'resume-review' | 'progress';

const RESTRICTED_TABS: Tab[] = ['chat', 'parse', 'mock-interview', 'resume-analyze', 'resume-review', 'progress'];

function AppContent() {
  const [activeTab, setActiveTab] = useState<Tab>('chat');
  const [showAuth, setShowAuth] = useState(false);
  const { isGuest, loading } = useAuth();
  const pendingTabRef = useRef<Tab | null>(null);

  // Default guests to the public questions tab
  useEffect(() => {
    if (!loading && isGuest && RESTRICTED_TABS.includes(activeTab)) {
      setActiveTab('questions');
    }
  }, [loading, isGuest]); // eslint-disable-line react-hooks/exhaustive-deps

  // When user logs in, switch to the pending tab if any
  useEffect(() => {
    if (!isGuest && pendingTabRef.current) {
      setActiveTab(pendingTabRef.current);
      pendingTabRef.current = null;
    }
  }, [isGuest]);

  const handleTabChange = (tab: Tab) => {
    if (isGuest && RESTRICTED_TABS.includes(tab)) {
      pendingTabRef.current = tab;
      setShowAuth(true);
      return;
    }
    setActiveTab(tab);
  };

  if (loading) return null;

  return (
    <>
      <Layout activeTab={activeTab} onTabChange={handleTabChange} onLoginClick={() => setShowAuth(true)}>
        {activeTab === 'chat' ? (
          <ChatPage />
        ) : activeTab === 'questions' ? (
          <QuestionsPage />
        ) : activeTab === 'parse' ? (
          <ParsePage />
        ) : activeTab === 'mock-interview' ? (
          <MockInterviewPage />
        ) : activeTab === 'resume-analyze' ? (
          <ResumeAnalyzePage />
        ) : activeTab === 'resume-review' ? (
          <ResumeReviewPage />
        ) : (
          <ProgressPage />
        )}
      </Layout>
      {showAuth && <AuthPage onClose={() => setShowAuth(false)} />}
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;