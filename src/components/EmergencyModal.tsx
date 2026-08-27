import React, { useState, useEffect } from 'react';
import { ShieldAlert, Wind, X, Sparkles, CheckCircle2, VolumeX, BellRing, Clock } from 'lucide-react';
import { soundEngine } from '../services/soundEngine';

interface EmergencyModalProps {
  onClose: () => void;
}

export const EmergencyModal: React.FC<EmergencyModalProps> = ({ onClose }) => {
  const [phase, setPhase] = useState<'inhale1' | 'inhale2' | 'exhale'>('inhale1');
  const [targetSeconds, setTargetSeconds] = useState<number>(30); // 30, 60, 90, 0 (0 = unlimited)
  const [secondsLeft, setSecondsLeft] = useState<number>(30);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [cycleProgress, setCycleProgress] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [isSoundOn, setIsSoundOn] = useState<boolean>(true);

  // Start & Manage Ultra-Long Tibetan Singing Bowl Sound
  useEffect(() => {
    if (isSoundOn && !isCompleted) {
      soundEngine.startEtherealEmergencyChime(0.75);
    } else {
      soundEngine.stopEtherealEmergencyChime();
    }

    return () => {
      soundEngine.stopEtherealEmergencyChime();
    };
  }, [isSoundOn, isCompleted]);

  // Handle Duration changes
  const handleSelectDuration = (secs: number) => {
    setTargetSeconds(secs);
    setSecondsLeft(secs);
    setElapsedSeconds(0);
    setIsCompleted(false);
  };

  // Timer countdown / countup loop
  useEffect(() => {
    if (isCompleted) return;

    const totalTimer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);

      if (targetSeconds > 0) {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            setIsCompleted(true);
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(totalTimer);
  }, [isCompleted, targetSeconds]);

  // Physiological sigh breath loop: Inhale deep (2.5s) -> Top up (1.2s) -> Long exhale (5.5s)
  useEffect(() => {
    if (isCompleted) return;

    let currentPhase: 'inhale1' | 'inhale2' | 'exhale' = 'inhale1';
    let tick = 0;
    const intervalMs = 50;

    const breathTimer = setInterval(() => {
      tick += intervalMs;

      if (tick < 2500) {
        currentPhase = 'inhale1';
        setCycleProgress((tick / 2500) * 100);
      } else if (tick < 3700) {
        currentPhase = 'inhale2';
        setCycleProgress(((tick - 2500) / 1200) * 100);
      } else if (tick < 9200) {
        currentPhase = 'exhale';
        setCycleProgress(((tick - 3700) / 5500) * 100);
      } else {
        tick = 0;
      }
      setPhase(currentPhase);
    }, intervalMs);

    return () => clearInterval(breathTimer);
  }, [isCompleted]);

  const toggleSound = () => {
    setIsSoundOn((prev) => !prev);
  };

  const handleCloseModal = () => {
    soundEngine.stopEtherealEmergencyChime();
    onClose();
  };

  const formatElapsed = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m > 0 ? `${m} นาที ` : ''}${s} วินาที`;
  };

  return (
    <div className="modal-overlay sos-overlay" onClick={handleCloseModal}>
      <div className="sos-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sos-header">
          <div className="sos-badge">
            <ShieldAlert size={18} />
            <span>เบรกสติฉุกเฉิน (SOS Brake)</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Sound Toggle Button */}
            <button
              type="button"
              className={`sos-sound-toggle-btn ${isSoundOn ? 'active' : ''}`}
              onClick={toggleSound}
              title={isSoundOn ? 'ปิดเสียงขันธิเบต' : 'เปิดเสียงขันธิเบต'}
            >
              {isSoundOn ? (
                <>
                  <BellRing size={13} className="text-amber-500 animate-pulse" />
                  <span>เสียงขันธิเบต 🥣</span>
                </>
              ) : (
                <>
                  <VolumeX size={13} />
                  <span>ปิดเสียง</span>
                </>
              )}
            </button>

            <button type="button" className="sos-close-btn" onClick={handleCloseModal}>
              <X size={20} />
            </button>
          </div>
        </div>

        {!isCompleted ? (
          <>
            {/* Urgent Warning Message */}
            <div className="sos-alert-box">
              <h3 className="sos-title">🛑 หยุดก่อน... วางมือถือลงบนโต๊ะ</h3>
              <p className="sos-desc">
                <strong>อย่าเพิ่งส่งข้อความ... อย่าเพิ่งตัดสินใจอะไรตอนนี้</strong><br />
                สมองกำลังอยู่ในโหมดตื่นตระหนก ฟังเสียงขันธิเบตแล้วสูดหายใจคลายความล่กไปด้วยกัน
              </p>
            </div>

            {/* Duration Selector Pills */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, margin: '4px 0' }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={12} />
                <span>เวลา:</span>
              </span>
              {[
                { label: '30 วิ', val: 30 },
                { label: '60 วิ', val: 60 },
                { label: '90 วิ', val: 90 },
                { label: '♾️ ยาวๆ', val: 0 },
              ].map((pill) => (
                <button
                  key={pill.val}
                  type="button"
                  onClick={() => handleSelectDuration(pill.val)}
                  style={{
                    padding: '3px 9px',
                    borderRadius: '999px',
                    fontSize: '0.72rem',
                    fontWeight: targetSeconds === pill.val ? 700 : 500,
                    border: '1px solid',
                    borderColor: targetSeconds === pill.val ? '#e09f3e' : 'var(--border-medium)',
                    backgroundColor: targetSeconds === pill.val ? 'rgba(224, 159, 62, 0.18)' : 'var(--bg-main)',
                    color: targetSeconds === pill.val ? '#b45309' : 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {/* Physiological Sigh Visualizer */}
            <div className="sos-visual-area">
              <div
                className={`sos-breath-circle ${phase}`}
                style={{
                  transform: `scale(${
                    phase === 'inhale1'
                      ? 1.0 + (cycleProgress / 100) * 0.35
                      : phase === 'inhale2'
                      ? 1.35 + (cycleProgress / 100) * 0.15
                      : 1.5 - (cycleProgress / 100) * 0.5
                  })`,
                }}
              >
                <div className="sos-circle-inner">
                  <Wind size={28} className="sos-wind-icon" />
                  <span className="sos-phase-text">
                    {phase === 'inhale1' && 'สูดเข้าลึกๆ...'}
                    {phase === 'inhale2' && 'สูดสั้นเพิ่มอีกนิด!'}
                    {phase === 'exhale' && 'ผ่อนลมหายใจออกช้าๆ ยาวๆ...'}
                  </span>
                </div>
              </div>
            </div>

            <div className="sos-timer-label">
              {targetSeconds > 0 ? (
                <span>เหลือเวลาพักใจอีก <strong>{secondsLeft}</strong> วินาที</span>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <span>พักใจไปแล้ว <strong>{formatElapsed(elapsedSeconds)}</strong> (เสียงขันเล่นต่อเนื่อง)</span>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ fontSize: '0.78rem', padding: '4px 12px', borderRadius: '999px' }}
                    onClick={() => setIsCompleted(true)}
                  >
                    ✨ ใจนิ่งแล้ว เสร็จสิ้น
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="sos-completed-box">
            <div className="sos-completed-icon">
              <CheckCircle2 size={40} className="text-primary" />
            </div>
            <h3 className="sos-completed-title">ใจเริ่มนิ่งลงแล้ว</h3>
            <p className="sos-completed-desc">
              อัตราการเต้นของหัวใจเริ่มกลับสู่สภาวะปกติแล้ว...<br />
              ตอนนี้ คุณมีสติกลับคืนมาแล้ว ค่อยๆ คิดว่าจะจัดการกับสถานการณ์ตรงหน้าอย่างไรต่อไปนะ
            </p>

            <button type="button" className="btn-primary" onClick={handleCloseModal} style={{ marginTop: 16 }}>
              <Sparkles size={16} />
              <span>กลับสู่แอปอย่างมีสติ</span>
            </button>
          </div>
        )}

        <div className="sos-footer-reminder">
          💡 อารมณ์ชั่ววูบจะอยู่กับเราไม่เกิน 90 วินาที ถ้าเราไม่ไปเติมฟืนให้มัน
        </div>
      </div>
    </div>
  );
};
