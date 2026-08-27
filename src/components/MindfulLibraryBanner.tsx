import React from 'react';
import { BookOpen, Sparkles, ChevronRight } from 'lucide-react';

interface MindfulLibraryBannerProps {
  onOpenLibrary: () => void;
}

export const MindfulLibraryBanner: React.FC<MindfulLibraryBannerProps> = ({ onOpenLibrary }) => {
  return (
    <div className="mindful-library-banner" onClick={onOpenLibrary}>
      <div className="library-banner-left">
        <div className="library-banner-icon-box">
          <BookOpen size={22} className="text-amber-600" />
        </div>
        <div className="library-banner-text">
          <div className="library-banner-tag">
            <Sparkles size={12} />
            <span>ยาใจตามสภาวะอารมณ์</span>
          </div>
          <h3 className="library-banner-title">📚 คลังยาใจ: หนังสือ & พอดแคสต์</h3>
          <p className="library-banner-sub">
            เลือกอ่านหนังสือภาพฮีลใจ หรือฟังพอดแคสต์สั้นๆ ปรับตามอารมณ์ของคุณ
          </p>
        </div>
      </div>

      <div className="library-banner-right">
        <button type="button" className="btn-open-library" tabIndex={-1}>
          <span>เปิดดู</span>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};
