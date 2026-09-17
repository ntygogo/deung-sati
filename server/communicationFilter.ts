import { config } from './config.js';
import { GoogleGenAI } from '@google/genai';
import { classifySafety } from './safetyClassifier.js';

export interface AlternativeOption {
  type: 'direct' | 'gentle' | 'boundary' | 'hold';
  label: string;
  text: string;
  rationale: string;
}

export interface CommunicationFilterResponse {
  whatHappened: string;
  observableFact?: string;
  feeling: string;
  coreNeed: string;
  emotionalTrigger: string;
  request: string;
  refinedAlternative: string;
  rationale: string;
  alternatives: AlternativeOption[];
  isSafetyRisk?: boolean;
  safetyMessage?: string;
}

const FILTER_PROMPT = `คุณคือผู้ช่วยดึงสติและเกลาการสื่อสารของแอป "ดึงสติ (Deung Sati)"
ผู้ใช้กำลังพิมพ์ข้อความดิบที่มีอารมณ์โกรธ, ประชด, ตัดพ้อ, วิตกกังวล หรือคำพูดรุนแรงที่อยากส่งไปหาอีกฝ่ายทันที

เป้าหมายสำคัญ:
ไม่ใช่การทำให้ผู้ใช้ดูเป็น "คนดี" หรือ "พูดจาไพเราะสุภาพแบบทางการ"
แต่คือ "การสร้างช่องว่าง (Pause) ระหว่างอารมณ์ชั่ววูบกับการกระทำ โดยยังคงสิ่งที่ผู้ใช้ต้องการจะสื่อสารจริงๆ เอาไว้ครบถ้วน"

กฎเหล็กสำคัญ:
1. ห้ามลบล้างเจตนาหรือความหมายที่แท้จริงของผู้ใช้ (Do not erase the user's meaning)
2. ห้ามใช้ภาษาทางการประดิษฐ์หรือคำสุภาพแบบองค์กร/คอลเซ็นเตอร์ (ห้ามใช้: "ขอเรียนแจ้งว่า", "กระผมใคร่ขอ", "ขอความกรุณา", "ด้วยความเคารพ")
3. ห้ามสั่งสอน หรือทำให้ผู้ใช้รู้สึกผิดที่โกรธ (Do not moralize or shame anger)
4. ประโยคที่เกลาใหม่ (refinedAlternative) ต้องยังฟังดูเหมือน "คนจริงๆ พูด" ที่เปิดอกคุยอย่างเป็นธรรมชาติและปลอดภัย

หน้าที่ของคุณ:
1. ระบุสิ่งที่ผู้ใช้กำลังรู้สึก (feeling): เช่น โกรธ, อึดอัด, น้อยใจ, ผิดหวัง, วิตกกังวล
2. ระบุสิ่งที่ผู้ใช้ต้องการสื่อสารจริงๆ / ความต้องการลึกๆ (coreNeed): สิ่งที่เธออยากสื่อจริงๆ เช่น อยากให้ตอบเพื่อจะได้ไม่ต้องรอ, ต้องการความเคารพในเวลา
3. แยกแยะข้อเท็จจริงที่เห็นได้ชัด vs การตีความ (observableFact) เมื่อเกี่ยวข้อง
4. เสนอประโยคที่ชัดเจนและปลอดภัยขึ้น (refinedAlternative): ประโยคหลักที่แนะนำให้ลองพูดแทน (ยังฟังดูเหมือนคนจริงๆ พูด)

ตอบกลับเป็น JSON Object เท่านั้น:
{
  "whatHappened": "ข้อเท็จจริงที่เกิดขึ้น",
  "observableFact": "ข้อเท็จจริงที่เห็นได้ชัดโดยไม่ตีความ",
  "feeling": "ความรู้สึกข้างใน",
  "coreNeed": "สิ่งที่เธออยากสื่อจริงๆ (ความต้องการลึกๆ)",
  "emotionalTrigger": "จุดสะกิดในข้อความเดิมที่อาจทำให้อีกฝ่ายตั้งการ์ด",
  "request": "คำร้องขอที่ชัดเจนและทำได้จริง",
  "refinedAlternative": "ประโยคหลักที่แนะนำให้ลองพูดแทน (ฟังดูเป็นคนจริงๆ ไม่ทางการ)",
  "rationale": "ทำไมประโยคนี้ถึงช่วยสื่อสารได้ผลดีกว่า",
  "alternatives": [
    {
      "type": "direct",
      "label": "พูดตรงขึ้น",
      "text": "ข้อความแบบพูดตรงขึ้น ไม่ประชด",
      "rationale": "ชัดเจน กระชับ ไม่ประชด"
    },
    {
      "type": "gentle",
      "label": "อ่อนลง",
      "text": "ข้อความแบบเปิดใจนุ่มนวล",
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
      "text": "วางมือถือคว่ำไว้ 5 นาที แล้วค่อยกลับมาดูใหม่",
      "rationale": "ตอนนี้อารมณ์ยังนำ สติยังไม่พร้อมส่ง"
    }
  ]
}`;

