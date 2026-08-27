import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Sparkles, CheckCircle2 } from 'lucide-react';

export type BreathingModeId = 'sigh' | 'sleep' | 'box' | 'coherent';

interface BreathingMode {
  id: BreathingModeId;
  name: string;
  subtitle: string;
  description: string;
  cycles: { phase: string; duration: number; action: 'in' | 'hold' | 'out' | 'hold2' }[];
  benefit: string;
}

const BREATHING_MODES: BreathingMode[] = [
  {
    id: 'sigh',
    name: 'Physiological Sigh',
    subtitle: 'ถอนหายใจ 2 จังหวะ',
    description: 'สูดเข้าลึก ➔ สูดสั้นตบท้าย ➔ ผ่อนออกยาวช้าๆ ทางปาก',
    benefit: 'ลดความล่ก ความตื่นตระหนก และปรับอัตราการเต้นของหัวใจใน 30 วินาที (Stanford)',
    cycles: [
      { phase: 'สูดหายใจเข้าลึกๆ...', duration: 2.5, action: 'in' },
      { phase: 'สูดสั้นเพิ่มอีกนิด!', duration: 1.2, action: 'in' },
      { phase: 'ผ่อนลมหายใจออกช้าๆ ยาวๆ...', duration: 5.5, action: 'out' },
    ],
  },
  {
    id: 'sleep',
    name: '4-7-8 Deep Sleep',
    subtitle: 'ผ่อนคลายลึกเตรียมตัวนอน',
    description: 'สูดเข้า 4 วิ ➔ กลั้น 7 วิ ➔ ผ่อนออก 8 วิ',
    benefit: 'ลดฮอร์โมนความเครียด คลายกล้ามเนื้อ และกล่อมระบบประสาทให้พร้อมหลับ',
    cycles: [
      { phase: 'หายใจเข้าทางจมูก...', duration: 4, action: 'in' },
      { phase: 'กลั้นลมหายใจไว้อย่างสงบ...', duration: 7, action: 'hold' },
      { phase: 'ผ่อนลมหายใจออกช้าๆ ทางปาก...', duration: 8, action: 'out' },
    ],
  },
  {
    id: 'box',
    name: 'Box Breathing (4-4-4-4)',
    subtitle: 'สี่เหลี่ยมสร้างสติและสมาธิ',
    description: 'เข้า 4 วิ ➔ กลั้น 4 วิ ➔ ออก 4 วิ ➔ ค้าง 4 วิ',
    benefit: 'เทคนิคที่ใช้ในหน่วยรบพิเศษเพื่อรักษาความเยือกเย็นในสถานการณ์กดดัน',
    cycles: [
      { phase: 'หายใจเข้า...', duration: 4, action: 'in' },
      { phase: 'กลั้นนิ่งๆ...', duration: 4, action: 'hold' },
      { phase: 'ผ่อนลมหายใจออก...', duration: 4, action: 'out' },
      { phase: 'พักว่างๆ อย่างเบาสบาย...', duration: 4, action: 'hold2' },
    ],
  },
  {
    id: 'coherent',
    name: 'Coherent Breathing',
    subtitle: 'หายใจสมดุล 5.5 / 5.5 วิ',
    description: 'เข้า 5.5 วิ ➔ ออก 5.5 วิ สม่ำเสมอ',
    benefit: 'ปรับอัตราความแปรปรวนของการเต้นของหัวใจ (HRV) คืนความสมดุลให้ร่างกาย',
    cycles: [
      { phase: 'หายใจเข้าช้าๆ นุ่มนวล...', duration: 5.5, action: 'in' },
      { phase: 'ผ่อนลมหายใจออกต่อเนื่อง...', duration: 5.5, action: 'out' },
    ],
  },
];

