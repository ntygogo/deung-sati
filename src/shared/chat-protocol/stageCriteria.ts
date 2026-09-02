/**
 * Official Adaptive Stages (Stage 1–7) & Heuristics for Deung Sati V1
 * Internal guide only — NOT a checklist or sequential questionnaire.
 * Updated: Natural HOLD → SEE Transition based on conversational readiness.
 */

import type {
  ChatMessage,
  ChatEngineTurnResponse,
  CbtConversationStage,
} from './conversationTypes.js';
import type { UserConversationIntent } from './conversationIntents.js';
import { isCrisisMessage } from './safetyRules.js';
import { evaluateCheckinConsent } from './consentRules.js';

export interface StageDefinition {
  stage: CbtConversationStage;
  name: string;
  description: string;
  goal: string;
}

export const OFFICIAL_STAGES: Record<CbtConversationStage, StageDefinition> = {
  1: {
    stage: 1,
    name: 'Orient',
    description: 'ทำความเข้าใจประเด็นหลักและพื้นที่การสนทนาที่ผู้ใช้ต้องการ',
    goal: 'รับฟังและจับประเด็นว่าเรื่องอะไรกำลังรบกวนใจผู้ใช้',
  },
  2: {
    stage: 2,
    name: 'Settle / Notice',
    description: 'ลดความล้น หรือสังเกตอารมณ์/ความรู้สึกในร่างกาย (ไม่บังคับ Somatic)',
    goal: 'ช่วยให้ใจนิ่งลง หรือสัมผัสความรู้สึกในปัจจุบัน',
  },
  3: {
    stage: 3,
    name: 'Event',
    description: 'ระบุสิ่งที่เกิดขึ้นจริง (Fact) ก่อนที่ใจจะตีความ',
    goal: 'แยกเหตุการณ์จริงภายนอกออกจากความคิด',
  },
  4: {
    stage: 4,
    name: 'Feeling / Meaning',
    description: 'ช่วยตั้งชื่อความรู้สึก และความหมาย/ความคิดที่พ่วงมากับเหตุการณ์',
    goal: 'เข้าใจว่าเรื่องนี้กระทบความรู้สึกอย่างไรและใจแอบแปลความหมายว่าอะไร',
  },
  5: {
    stage: 5,
    name: 'Separate',
    description: 'แยกความรู้สึก (Feeling) ข้อเท็จจริง (Fact) และการตีความ (Interpretation)',
    goal: 'เห็นชัดเจนว่าอะไรคือเรื่องจริงและอะไรคือเรื่องที่ใจแต่งเติม',
  },
  6: {
    stage: 6,
    name: 'Explore / Practice',
    description: 'สำรวจลูปพฤติกรรม หรือเลือกใช้เครื่องมือ/แบบฝึกหัดที่เหมาะกับ capacity',
    goal: 'เห็นวงจรความเคยชินเดิมของตัวเอง',
  },
  7: {
    stage: 7,
    name: 'Integrate / Choose',
    description: 'สรุปสิ่งที่เห็น คืนทางเลือกให้ผู้ใช้ และชวนทำ Micro Action / Future Self เมื่อพร้อม',
    goal: 'มีทางเลือกใหม่ที่รู้สึกมีพลังและเป็นผู้เลือกเอง',
  },
};

// Regex patterns for heuristic classification
const HIGH_EMOTION_IMPULSIVE_REGEX =
  /(กูจะโทรไปด่า|จะโทรไปด่า|จะไปด่า|จะวีน|จะประชด|จะตบ|จะตี|ทนไม่ไหวแล้ว|โกรธจนตัวสั่น|อยากระเบิด|จะบล็อก|จะเลิก|แม่ง)/i;

const VAGUE_EMOTION_REGEX =
  /(ไม่รู้ว่ารู้สึกอะไร|ไม่รู้เหมือนกัน|รู้แค่ว่ามันแปลก|บอกไม่ถูก|งงไปหมด|ว่างเปล่า|เฉยๆ|ไม่แน่ใจ|สับสน|เคว้ง|ตัน)/i;

const REPEATED_LOOP_REGEX =
  /(ทุกความสัมพันธ์|เกิดแบบนี้ตลอด|ทำไมเป็นแบบนี้อีกแล้ว|ลูปเดิม|ซ้ำๆ|กี่ครั้งก็เหมือนเดิม|ทำไมกูต้องเจอแบบนี้ทุกที)/i;

