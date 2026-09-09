import React, { useState } from 'react';
import { useCompanion } from '../context/CompanionContext';

export interface LoopReviewData {
  trigger: string;
  emotionOrBody: string;
  automaticStory: string;
  facts: string;
  oldResponse: string;
  newChoice: string;
  emotionTag?: string;
  learningTypes?: string[];
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

export const LEARNING_TYPES_LIST = [
  { id: 'notice_emotion', label: 'สังเกตอารมณ์ได้', effect: 'เพิ่มประกายและลวดลาย' },
  { id: 'separate_fact_story', label: 'แยกความจริงจากความคิด', effect: 'เพิ่มความใสของไข่' },
  { id: 'pause_before_reacting', label: 'หยุดก่อนตอบสนอง', effect: 'แสงเคลื่อนไหวช้าลงและนิ่งขึ้น' },
  { id: 'self_compassion', label: 'เมตตาตัวเอง', effect: 'เพิ่ม Aura นุ่ม' },
  { id: 'set_boundaries', label: 'ตั้งขอบเขต', effect: 'เหงือกชัดและแข็งแรงขึ้น' },
  { id: 'understand_relationships', label: 'เข้าใจความสัมพันธ์', effect: 'หนวดแตกแขนงหลากหลาย' },
  { id: 'new_choice', label: 'เลือกทางใหม่', effect: 'เสาไฟบนศีรษะเติบโต' },
  { id: 'take_micro_action', label: 'ลงมือทดลองจริง', effect: 'เพิ่มความสว่างและการเคลื่อนไหว' },
];

interface LoopReviewCardProps {
  conversationId: string;
  initialData?: Partial<LoopReviewData>;
  onClose?: () => void;
  onConfirmed?: (result: any) => void;
  isCrisisSession?: boolean;
}

export const LoopReviewCard: React.FC<LoopReviewCardProps> = ({
  conversationId,
  initialData,
  onClose,
  onConfirmed,
  isCrisisSession = false,
}) => {
  const { completeLoop, saveDraft } = useCompanion();

  const [trigger, setTrigger] = useState(initialData?.trigger || '');
  const [emotionOrBody, setEmotionOrBody] = useState(initialData?.emotionOrBody || '');
  const [automaticStory, setAutomaticStory] = useState(initialData?.automaticStory || '');
  const [facts, setFacts] = useState(initialData?.facts || '');
  const [oldResponse, setOldResponse] = useState(initialData?.oldResponse || '');
  const [newChoice, setNewChoice] = useState(initialData?.newChoice || '');
  const [emotionTag, setEmotionTag] = useState(initialData?.emotionTag || 'anxiety');
  const [learningTypes, setLearningTypes] = useState<string[]>(
    initialData?.learningTypes || ['notice_emotion', 'separate_fact_story', 'new_choice']
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [draftSavedToast, setDraftSavedToast] = useState(false);
  const [duplicateModal, setDuplicateModal] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<any | null>(null);

  const toggleLearningType = (id: string) => {
    setLearningTypes((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleConfirm = async (isReviewOverride = false) => {
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const idempotencyKey = `idemp_${conversationId}_${Date.now()}`;
      const payload = {
        conversationId,
        idempotencyKey,
        trigger,
        emotionOrBody,
        automaticStory,
        facts,
        oldResponse,
        newChoice,
        emotionTag,
        learningTypes,
        isReview: isReviewOverride,
        isCrisis: isCrisisSession,
      };

      const res = await completeLoop(payload);

      if (res.isDuplicateCandidate) {
        setDuplicateModal(res.message || 'ตรวจพบลูปที่คล้ายกันที่คุณเคยบันทึกไว้แล้ว');
        setIsSubmitting(false);
        return;
      }

      if (!res.success) {
        setErrorMsg(res.error || 'ไม่สามารถบันทึกลูปได้ กรุณาตรวจความถูกต้องของข้อมูล');
        setIsSubmitting(false);
        return;
      }

      setSuccessResult(res);
      if (onConfirmed) onConfirmed(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    try {
      await saveDraft({
        conversationId,
        trigger,
        emotionOrBody,
        automaticStory,
        facts,
        oldResponse,
        newChoice,
      });
      setDraftSavedToast(true);
      setTimeout(() => setDraftSavedToast(false), 2500);
    } catch (err) {
      console.warn('Draft save error:', err);
    }
  };

  // SUCCESS VIEW: Animation of Egg absorbing qualities
  if (successResult) {
    const feedback = successResult.eggFeedback || {};
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
        <div style={{ fontSize: '40px', marginBottom: '8px', animation: 'bounceHeart 1.5s infinite' }}>
          ✨🥚✨
        </div>
        <h3 style={{ margin: '0 0 6px 0', color: '#9D174D', fontSize: '18px', fontWeight: 700 }}>
          {feedback.message || 'บันทึก Completed Loop เรียบร้อยแล้ว!'}
        </h3>
        <p style={{ fontSize: '13px', color: '#B91C1C', fontStyle: 'italic', margin: '0 0 16px 0' }}>
          “{feedback.quote || 'สีเหล่านี้คือสิ่งที่เราเคยผ่าน ไม่ใช่สิ่งที่นิยามว่าเราเป็นใคร'}”
        </p>

        <div
          style={{
            background: 'rgba(255, 255, 255, 0.9)',
            border: '1px solid #FFE4E6',
            borderRadius: '16px',
            padding: '12px',
            marginBottom: '16px',
            fontSize: '13px',
            color: '#4B5563',
          }}
        >
          <div>ความคืบหน้าไข่: <b>{successResult.progressCount}/20</b> ลูป</div>
          {successResult.reward?.dailyRewardCapped && (
            <small style={{ color: '#D97706', display: 'block', marginTop: '4px' }}>
              (รับแต้มรางวัลประจำวันครบโควตา 5 ครั้งแล้ว แต่ไข่ยังคงเติบโตต่อไปอย่างงดงาม)
            </small>
          )}
          {successResult.reward?.xp > 0 && (
            <div style={{ color: '#059669', fontWeight: 600, marginTop: '4px' }}>
              +{successResult.reward.xp} XP • +{successResult.reward.shells} เปลือกหอย 🐚
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
          ไปคุยต่อกับเพื่อนใจ 💖
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
          <span style={{ fontSize: '20px' }}>👁️</span>
          <div>
            <h4 style={{ margin: 0, fontSize: '15px', color: '#9D174D', fontWeight: 700 }}>
              เราเห็นลูปนี้แล้ว
            </h4>
            <small style={{ color: '#832729', fontSize: '11px' }}>
              ตรวจทานและยืนยันข้อมูลทั้ง 6 ส่วน เพื่อส่งพลังให้ไข่เติบโต
            </small>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '18px', color: '#9CA3AF', cursor: 'pointer' }}
          >
            ✕
          </button>
        )}
      </div>

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

      {/* 6 Fields Form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* 1. Trigger */}
        <div>
          <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: '3px' }}>
            1. จุดสะกิด / สิ่งที่เกิดขึ้นจริง (Trigger)
          </label>
          <input
            type="text"
            value={trigger}
            onChange={(e) => setTrigger(e.target.value)}
            placeholder="เช่น เขาอ่านข้อความแล้วยังไม่ตอบมา 4 ชั่วโมง..."
            style={inputStyle}
          />
        </div>

        {/* 2. Emotion / Body Signal */}
        <div>
          <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: '3px' }}>
            2. ความรู้สึก / สัญญาณร่างกาย (Emotion & Body)
          </label>
          <input
            type="text"
            value={emotionOrBody}
            onChange={(e) => setEmotionOrBody(e.target.value)}
            placeholder="เช่น ใจเต้นเร็ว แน่นหน้าอก รู้สึกกลัวและเหงา..."
            style={inputStyle}
          />
        </div>

        {/* 3. Automatic Story */}
        <div>
          <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: '3px' }}>
            3. ความคิดแวบแรก / สิ่งที่ใจแอบคิด (Automatic Story)
          </label>
          <input
            type="text"
            value={automaticStory}
            onChange={(e) => setAutomaticStory(e.target.value)}
            placeholder="เช่น เขาคงเบื่อเราแล้ว ไม่อยากคุยกับเราแล้วแน่ๆ..."
            style={inputStyle}
          />
        </div>

        {/* 4. Facts */}
        <div>
          <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: '3px' }}>
            4. ข้อเท็จจริงที่รู้แน่ แยกจากการคาดเดา (Facts)
          </label>
          <input
            type="text"
            value={facts}
            onChange={(e) => setFacts(e.target.value)}
            placeholder="เช่น รู้แค่เขายังไม่ได้ตอบ ส่วนเหตุผลจริงๆ ยังไม่รู้..."
            style={inputStyle}
          />
        </div>

        {/* 5. Old Response */}
        <div>
          <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: '3px' }}>
            5. สิ่งที่ปกติเคยทำตามความเคยชิน (Old Habitual Response)
          </label>
          <input
            type="text"
            value={oldResponse}
            onChange={(e) => setOldResponse(e.target.value)}
            placeholder="เช่น ทักย้ำไป 5 ข้อความ หรือนั่งจ้องจอไม่เป็นอันทำอะไร..."
            style={inputStyle}
          />
        </div>

        {/* 6. New Choice */}
        <div>
          <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: '3px' }}>
            6. ทางเลือกใหม่ที่ตั้งใจทำในครั้งนี้ (New Choice)
          </label>
          <input
            type="text"
            value={newChoice}
            onChange={(e) => setNewChoice(e.target.value)}
            placeholder="เช่น วางมือถือ 30 นาที แล้วไปล้างหน้าดื่มน้ำให้ใจนิ่งก่อน..."
            style={inputStyle}
          />
        </div>

        {/* Emotion Selector */}
        <div style={{ marginTop: '6px' }}>
          <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: '6px' }}>
            🎨 สีอารมณ์ของลูปนี้ (ช่วยแต่งแต้ม Growth DNA ของน้อง):
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {EMOTIONS_LIST.map((em) => {
              const selected = emotionTag === em.id;
              return (
                <button
                  key={em.id}
                  type="button"
                  onClick={() => setEmotionTag(em.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 8px',
                    borderRadius: '999px',
                    fontSize: '11px',
                    border: selected ? `2px solid ${em.color}` : '1px solid #E5E7EB',
                    background: selected ? '#FFF1F2' : '#FFFFFF',
                    color: selected ? '#9D174D' : '#4B5563',
                    fontWeight: selected ? 600 : 400,
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: em.color }} />
                  {em.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Learning Types Checkboxes */}
        <div style={{ marginTop: '6px' }}>
          <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: '6px' }}>
            ✨ สิ่งที่ได้เรียนรู้จากลูปนี้:
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
            {LEARNING_TYPES_LIST.map((lt) => {
              const checked = learningTypes.includes(lt.id);
              return (
                <label
                  key={lt.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '11px',
                    color: checked ? '#831843' : '#6B7280',
                    background: checked ? '#FDF2F8' : '#F9FAFB',
                    border: checked ? '1px solid #F472B6' : '1px solid #E5E7EB',
                    borderRadius: '8px',
                    padding: '6px 8px',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleLearningType(lt.id)}
                    style={{ accentColor: '#E11D48' }}
                  />
                  <span>{lt.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      {/* Near Duplicate Confirmation Modal */}
      {duplicateModal && (
        <div
          style={{
            background: '#FEF3C7',
            border: '1.5px solid #F59E0B',
            borderRadius: '16px',
            padding: '12px',
            marginTop: '14px',
            fontSize: '12.5px',
            color: '#92400E',
          }}
        >
          <p style={{ margin: '0 0 8px 0', fontWeight: 600 }}>{duplicateModal}</p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => handleConfirm(true)}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '10px',
                background: '#D97706',
                color: '#FFF',
                border: 'none',
                fontWeight: 600,
                fontSize: '11.5px',
                cursor: 'pointer',
              }}
            >
              เป็นการทบทวนเดิม (บันทึกโดยไม่นับแต้มซ้ำ)
            </button>
            <button
              type="button"
              onClick={() => setDuplicateModal(null)}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '10px',
                background: '#FFF',
                color: '#92400E',
                border: '1px solid #F59E0B',
                fontWeight: 600,
                fontSize: '11.5px',
                cursor: 'pointer',
              }}
            >
              ขอแก้ไขข้อความใหม่
            </button>
          </div>
        </div>
      )}

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
            fontSize: '12.5px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {draftSavedToast ? '✓ บันทึกแบบร่างแล้ว' : 'บันทึกแบบร่าง'}
        </button>

        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => handleConfirm(false)}
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
      </div>
    </div>
  );
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