export const BreathingPacer: React.FC = () => {
  const [selectedModeId, setSelectedModeId] = useState<BreathingModeId>('sigh');
  const [isActive, setIsActive] = useState<boolean>(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [stepProgress, setStepProgress] = useState<number>(0);
  const [completedRounds, setCompletedRounds] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  const activeMode = BREATHING_MODES.find((m) => m.id === selectedModeId) || BREATHING_MODES[0];
  const currentStep = activeMode.cycles[currentStepIndex] || activeMode.cycles[0];

  const audioCtxRef = useRef<AudioContext | null>(null);

  // Play gentle bell sound on phase transition
  const playChime = (freq = 528) => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 1.3);
    } catch (e) {}
  };

  useEffect(() => {
    if (!isActive) return;

    playChime(currentStep.action === 'in' ? 528 : currentStep.action === 'out' ? 432 : 396);

    const stepDurationMs = currentStep.duration * 1000;
    const intervalTime = 50;
    const totalTicks = stepDurationMs / intervalTime;
    let tickCount = 0;

    const timer = setInterval(() => {
      tickCount++;
      setStepProgress(Math.min(100, (tickCount / totalTicks) * 100));

      if (tickCount >= totalTicks) {
        clearInterval(timer);
        setStepProgress(0);
        setCurrentStepIndex((prevIndex) => {
          const nextIndex = prevIndex + 1;
          if (nextIndex >= activeMode.cycles.length) {
            setCompletedRounds((r) => r + 1);
            return 0;
          }
          return nextIndex;
        });
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isActive, currentStepIndex, selectedModeId]);

  const handleToggle = () => {
    setIsActive((prev) => !prev);
  };

  const handleReset = () => {
    setIsActive(false);
    setCurrentStepIndex(0);
    setStepProgress(0);
    setCompletedRounds(0);
  };

  const handleSelectMode = (id: BreathingModeId) => {
    setSelectedModeId(id);
    setIsActive(false);
    setCurrentStepIndex(0);
    setStepProgress(0);
  };

  // Determine circle scale based on action and progress
  let circleScale = 1.0;
  if (isActive) {
    if (currentStep.action === 'in') {
      circleScale = 1.0 + (stepProgress / 100) * 0.45;
    } else if (currentStep.action === 'hold' || currentStep.action === 'hold2') {
      circleScale = currentStep.action === 'hold' ? 1.45 : 1.0;
    } else if (currentStep.action === 'out') {
      circleScale = 1.45 - (stepProgress / 100) * 0.45;
    }
  }

  return (
    <div className="breathing-container">
      {/* Mode Selector Chips */}
      <div className="breathing-modes-scroll">
        {BREATHING_MODES.map((mode) => (
          <button
            key={mode.id}
            className={`breathing-mode-btn ${selectedModeId === mode.id ? 'active' : ''}`}
            onClick={() => handleSelectMode(mode.id)}
          >
            <span className="mode-btn-title">{mode.name}</span>
            <span className="mode-btn-sub">{mode.subtitle}</span>
          </button>
        ))}
      </div>

      {/* Description Card */}
      <div className="breathing-info-card">
        <div className="breathing-info-header">
          <Sparkles size={16} className="text-primary" />
          <span className="breathing-info-title">{activeMode.subtitle}</span>
        </div>
        <p className="breathing-info-desc">{activeMode.description}</p>
        <div className="breathing-benefit-badge">
          <span>✨ {activeMode.benefit}</span>
        </div>
      </div>

      {/* Animated Visual Pacer Circle */}
      <div className="pacer-visual-area">
        <div className="pacer-outer-glow" style={{ transform: `scale(${circleScale * 1.15})` }} />
        <div
          className={`pacer-circle ${isActive ? 'active' : ''} action-${currentStep.action}`}
          style={{ transform: `scale(${circleScale})` }}
        >
          <div className="pacer-inner-content">
            <span className="pacer-phase-text">
              {isActive ? currentStep.phase : 'กด "เริ่ม" เพื่อฝึก'}
            </span>
            {isActive && (
              <span className="pacer-timer-text">
                {Math.ceil(currentStep.duration - (stepProgress / 100) * currentStep.duration)}s
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Round Counter */}
      {completedRounds > 0 && (
        <div className="breathing-round-badge">
          <CheckCircle2 size={14} />
          <span>ฝึกสำเร็จแล้ว {completedRounds} รอบ</span>
        </div>
      )}

      {/* Controls Bar */}
      <div className="breathing-controls">
        <button
          className="btn-control-secondary"
          onClick={() => setSoundEnabled(!soundEnabled)}
          title={soundEnabled ? 'ปิดเสียงกระดิ่ง' : 'เปิดเสียงกระดิ่ง'}
        >
          {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>

        <button className="btn-primary btn-breathing-main" onClick={handleToggle}>
          {isActive ? <Pause size={20} /> : <Play size={20} />}
          <span>{isActive ? 'หยุดชั่วคราว' : 'เริ่มฝึกหายใจ'}</span>
        </button>

        <button
          className="btn-control-secondary"
          onClick={handleReset}
          title="เริ่มรอบใหม่"
          disabled={!isActive && completedRounds === 0 && currentStepIndex === 0}
        >
          <RotateCcw size={18} />
        </button>
      </div>
    </div>
  );
};