const PERSPECTIVE_QUESTION_REGEX =
  /(ทำไมเขาถึงทำ|เขาคิดอะไรอยู่|เขาเป็นบ้าอะไร|ทำไมทำแบบนี้กับกู|เขาไม่แคร์เลยหรอ|เขาต้องการอะไร|ทำไมเขาไม่ตอบ)/i;

const CONCRETE_EVENT_OR_MEANING_REGEX =
  /(หัวหน้า|แฟน|เพื่อน|แม่|พ่อ|ที่ทำงาน|เจ้านาย|เพื่อนร่วมงาน|สั่งงาน|ด่า|ว่าแรง|ไม่แฟร์|ไม่ยุติธรรม|เอาเปรียบ|พูดจา|โยนงาน|หักหลัง|นอกใจ|โกหก|ไม่ให้เกียรติ|ทะเลาะ|ไม่ตอบ|หายไป|เทงาน|โดนว่า|โดนด่า|กดดัน|ไม่แคร์)/i;

const BEFORE_SPEAK_REGEX =
  /(กูจะส่งไปว่า|จะพิมพ์ไปบอก|จะส่งข้อความ|จะบอกมันว่า|จะพิมพ์ด่า|จะส่งประชด|จะพิมพ์ไปเลย)/i;

const DESIRE_TO_CHANGE_REGEX =
  /(ไม่อยากเป็นคนแบบนี้|อยากเปลี่ยนตัวเอง|เหนื่อยที่จะเป็นแบบนี้แล้ว|อยากเลิกนิสัยนี้|อยากโตขึ้น|อยากหลุดจากลูป)/i;

const IF_THEN_PLAN_REGEX =
  /(ครั้งหน้าถ้า|คราวหลังถ้า|ถ้าเกิดอีก|รอบหน้าถ้า|อยากหยุดตัวเองก่อน|วางแผนไว้ก่อน|ถ้าเขาหายไปอีก)/i;

const REPAIR_RELAPSE_REGEX =
  /(พลาดอีกแล้ว|เผลอทำไปแล้ว|ส่งประชดไปแล้ว|หลุดด่าไปแล้ว|ทำพังอีกแล้ว|รู้สึกผิดที่ทำไป|เผลอไปแล้ว)/i;

const EXPLICIT_TOPIC_SHIFT_REGEX =
  /(^|\s)(เปลี่ยนเรื่อง|พอแล้ว|ไม่อยากคุยเรื่องนี้|ช่างมัน|พักก่อน|คุยเรื่องอื่น|เปลี่ยนหัวข้อ|ข้ามเรื่องนี้)($|\s|\?|!|นะ|เถอะ|ดีกว่า)/i;

/**
 * Classify conversation intent into official 5 V1 intents
 */
export function classifyConversationIntent(
  latestMsg: string,
  _history?: ChatMessage[]
): UserConversationIntent {
  const clean = latestMsg.trim();
  if (isCrisisMessage(clean)) return 'vent';
  if (HIGH_EMOTION_IMPULSIVE_REGEX.test(clean) || BEFORE_SPEAK_REGEX.test(clean)) return 'decide';
  if (EXPLICIT_TOPIC_SHIFT_REGEX.test(clean)) return 'vent';
  if (DESIRE_TO_CHANGE_REGEX.test(clean) || IF_THEN_PLAN_REGEX.test(clean)) return 'change';
  if (
    PERSPECTIVE_QUESTION_REGEX.test(clean) ||
    VAGUE_EMOTION_REGEX.test(clean) ||
    REPEATED_LOOP_REGEX.test(clean) ||
    CONCRETE_EVENT_OR_MEANING_REGEX.test(clean)
  ) {
    return 'understand';
  }
  return 'vent';
}

/**
 * Classify comprehensive chat state and exercise recommendation deterministically
 */
