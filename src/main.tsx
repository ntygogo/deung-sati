import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { CompanionProvider } from './context/CompanionContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <LanguageProvider>
        <CompanionProvider>
          <App />
        </CompanionProvider>
      </LanguageProvider>
    </AuthProvider>
  </StrictMode>,
);
