import { isCrisisMessage } from '../src/shared/chat-protocol';

export interface SafetyClassification {
  mode: 'normal' | 'explore' | 'protect';
  risk_type: Array<
    | 'self_harm'
    | 'suicide'
    | 'harm_to_others'
    | 'domestic_violence'
    | 'medical_emergency'
    | 'past_harm_occurred'
  >;
  intent: 'none' | 'vague' | 'present';
  plan: 'none' | 'vague' | 'specific';
  means_access: 'none' | 'unknown' | 'available';
  timeframe: 'none' | 'vague' | 'imminent';
  proximity_to_target: 'none' | 'unknown' | 'near';
  current_action: boolean;
  recent_harm_occurred: boolean;
  medical_emergency: boolean;
  confidence: number;
  reason: string;
}

/**
 * Ultra-Fast Deterministic Safety Classifier (< 1ms, 0 API calls)
 * Eliminates redundant sequential LLM calls for standard conversational turns.
 */
export async function classifySafety(
  messages: Array<{ role: string; content: string }>
): Promise<SafetyClassification> {
  const latestMessage = messages[messages.length - 1]?.content || '';
  const text = latestMessage.toLowerCase();

  // 1. Immediate Crisis / Self-Harm
  if (isCrisisMessage(text)) {
    return {
      mode: 'protect',
      risk_type: ['suicide', 'self_harm'],
      intent: 'present',
      plan: 'specific',
      means_access: 'available',
      timeframe: 'imminent',
      proximity_to_target: 'near',
      current_action: true,
      recent_harm_occurred: false,
      medical_emergency: true,
      confidence: 1.0,
      reason: 'ตรวจพบสัญญาณความเสี่ยงต่อชีวิตหรือการทำร้ายตนเองฉุกเฉิน',
    };
  }

  // 2. Weapons / Extreme Imminent Physical Violence
  const hasWeaponOrMeans = /มีปืน|มีมีด|ถือปืน|ถือมีด|กินยาไปแล้ว|กรีดแขน|เอามีด|เชือกผูกคอ|พกปืน|พกมีด/i.test(text);
  const isEnRouteOrAction = /กำลังจะไปยิง|กำลังขับรถไปแทง|จะไปฆ่า|จะยิงมัน/i.test(text);
  const hasPastHarm = /ทำร้าย.*ไปแล้ว|ฆ่า.*ไปแล้ว|แทง.*ไปแล้ว|ฟัน.*ไปแล้ว|ซ้อม.*ไปแล้ว/i.test(text);
  const isMedicalEmergency = /กินยาไปหมดแผง|เลือดไหลไม่หยุด|หมดสติ|หายใจไม่ออก/i.test(text);

  if (hasWeaponOrMeans || isEnRouteOrAction || hasPastHarm || isMedicalEmergency) {
    return {
      mode: 'protect',
      risk_type: ['harm_to_others', 'medical_emergency'],
      intent: 'present',
      plan: 'specific',
      means_access: 'available',
      timeframe: 'imminent',
      proximity_to_target: 'near',
      current_action: true,
      recent_harm_occurred: hasPastHarm,
      medical_emergency: isMedicalEmergency,
      confidence: 0.95,
      reason: 'ตรวจพบภัยคุกคามทางกายภาพเฉพาะหน้า หรือเหตุฉุกเฉินทางการแพทย์',
    };
  }

  // 3. Emotional Intensity / Frustration / Venting (Normal / Explore)
  const isHighEmotion = /ด่า|โกรธ|แค้น|หงุดหงิด|เกลียด|ไม่ไหวแล้ว|จะบ้าตาย|ประสาทจะกิน/i.test(text);

  return {
    mode: isHighEmotion ? 'explore' : 'normal',
    risk_type: [],
    intent: 'none',
    plan: 'none',
    means_access: 'none',
    timeframe: 'none',
    proximity_to_target: 'none',
    current_action: false,
    recent_harm_occurred: false,
    medical_emergency: false,
    confidence: 1.0,
    reason: isHighEmotion
      ? 'อารมณ์เข้มข้นจากการระบายความรู้สึกทั่วไป ไม่พบภัยคุกคามทางกายภาพ'
      : 'ข้อความสนทนาทั่วไป',
  };
}
