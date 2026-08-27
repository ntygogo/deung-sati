import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Heart,
  RotateCcw,
  CheckCircle2,
  Activity,
  Flame,
} from 'lucide-react';

interface SomaticStep {
  id: string;
  title: string;
  bodyPart: string;
  clenchAction: string;
  releaseAction: string;
  holdSeconds: number;
  releaseSeconds: number;
}

const PMR_STEPS: SomaticStep[] = [
  {
    id: 'hands',
    title: '1. ฝ่ามือและแขน',
    bodyPart: 'ฝ่ามือ',
    clenchAction: 'กำหมัดทั้งสองข้างให้แน่นที่สุด... รับรู้แรงบีบที่ข้อมือและท่อนแขน',
    releaseAction: 'คลายมือออกทันที! วางมือหงายสบายๆ รับรู้ความโล่งเบาที่แผ่ออกมา',
    holdSeconds: 5,
    releaseSeconds: 7,
  },
  {
    id: 'shoulders',
    title: '2. บ่าและไหล่',
    bodyPart: 'หัวไหล่',
    clenchAction: 'ยักไหล่ทั้งสองข้างขึ้นมาแตะใบหูให้ตึงเกร็งที่สุด...',
    releaseAction: 'ทิ้งไหล่ลงทันที! ปล่อยให้น้ำหนักความตึงเครียดร่วงหล่นลงพื้น',
    holdSeconds: 5,
    releaseSeconds: 7,
  },
  {
    id: 'face',
    title: '3. ใบหน้าและกราม',
    bodyPart: 'กรามและใบหน้า',
    clenchAction: 'ขมวดคิ้วแน่น กัดกรามเบาๆ และย่นจมูกให้ใบหน้าตึงเกร็ง...',
    releaseAction: 'คลายกล้ามเนื้อหน้าทั้งหมดออก อ้าปากเบาๆ ผ่อนคลายหน้าผากและเปลือกตา',
    holdSeconds: 5,
    releaseSeconds: 7,
  },
  {
    id: 'legs',
    title: '4. ขาและเท้า',
    bodyPart: 'น่องและฝ่าเท้า',
    clenchAction: 'กระดกปลายเท้าขึ้นหาตัว เกร็งกล้ามเนื้อน่องและต้นขาให้แน่น...',
    releaseAction: 'ปล่อยเท้าตกลงตามสบาย รับรู้ความอบอุ่นที่ไหลเวียนลงสู่ปลายเท้า',
    holdSeconds: 5,
    releaseSeconds: 7,
  },
];

