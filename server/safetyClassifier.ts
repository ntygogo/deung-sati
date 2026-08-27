import { config } from './config.ts';
import { SAFETY_CLASSIFIER_PROMPT } from './prompts.ts';
import { GoogleGenAI } from '@google/genai';

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

export async function classifySafety(
  messages: Array<{ role: string; content: string }>
): Promise<SafetyClassification> {
  const latestMessage = messages[messages.length - 1]?.content || '';
  const text = latestMessage.toLowerCase();

  // Fast-path context checks
  const hasWeaponOrMeans = /มีปืน|มีมีด|ถือปืน|ถือมีด|กินยาไปแล้ว|กรีดแขน|เอามีด|เชือกผูกคอ|พกปืน|พกมีด/i.test(text);
  const isEnRouteOrAction = /กำลังจะไป|กำลังขับรถ|กำลังเดินไป|หน้าบ้าน|ในรถ|รอมัน|จะจบเรื่องนี้|จะยิง|จะแทง/i.test(text);
  const hasPastHarm = /ทำร้าย.*ไปแล้ว|ฆ่า.*ไปแล้ว|แทง.*ไปแล้ว|ฟัน.*ไปแล้ว|ซ้อม.*ไปแล้ว/i.test(text);
  const isMedicalEmergency = /กินยาไปหมดแผง|เลือดไหลไม่หยุด|หมดสติ|หายใจไม่ออก/i.test(text);
  const isViolentThoughtOnly = /อยากฆ่า|อยากต่อย|อยากตบ|อยากกระทืบ|อยากให้มันตาย|แค้น/i.test(text);
  const isBenign = !hasWeaponOrMeans && !isEnRouteOrAction && !hasPastHarm && !isMedicalEmergency && !isViolentThoughtOnly;

  // Fast-path: If completely benign, return normal mode immediately (0ms, 0 API quota used)
  if (isBenign) {
    return {
      mode: 'normal',
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
      reason: 'ข้อความสนทนาทั่วไป ไม่มีสัญญาณความเสี่ยงต่อความปลอดภัย',
    };
  }

  // If live Gemini API key is available and potential risk flagged, use structured safety model
  if (config.geminiApiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
      const conversationText = messages
        .map((m) => `${m.role === 'user' ? 'ผู้ใช้' : 'ดึงสติ'}: ${m.content}`)
        .join('\n');

      const response = await ai.models.generateContent({
        model: config.safetyModel || 'gemini-3.7-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `${SAFETY_CLASSIFIER_PROMPT}\n\n[CONVERSATION CONTEXT]:\n${conversationText}\n\nEvaluate the latest user message: "${latestMessage}"`,
              },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      const jsonStr = response.text || '{}';
      const parsed = JSON.parse(jsonStr) as SafetyClassification;
      if (parsed.mode) {
        return parsed;
      }
    } catch (err) {
      console.warn('Safety API call fallback to heuristic engine:', err);
    }
  }

  // Multi-dimensional heuristic engine
  if (hasPastHarm) {
    return {
      mode: 'protect',
      risk_type: ['past_harm_occurred'],
      intent: 'present',
      plan: 'specific',
      means_access: 'available',
      timeframe: 'imminent',
      proximity_to_target: 'near',
      current_action: true,
      recent_harm_occurred: true,
      medical_emergency: true,
      confidence: 0.95,
      reason: 'มีรายงานว่าเกิดเหตุทำร้ายร่างกายขึ้นแล้ว ต้องให้ความสำคัญกับการช่วยเหลือทางการแพทย์และฉุกเฉินทันที',
    };
  }

  if (isMedicalEmergency) {
    return {
      mode: 'protect',
      risk_type: ['medical_emergency', 'self_harm'],
      intent: 'present',
      plan: 'specific',
      means_access: 'available',
      timeframe: 'imminent',
      proximity_to_target: 'none',
      current_action: true,
      recent_harm_occurred: false,
      medical_emergency: true,
      confidence: 0.98,
      reason: 'ภาวะฉุกเฉินทางการแพทย์เฉพาะหน้า',
    };
  }

  if (hasWeaponOrMeans && (isEnRouteOrAction || /จะไป|จะทำ/i.test(text))) {
    return {
      mode: 'protect',
      risk_type: ['harm_to_others'],
      intent: 'present',
      plan: 'specific',
      means_access: 'available',
      timeframe: 'imminent',
      proximity_to_target: 'near',
      current_action: true,
      recent_harm_occurred: false,
      medical_emergency: false,
      confidence: 0.96,
      reason: 'มีอาวุธและกำลังเคลื่อนที่ไปหาเป้าหมาย เป็นอันตรายใกล้จะเกิดขึ้น ต้องเน้นความปลอดภัยเฉพาะหน้า',
    };
  }

  if (isViolentThoughtOnly) {
    return {
      mode: 'explore',
      risk_type: ['harm_to_others'],
      intent: 'vague',
      plan: 'none',
      means_access: 'none',
      timeframe: 'none',
      proximity_to_target: 'none',
      current_action: false,
      recent_harm_occurred: false,
      medical_emergency: false,
      confidence: 0.85,
      reason: 'มีความคิดรุนแรงจากความโกรธ แต่ยังไม่มีแผนหรืออาวุธเฉพาะหน้า เปิดพื้นที่รับฟังและสำรวจความเจ็บปวดใต้ความโกรธ',
    };
  }

  return {
    mode: 'normal',
    risk_type: [],
    intent: 'none',
    plan: 'none',
    means_access: 'none',
    timeframe: 'none',
    proximity_to_target: 'none',
    current_action: false,
    recent_harm_occurred: false,
    medical_emergency: false,
    confidence: 0.95,
    reason: 'การสนทนาในระดับปกติ',
  };
}
