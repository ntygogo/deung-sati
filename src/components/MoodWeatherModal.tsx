import React, { useState } from 'react';
import type { MoodWeather, GratitudeEntry } from '../types';
import {
  X,
  Edit2,
} from 'lucide-react';
import { WeatherCalendarView } from './WeatherCalendarView';
import { MOOD_WEATHER_OPTIONS } from '../constants/moodOptions';

interface MoodWeatherModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries?: GratitudeEntry[];
  selectedMood: MoodWeather;
  onSelectMood: (mood: MoodWeather) => void;
  onSaveDayEntry?: (entry: GratitudeEntry) => void;
  onDeleteDayEntry?: (id: string) => void;
  onSelectDayEntry?: (entry: GratitudeEntry) => void;
}

export const MoodWeatherModal: React.FC<MoodWeatherModalProps> = ({
  isOpen,
  onClose,
  entries = [],
  selectedMood = 'partly_cloudy',
  onSelectMood,
  onSaveDayEntry,
  onDeleteDayEntry,
  onSelectDayEntry,
}) => {
  if (!isOpen) return null;

  const safeEntries = Array.isArray(entries) ? entries : [];
  const currentOption = MOOD_WEATHER_OPTIONS.find((m) => m.id === selectedMood) || MOOD_WEATHER_OPTIONS[1];
  const [triggerTodayPicker, setTriggerTodayPicker] = useState<boolean>(false);

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="jar-modal-overlay" onClick={onClose}>
      <div className="jar-modal-card mood-modal-card-clean" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="jar-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="mood-modal-badge-icon">
              <span>🌦️</span>
            </div>
            <div>
              <h3 className="jar-modal-title">สภาพใจ &amp; พยากรณ์อารมณ์</h3>
              <p className="jar-modal-sub">บันทึกความรู้สึกและติดตามสภาพใจรายเดือน</p>
            </div>
          </div>
          <button type="button" className="btn-close-modal" onClick={onClose} aria-label="ปิด">
            <X size={18} />
          </button>
        </div>

        {/* Compact Today's Status Banner (Clean & Non-cluttered) */}
        <div className="mood-today-compact-banner">
          <div className="today-mood-left">
            <span className="today-tag-pill">วันนี้</span>
            <div className="today-mood-indicator">
              <span className="today-mood-emo">{currentOption.emoticon}</span>
              <div className="today-mood-text-group">
                <span className="today-mood-name">{currentOption.label}</span>
                <span className="today-mood-desc">{currentOption.subtitle}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn-quick-log-today"
            onClick={() => setTriggerTodayPicker(true)}
          >
            <Edit2 size={13} />
            <span>เปลี่ยน / บันทึก</span>
          </button>
        </div>

        {/* Weather Calendar & Interactive Day Popups */}
        <div className="mood-modal-calendar-section">
          <WeatherCalendarView
            entries={safeEntries}
            onSaveEntry={(entry) => {
              if (onSaveDayEntry) onSaveDayEntry(entry);
              if (entry.date === todayStr) {
                onSelectMood(entry.moodWeather);
              }
            }}
            onDeleteEntry={onDeleteDayEntry}
            onSelectEntry={onSelectDayEntry}
            openForDateStr={triggerTodayPicker ? todayStr : undefined}
            onClosePicker={() => setTriggerTodayPicker(false)}
          />
        </div>
      </div>
    </div>
  );
};
