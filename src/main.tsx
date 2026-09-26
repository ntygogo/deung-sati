import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { CompanionProvider } from './context/CompanionContext';
import { AppearanceLab } from './components/AppearanceLab';
import { AuthModal } from './components/AuthModal';

function AccountApp() {
  const { currentUser, isLoading } = useAuth();
  if (isLoading) return <p role="status">กำลังเปิดพื้นที่ของคุณ…</p>;
  if (!currentUser) return <AuthModal isOpen required initialMode="register" onClose={() => {}} />;
  // All app surfaces, including preview routes, require an authenticated account.
  if (new URLSearchParams(window.location.search).get('view') === 'appearance-lab') return <AppearanceLab />;
  return <CompanionProvider key={currentUser.id}><App /></CompanionProvider>;
}
createRoot(document.getElementById('root')!).render(
  <StrictMode><AuthProvider><LanguageProvider><AccountApp /></LanguageProvider></AuthProvider></StrictMode>,
);

