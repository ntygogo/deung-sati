import React from 'react';
import type { MoodWeather } from '../types';
import { ChevronRight, Sparkles } from 'lucide-react';
import { MOOD_WEATHER_OPTIONS } from '../constants/moodOptions';

interface MoodWeatherCardProps {
  selectedMood: MoodWeather;
  onOpenModal: () => void;
}

export const MoodWeatherCard: React.FC<MoodWeatherCardProps> = ({
  selectedMood = 'partly_cloudy',
  onOpenModal,
}) => {
  const currentOption = MOOD_WEATHER_OPTIONS.find((m) => m.id === selectedMood) || MOOD_WEATHER_OPTIONS[1];

  return (
    <button
      type="button"
      className="mood-banner-card"
      onClick={onOpenModal}
      aria-label="เปิดหน้าเช็คสภาพจิตใจและพยากรณ์ใจสุดปั่น"
    >
      <div className="mood-banner-left">
        {/* Playful Emoticons Cluster / Avatar */}
        <div className="mood-emoticon-cluster">
          <span className="cluster-item item-1">😎✨</span>
          <span className="cluster-item item-2">🫠🧋</span>
          <span className="cluster-item item-3">🥀🪫</span>
          <span className="cluster-item item-4">🌋🧨</span>
        </div>

        {/* Text Section */}
        <div className="mood-banner-text">
          <div className="mood-banner-title-row">
            <h3 className="mood-banner-title">สภาพจิตใจ</h3>
            <span className="mood-banner-badge">
              <Sparkles size={11} />
              <span>พยากรณ์ใจสุดปั่น</span>
            </span>
          </div>

          <p className="mood-banner-sub">
            วันนี้เป็น <strong>{currentOption.emoticon} {currentOption.label}</strong> หรือแบบไหน? แตะเพื่อเช็คอิน
          </p>
        </div>
      </div>

      {/* Right Action Arrow */}
      <div className="mood-banner-action">
        <span className="mood-action-pill">
          <span>เช็คใจ</span>
          <ChevronRight size={14} />
        </span>
      </div>
    </button>
  );
};
