import React, { useState } from 'react';
import type { GratitudeEntry } from '../types';
import {
  Sparkles,
  X,
  Shuffle,
  Calendar,
  Heart,
} from 'lucide-react';
import { MOOD_WEATHER_OPTIONS } from '../constants/moodOptions';

interface GratitudePaperNoteModalProps {
  isOpen: boolean;
  entry: GratitudeEntry | null;
  totalEntries: number;
  onClose: () => void;
  onPickAnother: () => void;
}

export const GratitudePaperNoteModal: React.FC<GratitudePaperNoteModalProps> = ({
  isOpen,
  entry,
  totalEntries,
  onClose,
  onPickAnother,
}) => {
  const [isFlipping, setIsFlipping] = useState<boolean>(false);

  if (!isOpen || !entry) return null;

  const moodConfig = MOOD_WEATHER_OPTIONS.find((m) => m.id === entry.moodWeather);

  const handlePickNext = () => {
    setIsFlipping(true);
    setTimeout(() => {
      onPickAnother();
      setIsFlipping(false);
    }, 280);
  };

  return (
    <div className="paper-modal-overlay" onClick={onClose}>
      <div className="paper-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Unfolded Realistic Paper Note */}
        <div className={`realistic-paper-note ${isFlipping ? 'paper-flipping' : ''}`}>
          {/* Washi Tape / Top Pin */}
          <div className="paper-washi-tape">
            <span>✨ ข้อความจากโหลความสุข</span>
          </div>

          {/* Close Button on top right of paper */}
          <button type="button" className="btn-close-paper" onClick={onClose} title="เก็บใส่โหล">
            <X size={18} />
          </button>

          {/* Paper Content */}
          <div className="paper-inner-body">
            {/* Tag badge & Mood stamp */}
            <div className="paper-header-stamps">
              {entry.tag ? (
                <span className="paper-tag-stamp">{entry.tag}</span>
              ) : (
                <span className="paper-tag-stamp">💛 ความสุขเล็กๆ</span>
              )}

              {moodConfig && (
                <span
                  className="paper-mood-stamp"
                  style={{ color: moodConfig.color, borderColor: moodConfig.color }}
                  title={moodConfig.label}
                >
                  {moodConfig.emoticon} {moodConfig.label}
                </span>
              )}
            </div>

            {/* The Main Handwritten Memory Text */}
            <div className="paper-text-box">
              <span className="paper-quote-mark open">“</span>
              <p className="paper-handwritten-text">{entry.text}</p>
              <span className="paper-quote-mark close">”</span>
            </div>

            {/* Footer timestamp */}
            <div className="paper-footer-meta">
              <div className="paper-date-stamp">
                <Calendar size={13} />
                <span>
                  บันทึกไว้เมื่อ{' '}
                  {new Date(entry.createdAt || entry.date).toLocaleDateString('th-TH', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <div className="paper-heart-icon">
                <Heart size={14} className="fill-current text-rose-400" />
              </div>
            </div>
          </div>

          {/* Bottom Fold / Shadow Edge */}
          <div className="paper-bottom-curl" />
        </div>

        {/* Action Controls underneath the paper */}
        <div className="paper-modal-actions">
          {totalEntries > 1 && (
            <button
              type="button"
              className="btn-paper-action shuffle"
              onClick={handlePickNext}
            >
              <Shuffle size={15} />
              <span>สุ่มใบอื่นอีก ({totalEntries} ใบ)</span>
            </button>
          )}

          <button
            type="button"
            className="btn-paper-action close"
            onClick={onClose}
          >
            <Sparkles size={15} />
            <span>เก็บความทรงจำนี้ใส่โหล ✨</span>
          </button>
        </div>
      </div>
    </div>
  );
};
