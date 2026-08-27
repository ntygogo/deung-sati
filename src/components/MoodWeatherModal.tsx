import React from 'react';
import type { MoodWeather, GratitudeEntry } from '../types';
import {
  X,
  Sparkles,
} from 'lucide-react';
import { WeatherCalendarView } from './WeatherCalendarView';
import { MOOD_WEATHER_OPTIONS } from '../constants/moodOptions';

interface MoodWeatherModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries?: GratitudeEntry[];
  selectedMood: MoodWeather;
  onSelectMood: (mood: MoodWeather) => void;
  onSelectDayEntry?: (entry: GratitudeEntry) => void;
}

export const MoodWeatherModal: React.FC<MoodWeatherModalProps> = ({
  isOpen,
  onClose,
  entries = [],
  selectedMood = 'partly_cloudy',
  onSelectMood,
  onSelectDayEntry,
}) => {
  if (!isOpen) return null;

  const safeEntries = Array.isArray(entries) ? entries : [];
  const currentOption = MOOD_WEATHER_OPTIONS.find((m) => m.id === selectedMood);

  return (
    <div className="jar-modal-overlay" onClick={onClose}>
      <div className="jar-modal-card mood-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="jar-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="mood-modal-badge-icon">
              <span>🌦️</span>
            </div>
            <div>
              <h3 className="jar-modal-title">สภาพจิตใจ & พยากรณ์ใจรายเดือน</h3>
              <p className="jar-modal-sub">แตะเลือกอารมณ์ของคุณวันนี้เพื่อบันทึกลงปฏิทิน</p>
            </div>
          </div>
          <button type="button" className="btn-close-modal" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* 4 Expressive Emoticons Grid */}
        <div className="mood-modal-selection-section">
          <span className="mood-modal-prompt-label">
            🎭 สภาพใจของคุณตอนนี้ตรงกับข้อไหนมากที่สุด?
          </span>

          <div className="mood-modal-grid">
            {MOOD_WEATHER_OPTIONS.map((opt) => {
              const isSelected = selectedMood === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  className={`mood-modal-btn ${isSelected ? 'active' : ''}`}
                  onClick={() => onSelectMood(opt.id)}
                  style={{
                    borderColor: isSelected ? opt.color : undefined,
                    backgroundColor: isSelected ? opt.bg : undefined,
                  }}
                >
                  <span className="mood-modal-emoticon">{opt.emoticon}</span>
                  <div className="mood-modal-btn-text">
                    <span className="mood-modal-btn-label">{opt.label}</span>
                    <span className="mood-modal-btn-sub">{opt.subtitle}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {currentOption && (
            <div className="mood-modal-active-toast">
              <Sparkles size={14} style={{ color: currentOption.color }} />
              <span>
                บันทึกวันนี้เป็น <strong>{currentOption.emoticon} {currentOption.label}</strong> ({currentOption.subtitle}) เรียบร้อยแล้ว!
              </span>
            </div>
          )}
        </div>

        {/* Weather Calendar & Playful Personality Report */}
        <div className="mood-modal-calendar-section">
          <WeatherCalendarView
            entries={safeEntries}
            onSelectEntry={onSelectDayEntry}
          />
        </div>
      </div>
    </div>
  );
};
