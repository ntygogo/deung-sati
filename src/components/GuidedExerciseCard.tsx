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

export const GuidedExerciseCard: React.FC<GuidedExerciseCardProps> = ({
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
