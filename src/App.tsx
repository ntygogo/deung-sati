import React, { useState } from 'react';
import type { TabType, LoopMapData } from './types';
import { TodayView } from './components/TodayView';
import { ChatView } from './components/ChatView';
import { LoopsView } from './components/LoopsView';
import { ExercisesView } from './components/ExercisesView';
import { ServicesView } from './components/ServicesView';
import { PrivateSessionModal } from './components/PrivateSessionModal';
import {
  Sparkles,
  MessageCircleHeart,
  Compass,
  Wind,
  Shield,
  HeartHandshake,
  Crown,
  User,
} from 'lucide-react';
import { EmergencyModal } from './components/EmergencyModal';
import { SubscriptionModal } from './components/SubscriptionModal';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthModal } from './components/AuthModal';
import { UserProfileModal } from './components/UserProfileModal';

const INITIAL_SAMPLE_LOOPS: LoopMapData[] = [
  {
    id: 'sample-loop-1',
    event: { value: 'หัวหน้าพูดต่อหน้าคนอื่นว่า "งานง่ายแค่นี้ทำไมยังผิด"', sourceType: 'user_explicit' },
    feeling: { value: 'อายมาก • โกรธ • ใจเต้นแรง', sourceType: 'user_explicit' },
    interpretation: { value: 'ทุกคนคงคิดว่าฉันไม่เก่ง ฉันไม่ดีพอ', sourceType: 'ai_reflection' },
    needFear: { value: 'กลัวถูกมองว่าไร้ความสามารถ / ต้องการการยอมรับ', sourceType: 'ai_reflection' },
    habitualResponse: { value: 'เงียบ ไม่กล้าสบตาใคร แล้วกลับมาด่าตัวเองที่บ้าน', sourceType: 'user_explicit' },
    habitualResult: { value: 'ไม่เคยได้ตั้งขอบเขต และสะสมความเครียดไว้ในใจ', sourceType: 'ai_reflection' },
    newChoice: { value: 'รอให้อารมณ์สงบลง แล้วนัดคุยเรื่องวิธี feedback เป็นการส่วนตัว', sourceType: 'user_explicit' },
    userConfirmed: true,
  },
];

