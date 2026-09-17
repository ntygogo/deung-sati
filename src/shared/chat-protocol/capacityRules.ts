/**
 * Cognitive & Emotional Capacity Rules for Deung Sati Unified Architecture v3
 */

export type UserCognitiveCapacity = 'low' | 'medium' | 'high';

export interface CapacityEvaluationResult {
  capacity: UserCognitiveCapacity;
  reason: string;
  allowComplexReflection: boolean;
}

/**
 * Evaluate user cognitive/emotional capacity.
 * Looks at whether user is able to analyze, think clearly, or is in an overwhelmed/impulsive state.
 */
export function evaluateUserCapacity(
  userText: string,
  isOverwhelmedOrImpulsive: boolean = false
): CapacityEvaluationResult {
  const text = userText.trim();

  // 1. Low Capacity: Overwhelmed, intense rage, impulsive urge, crying uncontrollably
  if (
    isOverwhelmedOrImpulsive ||
    /(ทนไม่ไหว|จะระเบิด|ร้องไห้ไม่หยุด|โกรธจนสั่น|จะไปด่า|จะโทรไปวีน|ไม่ไหวแล้ว|แม่ง|พังหมดแล้ว)/i.test(text)
  ) {
    return {
      capacity: 'low',
      reason: 'อารมณ์ท่วมท้นหรือมีแรงผลักดันชั่ววูบสูง ความพร้อมในการคิดวิเคราะห์ต่ำ',
      allowComplexReflection: false,
    };
  }

  // 2. High Capacity: Reflective, asking analytical questions, looking for solutions/choices
  if (
    /(ทำไมเราถึงเป็นแบบนี้|อยากเข้าใจตัวเอง|ควรเลือกทางไหน|อยากลองเปลี่ยน|อนาคตถ้าเกิดอีก|เราสังเกตเห็นว่า)/i.test(text)
  ) {
    return {
      capacity: 'high',
      reason: 'ผู้ใช้มีพื้นที่ในการคิดและพร้อมใคร่ครวญทางเลือกใหม่',
      allowComplexReflection: true,
    };
  }

  // 3. Medium Capacity: Standard narration, venting, describing events
  return {
    capacity: 'medium',
    reason: 'ผู้ใช้สามารถเล่าเรื่องและตอบคำถามสั้นๆ ได้อย่างต่อเนื่อง',
    allowComplexReflection: true,
  };
}
