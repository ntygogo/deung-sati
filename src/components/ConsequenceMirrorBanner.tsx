import React from 'react';
import { ChevronRight, Flame } from 'lucide-react';

interface ConsequenceMirrorBannerProps {
  onOpenSimulator: () => void;
}

export const ConsequenceMirrorBanner: React.FC<ConsequenceMirrorBannerProps> = ({
  onOpenSimulator,
}) => {
  return (
    <button
      type="button"
      className="mirror-devil-banner"
      onClick={onOpenSimulator}
      aria-label="เปิดกระจกจำลองผลลัพธ์ Worst-Case"
    >
      {/* Top Full Illustrated Hero Banner (Clean Pastel Magic Mirror & Friendly Spirit) */}
      <div className="duo-card-banner">
        <img
          src="/images/mirror_empathy_style.svg"
          alt="กระจกจำลองผลลัพธ์"
          className="duo-card-img"
          loading="lazy"
        />
        <span className="duo-badge-floating worst-case">
          <Flame size={11} />
          <span>Worst-Case</span>
        </span>
      </div>

      {/* Text & Content */}
      <div className="mirror-banner-content">
        <h3 className="mirror-banner-title">กระจกจำลองผลลัพธ์</h3>
        <p className="mirror-banner-sub">
          จะวีน? จะเท? จะตัดสินใจชั่ววูบ? แวะส่องผลลัพธ์ <strong>10 นาที / 10 วัน / 10 เดือน</strong> ก่อนนะ!
        </p>
      </div>

      {/* Action Button */}
      <div className="mirror-banner-action">
        <span className="mirror-action-pill">
          <span>ส่องกระจก</span>
          <ChevronRight size={14} />
        </span>
      </div>
    </button>
  );
};
