import React, { useState } from 'react';
import { useCompanion } from '../context/CompanionContext';

export interface LoopReviewData {
  traceId?: string;
  trigger: string;
  emotionOrBody: string;
  automaticStory: string;
  desires?: string;
  needs?: string;
  facts: string;
  oldResponse: string;
  options?: string;
  newChoice: string;
  microAction?: string;
  insights?: string;
  reflection?: string;
  emotionTag?: string;
  emotionTags?: string[];
  conversationStatus?: 'complete_loop' | 'partial_loop' | 'no_data';
  detectedSkills?: {
    emotional_awareness?: boolean;
    somatic_awareness?: boolean;
    cognitive_clarity?: boolean;
    conscious_action?: boolean;
  };
  confirmedSkills?: {
    emotional_awareness?: number;
    somatic_awareness?: number;
    cognitive_clarity?: number;
    conscious_action?: number;
  };
  isConfirmed?: boolean;
}

export const EMOTIONS_LIST = [
  { id: 'anger', label: 'โกรธ / หงุดหงิด', color: '#FF6B6B', name: 'Coral Red' },
  { id: 'sadness', label: 'เศร้า / ผิดหวัง', color: '#4D96FF', name: 'Ocean Blue' },
  { id: 'fear', label: 'กลัว / ไม่มั่นคง', color: '#6C5CE7', name: 'Deep Violet' },
  { id: 'anxiety', label: 'กังวล / คิดวน', color: '#A29BFE', name: 'Electric Lavender' },
  { id: 'loneliness', label: 'เหงา / รู้สึกถูกทิ้ง', color: '#3B3B98', name: 'Indigo' },
  { id: 'shame', label: 'อับอาย / รู้สึกผิด', color: '#D1A3B8', name: 'Dusty Mauve' },
  { id: 'calm', label: 'สงบ / โล่งใจ', color: '#00CEC9', name: 'Aqua' },
  { id: 'joy', label: 'ดีใจ / ภูมิใจ', color: '#FDCB6E', name: 'Peach Gold' },
  { id: 'hope', label: 'มีหวัง / กล้าลองใหม่', color: '#E17055', name: 'Warm Amber' },
];

export interface SkillAxisDef {
  id: 'emotional_awareness' | 'somatic_awareness' | 'cognitive_clarity' | 'conscious_action';
  label: string;
  desc: string;
  traitEffect: string;
  icon: string;
}

export const SKILL_AXES: SkillAxisDef[] = [
  {
    id: 'emotional_awareness',
    label: 'การรู้เท่าทันอารมณ์',
    desc: 'สังเกตและยอมรับอารมณ์โดยไม่ตัดสิน',
    traitEffect: 'ดวงตาสดใสและเปิดกว้าง (Eyes)',
    icon: '👁️',
  },
  {
    id: 'somatic_awareness',
    label: 'การรู้สัญญาณร่างกาย',
    desc: 'จับความรู้สึกแน่น เกร็ง หรือผ่อนคลายในกาย',
    traitEffect: 'เหงือกพลิ้วไหวและชัดเจน (Gills)',
    icon: '🫁',
  },
  {
    id: 'cognitive_clarity',
    label: 'การแยกความคิดจากความจริง',
    desc: 'แยกเรื่องเล่าในหัวออกจากข้อเท็จจริง',
    traitEffect: 'หนวดสัมผัสและหางสมดุล (Tail & Feelers)',
    icon: '🔍',
  },
  {
    id: 'conscious_action',
    label: 'การเลือกทำอย่างมีสติ',
    desc: 'หยุดความเคยชินเดิม แล้วเลือกก้าวใหม่ที่ดีต่อใจ',
    traitEffect: 'แสงสว่างและประกายนำทาง (Lantern & Aura)',
    icon: '✨',
  },
];

interface LoopReviewCardProps {
  conversationId: string;
  traceId?: string;
  initialData?: Partial<LoopReviewData>;
  onClose?: () => void;
  onConfirmed?: (result: any) => void;
  isCrisisSession?: boolean;
}

