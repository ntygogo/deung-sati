/**
 * User-Facing 4-Step Chat Journey Protocol
 * Centralized Single Source of Truth for the 4 chat navigation steps.
 * Does NOT expose internal framework names or mechanisms to the user.
 */

export interface UserFacingChatStep {
  step: 1 | 2 | 3 | 4;
  title: string;
  description: string;
  statusLabel: string;
}

export const USER_FACING_CHAT_STEPS: Record<1 | 2 | 3 | 4, UserFacingChatStep> = {
  1: {
    step: 1,
    title: 'หยุดและรับรู้อารมณ์',
    description: 'สังเกตความรู้สึกและสัญญาณในใจหรือร่างกายตอนนี้ ให้พื้นที่ตัวเองได้พักและรับฟังโดยไม่ตัดสิน',
    statusLabel: 'ตอนนี้เรากำลังอยู่ในช่วงหยุดและรับรู้อารมณ์',
  },
  2: {
    step: 2,
    title: 'แยกสิ่งที่เกิดขึ้น',
    description: 'กลับมาดูว่าอะไรคือข้อเท็จจริงที่เกิดขึ้นจริงรอบตัว แยกออกจากความคิด การตีความ หรือการคาดเดา',
    statusLabel: 'ตอนนี้เรากำลังอยู่ในช่วงแยกสิ่งที่เกิดขึ้น',
  },
  3: {
    step: 3,
    title: 'มองเห็นสิ่งที่อยู่ข้างใน',
    description: 'เข้าใจความรู้สึก ความกลัว หรือความต้องการลึกๆ และเห็นวงจรความเคยชินเดิมที่เกิดขึ้น',
    statusLabel: 'ตอนนี้เรากำลังอยู่ในช่วงมองเห็นสิ่งที่อยู่ข้างใน',
  },
  4: {
    step: 4,
    title: 'เลือกว่าจะทำอย่างไรต่อ',
    description: 'ค้นพบทางเลือกใหม่ที่สอดคล้องกับสิ่งที่เราต้องการ และทดลองก้าวเล็กๆ ที่มีสติ',
    statusLabel: 'ตอนนี้เรากำลังอยู่ในช่วงเลือกว่าจะทำอย่างไรต่อ',
  },
};

/**
 * Authoritative mapping from internal conversation turn/stage to user-facing 4 steps.
 * Soft progression: AI can navigate backwards without hard gates.
 */
export function mapTurnToUserFacingStep(
  stage?: number | null,
  mode?: string | null
): UserFacingChatStep {
  if (stage === 7 || mode === 'CHANGE') {
    return USER_FACING_CHAT_STEPS[4];
  }
  if (stage === 4 || stage === 6) {
    return USER_FACING_CHAT_STEPS[3];
  }
  if (stage === 3 || stage === 5) {
    return USER_FACING_CHAT_STEPS[2];
  }
  // Default and safe fallback for Stage 1, 2, mode 'HOLD', or uninitialized
  return USER_FACING_CHAT_STEPS[1];
}
