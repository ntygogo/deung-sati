import { config } from './config.ts';
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
  otherPerspectives: EmpathyPerspective[];
  mirrorToSelf: {
    triggeredCoreEmotion: string;
    underlyingNeed: string;
    cautionTrap: string;
  };
  smartScripts: SmartScript[];
  deungSatiAdvice: string;
}

const EMPATHY_LENS_PROMPT = `คุณคือนักจิตวิทยาความสัมพันธ์และผู้เชี่ยวชาญด้านการสื่อสารอย่างสันติ (Nonviolent Communication) ของแอป "ดึงสติ (Deung Sati)"
หน้าที่ของคุณคือช่วยผู้ใช้ "ถอดรหัสจิตวิทยาของอีกฝ่าย (Reverse Empathy)" ที่ทำพฤติกรรมบางอย่างให้ผู้ใช้เจ็บใจ โกรธ หรือสับสน
โดยมีเป้าหมายเพื่อ:
1. ฉายภาพ 3 ความเป็นไปได้ทางจิตวิทยาของอีกฝ่าย (โดยไม่เข้าข้างและไม่ตัดสินว่าเขาดีหรือชั่ว 100%)
2. ส่องกระจกสะท้อนกลับมาที่ใจของผู้ใช้ ว่าแท้จริงแล้วกำลังเจ็บ/กลัว/ต้องการอะไร
3. มอบ 3 ทางเลือกคำพูดสื่อสารอย่างฉลาดและมีสติ (Smart Scripts) ที่ช่วยให้ผู้ใช้ถือไพ่เหนือกว่า ไม่ตกเป็นทาสอารมณ์

จงตอบเป็น JSON object ที่ถูกต้องตามโครงสร้างนี้เท่านั้น (ห้ามใส่ markdown อื่นนอกเหนือจาก JSON):
{
  "relationshipType": "ประเภทความสัมพันธ์ที่ระบุ",
  "otherPerspectives": [
    {
      "title": "ความเป็นไปได้ที่ 1 (เช่น แบตเตอรี่พลังงานหมดเกลี้ยง / Overwhelmed)",
      "explanation": "อธิบายพฤติกรรมนี้ในมุมของเขาอย่างเป็นกลางและเข้าใจมนุษย์",
      "psychologicalReason": "กลไกทางจิตวิทยาที่อยู่เบื้องหลัง (เช่น ภาวะ Fight/Flight, Avoidant Coping)"
    },
    {
      "title": "ความเป็นไปได้ที่ 2 (เช่น กำลังตั้งการ์ดป้องกันตัวเอง / Defensive Insecurity)",
      "explanation": "อธิบายมุมมองที่สอง",
      "psychologicalReason": "กลไกทางจิตวิทยา"
    },
    {
      "title": "ความเป็นไปได้ที่ 3 (เช่น การสื่อสารบกพร่อง / Poor Emotional Literacy)",
      "explanation": "อธิบายมุมมองที่สาม",
      "psychologicalReason": "กลไกทางจิตวิทยา"
    }
  ],
  "mirrorToSelf": {
    "triggeredCoreEmotion": "อารมณ์ลึกๆ ของผู้ใช้ที่ถูกสะกิด (เช่น ความกลัวว่าจะไม่ได้รับความเคารพ / ความน้อยใจที่ถูกทอดทิ้ง)",
    "underlyingNeed": "ความต้องการที่แท้จริงของผู้ใช้ (เช่น ต้องการความชัดเจน, ต้องการพื้นที่ปลอดภัย)",
    "cautionTrap": "หลุมพรางอารมณ์ที่ห้ามทำเด็ดขาดในตอนนี้ (เช่น การประชด การตัดพ้อที่จะทำให้สถานการณ์แย่ลง)"
  },
  "smartScripts": [
    {
      "label": "🟢 ทางเลือกที่ 1: แบบนิ่งสงบและให้เกียรติ (Calm & Dignified)",
      "scriptText": "ประโยคข้อความตัวอย่างที่นำไปก๊อปปี้ส่งได้จริง",
      "whyItWorks": "ทำไมประโยคนี้ถึงได้ผลและไม่ทำให้เราเสียฟอร์ม"
    },
    {
      "label": "🟡 ทางเลือกที่ 2: แบบถามไถ่เปิดพื้นที่ (Curious & Open)",
      "scriptText": "ประโยคข้อความตัวอย่างที่นำไปก๊อปปี้ส่งได้จริง",
      "whyItWorks": "ทำไมประโยคนี้ถึงช่วยลดกำแพงในใจเขา"
    },
    {
      "label": "🟣 ทางเลือกที่ 3: แบบตั้งขอบเขตชัดเจน (Firm & Respectful Boundary)",
      "scriptText": "ประโยคข้อความตัวอย่างที่นำไปก๊อปปี้ส่งได้จริง",
      "whyItWorks": "ทำไมประโยคนี้ถึงปกป้องศักดิ์ศรีและความรู้สึกของเรา"
    }
  ],
  "deungSatiAdvice": "ประโยคดึงสติสั้นๆ อบอุ่น เพื่อให้ผู้ใช้วางมือถือ พักหายใจ 30 วินาทีก่อนตัดสินใจส่ง"
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
        config.aiModel || 'gemini-3.7-flash',
        'gemini-3.1-flash-lite',
        'gemini-flash-latest',
        'gemini-3.5-flash',
      ];

      const ai = new GoogleGenAI({ apiKey: config.geminiApiKey.trim() });

      for (const model of candidateModels) {
        try {
          const promptInput = `${EMPATHY_LENS_PROMPT}\n\n[ข้อมูลสถานการณ์]\n- ความสัมพันธ์: ${relationshipType}\n- สิ่งที่อีกฝ่ายทำหรือพูด: "${trimmedSituation}"\n- ความรู้สึก/สิ่งที่ผู้ใช้อยากทำตอนนี้: "${userReaction.trim() || 'รู้สึกโกรธ/สับสน/อยากตอบโต้'}"`;

          const response = await ai.models.generateContent({
            model,
            contents: [
              {
                role: 'user',
                parts: [{ text: promptInput }],
              },
            ],
            config: {
              responseMimeType: 'application/json',
              temperature: 0.3,
            },
          });

          const jsonStr = response.text || '{}';
          const parsed = JSON.parse(jsonStr) as EmpathyLensResponse;
          if (parsed.otherPerspectives && parsed.smartScripts) {
            console.log(`[Empathy Lens] Generated successfully via Gemini (${model}) for: "${trimmedSituation.slice(0, 40)}..."`);
            return parsed;
          }
        } catch (err: any) {
          console.warn(`[Empathy Lens] Model ${model} failed, trying next...`, err?.message?.slice(0, 80));
        }
      }
    } catch (err) {
      console.warn('[Empathy Lens] API call error:', err);
    }
  }

  // 2. Intelligent Context-Aware Fallback
  return generateFallbackEmpathyResponse(relationshipType, trimmedSituation, userReaction);
}

function generateFallbackEmpathyResponse(
  relationshipType: string,
  situation: string,
  _userReaction: string
): EmpathyLensResponse {
  const lower = situation.toLowerCase();

  if (lower.includes('อ่านไม่ตอบ') || lower.includes('ตอบช้า') || lower.includes('อืม') || lower.includes('ห้วน')) {
    return {
      relationshipType,
      otherPerspectives: [
        {
          title: 'ภาวะแบตเตอรี่หมดเกลี้ยง (Social & Cognitive Exhaustion)',
          explanation: 'เขาอาจกำลังเผชิญกับเรื่องเครียดเฉพาะหน้าจนไม่มีพลังงานเหลือพอจะประมวลผลบทสนทนาลึกซึ้ง การตอบสั้นๆ จึงเป็นวิธีประหยัดพลังงาน ไม่ได้แปลว่าเขาเกลียดเรา',
          psychologicalReason: 'Cognitive Overload (สมองล้าเกินกว่าจะสื่อสารอย่างอ่อนโยน)',
        },
        {
          title: 'สไตล์การหลบเลี่ยงความกดดัน (Avoidant Coping Style)',
          explanation: 'บางคนเมื่อรู้สึกว่ากำลังถูกจับผิดหรือถูกคาดหวัง จะสัญชาตญาณดึงตัวเองถอยห่างเพื่อหาพื้นที่ปลอดภัยชั่วคราว',
          psychologicalReason: 'Emotional Withdrawal (การล่าถอยทางอารมณ์)',
        },
        {
          title: 'กำลังมีเรื่องค้างคาใจแต่ไม่รู้วิธีพูด (Passive-Aggressive)',
          explanation: 'เขาอาจมีเรื่องขุ่นเคืองบางอย่างอยู่ แต่ขาดทักษะในการเปิดอกคุยตรงๆ จึงแสดงออกผ่านความเงียบหรือคำห้วนๆ',
          psychologicalReason: 'Suppressed Frustration (ความอึดอัดที่ถูกเก็บกด)',
        },
      ],
      mirrorToSelf: {
        triggeredCoreEmotion: 'ความน้อยใจและความกลัวว่าจะกลายเป็นคนไม่สำคัญในสายตาเขา',
        underlyingNeed: 'ต้องการการยืนยัน (Reassurance) และความใส่ใจที่สม่ำเสมอ',
        cautionTrap: 'การพิมพ์ด่าประชดหรือส่งข้อความรัวๆ จะยิ่งผลักให้เขาปิดประตูใส่และหลบหนีไปไกลกว่าเดิม',
      },
      smartScripts: [
        {
          label: '🟢 ทางเลือกที่ 1: แบบนิ่งสงบและให้เกียรติ (Calm & Dignified)',
          scriptText: 'เห็นตอบสั้นๆ วันนี้มีเรื่องเหนื่อยๆ ไหม? ถ้าพร้อมคุยเมื่อไหร่ค่อยบอกเรานะ',
          whyItWorks: 'แสดงถึงวุฒิภาวะ ไม่เต้นตามเกมอารมณ์ และคืนพื้นที่ให้อีกฝ่ายตัดสินใจ',
        },
        {
          label: '🟡 ทางเลือกที่ 2: แบบปล่อยวางและโฟกัสตัวเอง (Self-Prioritizing)',
          scriptText: 'โอเคจ้า งั้นเราขอไปทำธุระ/พักผ่อนก่อนนะ ค่อยคุยกัน',
          whyItWorks: 'ส่งสัญญาณว่าชีวิตเราไม่ได้ขึ้นอยู่กับความเร็วในการตอบของเขา ทำให้เราถือไพ่เหนือกว่า',
        },
        {
          label: '🟣 ทางเลือกที่ 3: แบบตั้งขอบเขตความสัมพันธ์ (Clear Boundary)',
          scriptText: 'ถ้ามีเรื่องอะไรไม่สบายใจ อยากให้บอกกันตรงๆ นะ การเงียบใส่กันมันทำให้เราไม่เข้าใจกันเปล่าๆ',
          whyItWorks: 'สื่อสารข้อเท็จจริงอย่างสุภาพโดยไม่ใช้อารมณ์วีน',
        },
      ],
      deungSatiAdvice: 'วางมือถือลง ดื่มน้ำเย็น 1 แก้ว อย่าเพิ่งส่งอะไรตอนนี้ ปล่อยให้เวลาทำงานสัก 1 ชั่วโมงครับ',
    };
  }

  // Generic Empathy Analysis Fallback
  return {
    relationshipType,
    otherPerspectives: [
      {
        title: 'การป้องกันตัวเองจากความไม่มั่นคง (Defensive Mechanism)',
        explanation: 'พฤติกรรมที่เขาทำอาจไม่ได้ตั้งใจมาทำร้ายคุณโดยตรง แต่เกิดจากความไม่มั่นคงในใจหรือความกลัวเสียหน้าที่เขากำลังปกปิดอยู่',
        psychologicalReason: 'Ego Defense Mechanism (การปกป้องศักดิ์ศรีตัวเอง)',
      },
      {
        title: 'มุมมองและกรอบประสบการณ์ที่ต่างกัน (Cognitive Gap)',
        explanation: 'สิ่งที่เรารู้สึกว่าร้ายแรง เขาอาจจะมองว่าเป็นเรื่องปกติเพราะเติบโตมาในสภาพแวดล้อมและวิธีคิดคนละแบบ',
        psychologicalReason: 'Fundamental Attribution Error (การตีความจากมุมมองตนเอง)',
      },
      {
        title: 'ความเครียดสะสมจากเรื่องอื่น (Displaced Stress)',
        explanation: 'เขาอาจจะกำลังเผชิญแรงกดดันจากจุดอื่นในชีวิต แล้วเผลอเอาอารมณ์มาปล่อยลงในบทสนทนานี้',
        psychologicalReason: 'Displacement (การระบายอารมณ์ใส่คนใกล้ตัว)',
      },
    ],
    mirrorToSelf: {
      triggeredCoreEmotion: 'ความโกรธที่รู้สึกว่าตัวเองไม่ได้รับความเป็นธรรมหรือไม่ได้รับความเคารพ',
      underlyingNeed: 'ต้องการให้เขาตระหนักถึงสิ่งที่เราเจอ และต้องการความจริงใจในการสื่อสาร',
      cautionTrap: 'การใช้อารมณ์ตอกกลับทันทีจะทำให้เรากลายเป็นฝ่ายผิดในสายตาคนอื่น และทำให้เรื่องบานปลาย',
    },
    smartScripts: [
      {
        label: '🟢 ทางเลือกที่ 1: แบบนิ่งสงบและยึดข้อเท็จจริง (Dignified Facts)',
        scriptText: 'เราเข้าใจในมุมคุณนะ แต่เรื่องนี้เราอยากขอคุยกันด้วยเหตุผลเมื่อทั้งคู่พร้อม',
        whyItWorks: 'ตัดการปะทะด้วยอารมณ์ และดึงบทสนทนากลับสู่จุดที่มีวุฒิภาวะ',
      },
      {
        label: '🟡 ทางเลือกที่ 2: แบบสะท้อนความรู้สึกอย่างสันติ (NVC Script)',
        scriptText: 'พอได้ยินแบบนี้ เรายอมรับว่ารู้สึกอึดอัดมาก เพราะเราให้เกียรติคุณเสมอ ครั้งหน้าช่วยปรับคำพูดหน่อยได้ไหม',
        whyItWorks: 'พูดความรู้สึกจริงโดยไม่กล่าวหาด่าทอ อีกฝ่ายจะปฏิเสธได้ยาก',
      },
      {
        label: '🟣 ทางเลือกที่ 3: แบบถอยออกมาเป็นผู้สังเกตการณ์ (Grey Rock)',
        scriptText: 'รับทราบครับ/ค่ะ เดี๋ยวขอเวลาพิจารณาตามความเหมาะสม',
        whyItWorks: 'หยุดให้ค่ากับคำพูดยั่วยุ ไม่ให้อีกฝ่ายได้ความสะใจจากการเห็นเราหัวร้อน',
      },
    ],
    deungSatiAdvice: 'หายใจเข้าลึกๆ 3 ครั้ง จำไว้ว่าเราควบคุมพฤติกรรมใครไม่ได้ แต่เราควบคุมความสงบในใจเราได้ 100% ครับ',
  };
}
