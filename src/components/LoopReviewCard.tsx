import React, { useState } from 'react';
import { useCompanion } from '../context/CompanionContext';
import { calculateLoopProgress, validateLoopForConfirmation } from '../shared/chat-protocol';

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
  const { updateTrace, confirmTrace, createDraftTrace } = useCompanion();

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
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [savedDraftSnapshot, setSavedDraftSnapshot] = useState<string | null>(null);
  const [updateSuccessToast, setUpdateSuccessToast] = useState(false);
  const [successResult, setSuccessResult] = useState<any | null>(null);

  // UX Requirement 4: Guided 4-stage progressive disclosure state (default guided)
  const [guidedStep, setGuidedStep] = useState<number>(() => {
    const progress = calculateLoopProgress(initialData || {});
    return progress.currentStage < 2 ? 1 : progress.currentStage < 3 ? 2 : 4;
  });
  const [showAllFields, setShowAllFields] = useState<boolean>(false);

  // Sync state if initialData is provided or updated (e.g. onResumeDraft)
  const lastHydratedKeyRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (initialData) {
      const incomingKey = propTraceId || initialData.traceId || (initialData as any)?.id || 'new_trace';
      if (lastHydratedKeyRef.current !== incomingKey) {
        lastHydratedKeyRef.current = incomingKey;
        if (initialData.traceId || (initialData as any).id) {
          setTraceId(initialData.traceId || (initialData as any).id);
        }
        if (initialData.trigger !== undefined) setTrigger(initialData.trigger);
        if (initialData.emotionOrBody !== undefined) setEmotionOrBody(initialData.emotionOrBody);
        if (initialData.automaticStory !== undefined) setAutomaticStory(initialData.automaticStory);
        if (initialData.facts !== undefined) setFacts(initialData.facts);
        if (initialData.needs !== undefined || initialData.desires !== undefined) setDesires(initialData.needs || initialData.desires || '');
        if (initialData.options !== undefined || initialData.oldResponse !== undefined) setOldResponse(initialData.options || initialData.oldResponse || '');
        if (initialData.microAction !== undefined || initialData.newChoice !== undefined) setNewChoice(initialData.microAction || initialData.newChoice || '');
        if (initialData.reflection !== undefined || initialData.insights !== undefined) setInsights(initialData.reflection || initialData.insights || '');
        if (initialData.isConfirmed !== undefined) setIsConfirmed(Boolean(initialData.isConfirmed));
        if (Array.isArray((initialData as any).emotionTags) && (initialData as any).emotionTags.length > 0) {
          setEmotionTags((initialData as any).emotionTags);
        } else if (Array.isArray((initialData as any).emotion_tags) && (initialData as any).emotion_tags.length > 0) {
          setEmotionTags((initialData as any).emotion_tags);
        }
      }
    }
  }, [initialData, propTraceId]);

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

  const progressEval = calculateLoopProgress({
    trigger,
    emotionOrBody,
    automaticStory,
    facts,
    desires,
    needs: desires,
    oldResponse,
    options: oldResponse,
    newChoice,
    microAction: newChoice,
    insights,
    reflection: insights,
  });

  const draftSnapshot = JSON.stringify({ trigger, emotionOrBody, automaticStory, facts, desires, oldResponse, newChoice, insights, emotionTags });
  const draftIsSaved = savedDraftSnapshot === draftSnapshot;
  const nextHelpfulStep = progressEval.currentStage < 2 ? 1 : progressEval.currentStage < 3 ? 2 : 4;

  // Validate required fields before Growth Event confirmation
  const validateBeforeConfirm = (): { isValid: boolean; missingFields: string[] } => {
    return validateLoopForConfirmation({
      trigger,
      emotionOrBody,
      automaticStory,
      facts,
      desires,
      needs: desires,
      oldResponse,
      options: oldResponse,
      newChoice,
      microAction: newChoice,
      insights,
      reflection: insights,
    });
  };

  const handleRequestConfirm = () => {
    const { isValid, missingFields } = validateBeforeConfirm();
    if (!isValid) {
      setErrorMsg(
        `ข้อมูลยังไม่ครบถ้วนสำหรับการยืนยัน Growth Event (ยังขาด: ${missingFields.join(', ')}) คุณสามารถกด "บันทึกไว้ก่อน" ได้ทุกเมื่อ หรือกรอกข้อมูลเพิ่มเติมเพื่อส่งพลังการเติบโต 🌱`
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
        `ข้อมูลยังไม่ครบถ้วนสำหรับการยืนยัน Growth Event (ยังขาด: ${missingFields.join(', ')}) คุณสามารถกด "บันทึกไว้ก่อน" ได้ทุกเมื่อ หรือกรอกข้อมูลเพิ่มเติมเพื่อส่งพลังการเติบโต 🌱`
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
    if (isSavingDraft || !progressEval.canSaveDraft) return;
    setIsSavingDraft(true);
    setErrorMsg(null);
    try {
      const cleanField = (val?: string) => (val === 'ยังไม่ได้สำรวจ' ? '' : val || '');
      if (traceId) {
        const res = await updateTrace(traceId, {
          trigger: cleanField(trigger),
          emotionOrBody: cleanField(emotionOrBody),
          automaticStory: cleanField(automaticStory),
          facts: cleanField(facts),
          desires: cleanField(desires),
          oldResponse: cleanField(oldResponse),
          newChoice: cleanField(newChoice),
          insights: cleanField(insights),
          emotionTags,
        });
        if (res.success) {
          setDraftSavedToast(true);
          setSavedDraftSnapshot(draftSnapshot);
          setTimeout(() => setDraftSavedToast(false), 2500);
        } else {
          setErrorMsg(res.error || 'ไม่สามารถบันทึกแบบร่างได้ กรุณาลองใหม่อีกครั้ง');
        }
        return;
      }

      const res = await createDraftTrace({
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
          setSavedDraftSnapshot(draftSnapshot);
        setTimeout(() => setDraftSavedToast(false), 2500);
      } else {
        setErrorMsg(res.error || 'ไม่สามารถสร้างแบบร่างได้ กรุณาลองใหม่อีกครั้ง');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการบันทึกแบบร่าง');
    } finally {
      setIsSavingDraft(false);
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
            <span>เก็บสิ่งที่สังเกตได้วันนี้ไว้ก่อนได้</span>
          </div>
          <div style={{ marginTop: '4px', fontSize: '11.5px' }}>
            ไม่ต้องตอบครบ 8 ช่องในครั้งเดียว บันทึกเท่าที่รู้ตอนนี้ แล้วกลับมาสานต่อเมื่อพร้อมได้ 🌱
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
            <span>เริ่มจากเรื่องเดียวก็พอ</span>
          </div>
          <div style={{ marginTop: '4px', fontSize: '11.5px' }}>
            ตอนนี้รู้สึกอย่างไร หรือมีอะไรเกิดขึ้น? เขียนสั้น ๆ เพียงช่องเดียวก็บันทึกไว้ได้
          </div>
        </div>
      )}

      {/* 4-Stage Loop Progress Stepper (Directive: 4 ช่วงการสำรวจลูป แยกจาก EXP น้อง) */}
      <div
        data-testid="loop-progress-stepper"
        style={{
          background: 'linear-gradient(135deg, #FFF7ED 0%, #FEF3C7 100%)',
          border: '1.5px solid #FDE68A',
          borderRadius: '16px',
          padding: '12px 14px',
          marginBottom: '14px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#92400E' }}>
            🌱 ความคืบหน้าของลูปนี้ ({progressEval.currentStage}/4 ช่วง)
          </span>
          <span
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '999px',
              background: progressEval.currentStage === 4 ? '#DEF7EC' : '#FEF08A',
              color: progressEval.currentStage === 4 ? '#03543F' : '#854D0E',
              fontWeight: 600,
            }}
          >
            {progressEval.stageName}
          </span>
        </div>

        {/* 4-Step Indicator Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '8px' }}>
          {[
            { num: 1, name: 'สังเกตตัวเอง', active: progressEval.stageStatus.stage1 },
            { num: 2, name: 'เห็นเหตุการณ์ & ความรู้สึก', active: progressEval.stageStatus.stage2 },
            { num: 3, name: 'แยกความจริง & ความคิด', active: progressEval.stageStatus.stage3 },
            { num: 4, name: 'เห็นข้อเรียนรู้ / สิ่งที่จะลองทำ', active: progressEval.stageStatus.stage4 },
          ].map((s) => (
            <div
              key={s.num}
              data-testid={`stepper-step-${s.num}`}
              onClick={() => {
                setGuidedStep(s.num);
                setShowAllFields(false);
              }}
              style={{
                borderRadius: '8px',
                padding: '6px 4px',
                textAlign: 'center',
                background: s.active ? '#10B981' : '#FFFFFF',
                color: s.active ? '#FFFFFF' : '#6B7280',
                border: s.num === guidedStep && !showAllFields ? '2px solid #E11D48' : s.active ? '1px solid #059669' : '1px solid #E5E7EB',
                boxShadow: s.num === guidedStep && !showAllFields ? '0 0 8px rgba(225, 29, 72, 0.4)' : s.active ? '0 2px 4px rgba(16, 185, 129, 0.2)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 700 }}>
                {s.active ? '✓' : s.num} {s.num === guidedStep && !showAllFields && '📍'}
              </div>
              <div style={{ fontSize: '9.5px', lineHeight: 1.2, marginTop: '2px' }}>
                {s.name}
              </div>
            </div>
          ))}
        </div>

        {/* Warm Guidance (No Pass/Fail Examination Tone) */}
        <div style={{ fontSize: '11.5px', color: '#78350F', lineHeight: 1.4 }}>
          {progressEval.currentStage === 4 ? (
            <span>💖 ครบลูปสำคัญแล้ว! พร้อมสำหรับการยืนยันเพื่อมอบพลังเติบโต หรือกดบันทึกไว้ก่อนได้ตลอดเวลา</span>
          ) : progressEval.currentStage === 3 ? (
            <span>✨ แยกความคิดออกจากความจริงได้ชัดเจนแล้ว ชวนมองต่อ: มีก้าวเล็กๆ ที่จะลองทำ หรือบทเรียนที่มองเห็นบ้างไหม</span>
          ) : progressEval.currentStage === 2 ? (
            <span>🍃 เห็นเหตุการณ์และความรู้สึกแล้ว ลองสังเกตแยกแยะ: ข้อเท็จจริงที่เกิดขึ้นคืออะไร และความคิดแวบแรกในหัวคืออะไร</span>
          ) : progressEval.currentStage === 1 ? (
            <span>🌱 จุดเริ่มต้นที่ดีมาก! ลองสังเกตเพิ่มอีกนิดให้เห็นทั้งจุดสะกิด และความรู้สึก/สัญญาณร่างกายที่เกิดขึ้น</span>
          ) : (
            <span>🌱 ค่อยๆ เริ่มต้นสำรวจอย่างผ่อนคลาย ด้วยการบันทึกสิ่งที่มากระทบ หรือความรู้สึกในกาย/ใจตอนนี้ได้เลยนะ</span>
          )}
        </div>
      </div>

      {!isConfirmed && (
        <div style={{ margin: '0 0 14px', color: '#6B4B42', fontSize: '12px' }}>
          <div role="progressbar" aria-label="ความคืบหน้าการสำรวจลูป" aria-valuemin={0} aria-valuemax={4} aria-valuenow={progressEval.currentStage}
            style={{ height: '8px', background: '#FCE7F3', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ width: `${progressEval.currentStage * 25}%`, height: '100%', background: '#DB2777', transition: 'width 0.2s' }} />
          </div>
          <p style={{ margin: '6px 0' }}>บันทึกความคืบหน้าไว้ได้ทุกช่วง · ยืนยันเมื่อพร้อมจึงนับ 1 ลูปให้น้อง</p>
          {draftIsSaved && (
            <div role="status" style={{ padding: '12px', background: '#ECFDF5', borderRadius: '12px', color: '#065F46' }}>
              ✓ เก็บสิ่งที่สังเกตไว้แล้ว วันนี้แค่นี้ก็ได้ กลับมาที่ประวัติแล้วกด “สานต่อ” เมื่อพร้อม
              <button type="button" onClick={onClose} style={{ display: 'block', marginTop: '8px', padding: '8px 12px' }}>พักไว้แค่นี้ก่อน</button>
            </div>
          )}
        </div>
      )}

      {/* Guided Mode vs Show All 8 Fields Toggle Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#FFF1F2',
          border: '1px solid #FECDD3',
          borderRadius: '14px',
          padding: '8px 12px',
          marginBottom: '12px',
        }}
      >
        <button
          type="button"
          data-testid="toggle-show-all-fields"
          onClick={() => setShowAllFields((prev) => !prev)}
          style={{
            background: showAllFields ? '#E11D48' : '#FFFFFF',
            border: showAllFields ? '1px solid #BE123C' : '1px solid #FDA4AF',
            color: showAllFields ? '#FFFFFF' : '#9D174D',
            padding: '5px 12px',
            borderRadius: '999px',
            fontSize: '11.5px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            transition: 'all 0.15s ease',
          }}
        >
          {showAllFields ? '🧭 แนะนำทีละช่วง (ช่วงที่ ' + guidedStep + ')' : '📋 ดูทั้งหมด 8 ช่อง'}
        </button>

        {!showAllFields && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              data-testid="prev-stage-btn"
              disabled={guidedStep <= 1}
              onClick={() => setGuidedStep((prev) => Math.max(1, prev - 1))}
              style={{
                padding: '4px 9px',
                borderRadius: '8px',
                background: guidedStep <= 1 ? '#F3F4F6' : '#FFFFFF',
                border: '1px solid #E5E7EB',
                color: guidedStep <= 1 ? '#9CA3AF' : '#374151',
                fontSize: '11px',
                fontWeight: 600,
                cursor: guidedStep <= 1 ? 'not-allowed' : 'pointer',
              }}
            >
              ◂ ก่อนหน้า
            </button>
            <span style={{ fontSize: '11px', color: '#9D174D', fontWeight: 700 }}>
              {guidedStep}/4
            </span>
            <button
              type="button"
              data-testid="next-stage-btn"
              disabled={guidedStep >= 4}
              onClick={() => setGuidedStep((prev) => Math.min(4, prev + 1))}
              style={{
                padding: '4px 9px',
                borderRadius: '8px',
                background: guidedStep >= 4 ? '#F3F4F6' : '#FFFFFF',
                border: '1px solid #E5E7EB',
                color: guidedStep >= 4 ? '#9CA3AF' : '#374151',
                fontSize: '11px',
                fontWeight: 600,
                cursor: guidedStep >= 4 ? 'not-allowed' : 'pointer',
              }}
            >
              ถัดไป ▸
            </button>
          </div>
        )}
      </div>

      {/* 8 Sections Form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* STAGE 1: สังเกตตัวเอง (Trigger & Emotion/Body) */}
        <div
          data-testid="stage-section-1"
          style={{
            display: showAllFields || guidedStep === 1 ? 'flex' : 'none',
            flexDirection: 'column',
            gap: '10px',
            background: !showAllFields ? '#FFFDFE' : 'transparent',
            padding: !showAllFields ? '10px' : '0',
            borderRadius: !showAllFields ? '14px' : '0',
            border: !showAllFields ? '1px solid #FFE4E6' : 'none',
          }}
        >
          {!showAllFields && (
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#9D174D', marginBottom: '2px' }}>
              🌱 ช่วงที่ 1: สังเกตตัวเอง (จุดสะกิดและอารมณ์/ความรู้สึกในกาย)
            </div>
          )}
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
        </div>

        {/* STAGE 2: เห็นเหตุการณ์ & ความรู้สึก (Cognitive Clarity: Story vs Facts) */}
        <div
          data-testid="stage-section-2"
          style={{
            display: showAllFields || guidedStep === 2 ? 'flex' : 'none',
            flexDirection: 'column',
            gap: '10px',
            background: !showAllFields ? '#FFFDFE' : 'transparent',
            padding: !showAllFields ? '10px' : '0',
            borderRadius: !showAllFields ? '14px' : '0',
            border: !showAllFields ? '1px solid #FFE4E6' : 'none',
          }}
        >
          {!showAllFields && (
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#9D174D', marginBottom: '2px' }}>
              🔍 ช่วงที่ 2: แยกแยะความจริง (เรื่องเล่าในหัว vs สิ่งที่เกิดขึ้นจริง)
            </div>
          )}
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
        </div>

        {/* STAGE 3: สำรวจความต้องการ & ทางเลือก (Needs & Options) */}
        <div
          data-testid="stage-section-3"
          style={{
            display: showAllFields || guidedStep === 3 ? 'flex' : 'none',
            flexDirection: 'column',
            gap: '10px',
            background: !showAllFields ? '#FFFDFE' : 'transparent',
            padding: !showAllFields ? '10px' : '0',
            borderRadius: !showAllFields ? '14px' : '0',
            border: !showAllFields ? '1px solid #FFE4E6' : 'none',
          }}
        >
          {!showAllFields && (
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#9D174D', marginBottom: '2px' }}>
              🌿 ช่วงที่ 3: สำรวจความต้องการ & ทางเลือก (ไม่บังคับ)
            </div>
          )}
          {/* 5. Needs / Desires */}
          <div>
            <label style={labelStyle}>
              5. ความต้องการลึกๆ (Needs & Desires){' '}
              <span style={{ color: '#9CA3AF', fontWeight: 400, fontSize: '11px' }}>(ไม่บังคับ)</span>
            </label>
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
            <label style={labelStyle}>
              6. ทางเลือกใหม่ (Options & Choices){' '}
              <span style={{ color: '#9CA3AF', fontWeight: 400, fontSize: '11px' }}>(ไม่บังคับ)</span>
            </label>
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
        </div>

        {/* STAGE 4: เห็นข้อเรียนรู้ / สิ่งที่จะลองทำ (Micro-action & Reflection) */}
        <div
          data-testid="stage-section-4"
          style={{
            display: showAllFields || guidedStep === 4 ? 'flex' : 'none',
            flexDirection: 'column',
            gap: '10px',
            background: !showAllFields ? '#FFFDFE' : 'transparent',
            padding: !showAllFields ? '10px' : '0',
            borderRadius: !showAllFields ? '14px' : '0',
            border: !showAllFields ? '1px solid #FFE4E6' : 'none',
          }}
        >
          {!showAllFields && (
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#9D174D', marginBottom: '2px' }}>
              ✨ ช่วงที่ 4: สิ่งที่จะลองทำ & บทเรียน (เลือกทำ 7 หรือ 8 เพื่อครบลูป)
            </div>
          )}
          {/* 7. Micro-action */}
          <div>
            <label style={labelStyle}>
              7. การลงมือทำย่อย (Micro-action){' '}
              <span style={{ color: '#059669', fontSize: '11px', fontWeight: 400 }}>(เลือกกรอก 7 หรือ 8 เพื่อครบลูป)</span>
            </label>
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
            <label style={labelStyle}>
              8. การสะท้อนคิด (Reflection & Insights){' '}
              <span style={{ color: '#059669', fontSize: '11px', fontWeight: 400 }}>(เลือกกรอก 7 หรือ 8 เพื่อครบลูป)</span>
            </label>
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
          data-testid="save-draft-btn"
          onClick={handleSaveDraft}
          disabled={isSavingDraft || !progressEval.canSaveDraft}
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
          title="เช็กอินใจ / บันทึกลูปที่กำลังสำรวจไว้ก่อนได้ตลอดเวลา"
        >
          {isSavingDraft ? 'กำลังเก็บบันทึก...' : draftIsSaved || draftSavedToast ? '✓ บันทึกไว้แล้ว' : '🌱 บันทึกไว้ก่อน'}
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
            onClick={() => {
              if (progressEval.canConfirm) handleRequestConfirm();
              else { setShowAllFields(false); setGuidedStep(nextHelpfulStep); }
            }}
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
            {isSubmitting ? 'กำลังตรวจสอบ...' : progressEval.canConfirm ? '✨ ยืนยันลูปของฉัน (+1 ลูป)' : 'สำรวจต่อเมื่อพร้อม →'}
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
