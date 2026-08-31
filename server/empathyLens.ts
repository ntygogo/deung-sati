import { config } from './config';
import { GoogleGenAI } from '@google/genai';

export interface EmpathyPerspective {
  title: string;
  explanation: string;
  psychologicalReason: string;
}

export interface SmartScript {
  label: string;
  scriptText: string;
  whyItWorks: string;
}

export interface EmpathyLensResponse {
  relationshipType: string;
  knownFact: string;
  myInterpretation: string;
  otherPerspectives: EmpathyPerspective[];
  mirrorToSelf: {
    triggeredCoreEmotion: string;
    underlyingNeed: string;
    cautionTrap: string;
  };
  myChoices: string[];
  smartScripts: SmartScript[];
  deungSatiAdvice: string;
}

const EMPATHY_LENS_PROMPT = `คุณคือผู้เชี่ยวชาญด้านการฝึกมุมมองและการรู้เท่าทันความคิดของแอป "ดึงสติ (Deung Sati)"
หน้าที่ของคุณคือช่วยผู้ใช้ "มองอีกมุม" โดยแยกแยะ 4 มิติอย่างชัดเจน:
1. สิ่งที่เรารู้จริง (knownFact): พฤติกรรมภายนอกที่เกิดขึ้นจริง
2. สิ่งที่เรากำลังแอบตีความ (myInterpretation): สิ่งที่สมองกำลังปรุงแต่งหรือคิดกลัวไปเอง
3. สิ่งที่อาจเป็นไปได้อื่น (otherPerspectives): ความเป็นไปได้ที่เป็นกลาง ไม่ด่วนตัดสิน ไม่ทึกทักอ่านใจใครเป็นความจริง
4. สิ่งที่ฉันต้องการและเลือกได้ (myChoices): ทางเลือกของตัวผู้ใช้เองที่ให้เกียรติตนเองและอีกฝ่าย

ตอบกลับเป็น JSON Object เท่านั้น:
{
  "relationshipType": "ประเภทความสัมพันธ์",
  "knownFact": "พฤติกรรมจริงที่เกิดขึ้นภายนอก",
  "myInterpretation": "สิ่งที่ใจมักจะแอบกังวลหรือตีความไปเอง",
  "otherPerspectives": [
    {
      "title": "ความเป็นไปได้ที่ 1 (เช่น กำลังติดธุระเร่งด่วน / เหนื่อยล้าสะสม)",
      "explanation": "อธิบายมุมมองในบริบทของมนุษย์คนหนึ่งอย่างเข้าใจ",
      "psychologicalReason": "เหตุผลความเป็นไปได้"
    },
    {
      "title": "ความเป็นไปได้ที่ 2 (เช่น กำลังคิดหาคำตอบที่เหมาะสม)",
      "explanation": "อธิบายมุมมองที่สอง",
      "psychologicalReason": "เหตุผลความเป็นไปได้"
    },
    {
      "title": "ความเป็นไปได้ที่ 3 (เช่น การสื่อสารที่ไม่ตรงกัน)",
      "explanation": "อธิบายมุมมองที่สาม",
      "psychologicalReason": "เหตุผลความเป็นไปได้"
    }
  ],
  "mirrorToSelf": {
    "triggeredCoreEmotion": "อารมณ์ลึกๆ ของเราที่ถูกสะกิด",
    "underlyingNeed": "ความต้องการที่แท้จริงของเรา",
    "cautionTrap": "หลุมพรางความคิดที่ควรหลีกเลี่ยง"
  },
  "myChoices": [
    "พักวางมือถือก่อน 30 นาที ให้ใจนิ่ง",
    "ถามไถ่ด้วยความห่วงใยแทนการประชด",
    "ตั้งขอบเขตอย่างสุภาพถ้าเรื่องนี้สำคัญจริง"
  ],
  "smartScripts": [
    {
      "label": "🟢 ทางเลือกแบบนิ่งสงบ",
      "scriptText": "ประโยคตัวอย่างพร้อมส่ง",
      "whyItWorks": "ข้อดีของประโยคนี้"
    },
    {
      "label": "🟡 ทางเลือกแบบถามไถ่เปิดพื้นที่",
      "scriptText": "ประโยคตัวอย่างพร้อมส่ง",
      "whyItWorks": "ข้อดีของประโยคนี้"
    }
  ],
  "deungSatiAdvice": "คำเตือนใจสั้นๆ 1 ประโยค"
}`;

