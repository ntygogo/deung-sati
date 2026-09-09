import React, { useState } from 'react';
import {
  getGuidedExercise,
  type GuidedExerciseDefinition,
  type ExerciseResultPayload,
  type ExerciseId,
} from '../shared/chat-protocol';

interface GuidedExerciseCardProps {
  exerciseId?: string;
  onComplete: (result: ExerciseResultPayload) => void;
  onCancel?: () => void;
}

function buildExerciseSummaryText(
  exerciseTitle: string,
  outcome: 'better' | 'same' | 'worse' | 'unknown',
  userInputs: Record<string, string>
): string {
  const outcomeTextMap = {
    better: 'รู้สึกเบาลงและมีสติมากขึ้น',
    same: 'รู้สึกยังเหมือนเดิม',
    worse: 'ยังมีความกังวล/ค้างคาใจอยู่',
    unknown: 'เสร็จสิ้นการฝึก',
  };

  let summary = `[ผลลัพธ์แบบฝึกหัด: ${exerciseTitle}]\nผลลัพธ์หลังฝึก: ${outcomeTextMap[outcome]}`;
  const entries = Object.entries(userInputs);
  if (entries.length > 0) {
    summary += '\nสิ่งที่บันทึกไว้:';
    for (const [key, val] of entries) {
      summary += `\n- ${key}: "${val}"`;
    }
  }
  return summary;
}

interface BeforeSpeakFilterResult {
  feeling: string;
  coreNeed: string;
  observableFact?: string;
  refinedAlternative: string;
  rationale?: string;
  isSafetyRisk?: boolean;
  safetyMessage?: string;
}

