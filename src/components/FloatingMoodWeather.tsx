import React from 'react';
import type { MoodWeather } from '../types';
import { MOOD_WEATHER_OPTIONS } from '../constants/moodOptions';
import { Cloud, Heart } from 'lucide-react';

interface FloatingMoodWeatherProps {
  selectedMood: MoodWeather;
  onClick: () => void;
}

export const FloatingMoodWeather: React.FC<FloatingMoodWeatherProps> = ({
  selectedMood,
  onClick,
}) => {
  const currentMoodConfig =
    MOOD_WEATHER_OPTIONS.find((m) => m.id === selectedMood) ||
    MOOD_WEATHER_OPTIONS[1];

  return (
    <button
      type="button"
      className="floating-mood-widget"
      onClick={onClick}
      aria-label="ดูและเช็คสภาพจิตใจ"
      title="สภาพจิตใจ (แตะเพื่อเช็คใจ & ดูปฏิทิน)"
    >
      {/* Floating Cloud + Heart Orb */}
      <div className="floating-mood-orb">
        <div className="cloud-heart-icon-group">
          <Cloud size={22} className="cloud-base-icon" />
          <Heart size={13} className="heart-badge-icon fill-current" />
        </div>

        {/* Current Mood Emoticon Badge */}
        <span className="floating-mood-active-badge">
          {currentMoodConfig.emoticon.split(' ')[0]}
        </span>
      </div>

      <div className="floating-mood-caption">
        <span className="floating-mood-text">สภาพจิตใจ</span>
        <span className="floating-mood-sub" style={{ color: currentMoodConfig.color }}>
          {currentMoodConfig.label}
        </span>
      </div>
    </button>
  );
};
