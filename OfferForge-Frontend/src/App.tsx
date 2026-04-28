import { useState } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/Layout';
import ChatPage from './pages/ChatPage';
import QuestionsPage from './pages/QuestionsPage';
import ParsePage from './pages/ParsePage';
import MockInterviewPage from './pages/MockInterviewPage';
import './styles/global.css';

type Tab = 'chat' | 'questions' | 'parse' | 'mock-interview';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('chat');

  return (
    <ThemeProvider>
      <Layout activeTab={activeTab} onTabChange={setActiveTab}>
        {activeTab === 'chat' ? (
          <ChatPage />
        ) : activeTab === 'questions' ? (
          <QuestionsPage />
        ) : activeTab === 'parse' ? (
          <ParsePage />
        ) : (
          <MockInterviewPage />
        )}
      </Layout>
    </ThemeProvider>
  );
}

export default App;
