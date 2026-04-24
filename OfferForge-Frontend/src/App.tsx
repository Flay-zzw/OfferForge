import { useState } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/Layout';
import ChatPage from './pages/ChatPage';
import QuestionsPage from './pages/QuestionsPage';
import './styles/global.css';

type Tab = 'chat' | 'questions';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('chat');

  return (
    <ThemeProvider>
      <Layout activeTab={activeTab} onTabChange={setActiveTab}>
        {activeTab === 'chat' ? <ChatPage /> : <QuestionsPage />}
      </Layout>
    </ThemeProvider>
  );
}

export default App;
