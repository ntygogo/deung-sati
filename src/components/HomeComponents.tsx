import React, { useState } from 'react';

/* -------------------------------------------------------------------------- */
/* 1. Nibbana Baby World (Sacred Nature Sanctuary)                           */
/* -------------------------------------------------------------------------- */
export const NibbanaWorld: React.FC = () => {
  return (
    <div className="nibbanaWorldCard">
      <div className="worldAtmosphere">
        <div className="worldSunHalo" />
        <div className="worldSparkleCluster">
          <span className="sparkleStar star1">✦</span>
          <span className="sparkleStar star2">✨</span>
          <span className="sparkleStar star3">✦</span>
        </div>
      </div>

      <div className="worldBannerFrame">
        <img
          src="/images/deung_sati_hero_banner.png"
          alt="Deung Sati • นิพพานเบบี้ โลกเล็กๆ อยู่ตรงนี้นะ"
          className="worldBannerImg"
        />
        <div className="worldGlassOverlay" />
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* 2. Quick Chat Card (Primary Chat Entry — V1 SSOT)                          */
/* -------------------------------------------------------------------------- */
export const QuickChatCard: React.FC<{
  onStartChat: (text: string) => void;
  onOpenChat: () => void;
}> = ({ onStartChat, onOpenChat }) => {
  const [inputVal, setInputVal] = useState('');

  const QUICK_INTENTS = [
    { label: 'อยากระบาย', prompt: 'อยากระบายเรื่องที่เจอมาวันนี้หน่อย' },
    { label: 'คิดวน', prompt: 'ตอนนี้คิดวนเรื่องเดิมไม่หยุดเลย' },
    { label: 'ไม่รู้จะทำยังไง', prompt: 'มีเรื่องกวนใจและยังไม่รู้จะทำยังไงดี' },
    { label: 'อยากเข้าใจตัวเอง', prompt: 'อยากเข้าใจตัวเองว่าทำไมถึงรู้สึกแบบนี้' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputVal.trim()) {
      onStartChat(inputVal.trim());
      setInputVal('');
    } else {
      onOpenChat();
    }
  };

  return (
    <div className="homeQuickChatCard">
      <div className="quickChatHeader">
        <div className="quickChatTitleRow">
          <span className="quickChatIcon">💬</span>
          <div>
            <h3 className="quickChatHeading">วันนี้มีอะไรอยู่ในใจ? 🌱</h3>
            <p className="quickChatSubheading">เราพร้อมรับฟัง เล่าให้เราฟังได้เลยนะ...</p>
          </div>
        </div>
      </div>

      <form className="quickChatComposer" onSubmit={handleSubmit}>
        <input
          type="text"
          className="quickChatInput"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder="เล่าให้เราฟัง..."
          aria-label="พิมพ์ข้อความเล่าเรื่องในใจ"
        />
        <button
          type="submit"
          className="quickChatSendBtn"
          title="ส่งข้อความเริ่มคุยทันที"
          aria-label="ส่งข้อความ"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m3 11 17-7-7 17-2.5-7.5L3 11Z" />
          </svg>
        </button>
      </form>

      {/* Quick Intent Chips (V1 SSOT) */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
        {QUICK_INTENTS.map((qi, idx) => (
          <button
            key={idx}
            type="button"
            style={{
              background: '#F7F4EB',
              border: '1px solid #E5DACB',
              borderRadius: '999px',
              padding: '4px 10px',
              fontSize: '11.5px',
              color: '#5C4738',
              cursor: 'pointer',
            }}
            onClick={() => onStartChat(qi.prompt)}
          >
            {qi.label}
          </button>
        ))}
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* 3. Soothing Emergency Pause Card (Gentle, Supportive, Non-Aggressive)      */
/* -------------------------------------------------------------------------- */
export const EmergencyPauseCard: React.FC<{
  onTriggerEmergency: () => void;
}> = ({ onTriggerEmergency }) => {
  return (
    <button
      type="button"
      className="peacefulPauseCard"
      onClick={onTriggerEmergency}
      aria-label="หยุดพักใจฉุกเฉิน ฝึกหายใจและฟังเสียงขันธิเบต"
    >
      <div className="pauseBowlIconWrap">
        <span className="pauseBowlEmoji">🔔</span>
        <div className="pauseSoundRipple" />
      </div>
      <div className="pauseTextColumn">
        <span className="pauseTopBadge">เบรกฉุกเฉิน</span>
        <strong className="pauseMainHeadline">หยุดพักใจ 1 นาที</strong>
        <p className="pauseHelperDesc">หายใจลึกๆ • ฟังเสียงขันธิเบต • คืนความนิ่ง</p>
      </div>
      <div className="pauseActionPill">
        <span>เริ่ม</span>
        <span className="pauseArrowRight">›</span>
      </div>
    </button>
  );
};

/* -------------------------------------------------------------------------- */
/* 4. Quick Tool Card for 2x2 Grid                                            */
/* -------------------------------------------------------------------------- */
export const QuickToolCard: React.FC<{
  icon: string;
  title: string;
  subtitle: string;
  onClick: () => void;
}> = ({ icon, title, subtitle, onClick }) => {
  return (
    <button type="button" className="toolCard" onClick={onClick}>
      <span className="toolIcon">{icon}</span>
      <div className="toolText">
        <h4>{title}</h4>
        <p>{subtitle}</p>
      </div>
    </button>
  );
};

/* -------------------------------------------------------------------------- */
/* 5. Future Self Card                                                        */
/* -------------------------------------------------------------------------- */
export const FutureSelfCard: React.FC<{
  trait: string;
  evidence: string;
  onClick: () => void;
}> = ({ trait, evidence, onClick }) => {
  return (
    <button type="button" className="futureSelfWellnessCard" onClick={onClick}>
      <div className="futureSelfIcon">🌱</div>
      <div className="futureSelfText">
        <span className="futureSelfLabel">ตัวฉันในอนาคต</span>
        <strong className="futureSelfTrait">{trait}</strong>
        <span className="futureSelfEvidence">หลักฐาน: {evidence}</span>
      </div>
      <span className="futureSelfArrow">›</span>
    </button>
  );
};

/* -------------------------------------------------------------------------- */
/* 6. Growth Reflection Card                                                  */
/* -------------------------------------------------------------------------- */
export const GrowthReflectionCard: React.FC<{
  topic: string;
  percent: number;
  onClick: () => void;
}> = ({ topic, percent, onClick }) => {
  return (
    <button type="button" className="growthReflectionCard" onClick={onClick}>
      <div className="growthBabyAvatar">
        <img
          src="/images/nibbana_baby_dark.jpg"
          alt="Nibbana Baby"
          className="growthBabyImg"
        />
      </div>
      <div className="growthContent">
        <span className="growthHeaderLabel">เส้นทางการรู้ทันตนเอง</span>
        <strong className="growthFocusTopic">{topic}</strong>
        <div className="growthProgressBar">
          <div
            className="growthProgressFill"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
      <span className="growthPercentage">{percent}%</span>
    </button>
  );
};
