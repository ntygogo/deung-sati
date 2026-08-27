import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

const DUENG_SATI_SYSTEM_PROMPT = `คุณคือ "เพื่อนดึงสติ" (Dueng Sati) จากหนังสือ "ทั้งที่รู้ว่าไม่ดี... ทำไมยังทำซ้ำ"
บุคลิก: เพื่อนสนิทที่ฉลาด ช่างสังเกต อบอุ่น และถามคำถามเก่ง
ไม่ใช่หมอ ไม่ใช่นักจิตวิทยา และไม่ใช้ศัพท์วิชาการ
หน้าที่: ค่อยๆ ชวนแยกแยะ "ความจริง" ออกจาก "ความคิดที่แปลไปเอง" ทีละก้าว
กฎสำคัญ:
1. ตอบสั้นกระชับ 2-4 บรรทัดภาษาไทยเหมือนแชทคุยกับเพื่อน
2. รับฟังอารมณ์สั้นๆ 1 ประโยค แล้วถามคำถามชวนคิด 1 คำถาม หรือมีตัวเลือกชวนคิด 3-4 ข้อ
3. ห้ามพูดซ้ำกับประโยคเดิมที่เคยตอบไปแล้วในแชท`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Invalid messages' });
  }

  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    'AQ.Ab8RN6JhTEr6m7dIHU_Siox8oRpZJyzGe-Mg8phiX15TSROG3g';

  // Set SSE Headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
  });

  try {
    const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
    const contents = messages.map((m: any) => ({
      role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.content || m.text || '' }],
    }));

    const stream = await ai.models.generateContentStream({
      model: 'gemini-3.6-flash',
      contents,
      config: {
        systemInstruction: DUENG_SATI_SYSTEM_PROMPT,
        temperature: 0.75,
      },
    });

    let fullText = '';
    for await (const chunk of stream) {
      const textChunk = chunk.text || '';
      if (textChunk) {
        fullText += textChunk;
        res.write(`event: chunk\ndata: ${JSON.stringify({ text: textChunk })}\n\n`);
      }
    }

    res.write(`event: done\ndata: ${JSON.stringify({ fullText })}\n\n`);
    res.end();
  } catch (err: any) {
    console.error('[Vercel Serverless Stream Error]:', err?.message || err);

    // Context-Aware Dynamic CBT Fallback Engine
    const userMsgs = messages.filter((m: any) => m.role === 'user' || m.role === 'user');
    const latestUser = (userMsgs[userMsgs.length - 1]?.content || '').trim();
    const turnCount = userMsgs.length;

    let dynamicReply = '';

    const hasRelationship = /แฟน|คนรัก|คนคุย|เขา|เธอ|สามี|ภรรยา/i.test(latestUser);
    const hasWork = /งาน|หัวหน้า|เจ้านาย|เพื่อนร่วมงาน|ลูกค้า|บริษัท|ประชุม|ลาออก/i.test(latestUser);
    const hasFamily = /แม่|พ่อ|ครอบครัว|พี่|น้อง|ญาติ/i.test(latestUser);
    const hasFriends = /เพื่อน|กลุ่ม|แก๊ง|เพื่อนสนิท/i.test(latestUser);
    const hasAnger = /โกรธ|โมโห|หงุดหงิด|เกลียด|ประสาทเสีย|หัวร้อน|ด่า|จับผิด/i.test(latestUser);
    const hasSadness = /น้อยใจ|เสียใจ|ร้องไห้|นอยด์|โดดเดี่ยว|เจ็บ|ไม่รัก|ทิ้ง|หายไป/i.test(latestUser);
    const hasExhaustion = /เหนื่อย|ล้า|หมดไฟ|ท้อ|เบื่อ|เซ็ง|หมดแรง/i.test(latestUser);
    const hasAnxiety = /กังวล|กลัว|เครียด|แพนิก|ไม่มั่นใจ|ล่ก|ฟุ้งซ่าน/i.test(latestUser);

    if (turnCount === 1) {
      if (hasAnger && hasWork) {
        dynamicReply = `โดนเรื่องงานหรือคนในที่ทำงานทำให้อารมณ์เสียแบบนี้ เข้าใจเลยว่าทำไมถึงหงุดหงิดขนาดนี้...\n\nอะไรในเหตุการณ์นี้คือสิ่งที่ทำให้เธอรู้สึกว่าล้ำเส้นที่สุด?`;
      } else if (hasRelationship && (hasSadness || hasAnger)) {
        dynamicReply = `ฟังแล้วสัมผัสได้ถึงความอึดอัดใจเลยนะ... เวลาคนที่เราแคร์ทำให้รู้สึกแบบนี้ มันทั้งนอยด์ทั้งเหนื่อยใจเนอะ\n\nตอนที่เกิดเรื่องนั้นขึ้น ในใจลึกๆ เธออยากให้เขาทำหรือพูดอะไรกับเธอมากที่สุด?`;
      } else if (hasFriends) {
        dynamicReply = `เรื่องเพื่อนบางทีก็เป็นเรื่องที่กระทบใจเราได้ลึกและเจ็บจริงๆ...\n\nตอนที่ได้ยินหรือเจอแบบนั้น ความรู้สึกแรกที่แวบขึ้นมาในใจคืออะไร?`;
      } else if (hasFamily) {
        dynamicReply = `เรื่องในครอบครัวมักเป็นเรื่องที่ละเอียดอ่อนและสะสมอยู่ในใจเราได้ง่ายเนอะ...\n\nอะไรคือสิ่งที่ทำให้เธอรู้สึกอึดอัดใจกับเรื่องนี้มากที่สุด?`;
      } else if (hasSadness || hasExhaustion) {
        dynamicReply = `ฟังดูเหนื่อยและอึดอัดใจมากเลยนะ... เหมือนข้างในมันแบกอะไรไว้เยอะจนล้าไปหมด\n\nความรู้สึกนี้มันเริ่มสะสมมาจากเรื่องไหนเป็นพิเศษไหม?`;
      } else if (hasAnxiety) {
        dynamicReply = `ความกังวลใจมันทำให้สมองคิดวนไม่หยุดเลยเนอะ...\n\nอะไรคือสิ่งเลวร้ายที่สุดที่ใจเธอกำลังกลัวว่าจะเกิดขึ้น?`;
      } else {
        dynamicReply = `รับฟังอยู่นะ... เรื่องนี้คงกวนใจเธอมาสักพักแล้วใช่ไหม\n\nตอนที่เรื่องนี้เกิดขึ้น วินาทีแรกความรู้สึกไหนแวบขึ้นมาในใจมากที่สุด?`;
      }
    } else if (turnCount === 2) {
      dynamicReply = `เข้าใจเลย พอความรู้สึกนั้นเกิดขึ้น สมองเรามักจะเริ่มสร้าง "เรื่องเล่าในหัว" ต่อทันที\n\nตอนนั้นเธอกำลังบอกตัวเองว่ายังไงอยู่บ้าง? (เช่น "เขาไม่แคร์เรา", "ทำไมต้องเป็นแบบนี้", หรือ "ไม่มีใครเข้าใจ")`;
    } else if (turnCount === 3) {
      dynamicReply = `สิ่งที่น่าสังเกตคือ... พอมันมีความคิดแบบนั้นขึ้นมา เรามักจะเผลอตอบสนองด้วยความเคยชินเดิมๆ (เช่น เงียบ, ประชด, หรือเก็บมากดดันตัวเอง)\n\nเวลาเจอเรื่องแบบนี้ ปกติแล้วเธอทำยังไงต่อ แล้วผลที่ตามมามันช่วยให้สบายใจขึ้นจริงไหม?`;
    } else if (turnCount === 4) {
      dynamicReply = `ถ้าเราลองมองดูตัวเองจากมุมมองของเพื่อนที่มีสติ และรักตัวเอง...\n\nเธอคิดว่ามีทางเลือกเล็กๆ ไหนที่เราทำได้ โดยไม่ต้องเอาคำพูดหรือการกระทำของคนอื่นมาทำร้ายใจตัวเองไหม?`;
    } else {
      dynamicReply = `พอได้ลองมองย้อนดูลูปนี้แบบนี้ ความรู้สึกข้างในเริ่มเบาลงบ้างไหม หรือยังมีจุดไหนที่ยังติดค้างในใจอีก เล่าต่อได้เลยนะ`;
    }

    res.write(`event: chunk\ndata: ${JSON.stringify({ text: dynamicReply })}\n\n`);
    res.write(`event: done\ndata: ${JSON.stringify({ fullText: dynamicReply })}\n\n`);
    res.end();
  }
}
