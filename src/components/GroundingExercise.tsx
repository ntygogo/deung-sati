import React, { useState } from 'react';
import { Eye, Hand, Ear, Sparkles, Smile, ArrowRight, RotateCcw, Check } from 'lucide-react';

interface GroundingStep {
  count: number;
  sense: string;
  icon: React.ReactNode;
  prompt: string;
  subtext: string;
  examples: string[];
}

const GROUNDING_STEPS: GroundingStep[] = [
  {
    count: 5,
    sense: 'การมองเห็น (Sight)',
    icon: <Eye size={24} />,
    prompt: 'มองหา 5 สิ่งรอบตัวที่คุณเห็นในตอนนี้',
    subtext: 'ไม่จำเป็นต้องเป็นของพิเศษ มองสี ลวดลาย เงา หรือแสงที่ตกกระทบ',
    examples: ['นาฬิกาบนผนัง', 'แสงแดดที่ลอดหน้าต่าง', 'สีของโต๊ะ', 'ลายของเสื้อผ้า', 'เงาของแก้วน้ำ'],
  },
  {
    count: 4,
    sense: 'การสัมผัส (Touch)',
    icon: <Hand size={24} />,
    prompt: 'สัมผัส 4 สิ่งที่มีตัวตนอยู่ตรงนี้',
    subtext: 'สังเกตอุณหภูมิ ความนุ่ม ความหยาบ หรือน้ำหนักที่กดลง',
    examples: ['เท้าที่แตะพื้น', 'เนื้อผ้าของกางเกง', 'ความเย็นของเคสโทรศัพท์', 'เส้นผมของตัวเอง'],
  },
  {
    count: 3,
    sense: 'การได้ยิน (Sound)',
    icon: <Ear size={24} />,
    prompt: 'ฟัง 3 เสียงที่เกิดขึ้นรอบตัวตอนนี้',
    subtext: 'ทั้งเสียงที่อยู่ใกล้และเสียงที่แว่วมาจากที่ไกลๆ',
    examples: ['เสียงพัดลมหรือแอร์', 'เสียงลมหายใจตัวเอง', 'เสียงรถวิ่งข้างนอก'],
  },
  {
    count: 2,
    sense: 'กลิ่นที่รับรู้ (Smell)',
    icon: <Sparkles size={24} />,
    prompt: 'สังเกต 2 กลิ่นรอบตัวในอากาศ',
    subtext: 'ถ้าไม่มีกลิ่นชัดเจน ลองดมกลิ่นชายเสื้อ หรือกลิ่นอากาศในห้อง',
    examples: ['กลิ่นกาแฟ/อาหาร', 'กลิ่นสบู่หรือเสื้อผ้าที่ซักแล้ว'],
  },
  {
    count: 1,
    sense: 'การรับรส หรือจิบน้ำ (Taste)',
    icon: <Smile size={24} />,
    prompt: 'รับรู้ 1 รสชาติ หรือจิบน้ำอุ่น 1 อึก',
    subtext: 'สังเกตรสชาติที่ยังหลงเหลืออยู่ในปาก หรือความรู้สึกขณะกลืนน้ำลงคอ',
    examples: ['จิบน้ำช้าๆ 1 อึก', 'รสชาติของมื้ออาหารล่าสุด'],
  },
];

export const GroundingExercise: React.FC = () => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean[]>>({
    0: [false, false, false, false, false],
    1: [false, false, false, false],
    2: [false, false, false],
    3: [false, false],
    4: [false],
  });
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  const step = GROUNDING_STEPS[currentStepIndex];
  const currentChecked = checkedItems[currentStepIndex] || [];
  const allCurrentChecked = currentChecked.length > 0 && currentChecked.every(Boolean);

  const handleToggleItem = (itemIdx: number) => {
    setCheckedItems((prev) => {
      const stepItems = [...(prev[currentStepIndex] || [])];
      stepItems[itemIdx] = !stepItems[itemIdx];
      return { ...prev, [currentStepIndex]: stepItems };
    });
  };

  const handleNextStep = () => {
    if (currentStepIndex < GROUNDING_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      setIsCompleted(true);
    }
  };

  const handleReset = () => {
    setCurrentStepIndex(0);
    setCheckedItems({
      0: [false, false, false, false, false],
      1: [false, false, false, false],
      2: [false, false, false],
      3: [false, false],
      4: [false],
    });
    setIsCompleted(false);
  };

  if (isCompleted) {
    return (
      <div className="grounding-complete-card">
        <div className="complete-icon-wrapper">
          <Sparkles size={36} className="text-primary" />
        </div>
        <h3 className="complete-title">ใจกลับมาอยู่กับปัจจุบันแล้ว</h3>
        <p className="complete-desc">
          คุณได้พาประสาทสัมผัสทั้ง 5 กลับมาสู่ความเป็นจริงตรงหน้าสำเร็จแล้ว<br />
          ความกังวลในอดีตและอนาคตไม่มีตัวตน... มีเพียง "ตอนนี้" ที่คุณปลอดภัย
        </p>

        <button className="btn-primary" onClick={handleReset} style={{ marginTop: 20 }}>
          <RotateCcw size={16} />
          <span>ฝึกใหม่อีกครั้ง</span>
        </button>
      </div>
    );
  }

  return (
    <div className="grounding-flow-container">
      {/* Step Indicators */}
      <div className="grounding-stepper">
        {GROUNDING_STEPS.map((s, idx) => (
          <div
            key={idx}
            className={`step-bubble ${idx === currentStepIndex ? 'active' : ''} ${idx < currentStepIndex ? 'done' : ''}`}
            onClick={() => setCurrentStepIndex(idx)}
          >
            {idx < currentStepIndex ? <Check size={14} /> : s.count}
          </div>
        ))}
      </div>

      {/* Main Grounding Card */}
      <div className="grounding-card">
        <div className="grounding-header">
          <div className="grounding-icon-badge">{step.icon}</div>
          <div>
            <span className="grounding-badge-tag">{step.count} สิ่ง • {step.sense}</span>
            <h3 className="grounding-prompt-text">{step.prompt}</h3>
          </div>
        </div>

        <p className="grounding-subtext">{step.subtext}</p>

        {/* Interactive Checkable Suggestions */}
        <div className="grounding-items-list">
          {step.examples.map((example, idx) => {
            const isChecked = currentChecked[idx] || false;
            return (
              <button
                key={idx}
                className={`grounding-check-item ${isChecked ? 'checked' : ''}`}
                onClick={() => handleToggleItem(idx)}
              >
                <div className={`checkbox-box ${isChecked ? 'checked' : ''}`}>
                  {isChecked && <Check size={12} />}
                </div>
                <span>{example}</span>
              </button>
            );
          })}
        </div>

        {/* Action Button */}
        <div className="grounding-footer-actions">
          <button
            className={`btn-primary btn-grounding-next ${allCurrentChecked ? 'highlight' : ''}`}
            onClick={handleNextStep}
          >
            <span>{currentStepIndex === GROUNDING_STEPS.length - 1 ? 'เสร็จสิ้นการฝึก' : 'ไปต่อขั้นถัดไป'}</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
