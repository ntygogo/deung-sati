import { config } from './config.js';
import { GoogleGenAI } from '@google/genai';

export interface ConsequenceSimulationResponse {
  tenMinutes: string;
  tenDays: string;
  tenMonthsWorstCase: string;
  realityCheckQuestion: string;
  smartAlternative: string;
  actionableStep: string;
}

const CONSEQUENCE_PROMPT = `คุณคือนักจิตวิทยาพฤติกรรมและผู้เชี่ยวชาญการดึงสติของแอป "ดึงสติ (Deung Sati)"
ผู้ใช้กำลังมีความคิดจะตัดสินใจทำสิ่งใดสิ่งหนึ่งด้วยอารมณ์ชั่ววูบ ความอยาก หรือความเครียด
ให้คุณวิเคราะห์ผลลัพธ์ตามกฎ 10-10-10 (10 นาที / 10 วัน / 10 เดือน) อย่างลึกซึ้ง ตรงจุด และมีเมตตา

จงตอบเป็น JSON object ที่ถูกต้องตามโครงสร้างนี้เท่านั้น (ห้ามใส่ markdown อื่นนอกเหนือจาก JSON):
{
  "tenMinutes": "ความรู้สึกและผลเฉพาะหน้าใน 10 นาทีแรก (ทั้งความสะใจ/ความโล่งชั่ววูบ และความกังวลหรือความกลัวที่เริ่มก่อตัว)",
  "tenDays": "ผลกระทบที่จะตามมาใน 10 วันข้างหน้า (ความสัมพันธ์, บรรยากาศ, ความตึงเครียด, ปัญหาที่บานปลาย)",
  "tenMonthsWorstCase": "ราคาแพงที่สุดที่อาจต้องจ่ายใน 10 เดือนข้างหน้า (Worst-Case Scenario เช่น การสูญเสียความไว้ใจ, อนาคต, คดีความ หรือตราบาปในใจ)",
  "realityCheckQuestion": "คำถามกระตุกสติที่เฉียบคมและสะกิดใจให้หยุดคิด (เขียนด้วยน้ำเสียงอบอุ่นแต่จริงใจ ไม่ตัดสิน)",
  "smartAlternative": "ทางออกหรือทางเลือกใหม่ที่ฉลาดและสง่างามกว่า (Smart Choice)",
  "actionableStep": "สิ่งที่ควรทำเดี๋ยวนี้เพื่อหยุดชะลออารมณ์และตั้งหลัก"
}`;

