/**
 * Mode Rules for Deung Sati Unified Architecture v3 (HOLD / SEE / CHANGE)
 */

export type ConversationMode = 'HOLD' | 'SEE' | 'CHANGE';

export interface ModeRuleDefinition {
  mode: ConversationMode;
  description: string;
  allowedActions: string[];
  prohibitedActions: string[];
}

export const MODE_DEFINITIONS: Record<ConversationMode, ModeRuleDefinition> = {
  HOLD: {
    mode: 'HOLD',
    description: 'เน้นการรับฟัง สะท้อนความรู้สึก ลด cognitive load ชะลอแรงกระตุ้นชั่ววูบ',
    allowedActions: [
      'ฟังอย่างอดทน',
      'สะท้อนความรู้สึกและเหตุการณ์ตรงหน้า',
      'ช่วยหยุดการกระทำ impulsive',
      'grounding สั้นๆ เฉพาะเมื่อเหมาะสมและผู้ใช้ยินยอม',
    ],
    prohibitedActions: [
      'ห้ามรีบสอนหรือให้คำแนะนำ',
      'ห้ามรีบทำ Loop Map หรือวิเคราะห์ root cause',
      'ห้ามยัดเยียดแบบฝึกหัด',
      'ห้ามถามคำถามซับซ้อนหลายข้อ',
    ],
  },
  SEE: {
    mode: 'SEE',
    description: 'สำรวจข้อเท็จจริง ความรู้สึก การตีความ ความต้องการ ความกลัว และแพทเทิร์น',
    allowedActions: [
      'ช่วยแยกข้อเท็จจริง (Fact) ออกจากการตีความ (Story)',
      'สำรวจความต้องการ (Need) และความกลัว (Fear)',
      'เสนอสมมติฐานลูปพฤติกรรม (Candidate Loop) อย่างระมัดระวัง',
      'ทำ Relationship Mirror เมื่อผู้ใช้ถามถึงอีกฝ่าย',
    ],
    prohibitedActions: [
      'ห้ามถามข้อมูลที่ผู้ใช้บอกแล้วซ้ำ',
      'ห้ามทำเป็นแบบสอบถาม (Questionnaire)',
      'ห้ามวินิจฉัยคนอื่นหรืออ่านใจคนอื่น',
    ],
  },
  CHANGE: {
    mode: 'CHANGE',
    description: 'ช่วยมองหาทางเลือกใหม่ ออกแบบพฤติกรรม ซ่อมแซมความรู้สึก และวางแผนรับมือ',
    allowedActions: [
      'ช่วยมองทางเลือกใหม่ (New Choice)',
      'ชวนคุยถึงตัวตนในอนาคต (Future Self)',
      'ช่วยเกลาคำพูดก่อนส่ง (Before Speak)',
      'วางแผน ถ้า...แล้วจะ... (If-Then Plan)',
      'ซ่อมแซมจิตใจหลังหลุดลูป (Repair After Loop)',
    ],
    prohibitedActions: [
      'ห้ามบังคับหรือตัดสินทางเลือกของผู้ใช้',
      'ห้ามรีบเข้าสู่ CHANGE หากผู้ใช้ยังอยู่ในสภาวะอารมณ์ท่วมท้น',
    ],
  },
};
