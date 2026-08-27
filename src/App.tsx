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
} from 'lucide-react';
import { EmergencyModal } from './components/EmergencyModal';
import { SubscriptionModal } from './components/SubscriptionModal';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { LanguageSwitcher } from './components/LanguageSwitcher';

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
  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [chatInitialTopic, setChatInitialTopic] = useState<string | undefined>(undefined);
  const [isPrivateSession, setIsPrivateSession] = useState<boolean>(false);
  const [showPrivateModal, setShowPrivateModal] = useState<boolean>(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState<boolean>(false);
  const [showSubModal, setShowSubModal] = useState<boolean>(false);
  const [isPlusUser, setIsPlusUser] = useState<boolean>(() => {
    try {
      return localStorage.getItem('deung_sati_is_plus_user') === 'true';
    } catch {
      return false;
    }
  });
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
    setIsPlusUser(true);
    try {
      localStorage.setItem('deung_sati_is_plus_user', 'true');
    } catch (e) {
      console.warn(e);
    }
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

          {/* Deung Sati Plus Subscription Button */}
          <button
            className={`plus-header-btn ${isPlusUser ? 'is-plus' : ''}`}
            onClick={() => setShowSubModal(true)}
            title={
              isPlusUser
                ? 'คุณเป็นสมาชิก ดึงสติ พลัส แล้ว'
                : 'อัปเกรดเป็น ดึงสติ พลัส (Deung Sati Plus)'
            }
          >
            <Crown size={14} className={isPlusUser ? 'text-amber-500' : 'text-amber-600'} />
            <span>{isPlusUser ? t('plusMember') : t('plusBtn')}</span>
          </button>

          {/* Red Emergency Warning Beacon Button (Pure Transparent Button with "ฉุกเฉิน" below) */}
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

      {/* Main Content Area */}
      <main className="app-content">
        {activeTab === 'today' && (
          <TodayView
            onStartChat={handleStartChat}
          />
        )}

        {activeTab === 'chat' && (
          <ChatView
            initialTopic={chatInitialTopic}
            isPrivateSession={isPrivateSession}
            onSaveLoop={handleSaveLoop}
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
            onLoadSampleLoops={(samples) => setSavedLoops(samples)}
          />
        )}

        {activeTab === 'exercises' && <ExercisesView onStartChat={handleStartChat} />}
        {activeTab === 'services' && <ServicesView />}
      </main>

      {/* Bottom 5-Tab Navigation */}
      <nav className="bottom-nav" aria-label="แถบนำทางหลัก">
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
        isAlreadyPlus={isPlusUser}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <LanguageProvider>
      <AppInner />
    </LanguageProvider>
  );
};

export default App;