export const BeforeSpeakCardView: React.FC<{
  onComplete: (result: ExerciseResultPayload) => void;
  onCancel?: () => void;
}> = ({ onComplete, onCancel }) => {
  const [rawText, setRawText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<BeforeSpeakFilterResult | null>(null);
  const [editedRefined, setEditedRefined] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Client-side safety check for immediate override (<1ms)
  const checkSafetyRisk = (text: string): boolean => {
    const t = text.toLowerCase();
    const isCrisis = /อยากตาย|ไม่อยากอยู่แล้ว|ฆ่าตัวตาย|กรีดแขน|กินยาตาย|ลาโลก|ผูกคอ/i.test(t);
    const isViolenceOrThreat =
      /จะไปยิง|จะไปแทง|จะไปฆ่า|เอาปืน|เอามีด|พกปืน|ขู่จะตี|ขู่จะซ้อม|ขู่จะทำร้าย|พ่อเคยตี|จะโดนตี|ปล่อยคลิป|แบล็กเมล/i.test(
        t
      );
    return isCrisis || isViolenceOrThreat;
  };

  const handleFilterSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = rawText.trim();
    if (!trimmed || isLoading) return;

    // Safety Path Override
    if (checkSafetyRisk(trimmed)) {
      const isDomestic = /พ่อ|แม่|แฟน|สามี|คนในบ้าน|ขู่จะตี|ขู่จะซ้อม|โดนตี/i.test(trimmed);
      const isSelfHarm = /อยากตาย|ไม่อยากอยู่แล้ว|ฆ่าตัวตาย|กรีดแขน/i.test(trimmed);
      const hotline = isDomestic
        ? 'สายด่วนช่วยเหลือสังคม 1300 (พม. 24 ชม.) หรือโทร 191'
        : isSelfHarm
        ? 'สายด่วนสุขภาพจิต 1323 (24 ชม.) หรือ 02-107-7977'
        : 'สายด่วนฉุกเฉิน 191 หรือ 1669';

      setResult({
        isSafetyRisk: true,
        safetyMessage: `ข้อความนี้มีสัญญาณความเสี่ยงต่อความปลอดภัยหรือความรุนแรง ขอให้ความปลอดภัยมาเป็นอันดับแรก หากตกอยู่ในอันตรายหรือต้องการความช่วยเหลือฉุกเฉิน ขอให้โทร ${hotline}`,
        feeling: 'ตึงเครียดหรือกำลังเผชิญอันตราย',
        coreNeed: 'ความปลอดภัยและการได้รับการคุ้มครอง',
        observableFact: 'ตรวจพบข้อความที่มีความเสี่ยง',
        refinedAlternative: '',
      });
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/filter-communication', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawMessage: trimmed }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.coreNeed && (data.refinedAlternative || data.isSafetyRisk)) {
          setResult(data);
          setEditedRefined(data.refinedAlternative || '');
          setIsLoading(false);
          return;
        }
      }
    } catch (err) {
      console.warn('Filter communication API error, using intelligent fallback:', err);
    }

    // Context-Aware Fallback if API is offline
    let feeling = 'โกรธ อึดอัด และน้อยใจ';
    let coreNeed = 'ต้องการให้เขารับฟังและเห็นความสำคัญของสิ่งที่เรากำลังสื่อสาร';
    let observableFact = 'สิ่งที่เกิดขึ้นยังไม่เป็นไปตามที่คาดหวัง';
    let refinedAlternative = 'ตอนนี้เรารู้สึกอึดอัดและไม่สบายใจกับเรื่องนี้ อยากขอคุยกันตรงๆ เพื่อหาทางออกร่วมกันนะ';

    if (trimmed.includes('อ่าน') || trimmed.includes('ตอบ') || trimmed.includes('ไม่โอเค')) {
      feeling = 'โกรธ น้อยใจ และอึดอัดที่ต้องนั่งรอเก้อ';
      coreNeed = 'ต้องการให้เขาตอบกลับสั้นๆ เพื่อให้รู้สถานะ และไม่ต้องรอด้วยความกังวล';
      observableFact = 'อีกฝ่ายเปิดอ่านข้อความแล้ว แต่ยังไม่มีการตอบกลับ';
      refinedAlternative = 'ถ้าอ่านแล้วยังไม่สะดวกตอบ ช่วยบอกเราสั้นๆ ได้ไหม พอเห็นอ่านแล้วเงียบไป เราไม่สบายใจเลย';
    }

    const fallbackResult: BeforeSpeakFilterResult = {
      feeling,
      coreNeed,
      observableFact,
      refinedAlternative,
      isSafetyRisk: false,
    };
    setResult(fallbackResult);
    setEditedRefined(refinedAlternative);
    setIsLoading(false);
  };

  const handleAdopt = () => {
    if (!result) return;
    const chosenMessage = editedRefined.trim() || result.refinedAlternative;

    onComplete({
      type: 'exercise_result',
      exercise_id: 'before_speak',
      result: {
        completed: true,
        outcome: 'better',
        user_inputs: {
          raw_message: rawText.trim(),
          feeling: result.feeling,
          core_need: result.coreNeed,
          observable_fact: result.observableFact || '',
          refined_message: chosenMessage,
        },
      },
      summary_text: `[กรองคำก่อนพูด]\n- สิ่งที่อยากพูดตอนแรก: "${rawText.trim()}"\n- สิ่งที่อยากสื่อจริงๆ: ${result.coreNeed}\n- ลองพูดแบบนี้ได้: "${chosenMessage}"`,
    });
  };

  const handleReset = () => {
    setResult(null);
    setRawText('');
    setEditedRefined('');
    setIsEditing(false);
  };

  return (
    <div
      style={{
        background: '#FFFDF9',
        border: '1.5px solid #E5DACB',
        borderRadius: '16px',
        padding: '16px',
        margin: '10px 0',
        boxShadow: '0 4px 14px rgba(92, 71, 56, 0.08)',
        color: '#4A3B32',
        fontFamily: 'inherit',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #F0E8DD',
          paddingBottom: '10px',
          marginBottom: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>✉️</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: '14.5px', color: '#3A2E26' }}>
              กรองคำก่อนพูด
            </div>
            <div style={{ fontSize: '11.5px', color: '#8C7355' }}>
              พิมพ์อย่างที่อยู่ในหัว แล้วช่วยจัดระเบียบให้สื่อสารได้จริง • 1 นาที
            </div>
          </div>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#A89279',
              fontSize: '18px',
              cursor: 'pointer',
              padding: '4px 8px',
            }}
            title="ปิด / กลับไปคุยต่อ"
            aria-label="ปิดแบบฝึกหัด"
          >
            ✕
          </button>
        )}
      </div>

      {/* Safety Override View */}
      {result?.isSafetyRisk ? (
        <div
          style={{
            background: '#FFF5F5',
            border: '1.5px solid #FFCDD2',
            borderRadius: '12px',
            padding: '14px',
            margin: '8px 0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '20px' }}>🛡️</span>
            <div style={{ fontWeight: 700, color: '#C62828', fontSize: '14px' }}>
              ความปลอดภัยของเธอสำคัญที่สุด
            </div>
          </div>
          <div style={{ fontSize: '12.5px', color: '#5F2120', lineHeight: 1.6, marginBottom: '14px' }}>
            {result.safetyMessage}
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={handleReset}
              style={{
                background: '#FFFFFF',
                border: '1px solid #FFCDD2',
                color: '#C62828',
                borderRadius: '8px',
                padding: '7px 14px',
                fontSize: '12.5px',
                cursor: 'pointer',
              }}
            >
              พิมพ์ข้อความใหม่
            </button>
          </div>
        </div>
      ) : !result ? (
        /* USER INPUT VIEW */
        <div>
          <div
            style={{
              fontSize: '13.5px',
              fontWeight: 600,
              color: '#3A2E26',
              marginBottom: '3px',
            }}
          >
            พิมพ์สิ่งที่อยากพูดออกมาได้เลย
          </div>
          <div
            style={{
              fontSize: '12px',
              color: '#8C7355',
              marginBottom: '10px',
              lineHeight: 1.4,
            }}
          >
            ไม่ต้องสุภาพ ไม่ต้องกรองคำ เขียนอย่างที่มันอยู่ในหัวตอนนี้ได้เลย
          </div>

          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="ทำไมอ่านแล้วไม่ตอบ กูโคตรไม่โอเคเลย"
            rows={4}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '12px',
              borderRadius: '10px',
              border: '1.5px solid #D9C8B5',
              background: '#FFFFFF',
              fontSize: '13.5px',
              lineHeight: 1.5,
              color: '#3A2E26',
              fontFamily: 'inherit',
              resize: 'vertical',
              outline: 'none',
            }}
          />

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '10px',
            }}
          >
            <span style={{ fontSize: '11px', color: '#A89279' }}>
              {rawText.length > 0 ? `${rawText.length} ตัวอักษร` : ''}
            </span>
            <button
              type="button"
              onClick={handleFilterSubmit}
              disabled={!rawText.trim() || isLoading}
              style={{
                background: !rawText.trim() || isLoading ? '#C7BBAE' : '#4CAF50',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '9px 18px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: !rawText.trim() || isLoading ? 'not-allowed' : 'pointer',
                boxShadow: !rawText.trim() || isLoading ? 'none' : '0 2px 6px rgba(76, 175, 80, 0.25)',
                transition: 'all 0.2s ease',
              }}
            >
              {isLoading ? 'กำลังช่วยกรองคำ...' : 'ช่วยกรองให้หน่อย'}
            </button>
          </div>
        </div>
      ) : (
        /* RESULT UI VIEW */
        <div>
          {/* 1. สิ่งที่เธออยากสื่อจริงๆ */}
          <div
            style={{
              background: '#FBF8F2',
              border: '1px solid #EADBCC',
              borderRadius: '10px',
              padding: '12px 14px',
              marginBottom: '12px',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#8A6A45',
                marginBottom: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <span>💡</span>
              <span>สิ่งที่เธออยากสื่อจริงๆ</span>
            </div>
            <div
              style={{
                fontSize: '13.5px',
                color: '#4A3B32',
                lineHeight: 1.55,
                fontWeight: 500,
              }}
            >
              {result.coreNeed}
            </div>
            {result.feeling && (
              <div style={{ fontSize: '11.5px', color: '#8C7355', marginTop: '6px' }}>
                ความรู้สึกข้างใน: <b>{result.feeling}</b>
              </div>
            )}
            {result.observableFact && (
              <div style={{ fontSize: '11.5px', color: '#8C7355', marginTop: '2px' }}>
                ข้อเท็จจริง: {result.observableFact}
              </div>
            )}
          </div>

          {/* 2. ลองพูดแบบนี้ได้ */}
          <div
            style={{
              background: '#F2F8F1',
              border: '1px solid #CCE4CA',
              borderRadius: '10px',
              padding: '12px 14px',
              marginBottom: '14px',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#2E692B',
                marginBottom: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <span>✉️</span>
              <span>ลองพูดแบบนี้ได้</span>
            </div>

            {isEditing ? (
              <textarea
                value={editedRefined}
                onChange={(e) => setEditedRefined(e.target.value)}
                rows={3}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1.5px solid #81C784',
                  background: '#FFFFFF',
                  fontSize: '13.5px',
                  lineHeight: 1.5,
                  color: '#1B5E20',
                  fontFamily: 'inherit',
                  outline: 'none',
                }}
              />
            ) : (
              <div
                style={{
                  fontSize: '14px',
                  color: '#1B5E20',
                  lineHeight: 1.6,
                  fontWeight: 500,
                }}
              >
                "{editedRefined}"
              </div>
            )}
          </div>

          {/* Actions: ใช้ประโยคนี้, ปรับอีก, พิมพ์ใหม่ */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              justifyContent: 'flex-end',
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              onClick={handleReset}
              style={{
                background: 'transparent',
                border: '1px solid #D9C8B5',
                borderRadius: '8px',
                padding: '7px 12px',
                fontSize: '12px',
                color: '#7D6A58',
                cursor: 'pointer',
              }}
            >
              พิมพ์ใหม่
            </button>

            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              style={{
                background: isEditing ? '#E8F5E9' : '#F7F4EB',
                border: '1px solid #D9C8B5',
                borderRadius: '8px',
                padding: '7px 12px',
                fontSize: '12px',
                color: isEditing ? '#1B5E20' : '#5C4738',
                cursor: 'pointer',
                fontWeight: isEditing ? 600 : 400,
              }}
            >
              {isEditing ? 'เสร็จสิ้นการปรับ' : 'ปรับอีก'}
            </button>

            <button
              type="button"
              onClick={handleAdopt}
              style={{
                background: '#4CAF50',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(76, 175, 80, 0.25)',
              }}
            >
              ใช้ประโยคนี้
            </button>
          </div>

          <div
            style={{
              fontSize: '11px',
              color: '#A89279',
              marginTop: '10px',
              textAlign: 'center',
            }}
          >
            🔒 ไม่มีการส่งข้อความหาบุคคลอื่นโดยอัตโนมัติ ใช้สำหรับสะท้อนใจและคุยต่อกับเราเท่านั้น
          </div>
        </div>
      )}
    </div>
  );
};

