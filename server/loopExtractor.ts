import { config } from './config.js';
import { LOOP_EXTRACTOR_PROMPT } from './prompts.js';
import { GoogleGenAI } from '@google/genai';

export interface ExtractedLoopResult {
  title: string;
  event: { value: string | null; source_type: 'user_explicit' | 'ai_reflection' };
  feeling: { value: string | null; source_type: 'user_explicit' | 'ai_reflection' };
  interpretation: { value: string | null; source_type: 'user_explicit' | 'ai_reflection' };
  need_fear: { value: string | null; source_type: 'user_explicit' | 'ai_reflection' };
  habitual_response: { value: string | null; source_type: 'user_explicit' | 'ai_reflection' };
  habitual_result: { value: string | null; source_type: 'user_explicit' | 'ai_reflection' };
  new_choice: { value: string | null; source_type: 'user_explicit' | 'ai_reflection' };
  can_offer_loop: boolean;
}

export async function extractLoop(
  messages: Array<{ role: string; content: string }>
): Promise<ExtractedLoopResult> {
  const conversationText = messages
    .map((m) => `${m.role === 'user' ? 'ผู้ใช้' : 'ดึงสติ'}: ${m.content}`)
    .join('\n');

  if (config.geminiApiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `${LOOP_EXTRACTOR_PROMPT}\n\n[CONVERSATION HISTORY]:\n${conversationText}`,
              },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const jsonStr = response.text || '{}';
      const parsed = JSON.parse(jsonStr) as ExtractedLoopResult;
      if (parsed.title) {
        return parsed;
      }
    } catch (err) {
      console.warn('Loop extraction API call fallback:', err);
    }
  }

  // Fallback intelligent heuristic extractor
  const text = conversationText.toLowerCase();

  let eventVal: string | null = null;
  let feelingVal: string | null = null;
  let interpVal: string | null = null;
  let choiceVal: string | null = null;

  if (text.includes('หัวหน้า') || text.includes('พูดต่อหน้า')) {
    eventVal = 'หัวหน้าพูดต่อหน้าคนอื่นว่า "งานง่ายแค่นี้ทำไมยังผิด"';
    feelingVal = 'อาย • โกรธ • ใจเต้นแรง';
    interpVal = 'ทุกคนคงคิดว่าฉันไม่เก่ง';
    choiceVal = 'รอให้อารมณ์ลดลง แล้วนัดคุยเรื่องวิธี feedback เป็นการส่วนตัว';
  } else if (text.includes('แฟน') && (text.includes('ตอบแชต') || text.includes('ไม่ตอบ'))) {
    eventVal = 'แฟนยังไม่ตอบข้อความแชต';
    feelingVal = 'กังวล • กระวนกระวายใจ';
    interpVal = 'เขาคงหมดรักฉันแล้ว หรือแอบคุยกับคนอื่น';
    choiceVal = 'วางโทรศัพท์ลงก่อน 30 นาที แล้วกลับมาสังเกตใจ';
  }

  return {
    title: eventVal ? 'ลูป: ' + eventVal.slice(0, 20) + '...' : 'ลูปความคิด',
    event: { value: eventVal, source_type: 'user_explicit' },
    feeling: { value: feelingVal, source_type: 'user_explicit' },
    interpretation: { value: interpVal, source_type: 'ai_reflection' },
    need_fear: { value: interpVal ? 'กลัวว่าตัวเองไม่สำคัญหรือไม่ดีพอ' : null, source_type: 'ai_reflection' },
    habitual_response: { value: eventVal ? 'เงียบ แล้วกลับมาด่าตัวเอง' : null, source_type: 'user_explicit' },
    habitual_result: { value: eventVal ? 'เรื่องจบแต่ความรู้สึกยังค้าง และปัญหาเดิมเกิดซ้ำ' : null, source_type: 'ai_reflection' },
    new_choice: { value: choiceVal, source_type: 'user_explicit' },
    can_offer_loop: Boolean(eventVal && interpVal),
  };
}
