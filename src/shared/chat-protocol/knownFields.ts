/**
 * Known Fields & Current Conversation Memory for Deung Sati Unified Architecture v3
 * Prevents the AI assistant from repeatedly asking for information already shared by the user.
 */

export type KnownFieldDimension =
  | 'trigger'
  | 'body'
  | 'emotion'
  | 'story'
  | 'need'
  | 'fear'
  | 'urge'
  | 'action'
  | 'payoff'
  | 'consequence';

export interface KnownFieldsState {
  trigger?: string | null;
  body?: string | null;
  emotion?: string | null;
  story?: string | null;
  need?: string | null;
  fear?: string | null;
  urge?: string | null;
  action?: string | null;
  payoff?: string | null;
  consequence?: string | null;
}

export const ALL_KNOWN_FIELD_DIMENSIONS: KnownFieldDimension[] = [
  'trigger',
  'body',
  'emotion',
  'story',
  'need',
  'fear',
  'urge',
  'action',
  'payoff',
  'consequence',
];

/**
 * Extract known dimensions from user text using heuristics.
 */
export function extractKnownDimensions(text: string): KnownFieldDimension[] {
  const clean = text.trim();
  const found: KnownFieldDimension[] = [];

  // Trigger / Event (External event)
  if (/เขา.*(ไม่ตอบ|โกหก|ด่า|ว่า|ทิ้ง|หายไป|สั่งงาน|ตำหนิ|บอกเลิก|คุยกับคนอื่น)|แฟน.*(ไม่ตอบ|ด่า|หาย)|ทะเลาะกับ/i.test(clean)) {
    found.push('trigger');
  }

  // Body sensations
  if (/แน่นหน้าอก|หัวใจเต้นเร็ว|ปวดหัว|จุกในคอ|เกร็ง|ตัวสั่น|หายใจไม่ทั่วท้อง|เหนื่อยล้า|หมดแรง/i.test(clean)) {
    found.push('body');
  }

  // Emotion
  if (/รู้สึก(โกรธ|เสียใจ|น้อยใจ|กลัว|เครียด|เหงา|เศร้า|เหนื่อย|ท้อ|อึดอัด|กังวล|ผิดหวัง|เจ็บปวด)/i.test(clean)) {
    found.push('emotion');
  }

  // Story / Interpretation
  if (/คิดว่า(เขาไม่รัก|เขาเบื่อ|เราไม่ดีพอ|เขาไม่แคร์|ไม่มีใครเข้าใจ|เขาจงใจ|เขาแกล้ง)|รู้สึกว่าตัวเอง(ไร้ค่า|ไม่เก่ง)/i.test(clean)) {
    found.push('story');
  }

  // Fear / Need
  if (/กลัวว่า(เขาจะทิ้ง|เขาจะไปมีคนอื่น|จะไม่เหลือใคร|จะพัง)|อยากให้(เขาเข้าใจ|เขาสนใจ|เขาฟัง|มีคนอยู่ข้างๆ)/i.test(clean)) {
    if (/กลัว/i.test(clean)) found.push('fear');
    if (/อยากให้|ต้องการ/i.test(clean)) found.push('need');
  }

  // Urge / Action
  if (/อยาก(โทรไปด่า|ส่งข้อความ|ทักซ้ำ|พิมพ์ประชด|หนีไป|กรี๊ด)|ทักไปแล้ว|โทรไปแล้ว|พิมพ์ไปแล้ว|ประชดไปแล้ว/i.test(clean)) {
    if (/อยาก/i.test(clean)) found.push('urge');
    if (/ไปแล้ว/i.test(clean)) found.push('action');
  }

  // Consequence
  if (/ตอนนี้รู้สึกผิด|เขายิ่งเงียบ|ทะเลาะหนักกว่าเดิม|พังกว่าเดิม|ผลคือ/i.test(clean)) {
    found.push('consequence');
  }

  return found;
}