const StandardGuidedCardView: React.FC<GuidedExerciseCardProps> = ({
  exerciseId = 'emergency_pause',
  onComplete,
  onCancel,
}) => {
  const exercise: GuidedExerciseDefinition = getGuidedExercise(exerciseId);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [selectedChoice, setSelectedChoice] = useState('');
  const [userInputs, setUserInputs] = useState<Record<string, string>>({});

  const currentStep = exercise.steps[currentStepIdx];
  const totalSteps = exercise.steps.length;
  const progressPercent = Math.round(((currentStepIdx + 1) / totalSteps) * 100);

  const handleNextStep = () => {
    const val = textInput.trim() || selectedChoice;
    if (val) {
      setUserInputs((prev) => ({
        ...prev,
        [currentStep.title || `step_${currentStepIdx + 1}`]: val,
      }));
    }
    if (currentStepIdx < totalSteps - 1) {
      setCurrentStepIdx((prev) => prev + 1);
      setTextInput('');
      setSelectedChoice('');
    } else {
      setIsCompleted(true);
    }
  };

  const handleSkipStep = () => {
    if (currentStepIdx < totalSteps - 1) {
      setCurrentStepIdx((prev) => prev + 1);
    } else {
      setIsCompleted(true);
    }
  };

  const handleStopExercise = () => {
    if (onCancel) {
      onCancel();
    } else {
      onComplete({
        type: 'exercise_result',
        exercise_id: exercise.id as ExerciseId,
        result: {
          completed: false,
          outcome: 'unknown',
          user_inputs: userInputs,
        },
        summary_text: buildExerciseSummaryText(exercise.title, 'unknown', userInputs),
      });
    }
  };

  const handleSelectOutcome = (outcome: 'better' | 'same' | 'worse') => {
    const finalInputs = { ...userInputs };
    const currentVal = textInput.trim() || selectedChoice;
    if (currentVal && !finalInputs[currentStep.title || `step_${currentStepIdx + 1}`]) {
      finalInputs[currentStep.title || `step_${currentStepIdx + 1}`] = currentVal;
    }

    onComplete({
      type: 'exercise_result',
      exercise_id: exercise.id as ExerciseId,
      result: {
        completed: true,
        outcome,
        user_inputs: finalInputs,
      },
      summary_text: buildExerciseSummaryText(exercise.title, outcome, finalInputs),
    });
  };

  return (
    <div
      style={{
        background: '#FFFDF9',
        border: '1.5px solid #E5DACB',
        borderRadius: '16px',
        padding: '16px',
        margin: '10px 0',
        boxShadow: '0 4px 14px rgba(92, 71, 56, 0.08)',
        color: '#4A3B32',
        fontFamily: 'inherit',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #F0E8DD',
          paddingBottom: '10px',
          marginBottom: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>{exercise.icon}</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: '14.5px', color: '#3A2E26' }}>
              {exercise.title}
            </div>
            <div style={{ fontSize: '11.5px', color: '#8C7355' }}>
              {exercise.subtitle} • {exercise.estimatedDuration}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={handleStopExercise}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#A89279',
            fontSize: '18px',
            cursor: 'pointer',
            padding: '4px 8px',
          }}
          title="ปิด / กลับไปคุยต่อ"
          aria-label="ปิดแบบฝึกหัด"
        >
          ✕
        </button>
      </div>

      {!isCompleted ? (
        <>
          {/* Progress Indicator */}
          <div style={{ marginBottom: '14px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '11.5px',
                color: '#7D6A58',
                marginBottom: '4px',
              }}
            >
              <span>
                ขั้นตอน {currentStepIdx + 1} จาก {totalSteps}: <b>{currentStep.title}</b>
              </span>
              <span>{progressPercent}%</span>
            </div>
            <div
              style={{
                height: '5px',
                background: '#EFE7DC',
                borderRadius: '999px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${progressPercent}%`,
                  background: '#66BB6A',
                  borderRadius: '999px',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>

          {/* Step Content */}
          <div style={{ marginBottom: '16px' }}>
            <div
              style={{
                fontSize: '14px',
                lineHeight: 1.6,
                color: '#3A2E26',
                fontWeight: 500,
                marginBottom: '8px',
              }}
            >
              {currentStep.instruction}
            </div>

            {currentStep.hint && (
              <div
                style={{
                  fontSize: '12px',
                  color: '#8C7355',
                  background: '#FAF6EE',
                  borderLeft: '3px solid #C4A480',
                  padding: '6px 10px',
                  borderRadius: '4px',
                  margin: '8px 0',
                }}
              >
                💡 {currentStep.hint}
              </div>
            )}

            {/* Optional Text Input */}
            {currentStep.inputType === 'text' && (
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder={currentStep.inputPlaceholder || 'พิมพ์บันทึกสั้นๆ ที่นี่...'}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #D9C8B5',
                  background: '#FFFFFF',
                  fontSize: '13px',
                  marginTop: '6px',
                  color: '#3A2E26',
                }}
              />
            )}

            {/* Optional Choice Chips */}
            {currentStep.inputType === 'choice' && currentStep.inputChoices && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                {currentStep.inputChoices.map((c, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedChoice(c)}
                    style={{
                      textAlign: 'left',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: selectedChoice === c ? '1.5px solid #2E7D32' : '1px solid #E5DACB',
                      background: selectedChoice === c ? '#E8F5E9' : '#FFFFFF',
                      fontSize: '12.5px',
                      color: selectedChoice === c ? '#1B5E20' : '#4A3B32',
                      cursor: 'pointer',
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              justifyContent: 'flex-end',
              alignItems: 'center',
            }}
          >
            <button
              type="button"
              onClick={handleSkipStep}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#8C7355',
                fontSize: '12px',
                cursor: 'pointer',
                padding: '6px 10px',
              }}
            >
              ข้ามข้อนี้
            </button>

            <button
              type="button"
              onClick={handleNextStep}
              style={{
                background: '#4CAF50',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(76, 175, 80, 0.25)',
              }}
            >
              {currentStep.actionLabel || (currentStepIdx === totalSteps - 1 ? 'เสร็จสิ้น' : 'ต่อไป ›')}
            </button>
          </div>
        </>
      ) : (
        /* Completion & Outcome Reflection */
        <div style={{ textAlign: 'center', padding: '10px 0' }}>
          <div style={{ fontSize: '28px', marginBottom: '6px' }}>🌸</div>
          <div style={{ fontWeight: 600, fontSize: '15px', color: '#2E7D32', marginBottom: '4px' }}>
            เสร็จสิ้นแบบฝึกหัดแล้ว
          </div>
          <div style={{ fontSize: '12.5px', color: '#7D6A58', marginBottom: '14px' }}>
            ตอนนี้ใจของเธอรู้สึกอย่างไรบ้าง?
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '280px', margin: '0 auto' }}>
            <button
              type="button"
              onClick={() => handleSelectOutcome('better')}
              style={{
                background: '#E8F5E9',
                border: '1px solid #A5D6A7',
                borderRadius: '10px',
                padding: '9px 12px',
                fontSize: '13px',
                fontWeight: 500,
                color: '#1B5E20',
                cursor: 'pointer',
              }}
            >
              😊 รู้สึกเบาลง / มีสติขึ้น
            </button>

            <button
              type="button"
              onClick={() => handleSelectOutcome('same')}
              style={{
                background: '#F7F4EB',
                border: '1px solid #E5DACB',
                borderRadius: '10px',
                padding: '9px 12px',
                fontSize: '13px',
                color: '#5C4738',
                cursor: 'pointer',
              }}
            >
              😐 รู้สึกยังเหมือนเดิม
            </button>

            <button
              type="button"
              onClick={() => handleSelectOutcome('worse')}
              style={{
                background: '#FFF3E0',
                border: '1px solid #FFE0B2',
                borderRadius: '10px',
                padding: '9px 12px',
                fontSize: '13px',
                color: '#E65100',
                cursor: 'pointer',
              }}
            >
              💭 ยังมีเรื่องกังวล/ค้างคาใจ
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const GuidedExerciseCard: React.FC<GuidedExerciseCardProps> = (props) => {
  if (props.exerciseId === 'before_speak') {
    return <BeforeSpeakCardView onComplete={props.onComplete} onCancel={props.onCancel} />;
  }
  return <StandardGuidedCardView {...props} />;
};