export const BodyCalmView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pmr' | 'heart-touch'>('pmr');
  const [currentPmrIndex, setCurrentPmrIndex] = useState<number>(0);
  const [isPmrActive, setIsPmrActive] = useState<boolean>(false);
  const [pmrPhase, setPmrPhase] = useState<'clench' | 'release'>('clench');
  const [countdown, setCountdown] = useState<number>(5);
  const [isPmrCompleted, setIsPmrCompleted] = useState<boolean>(false);

  // Heart Touch State
  const [heartTouchSeconds, setHeartTouchSeconds] = useState<number>(60);
  const [isHeartTouchActive, setIsHeartTouchActive] = useState<boolean>(false);

  const step = PMR_STEPS[currentPmrIndex] || PMR_STEPS[0];

  // PMR Timer Logic
  useEffect(() => {
    if (!isPmrActive || isPmrCompleted) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev > 1) return prev - 1;

        if (pmrPhase === 'clench') {
          setPmrPhase('release');
          return step.releaseSeconds;
        } else {
          // Move to next step
          if (currentPmrIndex < PMR_STEPS.length - 1) {
            setCurrentPmrIndex((idx) => idx + 1);
            setPmrPhase('clench');
            return PMR_STEPS[currentPmrIndex + 1].holdSeconds;
          } else {
            setIsPmrCompleted(true);
            setIsPmrActive(false);
            return 0;
          }
        }
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPmrActive, pmrPhase, currentPmrIndex, isPmrCompleted, step]);

  // Heart touch timer
  useEffect(() => {
    if (!isHeartTouchActive) return;
    const timer = setInterval(() => {
      setHeartTouchSeconds((prev) => {
        if (prev > 1) return prev - 1;
        setIsHeartTouchActive(false);
        return 0;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isHeartTouchActive]);

  const handleStartPmr = () => {
    setIsPmrActive(true);
    setIsPmrCompleted(false);
    setPmrPhase('clench');
    setCountdown(step.holdSeconds);
  };

  const handleResetPmr = () => {
    setIsPmrActive(false);
    setCurrentPmrIndex(0);
    setPmrPhase('clench');
    setCountdown(PMR_STEPS[0].holdSeconds);
    setIsPmrCompleted(false);
  };

  return (
    <div className="body-calm-container">
      {/* Sub Tabs */}
      <div className="somatic-tab-pills">
        <button
          className={`somatic-pill-btn ${activeTab === 'pmr' ? 'active' : ''}`}
          onClick={() => setActiveTab('pmr')}
        >
          <Activity size={15} />
          <span>เกร็งแล้วคลาย (PMR)</span>
        </button>

        <button
          className={`somatic-pill-btn ${activeTab === 'heart-touch' ? 'active' : ''}`}
          onClick={() => setActiveTab('heart-touch')}
        >
          <Heart size={15} />
          <span>ทาบมือบนหัวใจ (Somatic Heart)</span>
        </button>
      </div>

      {activeTab === 'pmr' ? (
        <div className="pmr-wrapper">
          {!isPmrCompleted ? (
            <div className="pmr-card">
              {/* Stepper Header */}
              <div className="pmr-steps-indicator">
                {PMR_STEPS.map((s, idx) => (
                  <div
                    key={s.id}
                    className={`pmr-step-dot ${idx === currentPmrIndex ? 'active' : idx < currentPmrIndex ? 'done' : ''}`}
                  >
                    <span>{idx + 1}</span>
                  </div>
                ))}
              </div>

              <div className="pmr-part-badge">
                <Flame size={14} className="text-primary" />
                <span>ส่วนที่ฝึก: <strong>{step.title}</strong></span>
              </div>

              {/* Dynamic Phase Display */}
              <div className={`pmr-action-box ${pmrPhase}`}>
                <span className="pmr-phase-tag">
                  {pmrPhase === 'clench' ? '✊ 1. เกร็งค้างไว้' : '🌿 2. คลายออกทันที'}
                </span>
                <p className="pmr-instruction">
                  {pmrPhase === 'clench' ? step.clenchAction : step.releaseAction}
                </p>
                <div className="pmr-timer-circle">
                  <span className="pmr-timer-num">{isPmrActive ? countdown : step.holdSeconds}</span>
                  <span className="pmr-timer-unit">วินาที</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pmr-controls-row">
                {!isPmrActive ? (
                  <button className="btn-primary" onClick={handleStartPmr}>
                    <Sparkles size={16} />
                    <span>เริ่มฝึกเกร็งแล้วคลาย</span>
                  </button>
                ) : (
                  <button className="btn-secondary" onClick={() => setIsPmrActive(false)}>
                    <span>หยุดชั่วคราว</span>
                  </button>
                )}

                <button className="btn-control-secondary" onClick={handleResetPmr} title="เริ่มใหม่">
                  <RotateCcw size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div className="grounding-complete-card">
              <div className="complete-icon-wrapper">
                <CheckCircle2 size={36} className="text-primary" />
              </div>
              <h3 className="complete-title">กล้ามเนื้อทั่วร่างกายคลายตัวแล้ว</h3>
              <p className="complete-desc">
                ระบบประสาทอัตโนมัติ (Parasympathetic) ของคุณได้รับการกระตุ้นแล้ว<br />
                ความตึงเกร็งที่สะสมไว้ถูกระบายออกไป ร่างกายกำลังเข้าสู่สภาวะสงบอย่างแท้จริง
              </p>

              <button className="btn-primary" onClick={handleResetPmr} style={{ marginTop: 16 }}>
                <RotateCcw size={16} />
                <span>ฝึกรอบใหม่อีกครั้ง</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="heart-touch-card">
          <div className="heart-icon-wrapper">
            <Heart size={36} className="text-primary animate-pulse" />
          </div>

          <h3 className="heart-touch-title">ทาบมือบนหัวใจ (Somatic Heart Touch)</h3>
          <p className="heart-touch-desc">
            วางฝ่ามือข้างหนึ่งหรือทั้งสองข้างลงบนกึ่งกลางหน้าอก...<br />
            กดน้ำหนักเบาๆ รับรู้ความอบอุ่นที่แผ่จากฝ่ามือสู่หัวใจ<br />
            การสัมผัสตรงนี้ช่วยหลั่งสาร <strong>Oxytocin</strong> คืนความรู้สึกปลอดภัยและลดความโดดเดี่ยวในทันที
          </p>

          <div className="heart-touch-timer-box">
            <span className="heart-timer-number">{heartTouchSeconds}s</span>
            <span className="heart-timer-sub">หายใจช้าๆ และสัมผัสความอบอุ่น</span>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button
              className="btn-primary"
              onClick={() => setIsHeartTouchActive(!isHeartTouchActive)}
            >
              {isHeartTouchActive ? 'หยุดชั่วคราว' : heartTouchSeconds === 60 ? 'เริ่มพักใจ 1 นาที' : 'ทำต่อ'}
            </button>
            <button
              className="btn-secondary"
              onClick={() => {
                setIsHeartTouchActive(false);
                setHeartTouchSeconds(60);
              }}
            >
              <RotateCcw size={14} />
              <span>รีเซ็ต</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