export async function simulateConsequence(
  action: string
): Promise<ConsequenceSimulationResponse> {
  const trimmedAction = action.trim();

  // 1. Primary: Call Real Gemini AI
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
                    text: `${CONSEQUENCE_PROMPT}\n\nสิ่งที่ผู้ใช้กำลังอยากทำ: "${trimmedAction}"`,
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
          const parsed = JSON.parse(jsonStr) as ConsequenceSimulationResponse;
          if (parsed.tenMinutes && parsed.tenMonthsWorstCase) {
            console.log(`[Consequence Simulator] Generated dynamically via Gemini (${model}) for: "${trimmedAction}"`);
            return parsed;
          }
        } catch (err: any) {
          console.warn(`[Consequence Simulator] Model ${model} failed, trying next...`, err?.message?.slice(0, 80));
        }
      }
    } catch (err) {
      console.warn('[Consequence Simulator] API call error:', err);
    }
  }

  // 2. Intelligent Context-Aware Fallback
  const lower = trimmedAction.toLowerCase();

  // Case: Theft / Stealing money / Financial crime
  if (lower.includes('ขโมย') || lower.includes('เงิน') || lower.includes('ลัก') || lower.includes('แอบเอา')) {
    return {
      tenMinutes: 'ได้เงินมาไว้ในมือ รู้สึกโล่งใจชั่ววูบที่ปัญหาเงินเฉพาะหน้าคลี่คลาย แต่ใจจะเริ่มเต้นแรงด้วยความระแวงและกลัวคนรู้',
      tenDays: 'แม่หรือคนในบ้านเริ่มสังเกตเห็นว่าเงินหาย บรรยากาศในบ้านตึงเครียด มีการตั้งข้อสงสัย ความรู้สึกผิดเริ่มกัดกินใจทุกครั้งที่มองหน้าแม่',
      tenMonthsWorstCase: 'ความจริงเปิดเผย สูญเสียความไว้วางใจจากครอบครัวอย่างสิ้นเชิง กลายเป็นตราบาปในใจ และเสียสายสัมพันธ์ที่เงินเท่าไหร่ก็ซื้อคืนไม่ได้',
      realityCheckQuestion: 'เงินจำนวนนี้ แลกกับความไว้ใจ รอยยิ้ม และน้ำตาของแม่... มันคุ้มค่ากับราคาชีวิตที่คุณต้องจ่ายจริงๆ ไหม?',
      smartAlternative: 'บอกแม่ตรงๆ ถึงความจำเป็นที่ต้องใช้เงิน หรือขอคำปรึกษาเรื่องภาระค่าใช้จ่าย แม้จะโดนบ่นแต่ยังรักษาความจริงใจและความไว้ใจไว้ได้',
      actionableStep: 'วางมือจากสิ่งนั้น เดินออกจากห้อง สูดหายใจเข้าลึกๆ 3 ครั้ง แล้วเขียนสิ่งที่จำเป็นต้องใช้เงินลงในกระดาษเพื่อหาทางออกที่ถูกต้อง',
    };
  }

  // Case: Resignation / Job rage
  if (lower.includes('ลาออก') || lower.includes('หัวหน้า') || lower.includes('งาน') || lower.includes('เทงาน')) {
    return {
      tenMinutes: 'สะใจมากที่ได้ตอกหน้าและประกาศว่าจะไม่ทนอีกต่อไป รู้สึกเป็นอิสระชั่วคราว',
      tenDays: 'ต้องเผชิญความกังวลเรื่องเงินเก็บ ขาดรายได้ประจำกะทันหัน และต้องวิ่งหางานใหม่อย่างกดดันและไร้ความพร้อม',
      tenMonthsWorstCase: 'เงินสำรองหมด ต้องยอมรับงานที่ไม่ชอบ เสียเครดิตและ Connection ในสายงานเดิมที่เคยสะสมมา',
      realityCheckQuestion: 'คุณพร้อมรับมือกับความเครียดเรื่องเงินและชีวิตที่ไร้แผนสำรอง จริงๆ หรือแค่อยากให้เขาเห็นว่าคุณมีคุณค่า?',
      smartAlternative: 'ร่างแผนสำรอง (Exit Strategy) ให้พร้อมก่อน ส่งใบสมัครและได้งานใหม่ที่ดียืนยันเรียบร้อย แล้วค่อยยื่นใบลาออกอย่างมืออาชีพและสง่างาม',
      actionableStep: 'จดข้อเรียกร้องหรือปัญหาที่เจอไว้เป็นข้อๆ พัก 1 คืน แล้วนัดคุยเรื่องขอบเขตงานหรือเริ่มส่ง Resume หาที่ใหม่แบบลับๆ',
    };
  }

  // Case: Relationship / Breakup / Revenge
  if (lower.includes('เลิก') || lower.includes('แฟน') || lower.includes('บล็อก') || lower.includes('นอกใจ') || lower.includes('ทักหาแฟนเก่า')) {
    return {
      tenMinutes: 'รู้สึกเหมือนได้เอาคืน ได้ทำให้เขารู้สึกผิดและตระหนักว่าเขากำลังจะเสียเราไป',
      tenDays: 'เกิดความเหงา ความเศร้า และความเสียดาย ยิ่งถ้าเขาปล่อยให้เลิกจริง เราจะกลายเป็นคนที่เจ็บปวดและอยากง้อแต่เสียฟอร์ม',
      tenMonthsWorstCase: 'สูญเสียคนที่รักและความทรงจำดีๆ ที่สร้างร่วมกันมา เพียงเพราะอารมณ์ชั่ววูบในคืนเดียว',
      realityCheckQuestion: 'คุณต้องการจะเลิกกันจริงๆ หรือลึกๆ แค่ต้องการให้เขาหันมาสนใจและแคร์ความรู้สึกคุณมากกว่านี้?',
      smartAlternative: 'แยกความโกรธออกจากความต้องการ บอกเขาตรงๆ ว่า "ตอนนี้เราโกรธมาก ขอเวลาสงบสติอารมณ์สัก 1 ชั่วโมง แล้วค่อยมาคุยกันดีๆ นะ"',
      actionableStep: 'อย่าเพิ่งพิมพ์ข้อความตัดพ้อ วางโทรศัพท์ลง ไปอาบน้ำหรือฟังเพลงผ่อนคลายให้หัวใจเต้นช้าลงก่อน',
    };
  }

  // Case: Social Media Drama / Shaming
  if (lower.includes('โพสต์') || lower.includes('ประจาน') || lower.includes('โซเชียล') || lower.includes('แฉ') || lower.includes('สตอรี่')) {
    return {
      tenMinutes: 'มีคนเข้ามากดไลก์ คอมเมนต์เข้าข้าง รู้สึกสะใจเหมือนมีพวกคอยเชียร์',
      tenDays: 'เรื่องบานปลาย มีคนแคปหน้าจอไปส่งต่อ กลายเป็นดราม่าที่ควบคุมไม่ได้ และอาจถูกฟ้องร้องดำเนินคดีหรือเสียภาพลักษณ์',
      tenMonthsWorstCase: 'ดิจิทัลฟุตพริ้นต์ (Digital Footprint) ติดตัว เสียความน่าเชื่อถือในหน้าที่การงานและสายตาคนรอบข้างที่มองเราเปลี่ยนไป',
      realityCheckQuestion: 'การประจาน 1 โพสต์ แลกกับภาพลักษณ์ คดีความ และความสงบสุขในชีวิตของคุณ คุ้มค่ากันจริงหรือ?',
      smartAlternative: 'เคลียร์กันตัวต่อตัว หรือบันทึกหลักฐานไว้เป็นส่วนตัว ไม่ดึงสายตาคนนอกที่ไม่ได้ช่วยแก้ปัญหาเข้ามาในชีวิต',
      actionableStep: 'พิมพ์ระบายในแอพนี้หรือในกระดาษให้เต็มที่ แล้วกดลบหรือฉีกทิ้ง เพื่อระบายสารเคมีแห่งความโกรธในสมอง',
    };
  }

  // Generic Fallback
  return {
    tenMinutes: `ได้ทำตามใจชั่ววูบกับเรื่อง "${trimmedAction}" รู้สึกโล่งหรือสะใจในเสี้ยวนาทีแรก`,
    tenDays: 'เริ่มเผชิญกับผลพวงที่ไม่ได้วางแผนไว้ ความยุ่งยากและความเครียดเริ่มตามมาทีละเรื่อง',
    tenMonthsWorstCase: 'ผลกระทบสะสมจนกลายเป็นปัญหาเรื้อรัง และต้องเสียเวลาหรือพลังงานชีวิตมหาศาลเพื่อตามแก้สิ่งที่ทำลงไป',
    realityCheckQuestion: `การทำ "${trimmedAction}" ตอนนี้ เป็นสิ่งที่ตัวคุณในอนาคตจะขอบคุณ หรือจะนั่งเสียใจ?`,
    smartAlternative: 'ใช้กฎพักใจ 24 ชั่วโมง (24-Hour Rule) อย่าเพิ่งลงมือทำตอนนี้ รอให้อารมณ์ลดลงแล้วค่อยตัดสินใจด้วยสมองส่วนเหตุผล',
    actionableStep: 'วางโทรศัพท์ลง ดื่มน้ำเย็น 1 แก้ว สูดลมหายใจเข้าลึกๆ แล้วลองมองสถานการณ์เหมือนเราเป็นคนนอกที่กำลังให้คำแนะนำเพื่อน',
  };
}
