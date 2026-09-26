import React, { useState } from 'react';
import { useCompanion } from '../context/CompanionContext';
import { CompanionRenderer } from './CompanionRenderer';
import { TraceConversationActions } from './TraceConversationActions';
import type { Conversation } from '../shared/conversation';
import { LoopReviewCard } from './LoopReviewCard';

interface CompanionRoomProps {
  conversationActions: { history: (trace: any) => Promise<Conversation[]>; resume: (trace: any) => Promise<void>; remove: (trace: any) => Promise<void>; isGuest: boolean };
  onBack: () => void;
  onOpenChat: () => void;
}

export const CompanionRoom: React.FC<CompanionRoomProps> = ({ onBack, onOpenChat, conversationActions }) => {
  const {
    companion,
    traceCount,
    traces,
    wallet,
    petCompanion,
    hatchCompanion,
    refreshCompanion,
  } = useCompanion();

  const [dialogue, setDialogue] = useState<string>('สวัสดีจ้ะ... วันนี้มีอะไรอยากชวนน้องคุย หรือมีเรื่องอะไรที่สังเกตเห็นไหม?');
  const [isInteracting, setIsInteracting] = useState<boolean>(false);
  const [showTraceModal, setShowTraceModal] = useState<boolean>(false);
  const [showHatchCelebration, setShowHatchCelebration] = useState<boolean>(false);
  const [selectedResumeTrace, setSelectedResumeTrace] = useState<any | null>(null);

  // Resume entry point for reviewing / continuing existing loop traces
  const onResumeDraft = (trace: any) => {
    setSelectedResumeTrace(trace);
    setShowTraceModal(true);
  };

  if (!companion) {
    return null;
  }

  const stage = companion.stage || 0;
  const isEgg = stage === 0;
  const progress = Math.min(20, traceCount);
  const canHatch = isEgg && traceCount >= 20;

  // Safe Space Themes
  const themeBackdrops: Record<string, { bg: string; cardBg: string; text: string; accent: string; title: string }> = {
    moonlit_pond: {
      bg: 'linear-gradient(180deg, #0F172A 0%, #1E293B 60%, #0F172A 100%)',
      cardBg: 'rgba(30, 41, 59, 0.75)',
      text: '#F1F5F9',
      accent: '#38BDF8',
      title: 'บ่อน้ำบัวใต้แสงจันทร์ (Moonlit Lotus Pond)',
    },
    misty_moss: {
      bg: 'linear-gradient(180deg, #14281D 0%, #1E382B 60%, #0F1F17 100%)',
      cardBg: 'rgba(30, 56, 43, 0.75)',
      text: '#ECFDF5',
      accent: '#34D399',
      title: 'สวนมอสส์ในม่านหมอก (Misty Moss Sanctuary)',
    },
    crystal_cavern: {
      bg: 'linear-gradient(180deg, #1E1035 0%, #2D1B4E 60%, #150A26 100%)',
      cardBg: 'rgba(45, 27, 78, 0.75)',
      text: '#FAF5FF',
      accent: '#C084FC',
      title: 'ถ้ำผลึกหินเรืองแสง (Crystal Cavern)',
    },
    zen_haven: {
      bg: 'linear-gradient(180deg, #2D1E16 0%, #3F2D21 60%, #1F140D 100%)',
      cardBg: 'rgba(63, 45, 33, 0.75)',
      text: '#FFFBEB',
      accent: '#FBBF24',
      title: 'บ้านไม้เซนใต้ร่มเงา (Zen Timber Haven)',
    },
  };

  const themeKey = companion.dna?.safe_space_theme || 'moonlit_pond';
  const theme = themeBackdrops[themeKey] || themeBackdrops.moonlit_pond;

  // Mindful Thai Dialogues upon Petting
  const mindfulQuotes = [
    'น้องรับรู้ถึงไออุ่นของคุณนะ ขอบคุณที่หยุดพักมาอยู่ด้วยกัน 💖',
    'หายใจเข้าลึกๆ ผ่อนคลายหัวไหล่... เค้าอยู่ตรงนี้ข้างๆ เสมอ 🍃',
    'ไม่ว่าจะเกิดอะไรขึ้น ความรู้ตัวของคุณกำลังหล่อเลี้ยงการเติบโตอยู่นะ ✨',
    'เก่งมากเลยนะที่สังเกตเห็นความคิดตัวเองในวันนี้ 🌱',
    'ไม่ต้องสมบูรณ์แบบก็ได้ แค่มีสติรู้ทันก็พอแล้ว 🤍',
  ];

  const handlePet = () => {
    setIsInteracting(true);
    petCompanion();
    const randomQuote = mindfulQuotes[Math.floor(Math.random() * mindfulQuotes.length)];
    setDialogue(randomQuote);
    setTimeout(() => setIsInteracting(false), 500);
  };

  const handleHatch = async () => {
    const result = await hatchCompanion();
    if (result.success) {
      setShowHatchCelebration(true);
      setDialogue('ยินดีด้วยนะ! ไข่ได้ฟักออกมาเป็นแอกโซลอทตัวน้อยแล้ว จากความเพียรในการสังเกตตนเองครบ 20 ครั้ง! 🎉✨');
    }
  };

  return (
    <div
      className="companionRoomScreen"
      style={{
        position: 'absolute',
        inset: 0,
        minHeight: '100dvh',
        height: '100%',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        background: theme.bg,
        color: theme.text,
        padding: '20px 16px calc(110px + env(safe-area-inset-bottom, 20px)) 16px',
        boxSizing: 'border-box',
        overflowX: 'hidden',
        fontFamily: 'inherit',
      }}
    >
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          maxWidth: '520px',
          margin: '0 auto 16px auto',
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: 'rgba(255, 255, 255, 0.12)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            color: '#FFF',
            padding: '8px 14px',
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          ← กลับหน้าหลัก
        </button>

        {/* Currency Display */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.3)',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            🐚 {wallet.shells}
          </div>
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.3)',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            💎 {wallet.memory_crystals}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '520px', margin: '0 auto' }}>
        {/* Habitat Room Title */}
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <div style={{ fontSize: '12px', color: theme.accent, letterSpacing: '0.5px' }}>
            {theme.title}
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '4px 0' }}>
            {companion.name}
          </h1>
          <div style={{ fontSize: '13px', opacity: 0.8 }}>
            {isEgg ? 'ระยะที่ 0: ไข่แห่งการรู้ตัว (Mindful Observation Egg)' : `ระยะที่ ${stage}: แอกโซลอทสหายสติ (Level ${wallet.level})`}
          </div>
        </div>

        {/* Companion Center Renderer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            margin: '20px 0',
            position: 'relative',
          }}
        >
          <CompanionRenderer
            stage={stage}
            traceCount={traceCount}
            source={companion}
            dna={companion.dna}
            moodState={companion.mood_state}
            isInteracting={isInteracting}
            onPet={handlePet}
            size={270}
          />
        </div>

        {/* Mascot Mindful Speech Bubble */}
        <div
          onClick={handlePet}
          style={{
            background: theme.cardBg,
            border: '1px solid rgba(255, 255, 255, 0.18)',
            borderRadius: '20px',
            padding: '14px 18px',
            textAlign: 'center',
            fontSize: '14px',
            lineHeight: 1.55,
            marginBottom: '20px',
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            backdropFilter: 'blur(8px)',
          }}
        >
          {dialogue}
          <div style={{ fontSize: '11px', opacity: 0.6, marginTop: '4px' }}>
            (แตะที่ตัวน้องหรือข้อความเพื่อสัมผัสและลูบหัว)
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* EGG STAGE: 20 LOOP TRACES PROGRESS METER                          */}
        {/* ----------------------------------------------------------------- */}
        {isEgg && (
          <div
            style={{
              background: theme.cardBg,
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '22px',
              padding: '18px 20px',
              marginBottom: '20px',
              backdropFilter: 'blur(8px)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontWeight: 600, fontSize: '15px' }}>🥚 ความคืบหน้าการฟักไข่</span>
              <span style={{ fontWeight: 700, fontSize: '16px', color: canHatch ? '#FBBF24' : theme.accent }}>
                {progress} / 20 Traces
              </span>
            </div>

            {/* Visual Progress Bar */}
            <div
              style={{
                height: '10px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.15)',
                overflow: 'hidden',
                position: 'relative',
                marginBottom: '12px',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${(progress / 20) * 100}%`,
                  background: canHatch
                    ? 'linear-gradient(90deg, #F59E0B, #FBBF24, #FDE047)'
                    : 'linear-gradient(90deg, #EC4899, #F43F5E, #FB7185)',
                  borderRadius: '8px',
                  transition: 'width 0.5s ease',
                }}
              />
            </div>

            <p style={{ fontSize: '12.5px', opacity: 0.85, lineHeight: 1.5, margin: '0 0 14px 0' }}>
              {canHatch
                ? '✨ พลังงานแห่งการสังเกตเต็มเปี่ยมแล้ว! ไข่ใบนี้พร้อมเปิดรับการกำเนิดใหม่แล้ว'
                : 'ไข่ใบนี้ต้องการพลังงานจากการสังเกตตนเองครบ 20 ครั้ง (Loop Traces) เพื่อฟักออกมาเป็นแอกโซลอท'}
            </p>

            {/* Hatch Action or Record Action */}
            {canHatch ? (
              <button
                onClick={handleHatch}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '16px',
                  background: 'linear-gradient(90deg, #F59E0B 0%, #D97706 100%)',
                  color: '#FFF',
                  fontWeight: 700,
                  fontSize: '15px',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 8px 20px rgba(245, 158, 11, 0.4)',
                  animation: 'pulseHatchBtn 1.5s infinite',
                }}
              >
                ✨ ฟักไข่สู่ชีวิตใหม่ (Hatch Companion!)
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setShowTraceModal(true)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '14px',
                    background: 'rgba(255, 255, 255, 0.14)',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    color: '#FFF',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  + บันทึก Loop Trace เอง
                </button>
                <button
                  onClick={onOpenChat}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '14px',
                    background: theme.accent,
                    color: '#0F172A',
                    fontWeight: 700,
                    fontSize: '13px',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  💬 ชวนคุยในแชตเพื่อบันทึก
                </button>
              </div>
            )}
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* HATCHED STAGE CONTROLS                                            */}
        {/* ----------------------------------------------------------------- */}
        {!isEgg && (
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <button
              onClick={handlePet}
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '16px',
                background: 'rgba(255, 255, 255, 0.15)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                color: '#FFF',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              💖 ลูบหัวน้อง
            </button>
            <button
              onClick={() => {
                setSelectedResumeTrace(null);
                setShowTraceModal(true);
              }}
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '16px',
                background: 'rgba(255, 255, 255, 0.15)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                color: '#FFF',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              📝 บันทึก Trace ใหม่
            </button>
            <button
              onClick={onOpenChat}
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '16px',
                background: theme.accent,
                color: '#0F172A',
                fontWeight: 700,
                fontSize: '14px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              💬 แชตกับสหาย
            </button>
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* GROWTH DNA & RECENT LOOP TRACES LIST                              */}
        {/* ----------------------------------------------------------------- */}
        <div
          style={{
            background: theme.cardBg,
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '22px',
            padding: '18px 20px',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontWeight: 600, fontSize: '15px' }}>📜 ประวัติการสังเกตตนเอง (Completed Loops)</span>
            <span style={{ fontSize: '12px', opacity: 0.7 }}>ทั้งหมด {traceCount} รายการ</span>
          </div>

          {traces.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 10px', opacity: 0.6, fontSize: '13px' }}>
              ยังไม่มี Completed Loop ที่ยืนยัน<br />
              ลองคุยกับน้องในแชต หรือกดปุ่มบันทึกเพื่อเริ่มตรวจทานลูปสติ 8 ส่วน
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '260px', overflowY: 'auto' }}>
              {traces.slice(0, 10).map((t, idx) => {
                const isConfirmed = Boolean(t.growth_event || t.xp_awarded || (t as any).is_confirmed);
                return (
                  <div
                    key={`${t.id || 'trc'}_${idx}`}
                    data-testid={`trace-item-${t.id || idx}`}
                    onClick={() => onResumeDraft(t)}
                    style={{
                      background: 'rgba(0, 0, 0, 0.22)',
                      borderRadius: '14px',
                      padding: '12px 14px',
                      fontSize: '13px',
                      borderLeft: `4px solid ${isConfirmed ? '#34D399' : theme.accent}`,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <strong style={{ color: '#FFF' }}>{t.title}</strong>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '11px', opacity: 0.6 }}>{t.trace_category}</span>
                        {isConfirmed ? (
                          <span
                            data-testid={`confirmed-badge-${t.id || idx}`}
                            style={{
                              background: 'rgba(52, 211, 153, 0.2)',
                              color: '#34D399',
                              border: '1px solid rgba(52, 211, 153, 0.4)',
                              borderRadius: '8px',
                              padding: '3px 8px',
                              fontSize: '11px',
                              fontWeight: 600,
                            }}
                          >
                            ✓ ยืนยันแล้ว
                          </span>
                        ) : (
                          <button
                            type="button"
                            data-testid="resume-draft-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              onResumeDraft(t);
                            }}
                            style={{
                              background: 'rgba(255, 255, 255, 0.15)',
                              border: '1px solid rgba(255, 255, 255, 0.25)',
                              color: '#FFF',
                              borderRadius: '8px',
                              padding: '3px 8px',
                              fontSize: '11px',
                              cursor: 'pointer',
                            }}
                          >
                            ✏️ สานต่อ
                          </button>
                        )}
                      </div>
                    </div>
                    <div style={{ opacity: 0.85, fontSize: '12.5px', lineHeight: 1.4 }}>{t.summary}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* MODAL: 6-PART COMPLETED LOOP REVIEW & ENTRY                       */}
      {/* ----------------------------------------------------------------- */}
      {showTraceModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            backdropFilter: 'blur(6px)',
          }}
        >
          <div
            className="companionLoopModalBody"
            style={{
              width: '100%',
              maxWidth: '480px',
              maxHeight: 'calc(100dvh - 24px)',
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {selectedResumeTrace && <TraceConversationActions trace={selectedResumeTrace} {...conversationActions} />}
            <LoopReviewCard
              conversationId={selectedResumeTrace?.source_session_id || (selectedResumeTrace as any)?.conversationId || `room_${Date.now()}`}
              traceId={selectedResumeTrace?.id}
              initialData={
                selectedResumeTrace
                  ? (() => {
                      let raw: any = {};
                      if (typeof selectedResumeTrace.raw_data_json === 'string') {
                        try {
                          const parsed = JSON.parse(selectedResumeTrace.raw_data_json);
                          if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
                            raw = parsed;
                          }
                        } catch {}
                      } else if (typeof selectedResumeTrace.raw_data_json === 'object' && selectedResumeTrace.raw_data_json !== null && !Array.isArray(selectedResumeTrace.raw_data_json)) {
                        raw = selectedResumeTrace.raw_data_json;
                      }

                      const exactTrigger = typeof raw.trigger === 'string'
                        ? raw.trigger
                        : (typeof (selectedResumeTrace as any).trigger === 'string' && (selectedResumeTrace as any).trigger !== 'แบบร่างลูปสติ'
                            ? (selectedResumeTrace as any).trigger
                            : '');

                      const exactEmotion = typeof raw.emotionOrBody === 'string'
                        ? raw.emotionOrBody
                        : (typeof raw.emotion_or_body === 'string'
                            ? raw.emotion_or_body
                            : (typeof (selectedResumeTrace as any).emotion_or_body === 'string' && (selectedResumeTrace as any).emotion_or_body !== 'แบบร่างการเรียนรู้'
                                ? (selectedResumeTrace as any).emotion_or_body
                                : ''));

                      const exactStory = typeof raw.automaticStory === 'string'
                        ? raw.automaticStory
                        : (typeof raw.automatic_story === 'string'
                            ? raw.automatic_story
                            : (typeof raw.thoughtsOrFears === 'string'
                                ? raw.thoughtsOrFears
                                : (typeof (selectedResumeTrace as any).automatic_story === 'string'
                                    ? (selectedResumeTrace as any).automatic_story
                                    : (typeof selectedResumeTrace.thoughts_or_fears === 'string'
                                        ? selectedResumeTrace.thoughts_or_fears
                                        : ''))));

                      const exactFacts = typeof raw.facts === 'string'
                        ? raw.facts
                        : (typeof (selectedResumeTrace as any).facts === 'string' ? (selectedResumeTrace as any).facts : '');

                      const exactNeeds = typeof raw.desires === 'string'
                        ? raw.desires
                        : (typeof raw.needs === 'string'
                            ? raw.needs
                            : (typeof selectedResumeTrace.desires === 'string'
                                ? selectedResumeTrace.desires
                                : (typeof (selectedResumeTrace as any).needs === 'string' ? (selectedResumeTrace as any).needs : '')));

                      const exactOptions = typeof raw.oldResponse === 'string'
                        ? raw.oldResponse
                        : (typeof raw.old_response === 'string'
                            ? raw.old_response
                            : (typeof raw.options === 'string'
                                ? raw.options
                                : (typeof selectedResumeTrace.old_response === 'string'
                                    ? selectedResumeTrace.old_response
                                    : (typeof (selectedResumeTrace as any).options === 'string' ? (selectedResumeTrace as any).options : ''))));

                      const exactMicroAction = typeof raw.newChoice === 'string'
                        ? raw.newChoice
                        : (typeof raw.new_choice === 'string'
                            ? raw.new_choice
                            : (typeof raw.microAction === 'string'
                                ? raw.microAction
                                : (typeof selectedResumeTrace.new_choice === 'string'
                                    ? selectedResumeTrace.new_choice
                                    : (typeof (selectedResumeTrace as any).microAction === 'string' ? (selectedResumeTrace as any).microAction : ''))));

                      const exactReflection = typeof raw.insights === 'string'
                        ? raw.insights
                        : (typeof raw.reflection === 'string'
                            ? raw.reflection
                            : (typeof selectedResumeTrace.insights === 'string'
                                ? selectedResumeTrace.insights
                                : (typeof (selectedResumeTrace as any).reflection === 'string' ? (selectedResumeTrace as any).reflection : '')));

                      const exactEmotionTags = Array.isArray(raw.emotionTags)
                        ? raw.emotionTags
                        : (Array.isArray((selectedResumeTrace as any).emotion_tags)
                            ? (selectedResumeTrace as any).emotion_tags
                            : (Array.isArray(selectedResumeTrace.emotion_tags_json)
                                ? selectedResumeTrace.emotion_tags_json
                                : []));

                      return {
                        trigger: exactTrigger,
                        emotionOrBody: exactEmotion,
                        automaticStory: exactStory,
                        facts: exactFacts,
                        needs: exactNeeds,
                        options: exactOptions,
                        microAction: exactMicroAction,
                        reflection: exactReflection,
                        emotionTags: exactEmotionTags,
                        isConfirmed: Boolean(selectedResumeTrace.growth_event || selectedResumeTrace.xp_awarded || (selectedResumeTrace as any).is_confirmed),
                      };
                    })()
                  : undefined
              }
              onClose={() => {
                setShowTraceModal(false);
                setSelectedResumeTrace(null);
              }}
              onConfirmed={(res) => {
                refreshCompanion();
                if (res.newlyHatched) {
                  setDialogue('ครบ 20 ลูปแล้ว! น้องฟักเป็นแอกโซลอทสหายสติแล้วนะ 🎉✨');
                } else if (res.newlyHatchable && isEgg) {
                  setDialogue('ครบ 20 ลูปแล้ว! ไข่พร้อมฟักแล้วนะ ✨🥚');
                } else if (!isEgg) {
                  setDialogue(`บันทึกลูปเรียบร้อย! สังเกตตัวเองแล้ว ${res.progressCount ?? traceCount} ครั้ง มาเติบโตไปด้วยกันนะ 🌱`);
                } else {
                  setDialogue(`บันทึกลูปเรียบร้อย! ความคืบหน้าการฟักไข่ ${Math.min(20, res.progressCount ?? traceCount)}/20 ลูป 🌱`);
                }
              }}
            />
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* CELEBRATION MODAL: HATCH SUCCESS                                  */}
      {/* ----------------------------------------------------------------- */}
      {showHatchCelebration && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10001,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div
            style={{
              background: '#FFFDF9',
              borderRadius: '28px',
              padding: '30px 24px',
              width: '100%',
              maxWidth: '420px',
              maxHeight: 'calc(100dvh - 24px)',
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
              textAlign: 'center',
              color: '#3E2D23',
              boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>🎉✨</div>
            <h2 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 8px 0' }}>
              การฟักไข่สมบูรณ์แบบ!
            </h2>
            <p style={{ fontSize: '14px', color: '#6E5D53', lineHeight: 1.5, margin: '0 0 16px 0' }}>
              ความรู้ตัวและการสังเกตตนเองครบ 20 ครั้งของคุณ ได้หล่อหลอมให้กำเนิดแอกโซลอทสหายสติเรียบร้อยแล้ว
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', margin: '12px 0' }}>
              <CompanionRenderer
                stage={1}
                traceCount={20}
                source={companion}
                dna={companion.dna}
                moodState="excited"
                size={200}
              />
            </div>

            <div
              style={{
                background: '#FEF3C7',
                border: '1px solid #FDE68A',
                borderRadius: '16px',
                padding: '12px',
                fontSize: '13px',
                color: '#92400E',
                marginBottom: '20px',
              }}
            >
              🎁 รางวัลการฟัก: +50 XP, +30 Shells, +1 Memory Crystal 💎
            </div>

            <button
              onClick={() => setShowHatchCelebration(false)}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '16px',
                background: '#657E53',
                color: '#FFF',
                fontWeight: 700,
                fontSize: '15px',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              ยินดีต้อนรับเพื่อนรัก 💖
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulseHatchBtn {
          0%, 100% { transform: scale(1); box-shadow: 0 8px 20px rgba(245, 158, 11, 0.4); }
          50% { transform: scale(1.03); box-shadow: 0 12px 28px rgba(245, 158, 11, 0.6); }
        }
      `}</style>
    </div>
  );
};
