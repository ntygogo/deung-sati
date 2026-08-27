import React, { useState } from 'react';
import type { GratitudeEntry, MoodWeather } from '../types';
import {
  Sparkles,
  Send,
  BookOpen,
  X,
  History,
  Trash2,
} from 'lucide-react';

interface GratitudeJarProps {
  entries?: GratitudeEntry[];
  currentMood?: MoodWeather;
  onAddEntry: (entry: GratitudeEntry) => void;
  onDeleteEntry: (id: string) => void;
}

const INSPIRATION_TAGS = [
  '☕ กาแฟ/ของกิน',
  '🛏️ เตียงนุ่มๆ',
  '🐱 สัตว์เลี้ยง',
  '🎧 เพลงโปรด',
  '💛 ขอบคุณตัวเอง',
  '🌿 ลมเย็นสบาย',
];

export const GratitudeJar: React.FC<GratitudeJarProps> = ({
  entries = [],
  currentMood = 'partly_cloudy',
  onAddEntry,
  onDeleteEntry,
}) => {
  const safeEntries = Array.isArray(entries) ? entries : [];
  const [inputText, setInputText] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string | undefined>();
  const [isDropping, setIsDropping] = useState<boolean>(false);
  const [showStarFly, setShowStarFly] = useState<boolean>(false);
  const [jarGlow, setJarGlow] = useState<boolean>(false);
  const [showSuccessToast, setShowSuccessToast] = useState<boolean>(false);
  const [randomMemory, setRandomMemory] = useState<GratitudeEntry | null>(null);
  const [showHistory, setShowHistory] = useState<boolean>(false);

  const handleSaveEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isDropping) return;

    setIsDropping(true);
    setShowStarFly(true);

    // Trigger visual star drop into the jar
    setTimeout(() => {
      setJarGlow(true);
      const newEntry: GratitudeEntry = {
        id: `gratitude-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        moodWeather: currentMood,
        text: inputText.trim(),
        tag: selectedTag,
        createdAt: new Date().toISOString(),
      };

      onAddEntry(newEntry);
      setInputText('');
      setSelectedTag(undefined);
      setIsDropping(false);
      setShowSuccessToast(true);

      setTimeout(() => {
        setShowStarFly(false);
        setJarGlow(false);
      }, 500);

      setTimeout(() => setShowSuccessToast(false), 3000);
    }, 650);
  };

  const handlePickRandom = () => {
    if (safeEntries.length === 0) return;
    const randomIndex = Math.floor(Math.random() * safeEntries.length);
    setRandomMemory(safeEntries[randomIndex]);
  };

  return (
    <div className="gratitude-standalone-card">
      {/* Header */}
      <div className="gratitude-card-header">
        <div className="gratitude-header-title-row">
          <div className="jar-badge-icon">
            <span>🏺</span>
          </div>
          <div>
            <h3 className="gratitude-card-title">ขวดโหลขอบคุณ & ความสุขประจำวัน</h3>
            <p className="gratitude-card-sub">แม้เรื่องเล็กๆ แค่ 1 สิ่ง ก็มีพลังช่วยให้ใจเบาลงได้</p>
          </div>
        </div>
      </div>

      {/* Floating Star Animation Element */}
      {showStarFly && (
        <div className="flying-star-animation">
          <span className="flying-star-item">⭐</span>
          <span className="flying-star-sparkles">✨</span>
        </div>
      )}

      {/* Input Box & Inspiration Chips */}
      <div className="gratitude-input-container">
        {/* Inspiration Tags */}
        <div className="inspiration-chips-row">
          {INSPIRATION_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              className={`tag-pill ${selectedTag === tag ? 'active' : ''}`}
              onClick={() => setSelectedTag(selectedTag === tag ? undefined : tag)}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSaveEntry} className="gratitude-form-clean">
          <input
            type="text"
            className="gratitude-main-input"
            placeholder="พิมพ์ 1 สิ่งที่อยากขอบคุณ หรือทำให้รู้สึกดีวันนี้..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isDropping}
          />
          <button
            type="submit"
            className={`btn-primary btn-drop-effect ${isDropping ? 'dropping' : ''}`}
            disabled={!inputText.trim() || isDropping}
          >
            <Send size={15} />
            <span>หย่อนลงโหล ✨</span>
          </button>
        </form>

        {showSuccessToast && (
          <div className="gratitude-success-toast">
            <Sparkles size={14} className="text-primary" />
            <span>หย่อนความสุข 1 ดวงดาวลงในขวดโหลเรียบร้อยแล้ว ✨</span>
          </div>
        )}
      </div>

      {/* Visual Glass Jar & Action Row */}
      <div className={`visual-jar-shelf ${jarGlow ? 'jar-active-glow' : ''}`}>
        <div className="glass-jar-display">
          <div className="jar-mouth" />
          <div className="jar-body-glass">
            <div className="jar-stars-inside">
              {Array.from({ length: Math.min(safeEntries.length, 18) }).map((_, i) => (
                <span
                  key={i}
                  className="floating-jar-star"
                  style={{
                    animationDelay: `${(i * 0.25) % 2.5}s`,
                    fontSize: i % 2 === 0 ? '1.1rem' : '0.85rem',
                  }}
                >
                  ⭐
                </span>
              ))}
            </div>
            <div className="jar-label-tag">
              <span>🏺 ในโหลมี <strong>{safeEntries.length}</strong> ความสุข</span>
            </div>
          </div>
        </div>

        <div className="jar-shelf-actions">
          <button
            type="button"
            className="btn-jar-pill primary"
            onClick={handlePickRandom}
            disabled={safeEntries.length === 0}
          >
            <BookOpen size={13} />
            <span>สุ่มหยิบ 1 ความสุขเดิม</span>
          </button>

          <button
            type="button"
            className="btn-jar-pill"
            onClick={() => setShowHistory(!showHistory)}
          >
            <History size={13} />
            <span>{showHistory ? 'ซ่อนประวัติ' : 'ดูทั้งหมด'}</span>
          </button>
        </div>
      </div>

      {/* Random Memory Drawer Modal/Popup */}
      {randomMemory && (
        <div className="random-memory-popup">
          <div className="memory-popup-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={16} className="text-primary" />
              <span className="memory-title">ความสุขที่คุณเคยเก็บไว้</span>
            </div>
            <button
              type="button"
              className="btn-close-memory"
              onClick={() => setRandomMemory(null)}
            >
              <X size={16} />
            </button>
          </div>

          <div className="memory-body">
            <p className="memory-text">“{randomMemory.text}”</p>
            <div className="memory-meta">
              {randomMemory.tag && <span className="memory-tag">{randomMemory.tag}</span>}
              <span className="memory-date">
                {new Date(randomMemory.createdAt || randomMemory.date).toLocaleDateString('th-TH', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* History List */}
      {showHistory && (
        <div className="gratitude-history-list">
          <span className="history-list-title">📜 ประวัติความสุขที่บันทึกไว้:</span>
          {safeEntries.length === 0 ? (
            <p className="empty-history-text">ยังไม่มีรายการบันทึก</p>
          ) : (
            safeEntries.map((item) => (
              <div key={item.id} className="history-item">
                <div className="history-item-left">
                  <span className="history-item-date">
                    {new Date(item.createdAt || item.date).toLocaleDateString('th-TH', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                  <span className="history-item-text">{item.text}</span>
                </div>
                <button
                  type="button"
                  className="btn-delete-entry"
                  onClick={() => onDeleteEntry(item.id)}
                  title="ลบรายการนี้"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