export async function analyzeEmpathyLens(params: {
  relationshipType: string;
  situation: string;
  userReaction?: string;
}): Promise<EmpathyLensResponse> {
  const { relationshipType, situation, userReaction = '' } = params;
  const trimmedSituation = situation.trim();

  // 1. Call Gemini AI
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
                    text: `${EMPATHY_LENS_PROMPT}\n\n[สถานการณ์ที่ระบุ]: "${trimmedSituation}"\n[ความสัมพันธ์]: ${relationshipType}\n[ความรู้สึกผู้ใช้]: ${userReaction}`,
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
          const parsed = JSON.parse(jsonStr) as EmpathyLensResponse;
          if (parsed.otherPerspectives && parsed.otherPerspectives.length > 0) {
            return parsed;
          }
        } catch (err: any) {
          console.warn(`[Empathy Lens] Model ${model} failed:`, err?.message?.slice(0, 80));
        }
      }
    } catch (err) {
      console.warn('[Empathy Lens] API call error:', err);
    }
  }

  // 2. Intelligent Context-Aware Fallback
  return {
    relationshipType,
    knownFact: trimmedSituation || 'เกิดสถานการณ์ที่ทำให้เกิดความค้างคาใจ',
    myInterpretation: 'เขาคงไม่สนใจหรือไม่เห็นความสำคัญของเราแล้ว',
    otherPerspectives: [
      {
        title: 'กำลังติดงานด่วน หรือมีธุระที่ไม่สะดวกพิมพ์',
        explanation: 'ในชีวิตจริง แต่ละคนมีภาระและจังหวะเวลาที่แตกต่างกัน การยังไม่ตอบอาจไม่ได้เกี่ยวกับเราโดยตรง',
        psychologicalReason: 'Cognitive Bandwidth & Overload',
      },
      {
        title: 'กำลังคิดหาคำตอบที่เหมาะสม',
        explanation: 'บางครั้งอีกฝ่ายต้องการเวลาคิดทบทวนก่อนตอบ เพื่อไม่ให้ใช้อารมณ์หรือคำพูดที่ผิดพลาด',
        psychologicalReason: 'Processing Time',
      },
      {
        title: 'พลังงานหมดชั่วคราว (Social Battery Low)',
        explanation: 'อาจกำลังเหนื่อยล้าจนยังไม่มีพลังสื่อสารกับใครในขณะนี้',
        psychologicalReason: 'Emotional Fatigue',
      },
    ],
    mirrorToSelf: {
      triggeredCoreEmotion: 'ความไม่มั่นคงและความกลัวการถูกปฏิเสธ',
      underlyingNeed: 'ต้องการความชัดเจนและความรู้สึกปลอดภัยในความสัมพันธ์',
      cautionTrap: 'การด่วนสรุปว่าเขาคิดร้าย แล้วส่งข้อความประชดใส่',
    },
    myChoices: [
      'พักวางมือถือ 30 นาที แล้วไปทำกิจกรรมอื่นให้ใจสบาย',
      'รอให้อีกฝ่ายสะดวก แล้วค่อยทักถามอย่างสุภาพ',
      'สื่อสารความต้องการของตนเองอย่างตรงไปตรงมา',
    ],
    smartScripts: [
      {
        label: '🟢 แบบนิ่งสงบและให้เกียรติ',
        scriptText: 'ถ้าสะดวกเมื่อไหร่ ช่วยตอบกลับหน่อยนะ แค่อยากรู้ว่าเป็นยังไงบ้าง',
        whyItWorks: 'ไม่กดดัน และแสดงความใส่ใจโดยไม่สูญเสียความมั่นคงในตนเอง',
      },
      {
        label: '🟡 แบบถามไถ่เปิดพื้นที่',
        scriptText: 'วันนี้ดูยุ่งๆ ไหม เป็นกำลังใจให้นะ ไว้ว่างค่อยคุยกัน',
        whyItWorks: 'สร้างความรู้สึกอบอุ่นและลดกำแพงการตั้งการ์ด',
      },
    ],
    deungSatiAdvice: 'เมื่อมองได้กว้าง ไม่ด่วนเดาใจใครเป็นความจริง ใจก็จะคุยกับตัวเองนุ่มนวลขึ้น 🌱',
  };
}