export function evaluateChatEngineTurn(
  latestUserText: string,
  _history: ChatMessage[] = []
): Omit<ChatEngineTurnResponse, 'assistant_message'> {
  const text = latestUserText.trim();

  // 1. Priority 0: Safety Crisis Gate
  if (isCrisisMessage(text)) {
    return {
      safety_state: 'crisis',
      mode: 'HOLD',
      capacity: 'low',
      user_intent: 'vent',
      stage: 1,
      intensity: 10,
      readiness: 'story',
      recommended_exercise: null,
      quick_replies: ['โทร 1323 (ฟรี 24 ชม.)', 'โทร 02-107-7977', 'อยู่ตรงนี้ก่อนนะ'],
    };
  }

  // 2. User explicitly declines exercise or says "ขอระบายก่อน"
  const consent = evaluateCheckinConsent(text);
  if (consent === 'declined' || /ยังไม่อยากทำ|ขอระบายก่อน|ไม่เอา|ไม่ลอง|คุยเฉยๆ/i.test(text)) {
    return {
      safety_state: 'normal',
      mode: 'HOLD',
      capacity: 'medium',
      user_intent: 'vent',
      stage: 1,
      intensity: 5,
      readiness: 'story',
      recommended_exercise: null,
      quick_replies: ['เล่าต่อเลย', 'รับฟังอยู่เสมอ', 'อยากระบายเรื่องไหน'],
    };
  }

  // 3. High Emotion / High Intensity / Low Capacity -> Emergency / Grounding
  if (HIGH_EMOTION_IMPULSIVE_REGEX.test(text)) {
    return {
      safety_state: 'concern',
      mode: 'HOLD',
      capacity: 'low',
      user_intent: 'decide',
      stage: 2,
      intensity: 9,
      readiness: 'story',
      recommended_exercise: {
        id: 'emergency_pause',
        reason: 'อารมณ์กำลังปะทุรุนแรง ควรหยุดพักหายใจและดึงสติตัวเองก่อนตัดสินใจทำสิ่งใด',
        ask_consent: true,
      },
      quick_replies: ['ลองดู (1 นาที)', 'ยังไม่อยากทำ', 'ขอเล่าต่อ'],
    };
  }

  // 4. "I don't know what I feel" / Disconnected -> Name The Feeling / Body Signal
  if (VAGUE_EMOTION_REGEX.test(text)) {
    return {
      safety_state: 'normal',
      mode: 'SEE',
      capacity: 'medium',
      user_intent: 'understand',
      stage: 2,
      intensity: 4,
      readiness: 'glimpse',
      recommended_exercise: {
        id: 'name_the_feeling',
        reason: 'ช่วยจับคลื่นอารมณ์และตั้งชื่อความรู้สึกที่แท้จริงทีละคำ',
        ask_consent: true,
      },
      quick_replies: ['ลองดู', 'ยังไม่อยากทำ', 'คุยต่อแบบเดิม'],
    };
  }

  // 5. Repeated Loop Pattern -> Loop Snapshot
  if (REPEATED_LOOP_REGEX.test(text)) {
    return {
      safety_state: 'normal',
      mode: 'SEE',
      capacity: 'medium',
      user_intent: 'understand',
      stage: 6,
      intensity: 6,
      readiness: 'glimpse',
      recommended_exercise: {
        id: 'loop_snapshot',
        reason: 'สำรวจรูปแบบพฤติกรรมและความเคยชินที่เคยเกิดขึ้นซ้ำในความสัมพันธ์',
        ask_consent: true,
      },
      quick_replies: ['ลองส่องดูลูป', 'ยังไม่อยากทำ', 'ขอเล่าต่อ'],
    };
  }

  // 6. Questioning Other's Mind ("ทำไมเขาถึงทำแบบนี้") -> Perspective Lens (under 'understand')
  if (PERSPECTIVE_QUESTION_REGEX.test(text)) {
    return {
      safety_state: 'normal',
      mode: 'SEE',
      capacity: 'medium',
      user_intent: 'understand',
      stage: 5,
      intensity: 6,
      readiness: 'glimpse',
      recommended_exercise: {
        id: 'perspective_lens',
        reason: 'แยกสิ่งที่รู้ ออกจากความเป็นไปได้รอบด้าน โดยไม่เดาใจใครเป็นความจริง',
        ask_consent: true,
      },
      quick_replies: ['มองอีกมุม', 'ยังไม่อยากทำ', 'คุยต่อ'],
    };
  }

  // 7. Concrete Event / Unfairness / Meaning -> Natural HOLD to SEE Transition (Stage 4)
  if (CONCRETE_EVENT_OR_MEANING_REGEX.test(text)) {
    return {
      safety_state: 'normal',
      mode: 'SEE',
      capacity: 'medium',
      user_intent: 'understand',
      stage: 4,
      intensity: 6,
      readiness: 'glimpse',
      recommended_exercise: null,
      quick_replies: ['รู้สึกไม่แฟร์เลย', 'อยากให้เขาเข้าใจเราบ้าง', 'ไม่รู้จะทำยังไงดี'],
    };
  }

  // 8. About to send/say something impulsive -> Before Speak (under 'decide')
  if (BEFORE_SPEAK_REGEX.test(text)) {
    return {
      safety_state: 'normal',
      mode: 'HOLD',
      capacity: 'medium',
      user_intent: 'decide',
      stage: 7,
      intensity: 7,
      readiness: 'direction',
      recommended_exercise: {
        id: 'before_speak',
        reason: 'เกลาข้อความให้สื่อความรู้สึกและความต้องการอย่างชัดเจนโดยไม่ทำร้ายความสัมพันธ์',
        ask_consent: true,
      },
      quick_replies: ['เกลาข้อความก่อน', 'ยังไม่อยากทำ', 'ส่งตามเดิม'],
    };
  }

  // 9. Wants to change -> Future Self Choice
  if (DESIRE_TO_CHANGE_REGEX.test(text)) {
    return {
      safety_state: 'normal',
      mode: 'CHANGE',
      capacity: 'high',
      user_intent: 'change',
      stage: 7,
      intensity: 5,
      readiness: 'direction',
      recommended_exercise: {
        id: 'future_self_choice',
        reason: 'เลือกการกระทำที่ตรงกับคุณค่าและตัวตนที่เราภูมิใจในอนาคต',
        ask_consent: true,
      },
      quick_replies: ['เลือกทางใหม่', 'ยังไม่อยากทำ', 'ขอคิดดูก่อน'],
    };
  }

  // 10. Ready to plan for future trigger -> If-Then Plan
  if (IF_THEN_PLAN_REGEX.test(text)) {
    return {
      safety_state: 'normal',
      mode: 'CHANGE',
      capacity: 'high',
      user_intent: 'change',
      stage: 7,
      intensity: 4,
      readiness: 'experiment',
      recommended_exercise: {
        id: 'if_then_plan',
        reason: 'วางแผนรับมือล่วงหน้า ถ้าเกิดสิ่งเร้าแล้วจะเลือกหยุดและตอบสนองอย่างไร',
        ask_consent: true,
      },
      quick_replies: ['วางแผน ถ้า...แล้ว...', 'ยังไม่อยากทำ', 'คุยต่อ'],
    };
  }

  // 11. Relapse / Repeated Old Loop -> Repair After Loop
  if (REPAIR_RELAPSE_REGEX.test(text)) {
    return {
      safety_state: 'normal',
      mode: 'SEE',
      capacity: 'medium',
      user_intent: 'understand',
      stage: 6,
      intensity: 6,
      readiness: 'practice',
      recommended_exercise: {
        id: 'repair_after_loop',
        reason: 'พลาดแล้วรู้ตัวคือการเติบโต ไม่ใช่ความล้มเหลว คืนความเมตตาให้ตัวเองและซ่อมแซม',
        ask_consent: true,
      },
      quick_replies: ['ซ่อมแซมใจ', 'ยังไม่อยากทำ', 'ขอระบายก่อน'],
    };
  }

  // 12. Explicit topic change
  if (EXPLICIT_TOPIC_SHIFT_REGEX.test(text)) {
    return {
      safety_state: 'normal',
      mode: 'SEE',
      capacity: 'medium',
      user_intent: 'vent',
      stage: 1,
      intensity: 3,
      readiness: 'story',
      recommended_exercise: null,
      quick_replies: ['เล่าเรื่องใหม่ได้เลย', 'อยากโฟกัสเรื่องไหน', 'รับฟังอยู่เสมอ'],
    };
  }

  // Default Standard Venting Turn
  return {
    safety_state: 'normal',
    mode: 'HOLD',
    capacity: 'medium',
    user_intent: 'vent',
    stage: 1,
    intensity: 5,
    readiness: 'story',
    recommended_exercise: null,
    quick_replies: ['เล่าต่อ', 'ยังไม่แน่ใจ', 'ขอเวลาคิดแป๊บนะ'],
  };
}
