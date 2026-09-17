import React, { useState } from 'react';
import { useCompanion } from '../context/CompanionContext';
import { CompanionRenderer } from './CompanionRenderer';

interface ConversationalOnboardingProps {
  onComplete: () => void;
  onCancel?: () => void;
  initialStep?: number;
}

export const ConversationalOnboarding: React.FC<ConversationalOnboardingProps> = ({
  onComplete,
  onCancel,
  initialStep = 1,
}) => {
  const { companion, createCompanionFromOnboarding } = useCompanion();
  const [step, setStep] = useState<number>(initialStep);
  const [toneStyle, setToneStyle] = useState<string>('gentle');
  const [focusArea, setFocusArea] = useState<string>('anxiety');
  const [safeSpace, setSafeSpace] = useState<string>('moonlit_pond');
  const [companionName, setCompanionName] = useState<string>(() => companion?.name || 'น้องดึงสติ');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [createdDnaPreview, setCreatedDnaPreview] = useState<any>(() => companion?.dna || null);

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      const created = await createCompanionFromOnboarding({
        toneStyle,
        focusArea,
        safeSpace,
        companionName,
      });
      setCreatedDnaPreview(created.dna);
      try {
        localStorage.setItem('deung_sati_onboarding_egg_created', 'true');
      } catch {}
      setStep(5); // Reveal step
    } catch (err) {
      console.error('Failed to create companion:', err);
      // Still allow proceeding to reveal
      setStep(5);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="onboardingOverlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'linear-gradient(180deg, #FBF8F3 0%, #F5EDE4 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 20px',
        overflowY: 'auto',
      }}
    >
      <div
        className="onboardingCard"
        style={{
          width: '100%',
          maxWidth: '480px',
          maxHeight: 'calc(100dvh - 32px)',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          background: 'rgba(255, 255, 255, 0.92)',
          borderRadius: '28px',
          padding: '28px 24px',
          boxShadow: '0 20px 40px rgba(100, 70, 80, 0.08)',
          border: '1px solid rgba(230, 215, 205, 0.6)',
          backdropFilter: 'blur(10px)',
          position: 'relative',
        }}
      >
        {onCancel && step < 5 && (
          <button
            onClick={onCancel}
            style={{
              position: 'absolute',
              top: '18px',
              right: '20px',
              background: 'none',
              border: 'none',
              fontSize: '22px',
              color: '#8E7D73',
              cursor: 'pointer',
            }}
            title="ข้ามไปก่อน"
          >
            ×
          </button>
        )}

        {/* Step Indicator */}
        {step <= 4 && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                style={{
                  flex: 1,
                  height: '5px',
                  borderRadius: '10px',
                  background: s <= step ? '#657E53' : '#E8DFD8',
                  transition: 'background 0.3s ease',
                }}
              />
            ))}
          </div>
        )}

        {/* STEP 1: Care & Tone Style */}
        {step === 1 && (
          <div>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🌱</div>
            <h2 style={{ fontSize: '20px', color: '#3E2D23', fontWeight: 700, margin: '0 0 8px 0' }}>
              ยินดีต้อนรับสู่ดึงสติ
            </h2>
            <p style={{ fontSize: '14px', color: '#6E5D53', lineHeight: 1.5, margin: '0 0 20px 0' }}>
              เมื่อคุณเริ่มสังเกตความคิดและความรู้สึก คุณอยากให้เพื่อนร่วมทางคนนี้คอยเตือนสติในรูปแบบไหน?
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              {[
                {
                  id: 'gentle',
                  title: 'อ่อนโยนและรับฟัง',
                  desc: 'รับฟังอย่างไม่ตัดสิน ให้ความอบอุ่น ชวนกลับมารู้ตัวช้าๆ',
                  emoji: '🌸',
                },
                {
                  id: 'direct',
                  title: 'ตรงไปตรงมา กระชับ ชัดเจน',
                  desc: 'กระชับ ไม่เยิ่นเย้อ ชวนแยกความจริงกับความคิดทันที',
                  emoji: '⚡',
                },
                {
                  id: 'quiet',
                  title: 'สงบนิ่ง อยู่เคียงข้าง',
                  desc: 'เงียบสงบ อยู่เป็นเพื่อนเงียบๆ ชวนหยุดหายใจก่อนทำอะไร',
                  emoji: '🍃',
                },
              ].map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => setToneStyle(opt.id)}
                  style={{
                    padding: '16px',
                    borderRadius: '18px',
                    border: toneStyle === opt.id ? '2px solid #657E53' : '1px solid #EAE2DB',
                    background: toneStyle === opt.id ? '#F4F7F2' : '#FFFFFF',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span style={{ fontSize: '26px' }}>{opt.emoji}</span>
                  <div>
                    <div style={{ fontWeight: 600, color: '#3E2D23', fontSize: '15px' }}>{opt.title}</div>
                    <div style={{ fontSize: '12px', color: '#7E6D63', marginTop: '2px' }}>{opt.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setStep(2)}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '16px',
                background: '#657E53',
                color: '#FFF',
                fontWeight: 600,
                fontSize: '15px',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              ต่อไป
            </button>
          </div>
        )}

        {/* STEP 2: Primary Focus Area */}
        {step === 2 && (
          <div>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎯</div>
            <h2 style={{ fontSize: '20px', color: '#3E2D23', fontWeight: 700, margin: '0 0 8px 0' }}>
              ช่วงนี้อยากโฟกัสสังเกตเรื่องอะไร?
            </h2>
            <p style={{ fontSize: '14px', color: '#6E5D53', lineHeight: 1.5, margin: '0 0 20px 0' }}>
              พลังงานในการสังเกตของคุณจะถูกส่งต่อไปหล่อหลอม Growth DNA ของมาสคอต
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              {[
                {
                  id: 'anxiety',
                  title: 'ลดความกังวลและความคิดวน',
                  desc: 'หยุดการคิดล่วงหน้า หรือคิดวนซ้ำๆ กับเรื่องเดิม',
                  emoji: '🌀',
                },
                {
                  id: 'anger',
                  title: 'จัดการอารมณ์โกรธ / ปะทะ',
                  desc: 'รู้ทันความหงุดหงิด กรองคำพูดก่อนส่งออกไปทำร้ายใคร',
                  emoji: '🔥',
                },
                {
                  id: 'patience',
                  title: 'ชะลอความใจร้อน ไม่ผัดวันประกันพรุ่ง',
                  desc: 'หยุดก่อนทำตามสัญชาตญาณ สร้างทางเลือกใหม่',
                  emoji: '⏳',
                },
                {
                  id: 'compassion',
                  title: 'เมตตาตนเองและเข้าใจความรู้สึก',
                  desc: 'โอบกอดตัวเองในวันที่เหนื่อยล้า ไม่ซ้ำเติมความผิดพลาด',
                  emoji: '🤍',
                },
              ].map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => setFocusArea(opt.id)}
                  style={{
                    padding: '14px 16px',
                    borderRadius: '16px',
                    border: focusArea === opt.id ? '2px solid #657E53' : '1px solid #EAE2DB',
                    background: focusArea === opt.id ? '#F4F7F2' : '#FFFFFF',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span style={{ fontSize: '22px' }}>{opt.emoji}</span>
                  <div>
                    <div style={{ fontWeight: 600, color: '#3E2D23', fontSize: '14px' }}>{opt.title}</div>
                    <div style={{ fontSize: '12px', color: '#7E6D63' }}>{opt.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setStep(1)}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '16px',
                  background: '#F0EBE5',
                  color: '#5C4A3E',
                  fontWeight: 600,
                  fontSize: '15px',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                ย้อนกลับ
              </button>
              <button
                onClick={() => setStep(3)}
                style={{
                  flex: 2,
                  padding: '14px',
                  borderRadius: '16px',
                  background: '#657E53',
                  color: '#FFF',
                  fontWeight: 600,
                  fontSize: '15px',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                ต่อไป
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Safe Space Habitat */}
        {step === 3 && (
          <div>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🏡</div>
            <h2 style={{ fontSize: '20px', color: '#3E2D23', fontWeight: 700, margin: '0 0 8px 0' }}>
              สภาพแวดล้อมที่ใจเธอรู้สึกปลอดภัยที่สุด
            </h2>
            <p style={{ fontSize: '14px', color: '#6E5D53', lineHeight: 1.5, margin: '0 0 20px 0' }}>
              ห้องพักผ่อนสำหรับเลี้ยงดูมาสคอตและพักใจของคุณ
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '24px' }}>
              {[
                {
                  id: 'moonlit_pond',
                  title: 'บ่อน้ำบัวใต้จันทร์',
                  bg: '#1A2C38',
                  color: '#E0F2FE',
                  emoji: '🌕🪷',
                },
                {
                  id: 'misty_moss',
                  title: 'สวนมอสส์ม่านหมอก',
                  bg: '#25382B',
                  color: '#DCFCE7',
                  emoji: '🌿🌫️',
                },
                {
                  id: 'crystal_cavern',
                  title: 'ถ้ำผลึกเรืองแสง',
                  bg: '#2A1F3D',
                  color: '#F3E8FF',
                  emoji: '✨🔮',
                },
                {
                  id: 'zen_haven',
                  title: 'บ้านไม้เซนร่มรื่น',
                  bg: '#3A2E24',
                  color: '#FEF3C7',
                  emoji: '🎋🪵',
                },
              ].map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => setSafeSpace(opt.id)}
                  style={{
                    padding: '16px 12px',
                    borderRadius: '18px',
                    background: opt.bg,
                    color: opt.color,
                    border: safeSpace === opt.id ? '3px solid #FFF' : '2px solid transparent',
                    boxShadow: safeSpace === opt.id ? '0 0 12px rgba(101, 126, 83, 0.4)' : 'none',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ fontSize: '24px', marginBottom: '6px' }}>{opt.emoji}</div>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>{opt.title}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setStep(2)}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '16px',
                  background: '#F0EBE5',
                  color: '#5C4A3E',
                  fontWeight: 600,
                  fontSize: '15px',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                ย้อนกลับ
              </button>
              <button
                onClick={() => setStep(4)}
                style={{
                  flex: 2,
                  padding: '14px',
                  borderRadius: '16px',
                  background: '#657E53',
                  color: '#FFF',
                  fontWeight: 600,
                  fontSize: '15px',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                ต่อไป
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Name your Companion */}
        {step === 4 && (
          <div>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🥚</div>
            <h2 style={{ fontSize: '20px', color: '#3E2D23', fontWeight: 700, margin: '0 0 8px 0' }}>
              ตั้งชื่อให้ไข่น้อยใบนี้
            </h2>
            <p style={{ fontSize: '14px', color: '#6E5D53', lineHeight: 1.5, margin: '0 0 20px 0' }}>
              เพื่อนที่จะค่อยๆ เติบโตและฟักออกมาจากการสังเกตตนเองของคุณ
            </p>

            <div style={{ marginBottom: '24px' }}>
              <input
                type="text"
                value={companionName}
                onChange={(e) => setCompanionName(e.target.value)}
                placeholder="ชื่อน้องสหายสติ..."
                maxLength={24}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  fontSize: '16px',
                  borderRadius: '16px',
                  border: '2px solid #657E53',
                  background: '#FFF',
                  color: '#3E2D23',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ fontSize: '12px', color: '#8E7D73', marginTop: '6px' }}>
                (คุณสามารถเปลี่ยนชื่อภายหลังได้เสมอ)
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setStep(3)}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '16px',
                  background: '#F0EBE5',
                  color: '#5C4A3E',
                  fontWeight: 600,
                  fontSize: '15px',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                ย้อนกลับ
              </button>
              <button
                disabled={isSubmitting}
                onClick={handleFinish}
                style={{
                  flex: 2,
                  padding: '14px',
                  borderRadius: '16px',
                  background: '#657E53',
                  color: '#FFF',
                  fontWeight: 600,
                  fontSize: '15px',
                  border: 'none',
                  cursor: 'pointer',
                  opacity: isSubmitting ? 0.7 : 1,
                }}
              >
                {isSubmitting ? 'กำลังให้กำเนิดไข่...' : 'รับ Companion Egg ✨'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: REVEAL THE COMPANION EGG */}
        {step === 5 && (
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '22px', color: '#3E2D23', fontWeight: 700, margin: '0 0 6px 0' }}>
              ไข่แห่งการรู้ตัวใบแรกของคุณ 🥚✨
            </h2>
            <p style={{ fontSize: '14px', color: '#6E5D53', margin: '0 0 16px 0' }}>
              ชื่อ: <strong style={{ color: '#657E53' }}>{companionName}</strong>
            </p>

            {/* Egg Visual Display */}
            <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 0 16px 0' }}>
              <CompanionRenderer
                stage={0}
                traceCount={0}
                dna={createdDnaPreview}
                size={220}
              />
            </div>

            {/* Hatching Mechanism Explanation */}
            <div
              style={{
                background: '#F9F5EE',
                border: '1px solid #EAE2D8',
                borderRadius: '18px',
                padding: '16px',
                textAlign: 'left',
                marginBottom: '20px',
              }}
            >
              <div style={{ fontWeight: 700, color: '#3E2D23', fontSize: '14px', marginBottom: '6px' }}>
                🌟 กฎการฟักไข่ด้วยการสังเกตตนเอง:
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: '#6E5D53', lineHeight: 1.6 }}>
                <li>ไข่ใบนี้จะไม่ฟักด้วยเวลา แต่จะฟักด้วย <strong>การรู้ตัวจริง</strong></li>
                <li>ทุกครั้งที่ยืนยัน Completed Loop ที่สังเกตตนเองครบถ้วน จะสะสม <strong>1 แต้มการเติบโต</strong> (บันทึกแบบร่างจะไม่นับแต้มจนกว่าจะยืนยัน)</li>
                <li>เมื่อสะสมครบ <strong>20 ลูปที่ยืนยันแล้ว (0/20)</strong> ไข่จะฟักเป็นมาสคอตแอกโซลอทตัวแรกของคุณ!</li>
              </ul>
            </div>

            <button
              onClick={onComplete}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '18px',
                background: '#657E53',
                color: '#FFF',
                fontWeight: 700,
                fontSize: '16px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 8px 18px rgba(101, 126, 83, 0.3)',
              }}
            >
              เข้าสู่ห้องน้องดึงสติ 🏡
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