const AppInner: React.FC = () => {
  const { t } = useLanguage();
  const { currentUser, isLoggedIn, isPlus } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [chatInitialTopic, setChatInitialTopic] = useState<string | undefined>(undefined);
  const [isPrivateSession, setIsPrivateSession] = useState<boolean>(false);
  const [showPrivateModal, setShowPrivateModal] = useState<boolean>(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState<boolean>(false);
  const [showSubModal, setShowSubModal] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [savedLoops, setSavedLoops] = useState<LoopMapData[]>(INITIAL_SAMPLE_LOOPS);

  const handleStartChat = (topic?: string) => {
    setChatInitialTopic(topic);
    setActiveTab('chat');
  };

  const handleSaveLoop = (newLoop: LoopMapData) => {
    const loopWithId = {
      ...newLoop,
      id: newLoop.id || `loop-${Date.now()}`,
      userConfirmed: true,
    };
    setSavedLoops((prev) => [
      loopWithId,
      ...prev.filter((l) => l.id !== loopWithId.id),
    ]);
  };

  const handleUpdateLoop = (updated: LoopMapData) => {
    setSavedLoops((prev) =>
      prev.map((l) => (l.id === updated.id ? updated : l))
    );
  };

  const handleDeleteLoop = (id?: string) => {
    if (!id) return;
    setSavedLoops((prev) => prev.filter((l) => l.id !== id));
  };

  const handleUpgradeSuccess = () => {
    // Upgraded via AuthContext
  };

  return (
    <div className="app-container">
      {/* Top Header */}
      <header className="app-header">
        <div className="brand-title">
          <span className="brand-dot" />
          <span>{t('brandTitle')}</span>
        </div>

        <div className="header-actions">
          {/* Multi-Language Switcher (TH | EN | 中文 | 日本語) */}
          <LanguageSwitcher />

          {/* User Account Login / Profile Button */}
          {isLoggedIn && currentUser ? (
            <button
              type="button"
              className="auth-profile-header-btn"
              onClick={() => setShowProfileModal(true)}
              title={`เข้าสู่ระบบในชื่อ: ${currentUser.name}`}
            >
              <div className="auth-profile-avatar">
                <span>{currentUser.name.charAt(0).toUpperCase()}</span>
              </div>
              <span className="auth-profile-name">{currentUser.name}</span>
              {isPlus && <Crown size={12} className="text-amber-500" />}
            </button>
          ) : (
            <button
              type="button"
              className="auth-login-header-btn"
              onClick={() => setShowAuthModal(true)}
              title="เข้าสู่ระบบ / สมัครสมาชิก"
            >
              <User size={13} />
              <span>เข้าสู่ระบบ</span>
            </button>
          )}

          {/* Deung Sati Plus Subscription Button */}
          <button
            className={`plus-header-btn ${isPlus ? 'is-plus' : ''}`}
            onClick={() => setShowSubModal(true)}
            title={
              isPlus
                ? 'คุณเป็นสมาชิก ดึงสติ พลัส แล้ว'
                : 'อัปเกรดเป็น ดึงสติ พลัส (Deung Sati Plus)'
            }
          >
            <Crown size={14} className={isPlus ? 'text-amber-500' : 'text-amber-600'} />
            <span>{isPlus ? t('plusMember') : t('plusBtn')}</span>
          </button>

          {/* Red Emergency Warning Beacon Button */}
          <button
            className="emergency-beacon-header-btn"
            onClick={() => setShowEmergencyModal(true)}
            title={t('emergencyTooltip')}
            aria-label="ปุ่มฉุกเฉิน เบรกอารมณ์"
          >
            <img
              src="/images/siren_beacon.svg"
              alt="ไฟฉุกเฉิน"
              className="emergency-beacon-img"
            />
            <span className="emergency-beacon-label">{t('emergencyBtn')}</span>
          </button>

          <button
            className={`private-toggle-btn ${isPrivateSession ? 'active' : ''}`}
            onClick={() => setShowPrivateModal(true)}
            title="ตั้งค่าโหมดความเป็นส่วนตัว"
          >
            <Shield size={14} />
            <span>{isPrivateSession ? t('privateModeActive') : t('privateMode')}</span>
          </button>
        </div>
      </header>

      {/* Private Session Indicator Banner */}
      {isPrivateSession && (
        <div className="private-session-bar">
          <div className="private-badge">
            <Shield size={12} />
            <span>{t('privateBadge')}</span>
          </div>
          <span className="private-text">{t('privateDesc')}</span>
          <button
            type="button"
            className="btn-exit-private"
            onClick={() => setIsPrivateSession(false)}
          >
            {t('privateTurnOff')}
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className={`main-content ${activeTab === 'chat' ? 'is-chat-tab' : ''}`}>
        {activeTab === 'today' && (
          <TodayView onStartChat={handleStartChat} />
        )}

        {activeTab === 'chat' && (
          <ChatView
            isPrivateSession={isPrivateSession}
            onSaveLoop={handleSaveLoop}
            initialTopic={chatInitialTopic}
            onNavigateToLoops={() => setActiveTab('loops')}
            onNavigateToExercises={() => setActiveTab('exercises')}
          />
        )}

        {activeTab === 'loops' && (
          <LoopsView
            loops={savedLoops}
            onUpdateLoop={handleUpdateLoop}
            onDeleteLoop={handleDeleteLoop}
            onStartNewChat={(topic) => handleStartChat(topic)}
          />
        )}

        {activeTab === 'exercises' && <ExercisesView />}

        {activeTab === 'services' && <ServicesView />}
      </main>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <button
          className={`nav-item ${activeTab === 'today' ? 'active' : ''}`}
          onClick={() => setActiveTab('today')}
        >
          <div className="nav-icon-container">
            <Sparkles size={20} />
          </div>
          <span>{t('tabToday')}</span>
          {activeTab === 'today' && <span className="nav-active-dot" />}
        </button>

        <button
          className={`nav-item ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => {
            setChatInitialTopic(undefined);
            setActiveTab('chat');
          }}
        >
          <div className="nav-icon-container">
            <MessageCircleHeart size={20} />
          </div>
          <span>{t('tabChat')}</span>
          {activeTab === 'chat' && <span className="nav-active-dot" />}
        </button>

        <button
          className={`nav-item ${activeTab === 'loops' ? 'active' : ''}`}
          onClick={() => setActiveTab('loops')}
        >
          <div className="nav-icon-container">
            <Compass size={20} />
          </div>
          <span>{t('tabLoops')}</span>
          {activeTab === 'loops' && <span className="nav-active-dot" />}
        </button>

        <button
          className={`nav-item ${activeTab === 'exercises' ? 'active' : ''}`}
          onClick={() => setActiveTab('exercises')}
        >
          <div className="nav-icon-container">
            <Wind size={20} />
          </div>
          <span>{t('tabExercises')}</span>
          {activeTab === 'exercises' && <span className="nav-active-dot" />}
        </button>

        <button
          className={`nav-item ${activeTab === 'services' ? 'active' : ''}`}
          onClick={() => setActiveTab('services')}
        >
          <div className="nav-icon-container">
            <HeartHandshake size={20} />
          </div>
          <span>{t('tabServices')}</span>
          {activeTab === 'services' && <span className="nav-active-dot" />}
        </button>
      </nav>

      {/* Auth Modal (Sign in / Sign up) */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />

      {/* User Profile & Account Management Modal */}
      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        onOpenSubscribe={() => setShowSubModal(true)}
      />

      {/* Private Session Explanation Modal */}
      {showPrivateModal && (
        <PrivateSessionModal
          isPrivate={isPrivateSession}
          onToggle={() => setIsPrivateSession(!isPrivateSession)}
          onClose={() => setShowPrivateModal(false)}
        />
      )}

      {/* SOS Emergency Brake Modal */}
      {showEmergencyModal && (
        <EmergencyModal onClose={() => setShowEmergencyModal(false)} />
      )}

      {/* Deung Sati Plus Payment & Upgrade Modal */}
      <SubscriptionModal
        isOpen={showSubModal}
        onClose={() => setShowSubModal(false)}
        onUpgradeSuccess={handleUpgradeSuccess}
        isAlreadyPlus={isPlus}
        onOpenAuth={() => setShowAuthModal(true)}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <LanguageProvider>
        <AppInner />
      </LanguageProvider>
    </AuthProvider>
  );
};

export default App;
