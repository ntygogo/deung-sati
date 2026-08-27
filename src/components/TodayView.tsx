import React, { useState, useEffect } from 'react';
import type { MoodWeather, GratitudeEntry } from '../types';
import { MessageCircleHeart } from 'lucide-react';
import { DailyWisdomCard } from './DailyWisdomCard';
import { FounderConnectCard } from './FounderConnectCard';
import { ConsequenceMirrorBanner } from './ConsequenceMirrorBanner';
import { ConsequenceSimulatorModal } from './ConsequenceSimulatorModal';
import { EmpathyLensBanner } from './EmpathyLensBanner';
import { EmpathyLensModal } from './EmpathyLensModal';
import { MindfulLibraryBanner } from './MindfulLibraryBanner';
import { MindfulLibraryModal } from './MindfulLibraryModal';
import { FloatingMoodWeather } from './FloatingMoodWeather';
import { MoodWeatherModal } from './MoodWeatherModal';
import { FloatingGratitudeJar } from './FloatingGratitudeJar';
import { GratitudeJarModal } from './GratitudeJarModal';

const STORAGE_KEY = 'deung_sati_gratitude_entries';

const SAMPLE_ENTRIES: GratitudeEntry[] = [
  {
    id: 'sample-1',
    date: new Date().toISOString().split('T')[0],
    moodWeather: 'sunny',
    text: 'กาแฟแก้วแรกตอนเช้าหอมและอุ่นกำลังดี',
    tag: '☕ กาแฟ/ของกิน',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'sample-2',
    date: new Date().toISOString().split('T')[0],
    moodWeather: 'rainy',
    text: 'ขอบคุณตัวเองที่ยังอดทนทำงานยากๆ จนเสร็จ',
    tag: '💛 ขอบคุณตัวเอง',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
  },
];

interface TodayViewProps {
  onStartChat: (initialTopic?: string) => void;
}

import { useLanguage } from '../context/LanguageContext';

