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
    console.error('[Vercel Serverless Stream Error]:', err);
    const fallbackText = 'ฟังแล้วเข้าใจเลยนะ... ตอนนี้ความรู้สึกไหนกวนใจเธอมากที่สุด เล่าให้ฟังได้นะ 🌿';
    res.write(`event: chunk\ndata: ${JSON.stringify({ text: fallbackText })}\n\n`);
    res.write(`event: done\ndata: ${JSON.stringify({ fullText: fallbackText })}\n\n`);
    res.end();
  }
}
