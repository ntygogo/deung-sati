/**
 * Smallest Helpful Move / Intervention Rules for Deung Sati Unified Architecture v3
 */

export type SuggestedIntervention =
  | 'listen'
  | 'reflect'
  | 'clarify'
  | 'ground'
  | 'immediate_reset'
  | 'fact_story'
  | 'relationship_mirror'
  | 'explore_need'
  | 'loop_reflection'
  | 'choice'
  | 'future_self'
  | 'before_speak'
  | 'exercise'
  | 'none';

export interface InterventionInfo {
  id: SuggestedIntervention;
  title: string;
  description: string;
  applicableMode: 'HOLD' | 'SEE' | 'CHANGE' | 'ALL';
}

export const INTERVENTION_CATALOG: Record<SuggestedIntervention, InterventionInfo> = {
  listen: {
    id: 'listen',
    title: 'รับฟังอย่างอดทน',
    description: 'ให้พื้นที่ผู้ใช้เล่าต่อโดยไม่ขัดจังหวะหรือตั้งคำถาม',
    applicableMode: 'HOLD',
  },
  reflect: {
    id: 'reflect',
    title: 'สะท้อนความรู้สึกและประเด็นสำคัญ',
    description: 'สะท้อนสิ่งที่ผู้ใช้เพิ่งเล่าอย่างสั้น กระชับ อบอุ่น',
    applicableMode: 'ALL',
  },
  clarify: {
    id: 'clarify',
    title: 'ถามขยายความ 1 คำถาม',
    description: 'ถามเพื่อเข้าใจจุดที่ยังคลุมเครือเพียง 1 คำถามที่สำคัญที่สุด',
    applicableMode: 'SEE',
  },
  ground: {
    id: 'ground',
    title: 'ดึงสติติดกับปัจจุบัน',
    description: 'ช่วยชะลออารมณ์ฉุกเฉินด้วยการหายใจหรือผ่อนคลายร่างกาย (เมื่อยินยอม)',
    applicableMode: 'HOLD',
  },
  immediate_reset: {
    id: 'immediate_reset',
    title: 'หยุดพักความคิดด้วยการกระทำเล็กๆ',
    description: 'ลดภาวะสมองล้น/ฟุ้งซ่านด้วยการชวนทำ micro-action สั้นๆ ปลอดภัย แล้วกลับมาคุยต่อ',
    applicableMode: 'ALL',
  },
  fact_story: {
    id: 'fact_story',
    title: 'แยกข้อเท็จจริงออกจากการตีความ',
    description: 'ชี้ให้เห็นความแตกต่างระหว่างสิ่งที่เกิดขึ้นจริงกับสิ่งที่ใจแต่งเรื่องต่อ',
    applicableMode: 'SEE',
  },
  relationship_mirror: {
    id: 'relationship_mirror',
    title: 'กระจกสะท้อนความสัมพันธ์',
    description: 'ตอบคำถามเรื่องอีกฝ่ายโดยแยก Fact/Possibility/Unknown แล้วสะท้อนผลกระทบกลับมาที่ผู้ใช้',
    applicableMode: 'SEE',
  },
  explore_need: {
    id: 'explore_need',
    title: 'สำรวจความต้องการและความกลัวลึกๆ',
    description: 'พาผู้ใช้มองลึกไปใต้ความโกรธ/เสียใจว่าแท้จริงแล้วต้องการอะไร',
    applicableMode: 'SEE',
  },
  loop_reflection: {
    id: 'loop_reflection',
    title: 'สะท้อนสมมติฐานลูปพฤติกรรม',
    description: 'เสนอ tentative hypothesis ของวงจรพฤติกรรมให้ผู้ใช้ยืนยันหรือแก้ไข',
    applicableMode: 'SEE',
  },
  choice: {
    id: 'choice',
    title: 'สำรวจทางเลือกใหม่',
    description: 'ชวนมองทางเลือกที่ตอบโจทย์ความต้องการระยะยาว',
    applicableMode: 'CHANGE',
  },
  future_self: {
    id: 'future_self',
    title: 'ตัวตนที่อยากเป็นในอนาคต',
    description: 'ชวนใคร่ครวญว่าตัวตนที่โตขึ้นในอนาคตจะเลือกตอบสนองอย่างไร',
    applicableMode: 'CHANGE',
  },
  before_speak: {
    id: 'before_speak',
    title: 'เกลาคำพูดก่อนส่ง',
    description: 'ช่วยหยุดข้อความประชดหรือก้าวร้าว และเกลาเป็นข้อความที่ชัดเจนและสร้างสรรค์',
    applicableMode: 'CHANGE',
  },
  exercise: {
    id: 'exercise',
    title: 'ชวนทำแบบฝึกหัดเฉพาะทาง',
    description: 'เสนอแบบฝึกหัดอินเทอร์แอคทีฟ (ต้องขอความยินยอมก่อนเสมอ)',
    applicableMode: 'ALL',
  },
  none: {
    id: 'none',
    title: 'ไม่มีการแทรกแซงพิเศษ',
    description: 'สนทนาตามธรรมชาติ',
    applicableMode: 'ALL',
  },
};
