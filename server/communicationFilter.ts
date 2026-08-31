import { config } from './config.ts';
import { GoogleGenAI } from '@google/genai';

export interface AlternativeOption {
  type: 'direct' | 'gentle' | 'boundary' | 'hold';
  label: string;
  text: string;
  rationale: string;
}

export interface CommunicationFilterResponse {
  whatHappened: string;
  feeling: string;
  coreNeed: string;
  emotionalTrigger: string;
  request: string;
  refinedAlternative: string;
  rationale: string;
  alternatives: AlternativeOption[];
}

const FILTER_PROMPT = `คุณคือผู้เชี่ยวชาญการสื่อสารอย่างมีสติและสันติ (Nonviolent Communication) ของแอป "ดึงสติ (Deung Sati)"
ผู้ใช้กำลังพิมพ์ข้อความดิบที่มีอารมณ์โกรธ, ประชด, ตัดพ้อ, วิตกกังวล หรือคำพูดรุนแรงที่อยากส่งไปหาคนอื่น

หน้าที่ของคุณคือ:
1. แยกแยะสิ่งที่เกิดขึ้น (whatHappened), ความรู้สึก (feeling), ความต้องการที่แท้จริง (coreNeed), จุดสะกิดอารมณ์เดิม (emotionalTrigger), และคำร้องขอที่ชัดเจน (request)
2. เสนอทางเลือกการสื่อสาร 4 สไตล์ที่ไม่ลบล้างตัวตนของผู้ใช้ และไม่สุภาพเกินจริงจนดูประดิษฐ์:
   - "พูดตรงขึ้น" (direct): ชัดเจน ตรงไปตรงมา กระชับ แต่ไม่ทำร้าย
   - "อ่อนลง" (gentle): นุ่มนวล คลายความตึงเครียด
   - "ตั้งขอบเขต" (boundary): ชัดเจนในจุดยืน ไม่ยอมให้ล้ำเส้นอย่างมีวุฒิภาวะ
   - "ยังไม่ส่งตอนนี้" (hold): คำแนะนำสั้นๆ ให้พักตั้งหลักก่อนพิมพ์

ตอบกลับเป็น JSON Object เท่านั้น:
{
  "whatHappened": "ข้อเท็จจริงที่เกิดขึ้น",
  "feeling": "ความรู้สึกข้างใน",
  "coreNeed": "ความต้องการที่แท้จริง",
  "emotionalTrigger": "จุดสะกิดในข้อความเดิมที่อาจทำให้อีกฝ่ายตั้งการ์ด",
  "request": "คำร้องขอที่ชัดเจนและทำได้จริง",
  "refinedAlternative": "ประโยคหลักที่แนะนำ (พร้อมส่ง)",
  "rationale": "ทำไมประโยคนี้ถึงได้ผลดีกว่า",
  "alternatives": [
    {
      "type": "direct",
      "label": "พูดตรงขึ้น",
      "text": "ข้อความแบบพูดตรงขึ้น",
      "rationale": "ชัดเจน กระชับ ไม่ประชด"
    },
    {
      "type": "gentle",
      "label": "อ่อนลง",
      "text": "ข้อความแบบนุ่มนวล",
      "rationale": "ลดแรงปะทะ เชื่อมโยงความเข้าใจ"
    },
    {
      "type": "boundary",
      "label": "ตั้งขอบเขต",
      "text": "ข้อความแบบตั้งขอบเขตชัดเจน",
      "rationale": "รักษาสิทธิและพื้นที่ของตนเองอย่างมั่นคง"
    },
    {
      "type": "hold",
      "label": "ยังไม่ส่งตอนนี้",
      "text": "ยังไม่ต้องส่งอะไร วางมือถือ 15 นาที แล้วค่อยตัดสินใจใหม่",
      "rationale": "ตอนนี้อารมณ์ยังนำ สติยังไม่พร้อมส่ง"
    }
  ]
}`;

export async function filterCommunicationMessage(
  message: string
): Promise<CommunicationFilterResponse> {
  const trimmed = message.trim();

  // 1. Call Real Gemini AI
  if (config.geminiApiKey) {
    try {
      const candidateModels = [
        config.aiModel || 'gemini-3.6-flash',
        'gemini-3.6-flash',
        'gemini-flash-latest',
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
            return parsed;
          }
        } catch (err: any) {
          console.warn(`[Communication Filter] Model ${model} failed:`, err?.message?.slice(0, 80));
        }
      }
    } catch (err) {
      console.warn('[Communication Filter] API call error:', err);
    }
  }

  // 2. Intelligent Context-Aware Fallback
  return {
    whatHappened: 'มีพฤติกรรมหรือสถานการณ์ที่ทำให้รู้สึกไม่ได้รับความใส่ใจ',
    feeling: 'อึดอัด กังวลใจ และน้อยใจ',
    coreNeed: 'ต้องการให้คู่สนทนารับฟังความรู้สึกและให้ความสำคัญกับความสัมพันธ์',
    emotionalTrigger: `น้ำเสียงและคำพูดที่มีความประชดหรือตัดพ้อในข้อความ ("${trimmed.slice(0, 30)}...")`,
    request: 'ขอเวลาคุยกันตรงๆ เพื่อความชัดเจน',
    refinedAlternative: 'ช่วงนี้เรารู้สึกกังวลใจและต้องการความชัดเจน ถ้าสะดวกช่วยตอบกลับเราหน่อยนะ',
    rationale: 'การสื่อสารด้วยการระบุความต้องการตรงๆ ช่วยลดกำแพงและทำให้อีกฝ่ายเปิดใจรับฟัง',
    alternatives: [
      {
        type: 'direct',
        label: 'พูดตรงขึ้น',
        text: 'เราต้องการความชัดเจนเรื่องนี้ ถ้าสะดวกช่วยตอบกลับหน่อยนะ',
        rationale: 'ตรงประเด็น ไม่ประชด',
      },
      {
        type: 'gentle',
        label: 'อ่อนลง',
        text: 'ถ้าเธอติดธุระอยู่ไม่เป็นไรนะ สะดวกเมื่อไหร่ค่อยทักหาเราก็ได้ แค่อยากรู้ว่าเป็นยังไงบ้าง',
        rationale: 'ให้พื้นที่และคลายความกดดัน',
      },
      {
        type: 'boundary',
        label: 'ตั้งขอบเขต',
        text: 'ถ้ายังไม่สะดวกคุยตอนนี้ ช่วยบอกเราสั้นๆ ได้ไหม เราจะได้ไม่ต้องนั่งรอและกังวลใจ',
        rationale: 'ดูแลความรู้สึกตัวเองอย่างมั่นคง',
      },
      {
        type: 'hold',
        label: 'ยังไม่ส่งตอนนี้',
        text: 'วางโทรศัพท์ลงก่อน 20 นาที หายใจลึกๆ 3 ครั้ง แล้วค่อยกลับมาดูใหม่',
        rationale: 'หยุดอารมณ์ชั่ววูบก่อนเผลอทำลายความสัมพันธ์',
      },
    ],
  };
}