export async function filterCommunicationMessage(
  message: string
): Promise<CommunicationFilterResponse> {
  const trimmed = message.trim();

  // 0. Safety Override Check (Fast deterministic check)
  const safety = await classifySafety([{ role: 'user', content: trimmed }]);
  if (safety.mode === 'protect') {
    const isDomestic = safety.risk_type.includes('domestic_violence');
    const isSelfHarm = safety.risk_type.includes('suicide') || safety.risk_type.includes('self_harm');
    const hotlineText = isDomestic
      ? 'สายด่วนช่วยเหลือสังคม 1300 (พม. 24 ชม.) หรือโทรแจ้งตำรวจ 191'
      : isSelfHarm
      ? 'สายด่วนสุขภาพจิต 1323 (24 ชม.) หรือสะมาริตันส์ 02-107-7977'
      : 'สายด่วนฉุกเฉิน 191 หรือ 1669';

    return {
      isSafetyRisk: true,
      safetyMessage: `ข้อความนี้มีสัญญาณความเสี่ยงต่อความปลอดภัยหรือความรุนแรง ขอให้ความปลอดภัยมาเป็นอันดับแรก หากตกอยู่ในอันตรายหรือต้องการความช่วยเหลือฉุกเฉิน ขอให้โทร ${hotlineText}`,
      whatHappened: 'ตรวจพบสัญญาณความเสี่ยงต่อความปลอดภัย',
      observableFact: 'ตรวจพบข้อความที่มีความเสี่ยง',
      feeling: 'ตึงเครียดหรือกำลังเผชิญอันตราย',
      coreNeed: 'ความปลอดภัยและการได้รับการคุ้มครอง',
      emotionalTrigger: 'ความเสี่ยงอันตรายหรือความรุนแรง',
      request: 'ขอความช่วยเหลือฉุกเฉิน',
      refinedAlternative: '',
      rationale: 'ความปลอดภัยสำคัญที่สุด ระบบจะไม่ทำการเกลาข้อความที่มีการข่มขู่หรือความรุนแรง',
      alternatives: [],
    };
  }

  // 1. Call Real Gemini AI
  if (config.geminiApiKey) {
    try {
      const candidateModels = [
        config.aiModel || 'gemini-3.5-flash-lite',
        'gemini-3.5-flash-lite',
        'gemini-3.1-flash-lite-preview',
        'gemini-3.5-flash',
      ];
      const uniqueCandidates = Array.from(new Set(candidateModels));

      const ai = new GoogleGenAI({ apiKey: config.geminiApiKey.trim() });

      for (const model of uniqueCandidates) {
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
              thinkingConfig: {
                thinkingBudget: 0,
              },
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
  if (trimmed.includes('อ่าน') || trimmed.includes('ตอบ') || trimmed.includes('ไม่โอเค')) {
    return {
      whatHappened: 'ส่งข้อความไปแล้วอีกฝ่ายเปิดอ่านแต่ยังไม่ได้ตอบกลับ',
      observableFact: 'อีกฝ่ายเปิดอ่านข้อความแล้ว แต่ยังไม่มีการตอบกลับ',
      feeling: 'โกรธ น้อยใจ และอึดอัดที่ต้องนั่งรอเก้อ',
      coreNeed: 'ต้องการให้เขาตอบกลับสั้นๆ เพื่อให้รู้สถานะ และไม่ต้องรอด้วยความกังวล',
      emotionalTrigger: 'คำตัดพ้อและอารมณ์ฉุนเฉียว ("กูโคตรไม่โอเค")',
      request: 'ขอให้ช่วยบอกสั้นๆ ว่าติดอะไรอยู่',
      refinedAlternative: 'ถ้าอ่านแล้วยังไม่สะดวกตอบ ช่วยบอกเราสั้นๆ ได้ไหม พอเห็นอ่านแล้วเงียบไป เราไม่สบายใจเลย',
      rationale: 'บอกความรู้สึกตรงๆ โดยไม่ประชด ช่วยให้อีกฝ่ายเข้าใจว่าเรากำลังรออยู่โดยไม่ต้องตั้งการ์ด',
      alternatives: [
        {
          type: 'direct',
          label: 'พูดตรงขึ้น',
          text: 'ถ้าอ่านแล้วยังไม่สะดวกตอบ ช่วยบอกเราสั้นๆ ได้ไหม พอเห็นอ่านแล้วเงียบไป เราไม่สบายใจเลย',
          rationale: 'ตรงประเด็นและบอกผลกระทบโดยไม่ด่าทอ',
        },
        {
          type: 'gentle',
          label: 'อ่อนลง',
          text: 'ถ้าติดธุระอยู่ไม่เป็นไรนะ สะดวกเมื่อไหร่ค่อยทักหาเราก็ได้ แค่อยากรู้ว่าเป็นยังไงบ้าง',
          rationale: 'ให้พื้นที่และคลายความกดดัน',
        },
        {
          type: 'boundary',
          label: 'ตั้งขอบเขต',
          text: 'ถ้ายังไม่ว่างตอบ ช่วยบอกเราสั้นๆ ทีนะ เราจะได้ไม่ต้องนั่งรอ',
          rationale: 'รักษาสิทธิและพื้นที่ของตนเองอย่างมั่นคง',
        },
        {
          type: 'hold',
          label: 'ยังไม่ส่งตอนนี้',
          text: 'วางมือถือคว่ำไว้ 5 นาที แล้วค่อยกลับมาดูใหม่',
          rationale: 'ตอนนี้อารมณ์ยังนำ สติยังไม่พร้อมส่ง',
        },
      ],
    };
  }

  return {
    whatHappened: 'มีพฤติกรรมหรือสถานการณ์ที่ทำให้รู้สึกไม่ได้รับความใส่ใจ',
    observableFact: 'เหตุการณ์ที่ทำให้เกิดความตึงเครียด',
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
