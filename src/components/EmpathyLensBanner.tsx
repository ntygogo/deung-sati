import React from 'react';
import { Sparkles, ChevronRight } from 'lucide-react';

interface EmpathyLensBannerProps {
  onOpenLens: () => void;
}

export const EmpathyLensBanner: React.FC<EmpathyLensBannerProps> = ({ onOpenLens }) => {
  return (
    <div
      className="empathy-lens-banner"
      onClick={onOpenLens}
      role="button"
      tabIndex={0}
      aria-label="เปิดแว่นส่องใจอีกฝ่าย ถอดรหัสความสัมพันธ์"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onOpenLens();
        }
      }}
    >
      {/* Top Full Illustrated Hero Banner (Pastel Blue & Pink Couple Hugging) */}
      <div className="duo-card-banner">
        <img
          src="/images/couple_empathy.svg"
          alt="ถอดรหัสจิตวิทยาความสัมพันธ์"
          className="duo-card-img"
          loading="lazy"
        />
        <span className="duo-badge-floating empathy">
          <Sparkles size={11} />
          <span>ความสัมพันธ์</span>
        </span>
      </div>

      <div className="empathy-banner-text">
        <h3 className="empathy-banner-title">แว่นส่องใจอีกฝ่าย</h3>
        <p className="empathy-banner-sub">
          ทำไมเขาถึงทำแบบนั้น? ถอดรหัสใจเขาเพื่อจัดการใจเรา & ได้คำพูดที่ฉลาด
        </p>
      </div>

      <div className="empathy-banner-right">
        <button type="button" className="btn-open-empathy" tabIndex={-1}>
          <span>ส่องใจ</span>
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};
