export const UNEXPLORED = 'ยังไม่ได้สำรวจ';

const GENERIC_STRINGS = new Set([
  UNEXPLORED,
  'วงจรสติ',
  'แบบร่างลูปสติ',
  'Loop Trace',
]);

export function isValidLoopField(val?: any, minLen = 2): boolean {
  if (!val || typeof val !== 'string') return false;
  const trimmed = val.trim();
  if (trimmed.length < minLen) return false;
  if (GENERIC_STRINGS.has(trimmed)) return false;
  if (trimmed.startsWith('สิ่งที่เกิดขึ้น (บันทึกจากที่ได้คุยกัน')) return false;
  return true;
}

export interface LoopDataLike {
  trigger?: string | null;
  emotionOrBody?: string | null;
  automaticStory?: string | null;
  facts?: string | null;
  microAction?: string | null;
  newChoice?: string | null;
  reflection?: string | null;
  insights?: string | null;
  needs?: string | null;
  desires?: string | null;
  options?: string | null;
  oldResponse?: string | null;
}

export interface LoopProgressStageStatus {
  stage1: boolean; // สังเกตตัวเอง (has trigger OR emotion/body)
  stage2: boolean; // เห็นเหตุการณ์และความรู้สึก (has trigger AND emotion/body)
  stage3: boolean; // แยกเหตุการณ์กับการตีความ (has facts AND story, distinct)
  stage4: boolean; // เห็นข้อเรียนรู้หรือสิ่งที่จะลองทำ (has action OR reflection)
}

export interface LoopProgressEvaluation {
  currentStage: 0 | 1 | 2 | 3 | 4;
  stageName: string;
  isComplete: boolean;
  canConfirm: boolean;
  canSaveDraft: boolean;
  missingForNextStage: string[];
  missingForConfirmation: string[];
  stageStatus: LoopProgressStageStatus;
}

export function calculateLoopProgress(data: LoopDataLike): LoopProgressEvaluation {
  const trigger = data.trigger || '';
  const emotionOrBody = data.emotionOrBody || '';
  const facts = data.facts || '';
  const automaticStory = data.automaticStory || '';
  const microAction = data.microAction || data.newChoice || '';
  const reflection = data.reflection || data.insights || '';
  const needs = data.needs || data.desires || '';
  const options = data.options || data.oldResponse || '';

  const hasTrigger = isValidLoopField(trigger, 3);
  const hasEmotion = isValidLoopField(emotionOrBody, 2);
  const hasFacts = isValidLoopField(facts, 3);
  const hasStory = isValidLoopField(automaticStory, 3);
  const hasAction = isValidLoopField(microAction, 3);
  const hasReflection = isValidLoopField(reflection, 3);
  const hasNeeds = isValidLoopField(needs, 2);
  const hasOptions = isValidLoopField(options, 2);

  const hasDistinctFactsAndStory =
    hasFacts && hasStory && facts.trim() !== automaticStory.trim();
  const hasActionOrReflection = hasAction || hasReflection;

  // Can save draft if user provided AT LEAST ONE substantive real data
  const canSaveDraft =
    hasTrigger ||
    hasEmotion ||
    hasFacts ||
    hasStory ||
    hasAction ||
    hasReflection ||
    hasNeeds ||
    hasOptions;

  // Ordered 4-stage progression:
  // Stage 1: สังเกตตัวเอง (trigger OR emotion)
  const stage1 = hasTrigger || hasEmotion;
  // Stage 2: เห็นเหตุการณ์และความรู้สึก (trigger AND emotion)
  const stage2 = stage1 && hasTrigger && hasEmotion;
  // Stage 3: แยกเหตุการณ์กับการตีความ (facts AND story, distinct)
  const stage3 = stage2 && hasDistinctFactsAndStory;
  // Stage 4: เห็นข้อเรียนรู้หรือสิ่งที่จะลองทำ (action OR reflection)
  const stage4 = stage3 && hasActionOrReflection;

  let currentStage: 0 | 1 | 2 | 3 | 4 = 0;
  let stageName = 'ยังไม่เริ่มสำรวจ';

  if (stage4) {
    currentStage = 4;
    stageName = 'เห็นข้อเรียนรู้หรือสิ่งที่จะลองทำ (ครบลูปสำคัญ)';
  } else if (stage3) {
    currentStage = 3;
    stageName = 'แยกเหตุการณ์กับการตีความ';
  } else if (stage2) {
    currentStage = 2;
    stageName = 'เห็นเหตุการณ์และความรู้สึก';
  } else if (stage1) {
    currentStage = 1;
    stageName = 'สังเกตตัวเอง';
  }

  const missingForNextStage: string[] = [];
  if (currentStage === 0) {
    missingForNextStage.push('จุดสะกิด หรือ ความรู้สึก/สัญญาณร่างกาย');
  } else if (currentStage === 1) {
    if (!hasTrigger) missingForNextStage.push('จุดสะกิด (Trigger)');
    if (!hasEmotion) missingForNextStage.push('ความรู้สึก/สัญญาณร่างกาย (Emotion & Body)');
  } else if (currentStage === 2) {
    if (!hasFacts) missingForNextStage.push('ข้อเท็จจริง (Facts)');
    if (!hasStory) missingForNextStage.push('ความคิดแวบแรก (Automatic Story)');
    if (hasFacts && hasStory && facts.trim() === automaticStory.trim()) {
      missingForNextStage.push('แยกข้อเท็จจริงออกจากการตีความ');
    }
  } else if (currentStage === 3) {
    missingForNextStage.push('ก้าวเล็กๆ (Micro-action) หรือ บทเรียน (Reflection)');
  }

  const missingForConfirmation: string[] = [];
  if (!hasTrigger) missingForConfirmation.push('จุดสะกิด (Trigger)');
  if (!hasEmotion) missingForConfirmation.push('ความรู้สึก/สัญญาณร่างกาย (Emotion & Body)');
  if (!hasFacts) missingForConfirmation.push('ข้อเท็จจริง (Facts)');
  if (!hasStory) missingForConfirmation.push('ความคิดแวบแรก (Automatic Story)');
  if (hasFacts && hasStory && facts.trim() === automaticStory.trim()) {
    missingForConfirmation.push('แยกข้อเท็จจริงออกจากการตีความ (Facts and Story must be distinct)');
  }
  if (!hasActionOrReflection) {
    missingForConfirmation.push('ก้าวเล็กๆ (Micro-action) หรือ บทเรียน (Reflection)');
  }

  const canConfirm = currentStage === 4 && missingForConfirmation.length === 0;

  return {
    currentStage,
    stageName,
    isComplete: canConfirm,
    canConfirm,
    canSaveDraft,
    missingForNextStage,
    missingForConfirmation,
    stageStatus: {
      stage1,
      stage2,
      stage3,
      stage4,
    },
  };
}

export function validateLoopForConfirmation(data: LoopDataLike): {
  isValid: boolean;
  missingFields: string[];
} {
  const evalResult = calculateLoopProgress(data);
  return {
    isValid: evalResult.canConfirm,
    missingFields: evalResult.missingForConfirmation,
  };
}
