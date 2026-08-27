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
import { GratitudePaperNoteModal } from './GratitudePaperNoteModal';

interface GratitudeJarModalProps {
  isOpen: boolean;
  onClose: () => void;
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

export const GratitudeJarModal: React.FC<GratitudeJarModalProps> = ({
  isOpen,
  onClose,
  entries = [],
  currentMood = 'partly_cloudy',
  onAddEntry,
  onDeleteEntry,
}) => {
  if (!isOpen) return null;

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

  const handlePickAnother = () => {
    if (safeEntries.length <= 1) return;
    let nextIndex = Math.floor(Math.random() * safeEntries.length);
    if (randomMemory && safeEntries[nextIndex]?.id === randomMemory.id) {
      nextIndex = (nextIndex + 1) % safeEntries.length;
    }
    setRandomMemory(safeEntries[nextIndex]);
  };

  return (
    <>
      <div className="jar-modal-overlay" onClick={onClose}>
        <div className="jar-modal-card" onClick={(e) => e.stopPropagation()}>
          {/* Modal Header */}
          <div className="jar-modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="jar-badge-icon">
                <span>🏺</span>
              </div>
              <div>
                <h3 className="jar-modal-title">ขวดโหลขอบคุณ & เก็บความสุข</h3>
                <p className="jar-modal-sub">บันทึก 1 สิ่งดีๆ ให้ใจได้พักและสะสมไว้ในโหล</p>
              </div>
            </div>
            <button type="button" className="btn-close-modal" onClick={onClose}>
              <X size={18} />
            </button>
          </div>

          {/* Visual Glass Jar & Floating Star Shelf */}
          <div className={`visual-jar-shelf modal-jar-shelf ${jarGlow ? 'jar-active-glow' : ''}`}>
            {/* Flying Star Drop Effect Animation */}
            {showStarFly && (
              <div className="flying-star-animation">
                <span className="flying-star-item">⭐</span>
                <span className="flying-star-sparkles">✨</span>
              </div>
            )}

            <div className="glass-jar-display">
              <div className="jar-mouth" />
              <div className="jar-body-glass">
                <div className="jar-stars-inside">
                  {Array.from({ length: Math.min(safeEntries.length, 20) }).map((_, i) => (
                    <span
                      key={i}
                      className="floating-jar-star"
                      style={{
                        animationDelay: `${(i * 0.22) % 2.5}s`,
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
                className="btn-jar-pill primary btn-pick-paper-note"
                onClick={handlePickRandom}
                disabled={safeEntries.length === 0}
              >
                <BookOpen size={14} />
                <span>📜 สุ่มคลี่อ่าน 1 แผ่นกระดาษ</span>
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

          {/* Input Box & Inspiration Chips */}
          <div className="gratitude-input-container">
            <span className="gratitude-input-prompt">✨ วันนี้มี 1 สิ่งดีๆ อะไรที่อยากขอบคุณหรือทำให้รู้สึกดี?</span>

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
                placeholder="ขอบคุณที่วันนี้ได้... หรือมี..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={isDropping}
                autoFocus
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

          {/* History List */}
          {showHistory && (
            <div className="gratitude-history-list" style={{ maxHeight: '180px', overflowY: 'auto' }}>
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
      </div>

      {/* Realistic Paper Note Modal Popup */}
      <GratitudePaperNoteModal
        isOpen={Boolean(randomMemory)}
        entry={randomMemory}
        totalEntries={safeEntries.length}
        onClose={() => setRandomMemory(null)}
        onPickAnother={handlePickAnother}
      />
    </>
  );
};
