/**
 * Relationship Mirror Protocol for Deung Sati Unified Architecture v3
 *
 * Core Principle:
 * When the user asks about the other person ("ทำไมเขาถึงทำแบบนี้", "เขาคิดอะไร", "เขายังรักเราไหม"):
 * 1. Do NOT deflect or dismiss by merely saying "เราไม่รู้ใจเขา กลับมาดูตัวเองกัน"
 * 2. Answer with tentative possibilities based on available facts.
 * 3. Clearly separate: FACTS vs POSSIBILITIES vs UNKNOWNS.
 * 4. Mirror the real emotional impact back to the user ("สิ่งที่เรารู้แน่ๆ คือ พอเขาทำแบบนี้ เธอรู้สึก...").
 * 5. Strictly PROHIBIT diagnosing or mind-reading third parties (no toxic/narcissist labels without deep context).
 */

export interface RelationshipMirrorStep {
  step: 'possibility' | 'distinction' | 'mirror_impact' | 'explore_need';
  instruction: string;
}

export const RELATIONSHIP_MIRROR_GUIDELINES = `
หลักการตอบคำถามเรื่องอีกฝ่าย (Relationship Mirror):
1. STEP A (ตอบความเป็นไปได้): ตอบจากข้อมูลที่มีอย่างเป็นไปได้และเป็นกลาง ไม่เข้าข้างจนเกินจริง
2. STEP B (แยกสิ่งที่รู้จริง/ความเป็นไปได้/สิ่งที่ไม่รู้):
   - Fact: สิ่งที่เกิดขึ้นจริง (เช่น เขาอ่านแล้วยังไม่ตอบมา 3 ชั่วโมง)
   - Possibility: ความเป็นไปได้ (เช่น เขาอาจติดงาน เลี่ยงความขัดแย้ง หรือต้องการพื้นที่)
   - Unknown: สิ่งที่ไม่มีใครรู้ใจเขาได้ 100%
3. STEP C (ส่องผลกระทบที่เกิดกับผู้ใช้): สะท้อนความรู้สึกและตำแหน่งของผู้ใช้ในความสัมพันธ์
   - "แต่สิ่งที่เรารู้แน่ๆ คือ พอเขาเงียบไปแบบนี้ ใจเธอเหมือนเคว้งและไม่รู้จะยืนตรงไหน"
4. STEP D (สำรวจ Need/Boundary ถ้าผู้ใช้พร้อม): ค่อยๆ ชวนดูความต้องการหรือขอบเขตความสัมพันธ์
5. ข้อห้ามเด็ดขาด:
   - ห้ามวินิจฉัยคนอื่น (เช่น อย่าบอกว่าเขาเป็น Narcissist, Toxic, Avoidant)
   - ห้ามอ่านใจอย่างมั่นใจจนเกินจริง
`;
