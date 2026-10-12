import { BillingReturn } from './components/SubscriptionModal';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import './betaTheme.css';
import { BetaTrialProvider } from './context/BetaTrialContext';
import { AuthModal } from './components/AuthModal';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { CompanionProvider } from './context/CompanionContext';
import { LineNotebookReview } from './components/LineNotebookReview';

function AccountApp() {
  const { currentUser, isLoading } = useAuth();
  if (isLoading) return <p role="status">กำลังเปิดพื้นที่ของคุณ…</p>;
  if (!currentUser) return <AuthModal isOpen required initialMode="register" onClose={() => {}} />;
  if(window.location.pathname==='/line-notebook')return <LineNotebookReview key={currentUser.id} ownerId={currentUser.id} email={currentUser.email}/>;
  // Remount account-owned state and chat when the identity changes.
  // Guest drafts remain in their existing local storage and are not uploaded.
  return <CompanionProvider key={currentUser?.id ?? 'guest'}><BetaTrialProvider><App /><BillingReturn /></BetaTrialProvider></CompanionProvider>;
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
