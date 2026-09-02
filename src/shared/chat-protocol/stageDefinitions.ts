/**
 * Canonical Stage Definitions (Single Source of Truth)
 * Neutral data structures for Adaptive Stages 1–7.
 * Pure definitions only — zero regexes, zero heuristic logic, zero runtime test dependencies.
 */

import type { CbtConversationStage } from './conversationTypes.js';

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

/**
 * Derives a prompt guidance fragment from the canonical stage definitions.
 * Injected directly into the master system prompt so changing stage definitions
 * automatically updates prompt instructions without duplicating text across files.
 */
export function formatOfficialStagesForPrompt(): string {
  return Object.values(OFFICIAL_STAGES)
    .map(
      (s) =>
        `   - Stage ${s.stage} (${s.name}): ${s.description} (เป้าหมาย: ${s.goal})`
    )
    .join('\n');
}
