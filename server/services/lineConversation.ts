import { LOOP_CHAT_FIELDS, prepareLoopChat, type LoopChatGuide } from '../../src/shared/chat-protocol/loopChatGuide.js';

const labels: Record<string, string> = {
  'อยากระบายต่อ': 'ยังเล่าไม่จบ',
  'ค่อย ๆ สำรวจลูปด้วยกัน': 'ลองสำรวจใจ',
  'ยังไม่รู้ ช่วยไกด์หน่อย': 'ช่วยยกตัวอย่างหน่อย',
  'สรุปแล้วบันทึก': 'สรุปที่คุยกัน',
};
export const lineChoiceLabel = (text: string) => labels[text] || text;
export function lineChoiceInput(text: string) {
  return Object.entries(labels).find(([, label]) => label === text)?.[0] || text;
}
export function lineConversationChoices(loop: unknown, replies: string[] = []) {
  // Read the completed turn's mode without advancing the conversation state machine.
  const guide = loop && typeof loop === 'object' ? loop as Partial<LoopChatGuide> : {};
  const contextual = guide.mode === 'review' ? ['สรุปแล้วบันทึก', 'อยากระบายต่อ']
    : guide.mode === 'offered' ? ['อยากระบายต่อ', 'ค่อย ๆ สำรวจลูปด้วยกัน']
    : guide.mode === 'guided' ? (replies.length ? replies : ['ยังไม่รู้ ช่วยไกด์หน่อย', 'ข้ามข้อนี้ก่อน', 'อยากระบายต่อ'])
    : ['อยากระบายต่อ'];
  // Keep usable labels intact; never truncate an action into an ambiguous choice.
  return [...new Set([...contextual.filter(x => x !== 'สิทธิ์ของฉัน' && Array.from(lineChoiceLabel(x)).length <= 20).slice(0, 3), 'เมนู', 'สิทธิ์ของฉัน'])];
}
export const isLineSummaryRequest = (text: string) => /^(?:ช่วย|ขอ)?สรุป(?:เลย|ให้หน่อย|ที่คุยกัน|ที่คุยกันมา|ที่คุยกันมาทั้งหมด|บทสนทนา|บันทึกลูป|แล้วบันทึก)?(?:นะ|จ้ะ|ค่ะ|ครับ)?[.!]*$/u.test(text.replace(/\s+/gu, ''));
export function lineLoopSummary(loop: unknown): string | null {
  const guide: LoopChatGuide = prepareLoopChat([], loop).state;
  if (!LOOP_CHAT_FIELDS.some(key => guide.fields[key])) return null;
  const titles = ['เหตุการณ์ที่กระทบใจ', 'ความรู้สึกหรือร่างกาย', 'ความคิดที่แวบขึ้นมา', 'สิ่งที่เกิดขึ้นจริง', 'สิ่งที่ต้องการ', 'ทางเลือกที่มองไว้', 'ก้าวเล็ก ๆ ที่เลือก', 'สิ่งที่สังเกตได้'];
  return 'สรุปจากสิ่งที่เธอเล่าไว้ในเรื่องนี้นะ\n\n' + LOOP_CHAT_FIELDS.map((key, i) => `${i + 1}. ${titles[i]}: ${guide.fields[key] || 'ยังไม่ได้เล่า / ยังไม่ชัดเจน'}`).join('\n\n')
    + '\n\nตรงไหนไม่ตรง แก้ให้เราได้เลยนะ สรุปนี้อยู่ในแชท LINE ยังไม่ได้บันทึกลงสมุดในเว็บ';
}
