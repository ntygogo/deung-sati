import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { CompanionProvider } from './context/CompanionContext';

function AccountApp() {
  const { currentUser, isLoading } = useAuth();
  if (isLoading) return <p role="status">กำลังเปิดพื้นที่ของคุณ…</p>;
  // Remount account-owned state and chat when the identity changes.
  // Guest drafts remain in their existing local storage and are not uploaded.
  return <CompanionProvider key={currentUser?.id ?? 'guest'}><App /></CompanionProvider>;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <LanguageProvider>
        <AccountApp />
      </LanguageProvider>
    </AuthProvider>
  </StrictMode>,
);