export const LoopReviewCard: React.FC<LoopReviewCardProps> = ({
  conversationId,
  traceId: propTraceId,
  initialData,
  onClose,
  onConfirmed,
  isCrisisSession = false,
}) => {
  const { updateTrace, confirmTrace, createDraftTrace, saveDraft } = useCompanion();

  // Deterministic or server-provided trace ID
  const [traceId, setTraceId] = useState<string | null>(
    propTraceId || initialData?.traceId || (initialData as any)?.id || null
  );

  // 8 Sections Form States
  const [trigger, setTrigger] = useState(initialData?.trigger || '');
  const [emotionOrBody, setEmotionOrBody] = useState(initialData?.emotionOrBody || '');
  const [automaticStory, setAutomaticStory] = useState(initialData?.automaticStory || '');
  const [facts, setFacts] = useState(initialData?.facts || '');
  const [desires, setDesires] = useState(initialData?.needs || initialData?.desires || '');
  const [oldResponse, setOldResponse] = useState(initialData?.options || initialData?.oldResponse || '');
  const [newChoice, setNewChoice] = useState(initialData?.microAction || initialData?.newChoice || '');
  const [insights, setInsights] = useState(initialData?.reflection || initialData?.insights || '');

  const conversationStatus =
    initialData?.conversationStatus ||
    (initialData?.trigger && initialData.trigger !== 'ยังไม่ได้สำรวจ' ? 'partial_loop' : 'no_data');

  // Emotion Tags (Multi-select, cosmetic only, does NOT mutate DNA)
  const [emotionTags, setEmotionTags] = useState<string[]>(() => {
    if (initialData?.emotionTags && initialData.emotionTags.length > 0) {
      return initialData.emotionTags;
    }
    if (initialData?.emotionTag) {
      return [initialData.emotionTag];
    }
    return ['anxiety'];
  });

  // AI-Detected Skills (Baseline from AI extraction or field inference)
  const detectedSkills = initialData?.detectedSkills || {
    emotional_awareness: Boolean(initialData?.emotionOrBody && initialData.emotionOrBody !== 'ยังไม่ได้สำรวจ'),
    somatic_awareness: Boolean(initialData?.emotionOrBody && initialData.emotionOrBody !== 'ยังไม่ได้สำรวจ'),
    cognitive_clarity: Boolean(initialData?.facts && initialData.facts !== 'ยังไม่ได้สำรวจ'),
    conscious_action: Boolean((initialData?.newChoice || initialData?.microAction) && initialData.newChoice !== 'ยังไม่ได้สำรวจ'),
  };

  // User-Confirmed Skills (User can uncheck detected skills, CANNOT check undetected ones)
  const [userSkills, setUserSkills] = useState<{
    emotional_awareness: boolean;
    somatic_awareness: boolean;
    cognitive_clarity: boolean;
    conscious_action: boolean;
  }>({
    emotional_awareness: Boolean(detectedSkills.emotional_awareness),
    somatic_awareness: Boolean(detectedSkills.somatic_awareness),
    cognitive_clarity: Boolean(detectedSkills.cognitive_clarity),
    conscious_action: Boolean(detectedSkills.conscious_action),
  });

  const [isConfirmed, setIsConfirmed] = useState<boolean>(Boolean(initialData?.isConfirmed));
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [draftSavedToast, setDraftSavedToast] = useState(false);
  const [updateSuccessToast, setUpdateSuccessToast] = useState(false);
  const [successResult, setSuccessResult] = useState<any | null>(null);

  // Toggle emotion tag (multi-select)
  const toggleEmotionTag = (id: string) => {
    setEmotionTags((prev) =>
      prev.includes(id) ? (prev.length > 1 ? prev.filter((t) => t !== id) : prev) : [...prev, id]
    );
  };

  // Toggle skill axis (Uncheck-only rule: user can only toggle IF AI detected it)
  const handleToggleSkill = (
    axis: 'emotional_awareness' | 'somatic_awareness' | 'cognitive_clarity' | 'conscious_action'
  ) => {
    if (!detectedSkills[axis]) return; // Cannot check undetected skill (anti-farming)
    setUserSkills((prev) => ({
      ...prev,
      [axis]: !prev[axis],
    }));
  };

  // Validate required fields before Growth Event confirmation
  const validateBeforeConfirm = (): { isValid: boolean; missingFields: string[] } => {
    const UNEXPLORED = 'ยังไม่ได้สำรวจ';
    const isInvalid = (val?: string, minLen = 2) => {
      if (!val || typeof val !== 'string') return true;
      const t = val.trim();
      return (
        t.length < minLen ||
        t === UNEXPLORED ||
        t === 'วงจรสติ' ||
        t === 'แบบร่างลูปสติ' ||
        t === 'Loop Trace' ||
        t.startsWith('สิ่งที่เกิดขึ้น (บันทึกจากที่ได้คุยกัน')
      );
    };

    const missing: string[] = [];
    if (isInvalid(trigger, 3)) missing.push('จุดสะกิด (Trigger)');
    if (isInvalid(emotionOrBody, 2)) missing.push('ความรู้สึก/สัญญาณร่างกาย (Emotion & Body)');
    if (isInvalid(automaticStory, 3)) missing.push('ความคิดแวบแรก (Automatic Story)');

    const hasResolution = !isInvalid(newChoice, 3) || !isInvalid(insights, 3);
    if (!hasResolution) missing.push('ก้าวเล็กๆ (Micro-action) หรือ บทเรียน (Reflection)');

    return { isValid: missing.length === 0, missingFields: missing };
  };

  const handleRequestConfirm = () => {
    const { isValid, missingFields } = validateBeforeConfirm();
    if (!isValid) {
      setErrorMsg(
        `ข้อมูลยังไม่ครบถ้วนสำหรับการยืนยัน Growth Event (ยังขาด: ${missingFields.join(', ')}) กรุณากรอกช่องที่ขาด หรือกด "บันทึกแบบร่าง" เพื่อเก็บไว้ก่อนได้ 🌱`
      );
      return;
    }
    setErrorMsg(null);
    setShowConfirmModal(true);
  };

  // 1. Authoritative Growth Confirmation
  const handleConfirmGrowth = async () => {
    setErrorMsg(null);

    const { isValid, missingFields } = validateBeforeConfirm();
    if (!isValid) {
      setErrorMsg(
        `ข้อมูลยังไม่ครบถ้วนสำหรับการยืนยัน Growth Event (ยังขาด: ${missingFields.join(', ')}) กรุณากรอกช่องที่ขาด หรือกด "บันทึกแบบร่าง" เพื่อเก็บไว้ก่อนได้ 🌱`
      );
      setShowConfirmModal(false);
      return;
    }

    setIsSubmitting(true);
    setShowConfirmModal(false);

    try {
      let activeTraceId = traceId;

      // Ensure server or local state has a real draft record before confirm
      if (!activeTraceId || activeTraceId.startsWith('trace_conv_')) {
        const draftRes = await createDraftTrace({
          id: activeTraceId || undefined,
          conversationId,
          trigger,
          emotionOrBody,
          automaticStory,
          desires,
          facts,
          oldResponse,
          newChoice,
          insights,
          emotionTags,
          skills: {
            emotional_awareness: userSkills.emotional_awareness ? 1 : 0,
            somatic_awareness: userSkills.somatic_awareness ? 1 : 0,
            cognitive_clarity: userSkills.cognitive_clarity ? 1 : 0,
            conscious_action: userSkills.conscious_action ? 1 : 0,
          },
        });

        if (!draftRes.success || !draftRes.traceId) {
          setErrorMsg(draftRes.error || 'ไม่สามารถเตรียมบันทึกลูปได้ กรุณาลองใหม่อีกครั้ง');
          setIsSubmitting(false);
          return;
        }
        activeTraceId = draftRes.traceId;
        setTraceId(activeTraceId);
      }

      const payload = {
        conversationId,
        idempotencyKey: `growth_${activeTraceId}`,
        trigger,
        emotionOrBody,
        automaticStory,
        desires,
        facts,
        oldResponse,
        newChoice,
        insights,
        emotionTags,
        skills: {
          emotional_awareness: userSkills.emotional_awareness ? 1 : 0,
          somatic_awareness: userSkills.somatic_awareness ? 1 : 0,
          cognitive_clarity: userSkills.cognitive_clarity ? 1 : 0,
          conscious_action: userSkills.conscious_action ? 1 : 0,
        },
        isCrisis: isCrisisSession,
      };

      const res = await confirmTrace(activeTraceId, payload);

      if (!res.success && !res.alreadyProcessed) {
        setErrorMsg(res.error || 'ไม่สามารถบันทึกและส่งพลังได้ กรุณาลองใหม่อีกครั้ง');
        setIsSubmitting(false);
        return;
      }

      setShowConfirmModal(false);
      setIsConfirmed(true);
      setSuccessResult(res);
      if (onConfirmed) onConfirmed(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Backward-safe Update of Existing Trace (Does NOT re-grant points or re-trigger growth)
  const handleUpdateTraceText = async () => {
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      if (!traceId) {
        const draftRes = await createDraftTrace({
          conversationId,
          trigger,
          emotionOrBody,
          automaticStory,
          desires,
          facts,
          oldResponse,
          newChoice,
          insights,
          emotionTags,
        });
        if (draftRes.success && draftRes.traceId) {
          setTraceId(draftRes.traceId);
          setUpdateSuccessToast(true);
          setTimeout(() => setUpdateSuccessToast(false), 3000);
        } else {
          setErrorMsg(draftRes.error || 'ไม่สามารถบันทึกได้');
        }
        setIsSubmitting(false);
        return;
      }

      const res = await updateTrace(traceId, {
        trigger,
        emotionOrBody,
        automaticStory,
        desires,
        facts,
        oldResponse,
        newChoice,
        insights,
        emotionTags,
      });

      if (!res.success) {
        setErrorMsg(res.error || 'ไม่สามารถอัปเดตบันทึกได้');
        setIsSubmitting(false);
        return;
      }

      setUpdateSuccessToast(true);
      setTimeout(() => setUpdateSuccessToast(false), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการอัปเดต');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    try {
      const cleanField = (val?: string) => (val === 'ยังไม่ได้สำรวจ' ? '' : val || '');
      const res = await createDraftTrace({
        id: traceId || undefined,
        conversationId,
        trigger: cleanField(trigger),
        emotionOrBody: cleanField(emotionOrBody),
        automaticStory: cleanField(automaticStory),
        desires: cleanField(desires),
        facts: cleanField(facts),
        oldResponse: cleanField(oldResponse),
        newChoice: cleanField(newChoice),
        insights: cleanField(insights),
        emotionTags,
      });
      if (res.success && res.traceId) {
        setTraceId(res.traceId);
        setDraftSavedToast(true);
        setTimeout(() => setDraftSavedToast(false), 2500);
      } else {
        await saveDraft({
          conversationId,
          trigger: cleanField(trigger),
          emotionOrBody: cleanField(emotionOrBody),
          automaticStory: cleanField(automaticStory),
          facts: cleanField(facts),
          oldResponse: cleanField(oldResponse),
          newChoice: cleanField(newChoice),
        });
        setDraftSavedToast(true);
        setTimeout(() => setDraftSavedToast(false), 2500);
      }
    } catch (err) {
      console.warn('Draft save error:', err);
    }
  };

  // SUCCESS VIEW: Showing the Growth Event feedback
  if (successResult) {
    const feedback = successResult.eggFeedback || {};
    const newlyHatched = Boolean(successResult.newlyHatched);

    return (
      <div
        className="loopSuccessCard"
        style={{
          background: 'linear-gradient(135deg, #FFF9FA 0%, #FFF0F3 100%)',
          border: '2px solid #FFCCD5',
          borderRadius: '24px',
          padding: '24px 20px',
          margin: '14px 0',
          textAlign: 'center',
          boxShadow: '0 12px 30px rgba(255, 182, 193, 0.25)',
          animation: 'fadeInCard 0.4s ease-out',
        }}
      >
        <div style={{ fontSize: '44px', marginBottom: '8px', animation: 'bounceHeart 1.5s infinite' }}>
          {newlyHatched ? '🐣✨' : '✨🥚✨'}
        </div>
        <h3 style={{ margin: '0 0 6px 0', color: '#9D174D', fontSize: '18px', fontWeight: 700 }}>
          {newlyHatched
            ? '🎉 สหายสติฟักออกจากไข่แล้ว!'
            : feedback.message || 'บันทึก Growth Event เรียบร้อยแล้ว!'}
        </h3>
        <p style={{ fontSize: '13px', color: '#B91C1C', fontStyle: 'italic', margin: '0 0 16px 0' }}>
          “{feedback.quote || 'ทุกครั้งที่เราตระหนักรู้ คือการโอบกอดและเติบโตขึ้นหนึ่งก้าว'}”
        </p>

        <div
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid #FFE4E6',
            borderRadius: '16px',
            padding: '14px',
            marginBottom: '16px',
            fontSize: '13px',
            color: '#4B5563',
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span>ความคืบหน้าการเติบโต:</span>
            <b style={{ color: '#9D174D' }}>
              {successResult.progressCount || successResult.companion?.growth_event_count || 1} ครั้ง
            </b>
          </div>

          <div style={{ borderTop: '1px dashed #FECDD3', paddingTop: '8px', marginTop: '8px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
              ทักษะสติที่ยืนยันในรอบนี้:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {SKILL_AXES.map((axis) => {
                const practiced = userSkills[axis.id];
                if (!practiced) return null;
                return (
                  <span
                    key={axis.id}
                    style={{
                      fontSize: '11px',
                      background: '#FDF2F8',
                      border: '1px solid #F472B6',
                      borderRadius: '999px',
                      padding: '3px 8px',
                      color: '#831843',
                    }}
                  >
                    {axis.icon} {axis.label} (+1)
                  </span>
                );
              })}
            </div>
          </div>

          {successResult.reward?.xp > 0 && (
            <div
              style={{
                color: '#059669',
                fontWeight: 600,
                marginTop: '10px',
                paddingTop: '8px',
                borderTop: '1px dashed #A7F3D0',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>🎁 ได้รับรางวัล:</span>
              <span>+{successResult.reward.xp} XP</span>
              <span>•</span>
              <span>+{successResult.reward.shells} เปลือกหอย 🐚</span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #F43F5E, #E11D48)',
            color: '#FFF',
            border: 'none',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(225, 29, 72, 0.3)',
          }}
        >
          กลับไปคุยต่อกับเพื่อนใจ 💖
        </button>
      </div>
    );
  }

  return (
    <div
      className="loopReviewCard"
      style={{
        background: '#FFFDFD',
        border: '1.5px solid #FFCCD5',
        borderRadius: '24px',
        padding: '18px 16px',
        margin: '12px auto',
        maxWidth: '96%',
        boxShadow: '0 10px 28px rgba(255, 183, 197, 0.15)',
        position: 'relative',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '22px' }}>🌱</span>
          <div>
            <h4 style={{ margin: 0, fontSize: '15.5px', color: '#9D174D', fontWeight: 700 }}>
              Loop Trace & การเติบโตของสหายสติ
            </h4>
            <small style={{ color: '#832729', fontSize: '11px' }}>
              ตรวจทาน 8 ส่วนสำคัญของลูปสติ และส่งพลังทักษะให้น้องเติบโต
            </small>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              color: '#9CA3AF',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            ✕
          </button>
        )}
      </div>

      {isConfirmed && (
        <div
          style={{
            background: '#F0FDF4',
            border: '1px solid #86EFAC',
            color: '#166534',
            borderRadius: '12px',
            padding: '8px 12px',
            fontSize: '11.5px',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>✓</span>
          <span>
            ลูปนี้ยืนยันและบันทึก Growth Event แล้ว คุณยังสามารถแก้ไขเนื้อหาเพื่อทบทวนตัวเองได้ตลอดเวลา
          </span>
        </div>
      )}

      {errorMsg && (
        <div
          style={{
            background: '#FEE2E2',
            border: '1px solid #FCA5A5',
            color: '#B91C1C',
            borderRadius: '12px',
            padding: '8px 12px',
            fontSize: '12px',
            marginBottom: '12px',
          }}
        >
          ⚠️ {errorMsg}
        </div>
      )}

      {updateSuccessToast && (
        <div
          style={{
            background: '#EFF6FF',
            border: '1px solid #93C5FD',
            color: '#1E40AF',
            borderRadius: '12px',
            padding: '8px 12px',
            fontSize: '12px',
            marginBottom: '12px',
          }}
        >
          ✓ อัปเดตเนื้อหาลูปเรียบร้อยแล้ว (ไม่ส่งผลต่อแต้มการเติบโตซ้ำ)
        </div>
      )}

      {/* Conversation Status Banners */}
      {conversationStatus === 'partial_loop' && !isConfirmed && (
        <div
          data-testid="status-banner-partial-loop"
          style={{
            background: '#FFFBEB',
            border: '1px solid #FCD34D',
            color: '#92400E',
            borderRadius: '12px',
            padding: '10px 12px',
            fontSize: '12px',
            marginBottom: '14px',
            lineHeight: 1.5,
          }}
        >
          <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>📝</span>
            <span>บทสนทนามีประเด็นแต่ยังไม่ครบลูป</span>
          </div>
          <div style={{ marginTop: '4px', fontSize: '11.5px' }}>
            ระบบดึงประเด็นที่คุยไว้ให้แล้ว ช่องที่ยังไม่ได้คุยแสดงเป็น &ldquo;ยังไม่ได้สำรวจ&rdquo; คุณสามารถแตะแก้ไขให้ครบเพื่อยืนยันลูป หรือกด &ldquo;บันทึกแบบร่าง&rdquo; ไว้ก่อนได้ 🌱
          </div>
        </div>
      )}

      {conversationStatus === 'no_data' && !isConfirmed && (
        <div
          data-testid="status-banner-no-data"
          style={{
            background: '#F3F4F6',
            border: '1px solid #E5E7EB',
            color: '#4B5563',
            borderRadius: '12px',
            padding: '10px 12px',
            fontSize: '12px',
            marginBottom: '14px',
            lineHeight: 1.5,
          }}
        >
          <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>ℹ️</span>
            <span>ยังไม่มีข้อมูลลูปจากบทสนทนา</span>
          </div>
          <div style={{ marginTop: '4px', fontSize: '11.5px' }}>
            คุณสามารถกรอกสำรวจสติ 8 ส่วนนี้ด้วยตนเอง หรือบันทึกเป็นแบบร่างเก็บไว้ก่อนได้
          </div>
        </div>
      )}

      {/* 8 Sections Form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* 1. Trigger */}
        <div>
          <label style={labelStyle}>1. สิ่งเร้า / จุดสะกิด (Trigger)</label>
          <input
            type="text"
            value={trigger}
            onChange={(e) => setTrigger(e.target.value)}
            onFocus={() => {
              if (trigger === 'ยังไม่ได้สำรวจ') setTrigger('');
            }}
            placeholder="เช่น มีคำถามผุดขึ้นมา, ข้อความที่ได้รับ, เหตุการณ์ที่พบเจอ..."
            style={{
              ...inputStyle,
              color: trigger === 'ยังไม่ได้สำรวจ' ? '#9CA3AF' : '#1F2937',
              fontStyle: trigger === 'ยังไม่ได้สำรวจ' ? 'italic' : 'normal',
              borderColor: trigger === 'ยังไม่ได้สำรวจ' ? '#FBCFE8' : '#E5E7EB',
              background: trigger === 'ยังไม่ได้สำรวจ' ? '#FFFBFD' : '#FFFFFF',
            }}
          />
        </div>

        {/* 2. Emotion / Body Signal */}
        <div>
          <label style={labelStyle}>2. อารมณ์ / ความรู้สึกทางกาย (Emotion & Body)</label>
          <input
            type="text"
            value={emotionOrBody}
            onChange={(e) => setEmotionOrBody(e.target.value)}
            onFocus={() => {
              if (emotionOrBody === 'ยังไม่ได้สำรวจ') setEmotionOrBody('');
            }}
            placeholder="เช่น รู้สึกเคว้ง เหงา แน่นหน้าอก ใจเต้นเร็ว..."
            style={{
              ...inputStyle,
              color: emotionOrBody === 'ยังไม่ได้สำรวจ' ? '#9CA3AF' : '#1F2937',
              fontStyle: emotionOrBody === 'ยังไม่ได้สำรวจ' ? 'italic' : 'normal',
              borderColor: emotionOrBody === 'ยังไม่ได้สำรวจ' ? '#FBCFE8' : '#E5E7EB',
              background: emotionOrBody === 'ยังไม่ได้สำรวจ' ? '#FFFBFD' : '#FFFFFF',
            }}
          />
        </div>

        {/* 3. Automatic Story */}
        <div>
          <label style={labelStyle}>3. ความคิดอัตโนมัติ (Automatic Story)</label>
          <input
            type="text"
            value={automaticStory}
            onChange={(e) => setAutomaticStory(e.target.value)}
            onFocus={() => {
              if (automaticStory === 'ยังไม่ได้สำรวจ') setAutomaticStory('');
            }}
            placeholder="เช่น เกิดมาทำไม ทุกอย่างไม่มีความหมาย ทำอะไรก็ไม่ดีพอ..."
            style={{
              ...inputStyle,
              color: automaticStory === 'ยังไม่ได้สำรวจ' ? '#9CA3AF' : '#1F2937',
              fontStyle: automaticStory === 'ยังไม่ได้สำรวจ' ? 'italic' : 'normal',
              borderColor: automaticStory === 'ยังไม่ได้สำรวจ' ? '#FBCFE8' : '#E5E7EB',
              background: automaticStory === 'ยังไม่ได้สำรวจ' ? '#FFFBFD' : '#FFFFFF',
            }}
          />
        </div>

        {/* 4. Facts */}
        <div>
          <label style={labelStyle}>4. ข้อเท็จจริง (Facts)</label>
          <input
            type="text"
            value={facts}
            onChange={(e) => setFacts(e.target.value)}
            onFocus={() => {
              if (facts === 'ยังไม่ได้สำรวจ') setFacts('');
            }}
            placeholder="เช่น สิ่งที่พิสูจน์ได้จริง แยกจากความกังวลหรือการตีความ..."
            style={{
              ...inputStyle,
              color: facts === 'ยังไม่ได้สำรวจ' ? '#9CA3AF' : '#1F2937',
              fontStyle: facts === 'ยังไม่ได้สำรวจ' ? 'italic' : 'normal',
              borderColor: facts === 'ยังไม่ได้สำรวจ' ? '#FBCFE8' : '#E5E7EB',
              background: facts === 'ยังไม่ได้สำรวจ' ? '#FFFBFD' : '#FFFFFF',
            }}
          />
        </div>

        {/* 5. Needs / Desires */}
        <div>
          <label style={labelStyle}>5. ความต้องการลึกๆ (Needs & Desires)</label>
          <input
            type="text"
            value={desires}
            onChange={(e) => setDesires(e.target.value)}
            onFocus={() => {
              if (desires === 'ยังไม่ได้สำรวจ') setDesires('');
            }}
            placeholder="เช่น ต้องการความหมาย อยากเข้าใจตนเอง อยากรู้สึกปลอดภัยและยอมรับ..."
            style={{
              ...inputStyle,
              color: desires === 'ยังไม่ได้สำรวจ' ? '#9CA3AF' : '#1F2937',
              fontStyle: desires === 'ยังไม่ได้สำรวจ' ? 'italic' : 'normal',
              borderColor: desires === 'ยังไม่ได้สำรวจ' ? '#FBCFE8' : '#E5E7EB',
              background: desires === 'ยังไม่ได้สำรวจ' ? '#FFFBFD' : '#FFFFFF',
            }}
          />
        </div>

        {/* 6. Options / New Choices */}
        <div>
          <label style={labelStyle}>6. ทางเลือกใหม่ (Options & Choices)</label>
          <input
            type="text"
            value={oldResponse}
            onChange={(e) => setOldResponse(e.target.value)}
            onFocus={() => {
              if (oldResponse === 'ยังไม่ได้สำรวจ') setOldResponse('');
            }}
            placeholder="เช่น หยุดคิดวน ให้เวลาพัก สูดลมหายใจลึกๆ หาเวลาอยู่เงียบๆ..."
            style={{
              ...inputStyle,
              color: oldResponse === 'ยังไม่ได้สำรวจ' ? '#9CA3AF' : '#1F2937',
              fontStyle: oldResponse === 'ยังไม่ได้สำรวจ' ? 'italic' : 'normal',
              borderColor: oldResponse === 'ยังไม่ได้สำรวจ' ? '#FBCFE8' : '#E5E7EB',
              background: oldResponse === 'ยังไม่ได้สำรวจ' ? '#FFFBFD' : '#FFFFFF',
            }}
          />
        </div>

        {/* 7. Micro-action */}
        <div>
          <label style={labelStyle}>7. การลงมือทำย่อย (Micro-action)</label>
          <input
            type="text"
            value={newChoice}
            onChange={(e) => setNewChoice(e.target.value)}
            onFocus={() => {
              if (newChoice === 'ยังไม่ได้สำรวจ') setNewChoice('');
            }}
            placeholder="เช่น ดื่มน้ำ 1 แก้ว วางมือบนอกแล้วหายใจลึกๆ 3 ครั้ง จดบันทึกสั้นๆ..."
            style={{
              ...inputStyle,
              color: newChoice === 'ยังไม่ได้สำรวจ' ? '#9CA3AF' : '#1F2937',
              fontStyle: newChoice === 'ยังไม่ได้สำรวจ' ? 'italic' : 'normal',
              borderColor: newChoice === 'ยังไม่ได้สำรวจ' ? '#FBCFE8' : '#E5E7EB',
              background: newChoice === 'ยังไม่ได้สำรวจ' ? '#FFFBFD' : '#FFFFFF',
            }}
          />
        </div>

        {/* 8. Reflection & Insights */}
        <div>
          <label style={labelStyle}>8. การสะท้อนคิด (Reflection & Insights)</label>
          <input
            type="text"
            value={insights}
            onChange={(e) => setInsights(e.target.value)}
            onFocus={() => {
              if (insights === 'ยังไม่ได้สำรวจ') setInsights('');
            }}
            placeholder="เช่น ความสงสัยเป็นเรื่องธรรมชาติ ค่อยๆ ค้นหาความหมายทีละก้าว..."
            style={{
              ...inputStyle,
              color: insights === 'ยังไม่ได้สำรวจ' ? '#9CA3AF' : '#1F2937',
              fontStyle: insights === 'ยังไม่ได้สำรวจ' ? 'italic' : 'normal',
              borderColor: insights === 'ยังไม่ได้สำรวจ' ? '#FBCFE8' : '#E5E7EB',
              background: insights === 'ยังไม่ได้สำรวจ' ? '#FFFBFD' : '#FFFFFF',
            }}
          />
        </div>

        {/* Emotion Atmosphere (Cosmetic, Multi-select, Directive 4) */}
        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #FFE4E6' }}>
          <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: '6px' }}>
            🎨 บรรยากาศอารมณ์ของลูปนี้ (ส่งผลต่อแสงประกายชั่วคราว ไม่เปลี่ยนตัวตนน้อง):
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {EMOTIONS_LIST.map((em) => {
              const selected = emotionTags.includes(em.id);
              return (
                <button
                  key={em.id}
                  type="button"
                  onClick={() => toggleEmotionTag(em.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '4px 9px',
                    borderRadius: '999px',
                    fontSize: '11px',
                    border: selected ? `2px solid ${em.color}` : '1px solid #E5E7EB',
                    background: selected ? '#FFF1F2' : '#FFFFFF',
                    color: selected ? '#9D174D' : '#4B5563',
                    fontWeight: selected ? 600 : 400,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: em.color }} />
                  {em.label}
                  {selected && <span style={{ fontSize: '9px' }}>✓</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4 Skill Axes (Directive 3 & Section D) */}
        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #FFE4E6' }}>
          <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: '3px' }}>
            ✨ ทักษะสติ 4 ด้านที่ฝึกในลูปนี้:
          </label>
          <small style={{ color: '#6B7280', fontSize: '10.5px', display: 'block', marginBottom: '8px' }}>
            ระบบตรวจพบจากลูปของคุณ คุณสามารถปลดติ๊กออกได้หากรู้สึกว่าไม่ได้ฝึกทักษะนั้น
          </small>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {SKILL_AXES.map((axis) => {
              const detected = Boolean(detectedSkills[axis.id]);
              const checked = userSkills[axis.id];

              return (
                <div
                  key={axis.id}
                  onClick={() => detected && handleToggleSkill(axis.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    padding: '8px 10px',
                    borderRadius: '10px',
                    background: !detected ? '#F9FAFB' : checked ? '#FDF2F8' : '#FFFFFF',
                    border: !detected ? '1px dashed #E5E7EB' : checked ? '1.5px solid #F472B6' : '1px solid #E5E7EB',
                    cursor: detected ? 'pointer' : 'not-allowed',
                    opacity: detected ? 1 : 0.6,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={!detected}
                    onChange={() => {}}
                    style={{ accentColor: '#E11D48', marginTop: '2px' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '13px' }}>{axis.icon}</span>
                      <b style={{ fontSize: '12px', color: detected ? '#1F2937' : '#9CA3AF' }}>
                        {axis.label}
                      </b>
                      {!detected && (
                        <span style={{ fontSize: '10px', color: '#9CA3AF', fontStyle: 'italic' }}>
                          (ไม่พบในลูปนี้)
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '1px' }}>
                      {axis.desc}
                    </div>
                    <div style={{ fontSize: '10.5px', color: '#BE185D', marginTop: '2px', fontWeight: 500 }}>
                      ส่งผลต่อ: {axis.traitEffect}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
        <button
          type="button"
          onClick={handleSaveDraft}
          style={{
            flex: 1,
            padding: '11px 8px',
            borderRadius: '14px',
            background: '#F3F4F6',
            color: '#4B5563',
            border: '1px solid #E5E7EB',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {draftSavedToast ? '✓ บันทึกร่างแล้ว' : 'บันทึกแบบร่าง'}
        </button>

        {isConfirmed ? (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleUpdateTraceText}
            style={{
              flex: 2,
              padding: '11px 12px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #059669, #047857)',
              color: '#FFF',
              border: 'none',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)',
            }}
          >
            {isSubmitting ? 'กำลังบันทึก...' : '💾 อัปเดตเนื้อหาลูปนี้'}
          </button>
        ) : (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleRequestConfirm}
            style={{
              flex: 2,
              padding: '11px 12px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #E11D48, #BE123C)',
              color: '#FFF',
              border: 'none',
              fontSize: '13px',
              fontWeight: 700,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(225, 29, 72, 0.25)',
            }}
          >
            {isSubmitting ? 'กำลังตรวจสอบ...' : '✨ ยืนยันลูปของฉัน (+1 ลูป)'}
          </button>
        )}
      </div>

      {/* Confirmation Modal (Immutable Growth Event Notice) */}
      {showConfirmModal && (
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
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              maxWidth: '380px',
              width: '100%',
              padding: '20px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              animation: 'fadeInCard 0.2s ease-out',
            }}
          >
            <div style={{ textAlign: 'center', fontSize: '36px', marginBottom: '8px' }}>
              🌱✨
            </div>
            <h4
              style={{
                margin: '0 0 8px 0',
                fontSize: '16px',
                color: '#9D174D',
                textAlign: 'center',
                fontWeight: 700,
              }}
            >
              ยืนยันการเติบโตของสหายสติ
            </h4>
            <p
              style={{
                fontSize: '12.5px',
                color: '#4B5563',
                lineHeight: 1.5,
                margin: '0 0 14px 0',
                textAlign: 'center',
              }}
            >
              คุณกำลังจะส่งพลังให้ไข่/น้องเติบโต <b>+1 ครั้ง</b> พร้อมรับรางวัล <b>+15 XP</b> และ{' '}
              <b>+10 เปลือกหอย 🐚</b>
            </p>

            <div
              style={{
                background: '#FFF5F7',
                border: '1px solid #FFE4E6',
                borderRadius: '12px',
                padding: '10px 12px',
                fontSize: '11.5px',
                color: '#831843',
                marginBottom: '16px',
              }}
            >
              <b>ทักษะที่จะได้รับ (+1 แต้ม):</b>
              <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px' }}>
                {SKILL_AXES.filter((a) => userSkills[a.id]).map((a) => (
                  <li key={a.id}>{a.label}</li>
                ))}
                {SKILL_AXES.filter((a) => userSkills[a.id]).length === 0 && (
                  <li style={{ color: '#9CA3AF' }}>ไม่มีทักษะที่เลือก (ยังคงได้นับรอบลูป +1)</li>
                )}
              </ul>
              <small style={{ display: 'block', marginTop: '8px', color: '#6B7280' }}>
                * หลังยืนยันแล้ว สามารถแก้ไขข้อความย้อนหลังได้ตลอดเวลา แต่แต้มรางวัลจะให้ครั้งเดียวเพื่อความหมายที่แท้จริง
              </small>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '12px',
                  background: '#F3F4F6',
                  color: '#4B5563',
                  border: 'none',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                กลับไปตรวจทาน
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmGrowth}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #E11D48, #BE123C)',
                  color: '#FFF',
                  border: 'none',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                }}
              >
                {isSubmitting ? 'กำลังบันทึก...' : 'ยืนยันทันที ✨'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const labelStyle: React.CSSProperties = {
  fontSize: '11.5px',
  fontWeight: 600,
  color: '#4B5563',
  display: 'block',
  marginBottom: '3px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: '10px',
  border: '1px solid #E5E7EB',
  fontSize: '12.5px',
  color: '#1F2937',
  boxSizing: 'border-box',
  outline: 'none',
  background: '#FFFFFF',
};
