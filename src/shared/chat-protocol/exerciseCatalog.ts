/**
 * Guided Exercise Definitions & Step Catalog for Deung Sati V1
 * Deterministic client-side execution to eliminate latency and API costs during steps.
 */

export interface ExerciseStep {
  stepIndex: number;
  totalSteps: number;
  title: string;
  instruction: string;
  hint?: string;
  actionLabel?: string; // e.g. "ทำแล้ว", "ต่อไป"
  inputType?: 'none' | 'text' | 'choice';
  inputChoices?: string[];
  inputPlaceholder?: string;
}

export interface GuidedExerciseDefinition {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  estimatedDuration: string;
  steps: ExerciseStep[];
}

export const GUIDED_EXERCISE_CATALOG: Record<string, GuidedExerciseDefinition> = {
  // 1. Simple 4-4-4 Breathing / Emergency Pause
  emergency_pause: {
    id: 'emergency_pause',
    title: 'หยุดพักหายใจ 1 นาที',
    subtitle: 'คืนความนิ่งให้ร่างกายและชะลอแรงผลักชั่ววูบ',
    icon: '🫁',
    estimatedDuration: '1 นาที',
    steps: [
      {
        stepIndex: 1,
        totalSteps: 3,
        title: 'วางทุกอย่างลง',
        instruction: 'ทิ้งหลังพิงพนัก สัมผัสฝ่าเท้าวางราบกับพื้น คลายหัวไหล่และกล้ามเนื้อขากรรไกรเบาๆ',
        hint: 'ไม่จำเป็นต้องทำให้สมบูรณ์แบบ แค่รู้ตัวว่ากำลังนั่งอยู่ตรงนี้',
        actionLabel: 'พร้อมแล้ว',
      },
      {
        stepIndex: 2,
        totalSteps: 3,
        title: 'หายใจเข้าช้าๆ 4 วินาที',
        instruction: 'สูดลมหายใจเข้าทางจมูกลึกๆ นับ 1... 2... 3... 4... แล้วกักลมหายใจไว้นิ่งๆ 2 วินาที',
        hint: 'สังเกตลมที่ผ่านปลายจมูกเข้าไป',
        actionLabel: 'ทำแล้ว',
      },
      {
        stepIndex: 3,
        totalSteps: 3,
        title: 'ผ่อนลมหายใจออกยาวๆ 6 วินาที',
        instruction: 'ค่อยๆ เป่าลมหายใจออกทางปากช้าๆ นับ 1... 2... 3... 4... 5... 6...',
        hint: 'ปล่อยให้ความตึงเครียดไหลออกไปพร้อมลมหายใจ',
        actionLabel: 'เสร็จสิ้น',
      },
    ],
  },

  // 2. Sensory Orientation (Grounding 5-4-3-2-1)
  grounding_5_senses: {
    id: 'grounding_5_senses',
    title: 'สัมผัสประสาททั้ง 5 (Grounding)',
    subtitle: 'ดึงใจจากความคิดวนกลับมาอยู่กับสิ่งที่สัมผัสได้จริง',
    icon: '🌿',
    estimatedDuration: '2 นาที',
    steps: [
      {
        stepIndex: 1,
        totalSteps: 3,
        title: 'มองเห็น 3 สิ่ง',
        instruction: 'กวาดสายตามองรอบตัว สังเกตสิ่งของ 3 อย่างที่มีสีต่างกันรอบตัวเธอตอนนี้',
        hint: 'มองแค่รูปทรงและสี โดยไม่ต้องตัดสินว่าชอบหรือไม่ชอบ',
        actionLabel: 'มองเห็นแล้ว',
      },
      {
        stepIndex: 2,
        totalSteps: 3,
        title: 'สัมผัส 2 สิ่ง',
        instruction: 'แตะหรือสัมผัสสิ่งของ 2 อย่างใกล้ตัว เช่น เนื้อผ้าของเสื้อ หรือพื้นผิวของโต๊ะ/หน้าจอ',
        hint: 'สังเกตอุณหภูมิและความเรียบ/ขรุขระ',
        actionLabel: 'สัมผัสแล้ว',
      },
      {
        stepIndex: 3,
        totalSteps: 3,
        title: 'ฟัง 1 เสียง',
        instruction: 'หลับตาลงสักครู่ ตั้งใจฟังเสียงที่อยู่ไกลที่สุดหรือเบาที่สุดรอบตัวตอนนี้',
        hint: 'เสียงพัดลม เสียงลมหายใจ หรือเสียงบรรยากาศรอบข้าง',
        actionLabel: 'ได้ยินแล้ว',
      },
    ],
  },

  // 3. Fact vs Interpretation (แยกเรื่องจริง vs ความคิด)
  fact_story_unknown: {
    id: 'fact_story_unknown',
    title: 'แยกข้อเท็จจริงออกจากการตีความ',
    subtitle: 'เห็นสิ่งที่เกิดขึ้นจริงก่อนที่ใจจะแต่งเรื่องต่อ',
    icon: '🔍',
    estimatedDuration: '2 นาที',
    steps: [
      {
        stepIndex: 1,
        totalSteps: 3,
        title: '1. ข้อเท็จจริง (Fact)',
        instruction: 'เหตุการณ์ที่กล้องวงจรปิดบันทึกได้จริงๆ คืออะไร? (คำพูดตัวต่อตัว หรือการกระทำที่เห็นชัด)',
        hint: 'เขียนเฉพาะสิ่งที่เกิดขึ้นจริงโดยไม่มีคำตัดสิน เช่น "เขาอ่านแชตแล้วยังไม่ได้ตอบ"',
        inputType: 'text',
        inputPlaceholder: 'สิ่งที่เกิดขึ้นจริงแบบไม่มีการตีความ...',
        actionLabel: 'ระบุแล้ว',
      },
      {
        stepIndex: 2,
        totalSteps: 3,
        title: '2. เสียงที่ใจแต่งเติม (Story)',
        instruction: 'แล้วใจเราแอบแปลความหมายเหตุการณ์นั้นว่าอะไร?',
        hint: 'เช่น "เขาไม่เห็นหัวเรา", "เขาหมดรักเราแล้ว", "เราไม่มีค่า"',
        inputType: 'text',
        inputPlaceholder: 'ความคิดหรือเสียงในหัวที่เกิดขึ้น...',
        actionLabel: 'เห็นความคิดแล้ว',
      },
      {
        stepIndex: 3,
        totalSteps: 3,
        title: '3. สิ่งที่ยังไม่รู้แน่ชัด (Unknown)',
        instruction: 'ตรงไหนของเรื่องนี้ที่ตอนนี้เรายังไม่มีข้อมูลพอจะสรุป?',
        hint: 'เช่น สิ่งที่ยังไม่ได้ถามเขาตรงๆ หรือเหตุผลจริงในใจเขาที่เรายังไม่มีทางรู้ได้',
        inputType: 'text',
        inputPlaceholder: 'สิ่งที่ตอนนี้ยังไม่มีข้อมูลพอจะสรุป...',
        actionLabel: 'เข้าใจแล้ว',
      },
    ],
  },

  // 4. Before Speak (เกลาคำพูดก่อนส่ง)
  before_speak: {
    id: 'before_speak',
    title: 'หยุดเกลาคำพูดก่อนส่ง',
    subtitle: 'สื่อสารความต้องการที่แท้จริงโดยไม่ทำร้ายความสัมพันธ์',
    icon: '✉️',
    estimatedDuration: '1 นาที',
    steps: [
      {
        stepIndex: 1,
        totalSteps: 3,
        title: '1. เช็กแรงขับข้างใน',
        instruction: 'ข้อความที่จะส่งตอนนี้ มีเป้าหมายเพื่อ "ประชด/เอาชนะ" หรือเพื่อ "สื่อสารความรู้สึกให้เข้าใจกัน"?',
        hint: 'ถ้าตอบเพื่อเอาชนะ มักจะจบด้วยความรู้สึกผิดภายหลัง',
        actionLabel: 'เช็กแล้ว',
      },
      {
        stepIndex: 2,
        totalSteps: 3,
        title: '2. ตัดคำตัดสินออก',
        instruction: 'ตัดคำว่า "แกตลอดเวลา", "ไม่เคยเห็นหัว", หรือคำประชดออก แล้วบอกแค่สิ่งที่เราเห็นและความรู้สึกของเรา',
        hint: 'เปลี่ยนจาก "แกไม่เคยแคร์" เป็น "พอเธอเงียบไป เรากังวลและน้อยใจ"',
        actionLabel: 'ตัดออกแล้ว',
      },
      {
        stepIndex: 3,
        totalSteps: 3,
        title: '3. ระบุความต้องการชัดเจน',
        instruction: 'บอกความต้องการอย่างตรงไปตรงมา 1 ข้อ เช่น "อยากให้ช่วยตอบสั้นๆ ว่าติดอะไรอยู่"',
        hint: 'สื่อสารแบบที่ตัวเราในอนาคตจะไม่รู้สึกผิด',
        actionLabel: 'พร้อมส่งแบบมีสติ',
      },
    ],
  },

  // 5. Perspective Lens (ส่องมุมมองอีกฝ่าย)
  perspective_lens: {
    id: 'perspective_lens',
    title: 'กระจกสะท้อนมุมมอง (Perspective Lens)',
    subtitle: 'มองสถานการณ์จากความเป็นไปได้รอบด้านโดยไม่เดาใจ',
    icon: '🔭',
    estimatedDuration: '2 นาที',
    steps: [
      {
        stepIndex: 1,
        totalSteps: 3,
        title: '1. มุมมองฝั่งเรา',
        instruction: 'ในมุมของเรา เราเห็นอะไร และสิ่งที่เกิดขึ้นกระทบใจเราตรงไหน?',
        hint: 'ยอมรับความเจ็บ ความโกรธ หรือความผิดหวังของเราตามจริง',
        actionLabel: 'รับรู้ฝั่งเรา',
      },
      {
        stepIndex: 2,
        totalSteps: 3,
        title: '2. ความเป็นไปได้ในฝั่งเขา',
        instruction: 'ถ้าเขาไม่ได้มีเจตนาจะทำร้ายเรา มีปัจจัยอะไรในชีวิตเขา (ความเครียด, งาน, ความเหนื่อย) ที่อาจส่งผลต่อพฤติกรรมนี้?',
        hint: 'การเข้าใจปัจจัยของเขาไม่ได้แปลว่าเราต้องยอมรับพฤติกรรมที่ไม่ดี',
        actionLabel: 'มองเห็นปัจจัย',
      },
      {
        stepIndex: 3,
        totalSteps: 3,
        title: '3. ทางเลือกของเรา',
        instruction: 'เมื่อเราไม่สามารถควบคุมใจเขาได้ สิ่งที่เราเลือกทำเพื่อดูแลใจตัวเองตอนนี้คืออะไร?',
        hint: 'ถอยมาพัก, สื่อสารอย่างนิ่งๆ, หรือวางเรื่องนี้ไว้ชั่วคราว',
        actionLabel: 'เลือกทางของฉัน',
      },
    ],
  },

  // 6. Micro Action (การกระทำเล็กๆ 1 อย่าง)
  micro_action: {
    id: 'micro_action',
    title: 'เลือกการกระทำเล็กๆ (Micro Action)',
    subtitle: 'ก้าวเล็กๆ 1 อย่างที่ทำได้จริงทันทีโดยไม่ฝืนใจ',
    icon: '🌱',
    estimatedDuration: '1 นาที',
    steps: [
      {
        stepIndex: 1,
        totalSteps: 2,
        title: 'เลือก 1 สิ่งที่ทำได้ทันที',
        instruction: 'อะไรคือสิ่งเล็กๆ ที่ใช้เวลาไม่เกิน 2 นาที ที่จะช่วยให้เธอรู้สึกว่าได้ดูแลตัวเองตอนนี้?',
        hint: 'เช่น ดื่มน้ำเย็น 1 แก้ว, ลุกไปล้างหน้า, วางโทรศัพท์คว่ำหน้า 5 นาที, หรือเขียนระบายสั้นๆ',
        inputType: 'choice',
        inputChoices: [
          'ดื่มน้ำเย็นสักแก้ว 💧',
          'ลุกไปยืดเส้น/ล้างหน้า 🚶',
          'วางมือถือพักสายตา 5 นาที 📱',
          'สูดลมหายใจลึกๆ 3 ครั้ง 🌬️',
        ],
        actionLabel: 'เลือกแล้ว',
      },
      {
        stepIndex: 2,
        totalSteps: 2,
        title: 'ลงมือทำทันที',
        instruction: 'ใช้เวลานี้ทำสิ่งเล็กๆ ที่เธอเลือก เพื่อคืนพลังให้ตัวเองนะ 🌱',
        hint: 'การเปลี่ยนแปลงเริ่มต้นจากการกระทำเล็กๆ เสมอ',
        actionLabel: 'ทำเรียบร้อยแล้ว',
      },
    ],
  },
};

/**
 * Get exercise definition by ID or fallback to emergency pause
 */
export function getGuidedExercise(id?: string): GuidedExerciseDefinition {
  if (!id) return GUIDED_EXERCISE_CATALOG.emergency_pause;
  return GUIDED_EXERCISE_CATALOG[id] || GUIDED_EXERCISE_CATALOG.emergency_pause;
}
