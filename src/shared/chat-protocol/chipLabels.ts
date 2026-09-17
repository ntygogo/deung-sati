/**
 * Standard Quick Option Chips Labels
 * Shared across UI and Fallback response generators.
 */

export const CHIP_LABELS = {
  // Consent offer options
  CONSENT_OFFER: ['ลองดู', 'ยังไม่อยากทำ', 'คุยต่อแบบเดิม'],
  // Ambiguous consent re-prompt options
  CONSENT_AMBIGUOUS: ['ฟังเราต่อ', 'ลองหนึ่งคำถาม', 'พักก่อน'],

  // Step 1: Body Check-in options
  STEP1_BODY: ['หน้าอก', 'คอ', 'ท้อง', 'หัว', 'ทั้งตัว', 'ไม่รู้/ไม่รู้สึกอะไร'],

  // Step 2: Sensation Texture options
  STEP2_TEXTURE: [
    'หนัก',
    'ตึง',
    'แน่น',
    'ชา',
    'ร้อน',
    'สั่น',
    'ว่างเปล่า',
    'บอกไม่ถูก',
  ],

  // Step 3: Trigger context options
  STEP3_TRIGGER: [
    'มีคนพูดบางอย่างใส่',
    'เรื่องงาน/เรื่องเงิน',
    'อยู่คนเดียวแล้วคิดวน',
    'จำไม่ได้/ข้ามก่อน',
  ],

  // Step 4: Emotional Naming suggestions
  STEP4_EMOTIONS: [
    'กังวล',
    'น้อยใจ',
    'ผิดหวัง',
    'กลัว',
    'สับสน',
    'ยังไม่มีคำไหนตรง',
  ],

  // Step 5: Fact vs Feeling acknowledgement options
  STEP5_FACT_FEELING: ['เข้าใจแล้ว', 'เห็นภาพชัดขึ้น', 'ไปต่อ'],

  // Step 6: Micro-Exercise choices
  STEP6_EXERCISES: [
    'หายใจและอยู่กับร่างกาย',
    'เขียนสิ่งที่รู้สึก',
    'มองข้อเท็จจริง',
    'ยังไม่พร้อม',
  ],

  // Mode wrap-up return choices
  WRAPUP_RETURN: ['คุยต่อ', 'กลับสู่บทสนทนาเดิม', 'พักก่อน'],

  // Topic confirmation choices
  TOPIC_CONFIRM: ['เรื่องเดิม', 'เริ่มเรื่องใหม่'],
} as const;
