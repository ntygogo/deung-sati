import type {
  ChatMessage,
  ConversationIntent,
} from './conversationTypes.ts';
import { isCrisisMessage } from './safetyRules.ts';

// Explicit user commands to shift topic
const EXPLICIT_TOPIC_SHIFT_REGEX =
  /(^|\s)(เปลี่ยนเรื่อง|พอแล้ว|ไม่อยากคุยเรื่องนี้|ช่างมัน|พักก่อน|คุยเรื่องอื่น|เปลี่ยนหัวข้อ|ข้ามเรื่องนี้)($|\s|\?|!|นะ|เถอะ|ดีกว่า)/i;

// Impulsive actions / revenge triggers
const IMPULSIVE_ACTION_REGEX =
  /จะ(ด่า|วีน|ประชด|โพสต์|ประจาน|ตบ|ตี|ลาออก|เลิก|บล็อก|บล็อค)|อยาก(ด่า|วีน|ประชด|เลิก|บล็อก|ตบ|ตี)/i;

// Vague / stuck triggers for Guided Check-in
const VAGUE_CHECKIN_REGEX =
  /(ไม่รู้|งง|บอกไม่ถูก|ว่างเปล่า|เฉยๆ|ไม่แน่ใจ|สับสน|เคว้ง|ตัน|แย่มาก)/i;

/**
 * Classify the user's immediate conversation intent
 */
export function classifyConversationIntent(
  latestMsg: string,
  _history?: ChatMessage[]
): ConversationIntent {
  const clean = latestMsg.trim();

  // 1. Crisis priority 0
  if (isCrisisMessage(clean)) {
    return 'crisis';
  }

  // 2. Impulsive reaction needing pause
  if (IMPULSIVE_ACTION_REGEX.test(clean)) {
    return 'pausing';
  }

  // 3. Explicit command to change topic / rest
  if (EXPLICIT_TOPIC_SHIFT_REGEX.test(clean)) {
    return 'venting';
  }

  // 4. User asking for direct advice/choice
  if (/ทำไงดี|ควรทำยังไง|มีวิธีไหม|ขอคำแนะนำ|ช่วยเลือก|ทำอะไรได้บ้าง/i.test(clean)) {
    return 'deciding';
  }

  // 5. User ready for practice / exercises
  if (/อยากฝึก|ขอลองทำ|ช่วยดึงสติ|ฝึกหายใจ|อยากผ่อนคลาย/i.test(clean)) {
    return 'practicing';
  }

  // 6. User ready to summarize / view loop map
  if (/ดูลูป|บันทึกลูป|สรุปให้หน่อย|เห็นภาพแล้ว/i.test(clean)) {
    return 'summarizing';
  }

  // 7. User is vague / stuck / exploring (Triggers Guided Check-in offer)
  if (VAGUE_CHECKIN_REGEX.test(clean)) {
    return 'exploring';
  }

  // 8. User venting emotions / telling story
  if (clean.length > 20 || /แฟน|งาน|หัวหน้า|แม่|พ่อ|เพื่อน|เหนื่อย|โกรธ|น้อยใจ|เสียใจ/i.test(clean)) {
    return 'venting';
  }

  // Default when unclear
  return 'unclear';
}

/**
 * Check if the user explicitly commanded a topic change
 */
export function isExplicitTopicShift(text: string): boolean {
  return EXPLICIT_TOPIC_SHIFT_REGEX.test(text);
}
