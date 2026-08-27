import { config } from './config.ts';
import { GoogleGenAI } from '@google/genai';

export interface CommunicationFilterResponse {
  coreNeed: string;
  emotionalTrigger: string;
  refinedAlternative: string;
  rationale: string;
}

const FILTER_PROMPT = `คุณคือนักจิตวิทยาการสื่อสารและผู้เชี่ยวชาญการสื่อสารอย่างสันติ (Nonviolent Communication - NVC) ของแอป "ดึงสติ (Deung Sati)"
ผู้ใช้กำลังพิมพ์ข้อความที่เต็มไปด้วยอารมณ์โกรธ, ประชด, ตัดพ้อ, วิตกกังวล หรือคำพูดรุนแรงที่อยากส่งไปหาคู่สนทนา (เช่น แฟน, เพื่อนร่วมงาน, หัวหน้า, คนในครอบครัว)
หน้าที่ของคุณคือ "กลั่นกรองข้อความนี้ในทันที" โดย:
1. สกัด "ความต้องการที่แท้จริง (Core Need)" ที่ซ่อนอยู่ใต้ความโกรธ/คำประชด
2. ชี้ให้เห็น "จุดสะกิดอารมณ์ (Emotional Trigger)" ในข้อความเดิมที่อาจทำให้อีกฝ่ายตั้งการ์ดหรือทะเลาะหนักกว่าเดิม
3. ปรับเป็น "ประโยคใหม่ที่สง่างามและได้ผล (Refined Alternative)" โดยใช้หลัก NVC (ข้อเท็จจริง + ความรู้สึก + ความต้องการ + คำร้องขอที่ชัดเจน)
4. อธิบาย "เหตุผลทางจิตวิทยา (Rationale)" สั้นๆ ว่าทำไมประโยคใหม่นี้ถึงช่วยรักษาความสัมพันธ์และทำให้ได้ผลลัพธ์ที่ดีกว่า

จงตอบเป็น JSON object ที่ถูกต้องตามโครงสร้างนี้เท่านั้น (ห้ามใส่ markdown อื่นนอกเหนือจาก JSON):
{
  "coreNeed": "ความต้องการที่แท้จริงของคุณ (สกัดออกมาให้ตรงใจและลึกซึ้ง)",
  "emotionalTrigger": "จุดสะกิดอารมณ์ในข้อความเดิมที่อาจทำให้เกิดปัญหา (อธิบายคำหรือน้ำเสียง)",
  "refinedAlternative": "ประโยคข้อความใหม่ที่เรียบเรียงอย่างสันติและมีวุฒิภาวะ (พร้อมนำไปก๊อปปี้ส่งได้ทันที)",
  "rationale": "เหตุผลทางจิตวิทยาว่าทำไมประโยคนี้ถึงได้ผลลัพธ์ที่ดีกว่า"
}`;

export async function filterCommunicationMessage(
  message: string
): Promise<CommunicationFilterResponse> {
  const trimmed = message.trim();

  // 1. Call Real Gemini AI
  if (config.geminiApiKey) {
    try {
      const candidateModels = [
        config.aiModel || 'gemini-3.7-flash',
        'gemini-3.1-flash-lite',
        'gemini-flash-latest',
        'gemini-3.5-flash',
      ];

      const ai = new GoogleGenAI({ apiKey: config.geminiApiKey.trim() });

      for (const model of candidateModels) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: `${FILTER_PROMPT}\n\n[ข้อความดิบที่ผู้ใช้พิมพ์ก่อนส่ง]:\n"${trimmed}"`,
                  },
                ],
              },
            ],
            config: {
              responseMimeType: 'application/json',
              temperature: 0.3,
            },
          });

          const jsonStr = response.text || '{}';
          const parsed = JSON.parse(jsonStr) as CommunicationFilterResponse;
          if (parsed.coreNeed && parsed.refinedAlternative) {
            console.log(`[Communication Filter] Filtered dynamically via Gemini (${model}) for: "${trimmed.slice(0, 30)}..."`);
            return parsed;
          }
        } catch (err: any) {
          console.warn(`[Communication Filter] Model ${model} failed, trying next...`, err?.message?.slice(0, 80));
        }
      }
    } catch (err) {
      console.warn('[Communication Filter] API call error:', err);
    }
  }

  // 2. Intelligent Context-Aware Fallback
  return {
    coreNeed: 'ต้องการให้คู่สนทนารับฟังความรู้สึกและให้ความสำคัญกับสิ่งที่เรากำลังเผชิญอยู่',
    emotionalTrigger: `น้ำเสียงและคำพูดที่มีความประชดหรือตัดพ้อในข้อความ ("${trimmed.slice(0, 30)}...") ซึ่งอาจทำให้อีกฝ่ายรู้สึกถูกโจมตีและตั้งการ์ดใส่`,
    refinedAlternative: `ตอนนี้เรารู้สึกอึดอัดและไม่สบายใจกับเรื่องที่เกิดขึ้น อยากขอเวลาคุยกันตรงๆ ด้วยเหตุผลเพื่อหาทางออกร่วมกันครับ/ค่ะ`,
    rationale: 'การสื่อสารด้วยการระบุความรู้สึกและข้อเท็จจริง จะลดแรงต้านและทำให้อีกฝ่ายเปิดใจรับฟังได้มากกว่าการใช้อารมณ์ปะทะ',
  };
}
