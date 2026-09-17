/**
 * Official Conversation Intents for Deung Sati V1 (Frozen Taxonomy)
 * V1 Authoritative SSOT: Exactly 5 Intents.
 */

export type UserConversationIntent =
  | 'vent'
  | 'understand'
  | 'decide'
  | 'change'
  | 'unknown';

export interface IntentDefinition {
  id: UserConversationIntent;
  description: string;
  defaultMode: 'HOLD' | 'SEE' | 'CHANGE';
  suggestedInterventions: string[];
}

export const INTENT_DEFINITIONS: Record<UserConversationIntent, IntentDefinition> = {
  vent: {
    id: 'vent',
    description: 'ผู้ใช้ต้องการระบายความรู้สึก ความอึดอัด หรือความคับข้องใจ',
    defaultMode: 'HOLD',
    suggestedInterventions: ['empathy', 'reflection'],
  },
  understand: {
    id: 'understand',
    description:
      'ผู้ใช้ต้องการเข้าใจตนเองหรือสถานการณ์/อีกฝ่าย (เช่น "ทำไมเราเป็นแบบนี้", "ทำไมเขาถึงทำแบบนี้", "เขาคิดอะไร")',
    defaultMode: 'SEE',
    suggestedInterventions: ['fact_story', 'perspective_lens', 'explore_need'],
  },
  decide: {
    id: 'decide',
    description: 'ผู้ใช้ต้องการตัดสินใจ หรือชะลอแรงกระตุ้นชั่ววูบก่อนเลือกกระทำ',
    defaultMode: 'SEE',
    suggestedInterventions: ['choice', 'worst_case_10_10_10', 'before_speak'],
  },
  change: {
    id: 'change',
    description: 'ผู้ใช้พร้อมเปลี่ยนพฤติกรรม ออกแบบพฤติกรรมใหม่ หรือทดลองการกระทำเล็กๆ (Micro Action)',
    defaultMode: 'CHANGE',
    suggestedInterventions: ['future_self', 'micro_action', 'behavioral_experiment'],
  },
  unknown: {
    id: 'unknown',
    description: 'ยังไม่สามารถระบุเจตนาได้ชัดเจน',
    defaultMode: 'HOLD',
    suggestedInterventions: ['empathy', 'clarification'],
  },
};
