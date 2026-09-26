import React, { useState } from 'react';
import { CompanionRenderer } from './CompanionRenderer';
import type { CompanionData } from '../context/CompanionContext';

/* -------------------------------------------------------------------------- */
/* 1. Natti Emotional Terrarium Hero (38-44dvh, Giant Living Egg Hero)        */
/* -------------------------------------------------------------------------- */
export const EmotionalTerrariumHero: React.FC<{
  companion: CompanionData | null;
  traceCount: number;
  onOpenCompanionRoom: () => void;
  onPetCompanion?: () => void;
}> = ({ companion, traceCount, onOpenCompanionRoom, onPetCompanion }) => {
  // Always fallback to Stage 0 Egg if companion is null or loading
  const stage = companion?.stage ?? 0;
  const progress = Math.min(20, Math.max(0, traceCount ?? 0));
  const isReadyToHatch = progress >= 20 && stage === 0;

  const fallbackDna = {
    primary_pink_shade: 'soft_sakura',
    secondary_color: '#8BD3DD',
    gill_type: 'feathery',
    cheek_feeler_type: 'curled',
    head_light_type: 'lantern',
    head_light_tip: 'warm',
    tail_type: 'swimming',
    body_pattern: 'translucent',
    movement_personality: 'gentle',
    safe_space_theme: 'nebula',
  };

  return (
    <section
      className="nattiTerrariumHero emotional-terrarium-hero"
      data-testid="emotional-terrarium-hero"
      aria-label="Natti Emotional Terrarium"
      style={{
        margin: '6px 14px 10px',
        flexShrink: 0,
        minHeight: '290px',
        height: 'clamp(290px, 42dvh, 360px)',
        borderRadius: '34px',
        position: 'relative',
        overflow: 'hidden',
        background: 'radial-gradient(ellipse at 50% 28%, #2A174E 0%, #151138 58%, #0A081D 100%)',
        border: '1.5px solid rgba(255, 255, 255, 0.24)',
        boxShadow: '0 20px 48px rgba(10, 8, 29, 0.44), inset 0 2px 14px rgba(255, 255, 255, 0.22)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        userSelect: 'none',
      }}
    >
      <style>{`
        @keyframes terrariumAuraBreathe {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50% { opacity: 0.85; transform: scale(1.06); }
        }
        @keyframes orbitSpinSlow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes sporeFloat1 {
          0%, 100% { transform: translate(0, 0) scale(0.9); opacity: 0.35; }
          50% { transform: translate(14px, -18px) scale(1.2); opacity: 0.85; }
        }
        @keyframes sporeFloat2 {
          0%, 100% { transform: translate(0, 0) scale(1.1); opacity: 0.3; }
          50% { transform: translate(-16px, -14px) scale(0.8); opacity: 0.8; }
        }
        @keyframes pulseGlowRing {
          0%, 100% { filter: drop-shadow(0 0 6px rgba(251, 191, 36, 0.5)); }
          50% { filter: drop-shadow(0 0 14px rgba(244, 114, 182, 0.85)); }
        }

        @media (prefers-reduced-motion: reduce) {
          .terrariumAnimated, .orbitRingAnimated, .sporeAnimated {
            animation: none !important;
          }
        }
      `}</style>

      {/* A. ATMOSPHERE: Specular Dome Reflection Arc */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '70px',
          background: 'radial-gradient(ellipse at 50% 0%, rgba(255, 255, 255, 0.36) 0%, rgba(255, 255, 255, 0) 68%)',
          pointerEvents: 'none',
          zIndex: 4,
        }}
      />

      {/* B. ATMOSPHERE: Emotional Terrarium Nebulas (Pearl Pink, Lavender, Amber, Cobalt Depth) */}
      <div
        className="terrariumAnimated"
        style={{
          position: 'absolute',
          top: '12%',
          left: '8%',
          width: '180px',
          height: '180px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(244, 114, 182, 0.32) 0%, transparent 70%)',
          filter: 'blur(28px)',
          animation: 'terrariumAuraBreathe 6s ease-in-out infinite',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />
      <div
        className="terrariumAnimated"
        style={{
          position: 'absolute',
          bottom: '18%',
          right: '8%',
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.28) 0%, transparent 70%)',
          filter: 'blur(30px)',
          animation: 'terrariumAuraBreathe 7.5s ease-in-out infinite alternate',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '38%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '150px',
          height: '150px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(251, 191, 36, 0.22) 0%, transparent 65%)',
          filter: 'blur(22px)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* C. ATMOSPHERE: Floating Bioluminescent Stardust Spores */}
      <div
        className="sporeAnimated"
        style={{
          position: 'absolute',
          top: '20%',
          left: '18%',
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: '#FDE68A',
          boxShadow: '0 0 10px #F59E0B',
          animation: 'sporeFloat1 5s ease-in-out infinite',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />
      <div
        className="sporeAnimated"
        style={{
          position: 'absolute',
          top: '32%',
          right: '20%',
          width: '5px',
          height: '5px',
          borderRadius: '50%',
          background: '#F472B6',
          boxShadow: '0 0 8px #F472B6',
          animation: 'sporeFloat2 6s ease-in-out infinite',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />
      <div
        className="sporeAnimated"
        style={{
          position: 'absolute',
          bottom: '36%',
          left: '24%',
          width: '4px',
          height: '4px',
          borderRadius: '50%',
          background: '#C084FC',
          boxShadow: '0 0 8px #A855F7',
          animation: 'sporeFloat1 7s ease-in-out infinite alternate',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />

      {/* 1. TOP BAR: Sacred Terrarium Header */}
      <div
        style={{
          padding: '12px 16px 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'relative',
          zIndex: 5,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.06em',
              color: '#F472B6',
              background: 'rgba(244, 114, 182, 0.16)',
              padding: '3px 10px',
              borderRadius: '999px',
              border: '1px solid rgba(244, 114, 182, 0.32)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>✦</span>
            <span>โลกเล็ก ๆ ของน้อง</span>
          </span>
        </div>

        {/* Small "เข้าห้องน้อง" button in Hero */}
        <button
          type="button"
          onClick={onOpenCompanionRoom}
          style={{
            background: 'rgba(255, 255, 255, 0.16)',
            border: '1px solid rgba(255, 255, 255, 0.32)',
            borderRadius: '999px',
            padding: '5px 13px',
            fontSize: '12px',
            fontWeight: 700,
            color: '#FFFFFF',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            transition: 'transform 0.15s ease',
          }}
          aria-label="เข้าห้องน้องที่ห้องสหาย"
        >
          <span>เข้าห้องน้อง</span>
          <span style={{ fontSize: '13px', color: '#FDE68A' }}>✦</span>
        </button>
      </div>

      {/* 2. CENTER HERO: Translucent Glass Egg with Living Axolotl Embryo & Energy Orbit */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          zIndex: 3,
        }}
      >
        {/* SVG Sacred Energy Orbit encircling the egg */}
        <svg
          className="orbitRingAnimated"
          width="290"
          height="254"
          viewBox="0 0 290 254"
          style={{
            position: 'absolute',
            pointerEvents: 'none',
            zIndex: 1,
            filter: 'drop-shadow(0 0 10px rgba(251, 191, 36, 0.45))',
          }}
        >
          <defs>
            <linearGradient id="orbitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F472B6" />
              <stop offset="50%" stopColor="#C084FC" />
              <stop offset="100%" stopColor="#FBBF24" />
            </linearGradient>
            <radialGradient id="orbitGlowBack" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(251, 191, 36, 0.25)" />
              <stop offset="70%" stopColor="rgba(244, 114, 182, 0.1)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>

          {/* Soft ambient orbital glow */}
          <ellipse cx="145" cy="127" rx="116" ry="82" fill="url(#orbitGlowBack)" />

          {/* Background Orbit Track (Subtle Translucent Ring) - only shown for Stage 0 Egg */}
          {stage === 0 && (
            <ellipse
              cx="145"
              cy="127"
              rx="110"
              ry="78"
              fill="none"
              stroke="rgba(255, 255, 255, 0.16)"
              strokeWidth="2.5"
              strokeDasharray="4 6"
              transform="rotate(-12 145 127)"
            />
          )}

          {/* Active Glowing Energy Halo Arc (represents 0-20 Traces) */}
          <path
            d="M 35 127 A 110 78 0 1 1 255 127 A 110 78 0 1 1 35 127"
            fill="none"
            stroke="url(#orbitGrad)"
            strokeWidth="3.6"
            strokeLinecap="round"
            strokeDasharray="595"
            strokeDashoffset={595 - (595 * (progress / 20))}
            transform="rotate(-12 145 127)"
            style={{
              transition: 'stroke-dashoffset 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          />

          {/* Orbit Star Node at tip */}
          {progress > 0 && (
            <circle
              cx={145 + 110 * Math.cos((progress / 20) * 2 * Math.PI - Math.PI / 2)}
              cy={127 + 78 * Math.sin((progress / 20) * 2 * Math.PI - Math.PI / 2)}
              r="4.5"
              fill="#FFFFFF"
              filter="drop-shadow(0 0 6px #FBBF24)"
            />
          )}
        </svg>

        {/* Central Living Axolotl Glass Egg (Expanded 18% to 242px) */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <CompanionRenderer
            stage={stage}
            traceCount={progress}
            dna={companion?.dna || fallbackDna}
            source={companion ?? undefined}
            moodState={companion?.mood_state || 'calm'}
            onPet={onPetCompanion}
            size={242}
          />
        </div>
      </div>

      {/* 3. HERO FOOTER: Mindful Progress Integrated Inside Hero */}
      <div
        style={{
          padding: '0 16px 14px',
          textAlign: 'center',
          position: 'relative',
          zIndex: 5,
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255, 255, 255, 0.12)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: isReadyToHatch
              ? '1.5px solid rgba(251, 191, 36, 0.7)'
              : '1px solid rgba(255, 255, 255, 0.22)',
            borderRadius: '999px',
            padding: '5px 14px',
            boxShadow: isReadyToHatch
              ? '0 0 16px rgba(251, 191, 36, 0.4)'
              : '0 4px 14px rgba(0, 0, 0, 0.2)',
          }}
        >
          {/* Energy spark icon */}
          <span style={{ fontSize: '13px' }}>✨</span>

          {/* Sacred Progress Label */}
          <strong
            style={{
              fontSize: '13.5px',
              fontWeight: 800,
              color: '#FFFFFF',
              letterSpacing: '0.01em',
            }}
          >
            {stage === 0
              ? `เรียนรู้แล้ว ${progress} จาก 20 ลูป`
              : (companion?.name || 'สหายสติ')}
          </strong>

          {/* Glowing accent badge (only for hatched levels; cut for egg as requested) */}
          {stage > 0 && (
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#FFFFFF',
                background: 'rgba(244, 114, 182, 0.4)',
                padding: '2px 8px',
                borderRadius: '999px',
              }}
            >
              Lv.{stage}
            </span>
          )}
        </div>

        {/* Subtitle mandated by Founder */}
        <p
          style={{
            margin: '6px 0 0',
            fontSize: '12px',
            color: 'rgba(255, 255, 255, 0.82)',
            letterSpacing: '0.01em',
          }}
        >
          ทุกครั้งที่เธอมองเห็นตัวเอง น้องจะค่อย ๆ เติบโต
        </p>
      </div>
    </section>
  );
};

/* Backwards-compatible alias */
export const NibbanaWorld: React.FC = () => null;

/* -------------------------------------------------------------------------- */
/* 2. Glass Capsule Conversation Bubble (Chat Entry Nesting Under Hero)       */
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
    <div
      className="homeChatCapsule"
      style={{
        margin: '2px 14px 10px',
        background: 'rgba(255, 255, 255, 0.86)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1.5px solid rgba(244, 114, 182, 0.28)',
        borderRadius: '24px',
        padding: '11px 14px',
        boxShadow: '0 6px 20px rgba(20, 19, 43, 0.05)',
        position: 'relative',
        zIndex: 10,
        flexShrink: 0,
      }}
    >
      {/* Header with floating bubble */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '19px' }}>🫧</span>
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: '14.5px',
                color: '#1E1B4B',
                fontWeight: 700,
                letterSpacing: '-0.2px',
              }}
            >
              วันนี้มีอะไรอยู่ในใจ?
            </h3>
            <p
              style={{
                margin: '1px 0 0',
                fontSize: '11.5px',
                color: '#64748B',
              }}
            >
              เล่าให้โลกของน้องฟังได้เลยนะ...
            </p>
          </div>
        </div>
      </div>

      {/* Input Composer Pill */}
      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          alignItems: 'center',
          background: '#FFFFFF',
          border: '1.5px solid rgba(192, 132, 252, 0.35)',
          borderRadius: '999px',
          padding: '4px 6px 4px 14px',
          marginTop: '8px',
          boxShadow: '0 2px 6px rgba(124, 58, 237, 0.05)',
          gap: '8px',
        }}
      >
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder="เล่าเรื่องในใจให้ฟังหน่อย..."
          aria-label="พิมพ์ข้อความเล่าเรื่องในใจ"
          style={{
            flex: 1,
            border: 0,
            outline: 0,
            background: 'transparent',
            fontSize: '13.5px',
            color: '#1E1B4B',
          }}
        />
        <button
          type="submit"
          title="ส่งข้อความเริ่มคุยทันที"
          aria-label="ส่งข้อความ"
          style={{
            width: '36px',
            height: '36px',
            minWidth: '36px',
            borderRadius: '50%',
            border: 0,
            background: 'linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)',
            display: 'grid',
            placeItems: 'center',
            boxShadow: '0 3px 10px rgba(236, 72, 153, 0.35)',
            cursor: 'pointer',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m3 11 17-7-7 17-2.5-7.5L3 11Z" />
          </svg>
        </button>
      </form>

      {/* Quick Intent Chips (Dreamy Lavender & Pearl Pink) */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
        {QUICK_INTENTS.map((qi, idx) => (
          <button
            key={idx}
            type="button"
            style={{
              background: 'rgba(253, 242, 248, 0.88)',
              border: '1px solid rgba(244, 114, 182, 0.35)',
              borderRadius: '999px',
              padding: '4px 11px',
              fontSize: '11.5px',
              fontWeight: 500,
              color: '#831843',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
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
/* 3. Mindful Tools Section (Organic Asymmetrical Orbit of Varied Tools)      */
/* -------------------------------------------------------------------------- */
export const MindfulToolsSection: React.FC<{
  onBeforeSpeak: () => void;
  onPerspective: () => void;
  onAwareness: () => void;
}> = ({ onBeforeSpeak, onPerspective, onAwareness }) => {
  return (
    <div style={{ margin: '4px 14px 14px' }}>
      {/* Category Heading */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', paddingLeft: '4px' }}>
        <span style={{ fontSize: '13px', color: '#7C3AED' }}>✦</span>
        <h3
          style={{
            margin: 0,
            fontSize: '15px',
            fontWeight: 700,
            color: '#1E1B4B',
            letterSpacing: '-0.2px',
          }}
        >
          เครื่องมือช่วยใจ
        </h3>
      </div>

      {/* Asymmetrical 2-Column Row + 1 Full Capsule Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', gap: '10px', marginBottom: '10px' }}>
        
        {/* Tool 1: ก่อนพูด (Fluid Coral-Lavender Droplet Shape) */}
        <button
          type="button"
          onClick={onBeforeSpeak}
          style={{
            borderRadius: '26px 14px 24px 24px',
            border: '1px solid rgba(251, 113, 133, 0.35)',
            background: 'linear-gradient(135deg, rgba(255, 241, 242, 0.92) 0%, rgba(254, 226, 226, 0.85) 100%)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            padding: '13px 14px',
            textAlign: 'left',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(244, 63, 94, 0.06)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {/* Custom Glowing Speech Wave Icon */}
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'rgba(251, 113, 133, 0.16)',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E11D48" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                <path d="M8 9h8" />
                <path d="M8 13h4" />
              </svg>
            </div>
            <span style={{ fontSize: '11px', color: '#FB7185', fontWeight: 700 }}>01</span>
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 700, color: '#1E1B4B' }}>ก่อนพูด</h4>
            <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#64748B' }}>คิดก่อน... เพื่อสัมพันธ์ที่ดี</p>
          </div>
        </button>

        {/* Tool 2: มองอีกมุม (Prismatic Amber-Cobalt Crystal Card) */}
        <button
          type="button"
          onClick={onPerspective}
          style={{
            borderRadius: '14px 26px 24px 24px',
            border: '1px solid rgba(245, 158, 11, 0.32)',
            background: 'linear-gradient(135deg, rgba(254, 243, 199, 0.92) 0%, rgba(237, 233, 254, 0.85) 100%)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            padding: '13px 14px',
            textAlign: 'left',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(245, 158, 11, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {/* Custom Prismatic Lens Icon */}
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'rgba(245, 158, 11, 0.16)',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                <path d="M2 12h20" />
              </svg>
            </div>
            <span style={{ fontSize: '11px', color: '#D97706', fontWeight: 700 }}>02</span>
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 700, color: '#1E1B4B' }}>มองอีกมุม</h4>
            <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#64748B' }}>ปรับเลนส์ความคิด ขยายมุมมอง</p>
          </div>
        </button>
      </div>

      {/* Tool 3: เมื่อรู้สึกรู้ทัน (Full-width Pearl Pink Capsule) */}
      <button
        type="button"
        onClick={onAwareness}
        style={{
          width: '100%',
          borderRadius: '24px',
          border: '1px solid rgba(192, 132, 252, 0.32)',
          background: 'linear-gradient(135deg, rgba(250, 245, 255, 0.94) 0%, rgba(253, 242, 248, 0.94) 100%)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          textAlign: 'left',
          cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(124, 58, 237, 0.05)',
        }}
      >
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(244, 114, 182, 0.2), rgba(168, 85, 247, 0.2))',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9333EA" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v4" />
            <path d="M12 18v4" />
            <path d="M4.93 4.93l2.83 2.83" />
            <path d="M16.24 16.24l2.83 2.83" />
            <path d="M2 12h4" />
            <path d="M18 12h4" />
            <path d="M4.93 19.07l2.83-2.83" />
            <path d="M16.24 7.76l2.83-2.83" />
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <strong style={{ display: 'block', fontSize: '14px', color: '#1E1B4B' }}>เมื่อรู้สึกรู้ทัน</strong>
          <span style={{ fontSize: '11.5px', color: '#64748B' }}>บันทึกและมองเห็นวงจรจิตใจตนเอง</span>
        </div>
        <span style={{ fontSize: '16px', color: '#A855F7', fontWeight: 700 }}>›</span>
      </button>
    </div>
  );
};

/* Backwards-compatible alias for single tool card */
export const QuickToolCard: React.FC<{
  icon: string;
  title: string;
  subtitle: string;
  onClick: () => void;
}> = ({ icon, title, subtitle, onClick }) => {
  return (
    <button type="button" onClick={onClick} style={{ display: 'none' }}>
      {icon} {title} {subtitle}
    </button>
  );
};

/* -------------------------------------------------------------------------- */
/* 4. Soothing Emergency Pause (Compact Amber–Coral Glowing Glass Pill)       */
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
      style={{
        margin: '0 14px 14px',
        width: 'calc(100% - 28px)',
        borderRadius: '22px',
        border: '1px solid rgba(251, 113, 133, 0.32)',
        background: 'linear-gradient(135deg, rgba(255, 241, 242, 0.9) 0%, rgba(254, 243, 199, 0.86) 100%)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        alignItems: 'center',
        gap: '12px',
        padding: '11px 16px',
        textAlign: 'left',
        boxShadow: '0 4px 16px rgba(244, 63, 94, 0.06)',
        userSelect: 'none',
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          background: 'rgba(251, 113, 133, 0.16)',
          display: 'grid',
          placeItems: 'center',
          fontSize: '18px',
        }}
      >
        <span>🔔</span>
      </div>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              fontSize: '10.5px',
              fontWeight: 800,
              color: '#E11D48',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            เบรกฉุกเฉิน
          </span>
          <span style={{ fontSize: '10px', color: '#D97706' }}>•</span>
          <strong style={{ fontSize: '13.5px', color: '#1E1B4B' }}>หยุดพักใจ 1 นาที</strong>
        </div>
        <p style={{ margin: '1px 0 0', fontSize: '11px', color: '#64748B' }}>
          หายใจลึกๆ • ฟังเสียงขันธิเบต • คืนความนิ่ง
        </p>
      </div>
      <div
        style={{
          background: 'linear-gradient(135deg, #FB7185, #F59E0B)',
          color: '#FFFFFF',
          padding: '5px 12px',
          borderRadius: '999px',
          fontSize: '11.5px',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          boxShadow: '0 2px 6px rgba(244, 63, 94, 0.22)',
        }}
      >
        <span>เริ่ม</span>
        <span style={{ fontSize: '12px' }}>›</span>
      </div>
    </button>
  );
};

/* -------------------------------------------------------------------------- */
/* 5. Cosmic Glass Letter from Future Self                                    */
/* -------------------------------------------------------------------------- */
export const FutureSelfCard: React.FC<{
  trait: string;
  evidence: string;
  onClick: () => void;
}> = ({ trait, evidence, onClick }) => {
  return (
    <button
      type="button"
      className="futureSelfCosmicCard"
      onClick={onClick}
      style={{
        margin: '0 14px 20px',
        width: 'calc(100% - 28px)',
        borderRadius: '24px',
        border: '1px solid rgba(192, 132, 252, 0.32)',
        background: 'linear-gradient(135deg, rgba(245, 240, 255, 0.94) 0%, rgba(253, 242, 248, 0.94) 100%)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        textAlign: 'left',
        cursor: 'pointer',
        boxShadow: '0 4px 16px rgba(124, 58, 237, 0.06)',
      }}
    >
      <div
        style={{
          width: '38px',
          height: '38px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(251, 191, 36, 0.2))',
          display: 'grid',
          placeItems: 'center',
          fontSize: '18px',
        }}
      >
        🪐
      </div>
      <div style={{ flex: 1 }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#7C3AED', letterSpacing: '0.02em' }}>
          ก้าวเล็ก ๆ สู่ตัวฉันในอนาคต
        </span>
        <strong style={{ display: 'block', fontSize: '14px', color: '#1E1B4B', marginTop: '1px' }}>
          {trait}
        </strong>
        <span style={{ fontSize: '11px', color: '#64748B' }}>{evidence}</span>
      </div>
      <span style={{ fontSize: '16px', color: '#A855F7' }}>›</span>
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
    <button
      type="button"
      className="growthReflectionCard"
      onClick={onClick}
      style={{
        margin: '0 14px 14px',
        width: 'calc(100% - 28px)',
        borderRadius: '22px',
        border: '1px solid rgba(244, 114, 182, 0.28)',
        background: 'rgba(255, 255, 255, 0.9)',
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        textAlign: 'left',
        cursor: 'pointer',
        boxShadow: '0 4px 16px rgba(244, 114, 182, 0.06)',
      }}
    >
      <div
        style={{
          width: '38px',
          height: '38px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #FCE7F3, #EDE9FE)',
          display: 'grid',
          placeItems: 'center',
          fontSize: '18px',
        }}
      >
        🪞
      </div>
      <div style={{ flex: 1 }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#DB2777' }}>เส้นทางการรู้ทันตนเอง</span>
        <strong style={{ display: 'block', fontSize: '14px', color: '#1E1B4B' }}>{topic}</strong>
        <div
          style={{
            height: '5px',
            background: 'rgba(244, 114, 182, 0.15)',
            borderRadius: '999px',
            marginTop: '6px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${percent}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #F472B6, #8B5CF6)',
              borderRadius: '999px',
            }}
          />
        </div>
      </div>
      <span style={{ fontSize: '13px', fontWeight: 700, color: '#7C3AED' }}>{percent}%</span>
    </button>
  );
};