export const TodayView: React.FC<TodayViewProps> = ({ onStartChat }) => {
  const { t } = useLanguage();
  const [entries, setEntries] = useState<GratitudeEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : SAMPLE_ENTRIES;
    } catch {
      return SAMPLE_ENTRIES;
    }
  });

  const [selectedMood, setSelectedMood] = useState<MoodWeather>('partly_cloudy');
  const [isMoodModalOpen, setIsMoodModalOpen] = useState<boolean>(false);
  const [isJarModalOpen, setIsJarModalOpen] = useState<boolean>(false);
  const [isSimModalOpen, setIsSimModalOpen] = useState<boolean>(false);
  const [isEmpathyModalOpen, setIsEmpathyModalOpen] = useState<boolean>(false);
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState<boolean>(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch (e) {
      console.warn('Failed to save gratitude entries to localStorage', e);
    }
  }, [entries]);

  const handleAddEntry = (newEntry: GratitudeEntry) => {
    setEntries((prev) => [newEntry, ...prev]);
  };

  const handleDeleteEntry = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const handleSelectTodayMood = (mood: MoodWeather) => {
    setSelectedMood(mood);
    const todayStr = new Date().toISOString().split('T')[0];
    
    const existingIndex = entries.findIndex(
      (e) => (e.date === todayStr) || (e.createdAt && e.createdAt.startsWith(todayStr))
    );

    if (existingIndex >= 0) {
      const updated = [...entries];
      updated[existingIndex] = {
        ...updated[existingIndex],
        moodWeather: mood,
      };
      setEntries(updated);
    } else {
      const newEntry: GratitudeEntry = {
        id: `mood-${Date.now()}`,
        date: todayStr,
        moodWeather: mood,
        text: 'เช็คอินสภาพใจประจำวัน',
        tag: '🌦️ สภาพใจ',
        createdAt: new Date().toISOString(),
      };
      setEntries([newEntry, ...entries]);
    }
  };

  const handleSaveDayEntry = (savedEntry: GratitudeEntry) => {
    const existingIndex = entries.findIndex(
      (e) => e.id === savedEntry.id || (e.date && e.date === savedEntry.date)
    );
    if (existingIndex >= 0) {
      const updated = [...entries];
      updated[existingIndex] = savedEntry;
      setEntries(updated);
    } else {
      setEntries([savedEntry, ...entries]);
    }
    const todayStr = new Date().toISOString().split('T')[0];
    if (savedEntry.date === todayStr) {
      setSelectedMood(savedEntry.moodWeather);
    }
  };

  const primaryChips = [
    t('chip1'),
    t('chip2'),
    t('chip3'),
    t('chip4'),
    t('chip5'),
  ];

  return (
    <div className="today-screen">
      {/* 1. Hero Headline & Dominant CTA */}
      <div className="today-hero-clean">
        <h1 className="today-headline">{t('todayGreeting')}</h1>
        <p className="today-subtext">{t('todaySub')}</p>

        <button
          className="btn-hero-cta"
          onClick={() => onStartChat()}
          aria-label="เริ่มการสนทนา"
        >
          <MessageCircleHeart size={22} />
          <span>{t('heroChatBtn')}</span>
        </button>

        {/* Compact Quick Chips */}
        <div className="quick-chips-row">
          <span className="quick-chips-label">Quick topics:</span>
          {primaryChips.map((chip) => (
            <button
              key={chip}
              type="button"
              className="quick-chip-pill"
              onClick={() => onStartChat(chip)}
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* 2. 🪞 กระจกจำลองผลลัพธ์ (ซ้าย) & 🔍 แว่นส่องใจอีกฝ่าย (ขวา) */}
      <div className="mirror-empathy-duo-grid">
        <ConsequenceMirrorBanner
          onOpenSimulator={() => setIsSimModalOpen(true)}
        />
        <EmpathyLensBanner
          onOpenLens={() => setIsEmpathyModalOpen(true)}
        />
      </div>

      {/* 3. 📚 คลังยาใจ & สื่อบำบัดอารมณ์ (Mindful Library Banner) */}
      <MindfulLibraryBanner
        onOpenLibrary={() => setIsLibraryModalOpen(true)}
      />

      {/* 5. 🎴 Daily Micro-Wisdom Card */}
      <DailyWisdomCard />

      {/* 6. 💖 Founder Community & LINE Feedback Card */}
      <FounderConnectCard />

      {/* 🪞 Empathy Lens Modal */}
      <EmpathyLensModal
        isOpen={isEmpathyModalOpen}
        onClose={() => setIsEmpathyModalOpen(false)}
        onStartChat={onStartChat}
      />

      {/* 📚 Mindful Library Modal */}
      <MindfulLibraryModal
        isOpen={isLibraryModalOpen}
        onClose={() => setIsLibraryModalOpen(false)}
      />

      {/* 🪞 Consequence Simulator Modal */}
      <ConsequenceSimulatorModal
        isOpen={isSimModalOpen}
        onClose={() => setIsSimModalOpen(false)}
        onStartChat={onStartChat}
      />

      {/* ⛅💖 Floating Mood Weather Widget (Floats gracefully directly above the Gratitude Jar) */}
      <FloatingMoodWeather
        selectedMood={selectedMood}
        onClick={() => setIsMoodModalOpen(true)}
      />

      {/* 🎭 Mood Weather & Monthly Calendar Modal */}
      <MoodWeatherModal
        isOpen={isMoodModalOpen}
        onClose={() => setIsMoodModalOpen(false)}
        entries={entries}
        selectedMood={selectedMood}
        onSelectMood={handleSelectTodayMood}
        onSaveDayEntry={handleSaveDayEntry}
        onDeleteDayEntry={handleDeleteEntry}
      />

      {/* 🏺 Floating Gratitude Jar Widget (Floats invitingly on bottom-left) */}
      <FloatingGratitudeJar
        entriesCount={entries.length}
        onClick={() => setIsJarModalOpen(true)}
      />

      {/* 🏺 Gratitude Jar Full Modal */}
      <GratitudeJarModal
        isOpen={isJarModalOpen}
        onClose={() => setIsJarModalOpen(false)}
        entries={entries}
        currentMood={selectedMood}
        onAddEntry={handleAddEntry}
        onDeleteEntry={handleDeleteEntry}
      />
    </div>
  );
};
