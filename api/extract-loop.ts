import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages } = req.body || {};
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    'AQ.Ab8RN6KCEvnaXfqgMinUvKsKoNfrLnmDUGkkLylwmbfhXvva2Q';

  try {
    const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
    const userText = Array.isArray(messages)
      ? messages.map((m: any) => `${m.role}: ${m.content}`).join('\n')
      : 'มีเรื่องกวนใจ';

    const prompt = `จากบทสนทนานี้ ช่วยสกัด Loop Map (CBT) เป็น JSON ภาษาไทย:
${userText}

รูปแบบ JSON ที่ต้องการ:
{
  "can_offer_loop": true,
  "title": "ชื่อลูปสั้นๆ 3-5 คำ",
  "event": "สิ่งที่เกิดขึ้นจริงตรงหน้า",
  "feeling": "อารมณ์/ความรู้สึกข้างใน",
  "interpretation": "เรื่องเล่าหรือความคิดในหัว",
  "need_fear": "ความต้องการลึกๆ",
  "habitual_response": "ปฏิกิริยาเดิมที่เคยทำ",
  "habitual_result": "ผลลัพธ์ที่ตามมา",
  "new_choice": "ทางเลือกใหม่ที่มีสติ"
}`;

    const result = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(result.text || '{}');
    return res.status(200).json(parsed);
  } catch (err: any) {
    return res.status(200).json({
      can_offer_loop: true,
      title: 'วงจรความคิดปัจจุบัน',
      event: 'มีเรื่องกระทบใจ',
      feeling: 'หงุดหงิด / อึดอัดใจ',
      interpretation: 'คิดว่าเขาจ้องจับผิดหรือไม่เห็นค่า',
      need_fear: 'อยากให้คนเข้าใจและให้เกียรติ',
      habitual_response: 'เก็บมากดดันตัวเอง / นอยด์',
      habitual_result: 'อารมณ์ขุ่นมัวและเสียพลังงาน',
      new_choice: 'ตั้งสติ หายใจลึกๆ และแยกแยะความจริงกับความคิด',
    });
  }
}
