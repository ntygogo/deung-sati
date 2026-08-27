import React from 'react';
import { Sparkles, MessageCircle, ExternalLink, Heart } from 'lucide-react';

export const FounderConnectCard: React.FC = () => {
  return (
    <div className="founder-connect-card">
      <div className="founder-card-header">
        <div className="founder-avatar-wrapper">
          <img
            src="/images/nutty_profile.jpg"
            alt="นัตตี้ — NTYGOGO"
            className="founder-avatar-img"
          />
          <span className="founder-status-badge" title="พร้อมรับฟังฟีดแบ็ก">
            <Sparkles size={11} className="text-amber-500" />
          </span>
        </div>

        <div className="founder-header-info">
          <div className="founder-role-tag">
            <Heart size={12} className="text-rose-500" />
            <span>นัตตี้ — NTYGOGO</span>
          </div>
          <h3 className="founder-card-title">แวะมาคุย หรือส่งฟีดแบ็กให้นัตตี้ได้นะ 💬</h3>
          <span className="founder-line-id-pill">LINE: @ntygogo</span>
        </div>
      </div>

      <p className="founder-card-body">
        นัตตี้ตั้งใจสร้างแอปดึงสติขึ้นมาจากหัวใจเพื่อเป็นเพื่อนร่วมทางของคุณ... 
        ถ้าลองใช้แล้วรู้สึกยังไง มีข้อเสนอแนะ ติชม หรืออยากทักมาเล่าความรู้สึก ทัก LINE มาคุยกับนัตตี้ได้เลยนะคะ 🌿✨
      </p>

      <div className="founder-card-footer">
        <a
          href="https://lin.ee/snQhce5"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-line-founder"
        >
          <MessageCircle size={17} />
          <span>แอด LINE ทักแชตนัตตี้ (@ntygogo)</span>
          <ExternalLink size={14} className="opacity-75" />
        </a>
      </div>
    </div>
  );
};
