import React from 'react';
import { Sparkles } from 'lucide-react';

interface FloatingGratitudeJarProps {
  entriesCount: number;
  onClick: () => void;
}

export const FloatingGratitudeJar: React.FC<FloatingGratitudeJarProps> = ({
  entriesCount = 0,
  onClick,
}) => {
  return (
    <button
      type="button"
      className="floating-jar-widget"
      onClick={onClick}
      aria-label="เปิดขวดโหลขอบคุณและความสุข"
      title="แตะเพื่อเปิดขวดโหลเก็บความสุข"
    >
      <div className="floating-jar-orb">
        <div className="floating-jar-icon">
          <span>🏺</span>
        </div>
        <div className="floating-star-indicator">
          <Sparkles size={11} />
        </div>
        {entriesCount > 0 && (
          <span className="floating-count-badge">{entriesCount}</span>
        )}
      </div>

      <div className="floating-jar-caption">
        <span className="floating-jar-text">โหลขอบคุณ</span>
        <span className="floating-jar-sub">เก็บ 1 สิ่งดีๆ ✨</span>
      </div>
    </button>
  );
};
