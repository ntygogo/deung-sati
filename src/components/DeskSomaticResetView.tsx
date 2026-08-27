import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Coffee, CheckCircle } from 'lucide-react';

interface SomaticStep {
  title: string;
  instruction: string;
  emoji: string;
  detail: string;
  duration: number;
}

const SOMATIC_STEPS: SomaticStep[] = [
  {
    title: '1. หย่อนไหล่ & สลัดฝ่ามือ',
    instruction: 'ทิ้งหัวไหล่ลงให้ห่างจากใบหู สลัดข้อมือและนิ้วมือเบาๆ 5-10 ครั้ง',
    emoji: '👐',
    detail: 'ช่วยคลายกล้ามเนื้อ Trapezius ที่เกร็งตัวจากการพิมพ์งานหน้าจอคอมพิวเตอร์',
    duration: 15,
  },
  {
    title: '2. คลายกราม & ผ่อนหัวคิ้ว',
    instruction: 'อ้าปากเล็กน้อยให้ฟันบนและล่างไม่สัมผัสกัน ผ่อนคลายกล้ามเนื้อระหว่างคิ้ว',
    emoji: '😌',
    detail: 'กรามเป็นจุดที่กักเก็บความเครียดและความโกรธสะสมไว้มากที่สุดในใบหน้า',
    duration: 15,
  },
  {
    title: '3. ยืดกระดูกสันหลัง & เปิดอก',
    instruction: 'เหยียดหลังตรง ดึงสะบักหลังเข้าหากันเบาๆ เปิดพื้นที่ให้ปอดขยายตัว',
    emoji: '🫁',
    detail: 'การนั่งงอตัวทำให้หายใจตื้น การเปิดอกช่วยส่งสัญญาณความปลอดภัยไปยังสมอง',
    duration: 15,
  },
  {
    title: '4. ถอนหายใจลึก (Somatic Sigh)',
    instruction: 'สูดหายใจเข้าทางจมูก 2 จังหวะสั้นๆ แล้วพรูลมหายใจออกทางปากยาวๆ ดัง "ฮู่ว..."',
    emoji: '🌬️',
    detail: 'Double Inhale Sigh ช่วยยุบถุงลมปอดและกระตุ้นระบบประสาทพาราซิมพาเทติกทันที',
    duration: 15,
  },
];

export const DeskSomaticResetView: React.FC = () => {
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(15);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (isActive && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (isActive && timeLeft === 0) {
      if (currentStepIdx < SOMATIC_STEPS.length - 1) {
        setCurrentStepIdx((prev) => prev + 1);
        setTimeLeft(SOMATIC_STEPS[currentStepIdx + 1].duration);
      } else {
        setIsActive(false);
        setIsCompleted(true);
      }
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isActive, timeLeft, currentStepIdx]);

  const handleStart = () => {
    setIsActive(true);
    setIsCompleted(false);
  };

  const handlePause = () => {
    setIsActive(false);
  };

  const handleReset = () => {
    setIsActive(false);
    setCurrentStepIdx(0);
    setTimeLeft(SOMATIC_STEPS[0].duration);
    setIsCompleted(false);
  };

  const currentStep = SOMATIC_STEPS[currentStepIdx];
  const totalElapsed = currentStepIdx * 15 + (15 - timeLeft);
  const progressPercent = (totalElapsed / 60) * 100;

  return (
    <div className="desk-somatic-container">
      {/* Header */}
      <div className="desk-somatic-header">
        <div className="desk-icon-box">
          <Coffee size={22} className="text-primary" />
        </div>
        <div>
          <h3 className="desk-title">ปุ่มคลายร่างฉุกเฉิน 60 วินาที</h3>
          <p className="desk-sub">รีเซ็ตระบบประสาทและคลายกล้ามเนื้อที่โต๊ะทำงานใน 1 นาที</p>
        </div>
      </div>

      {!isCompleted ? (
        <div className="desk-action-card">
          {/* Circular / Line Progress */}
          <div className="somatic-progress-track">
            <div className="somatic-progress-bar" style={{ width: `${progressPercent}%` }} />
          </div>

          <div className="somatic-step-indicators">
            {SOMATIC_STEPS.map((_step, idx) => (
              <div
                key={idx}
                className={`somatic-dot ${idx === currentStepIdx ? 'active' : ''} ${
                  idx < currentStepIdx ? 'done' : ''
                }`}
              >
                <span>{idx + 1}</span>
              </div>
            ))}
          </div>

          {/* Current Step Animation & Display */}
          <div className="somatic-display-box">
            <div className="somatic-emoji-avatar animate-bounce">{currentStep.emoji}</div>
            <h4 className="somatic-step-title">{currentStep.title}</h4>
            <p className="somatic-step-instruction">“{currentStep.instruction}”</p>
            <span className="somatic-step-detail">💡 {currentStep.detail}</span>

            {/* Countdown timer */}
            <div className="somatic-timer-badge">
              <span className="somatic-timer-num">{timeLeft}</span>
              <span className="somatic-timer-sec">วินาที</span>
            </div>
          </div>

          {/* Controls */}
          <div className="somatic-controls-row">
            {!isActive ? (
              <button type="button" className="btn-primary btn-somatic-main" onClick={handleStart}>
                <Play size={18} />
                <span>{totalElapsed > 0 ? 'ทำต่อ' : 'เริ่มคลายร่าง 60 วิ'}</span>
              </button>
            ) : (
              <button type="button" className="btn-primary btn-somatic-main pause" onClick={handlePause}>
                <Pause size={18} />
                <span>พักชั่วคราว</span>
              </button>
            )}

            <button type="button" className="btn-control-secondary" onClick={handleReset} title="เริ่มใหม่">
              <RotateCcw size={16} />
            </button>
          </div>
        </div>
      ) : (
        /* Completed Screen */
        <div className="desk-completed-card">
          <div className="completed-icon-sparkle">
            <CheckCircle size={44} className="text-emerald-600" />
          </div>
          <h4 className="completed-title">ร่างกายของคุณได้รับการรีเซ็ตแล้ว 🌿</h4>
          <p className="completed-sub">
            สังเกตลมหายใจที่ลึกขึ้น ไหล่ที่เบาลง และความสงบที่กลับคืนสู่ร่างกาย ดื่มน้ำสัก 1 จิบ แล้วค่อยลุยงานต่อนะครับ
          </p>
          <button type="button" className="btn-primary" onClick={handleReset} style={{ borderRadius: 'var(--radius-full)' }}>
            <RotateCcw size={15} className="inline mr-1" />
            <span>ทำอีกรอบ</span>
          </button>
        </div>
      )}
    </div>
  );
};
