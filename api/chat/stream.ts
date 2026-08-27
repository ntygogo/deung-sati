import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';
import { DUENG_SATI_MASTER_PROMPT } from '../../server/prompts/duengSatiMasterPrompt';
import {
  evaluateCheckinConsent,
  isCrisisMessage,
  classifyConversationIntent,
  isExplicitTopicShift,
  CHIP_LABELS,
  type EmotionalCheckinData,
  type SessionStatePayload,
} from '../../src/shared/chat-protocol';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, sessionState } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Invalid messages' });
  }

  const checkinState: EmotionalCheckinData =
    sessionState?.checkinState || req.body.checkinState || { step: 'idle' };

  const apiKey = process.env.GEMINI_API_KEY || '';

  // Set SSE Headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
  });

  const userMsgs = messages.filter((m: any) => m.role === 'user');
  const latestUser = (userMsgs[userMsgs.length - 1]?.content || userMsgs[userMsgs.length - 1]?.text || '').trim();

  // Priority 0: Crisis Safety Gate
  if (isCrisisMessage(latestUser)) {
    const crisisText = `ความปลอดภัยและความรู้สึกของเธอสำคัญที่สุดในตอนนี้เลยนะ... ขอให้เธอหยุดพัก หายใจเข้าลึกๆ ช้าๆ ก่อน\n\nหากรู้สึกว่าอารมณ์ท่วมท้นจนรับไม่ไหว ขอให้โทรหาสายด่วนฟรี 1323 (กรมสุขภาพจิต 24 ชม.) หรือโทร 02-107-7977 (สะมาริตันส์) หรือ 1669 / 191 เพื่อให้มีคนรับฟังและดูแลความปลอดภัยของเธอทันทีนะ 🌿`;
    res.write(`event: safety\ndata: ${JSON.stringify({ mode: 'protect', risk_type: ['crisis'] })}\n\n`);
    res.write(`event: chunk\ndata: ${JSON.stringify({ text: crisisText })}\n\n`);
    res.write(`event: done\ndata: ${JSON.stringify({ fullText: crisisText, safetyMode: 'protect' })}\n\n`);
    return res.end();
  }

  // 1. Primary: Gemini API Streaming
  if (apiKey && apiKey.trim()) {
    try {
      const ai = new GoogleGenAI({ apiKey: apiKey.trim() });

      const validMessages = messages.filter((m: any) => (m.content || m.text || '').trim());
      const firstUserIdx = validMessages.findIndex((m: any) => m.role === 'user');
      const sliced = firstUserIdx >= 0 ? validMessages.slice(firstUserIdx) : validMessages;

      const contents = sliced.map((m: any) => ({
        role: m.role === 'assistant' || m.role === 'model' || m.role === 'ai' ? 'model' : 'user',
        parts: [{ text: m.content || m.text || '' }],
      }));

      const stream = await ai.models.generateContentStream({
        model: 'gemini-3.6-flash',
        contents,
        config: {
          systemInstruction: DUENG_SATI_MASTER_PROMPT,
          temperature: 0.75,
          maxOutputTokens: 1000,
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
      return res.end();
    } catch (err: any) {
      console.warn('[Vercel Serverless Stream Warning]: Gemini API stream failed, switching to deterministic serverless fallback:', err?.message || err);
    }
  }

  // 2. Deterministic Context-Aware Serverless Fallback
  let dynamicReply = '';
  let quickOptions: string[] | undefined = undefined;
  let updatedCheckin: EmotionalCheckinData = { ...checkinState };

  // Explicit Topic Change
  if (isExplicitTopicShift(latestUser)) {
    dynamicReply = `ได้เลย งั้นเราพักเรื่องนั้นไว้ก่อนนะ... ตอนนี้มีเรื่องไหนที่เธออยากเล่าต่อ เล่าให้เราฟังได้เลย`;
    updatedCheckin = { step: 'idle' };
  }
  // Check-in Offered State with Strict Consent Evaluation
  else if (checkinState.step === 'offered' || checkinState.step === 'awaiting_consent') {
    const consent = evaluateCheckinConsent(latestUser);
    if (consent === 'affirmative') {
      dynamicReply = `ถ้ายังไม่ต้องตั้งชื่ออารมณ์ ตอนนี้ร่างกายตรงไหนรู้สึกชัดที่สุด?`;
      quickOptions = [...CHIP_LABELS.STEP1_BODY];
      updatedCheckin = { step: 'step1_body' };
    } else if (consent === 'declined') {
      dynamicReply = `ได้เลย ไม่เป็นไรเลยนะ... งั้นเราคุยกันต่อตามปกติ เธออยากเล่าหรือระบายเรื่องไหนต่อ เล่าได้เลยนะ`;
      updatedCheckin = { step: 'declined' };
    } else {
      dynamicReply = `ไม่เป็นไรเลยนะ เธอยังไม่ต้องรีบตัดสินใจก็ได้ ตอนนี้อยากให้เราอยู่ฟังเธอเล่าต่อ หรืออยากลองสังเกตร่างกายด้วยกันแค่หนึ่งคำถามดี?`;
      quickOptions = [...CHIP_LABELS.CONSENT_AMBIGUOUS];
      updatedCheckin = { step: 'awaiting_consent' };
    }
  }
  // Standard Exploration & Check-in Trigger Check
  else {
    const intent = classifyConversationIntent(latestUser, messages);

    if (intent === 'exploring' && checkinState.step !== 'declined' && checkinState.step !== 'completed') {
      dynamicReply = `เหมือนตอนนี้มันยังบอกไม่ถูกว่าเกิดอะไรขึ้นข้างใน ใช่ไหม\n\nอยากให้เราค่อยๆ ช่วยสำรวจจากความรู้สึกในร่างกายทีละนิดไหม?`;
      quickOptions = [...CHIP_LABELS.CONSENT_OFFER];
      updatedCheckin = { step: 'offered' };
    } else if (intent === 'pausing') {
      dynamicReply = `เข้าใจเลยว่าตอนนั้นมันโกรธจนอยากระเบิดออกมาเดี๋ยวนี้...\n\nแต่ลองหยุดหายใจลึกๆ 10 วินาที... ถ้าทำไปตอนนี้ ความสะใจอยู่กับเราแป๊บเดียว แล้วผลแย่ที่สุดที่จะตามมาหลังจากนั้น เธอพร้อมรับมือกับมันจริงๆ หรือเปล่า?`;
    } else {
      dynamicReply = `รับฟังอยู่นะ... เรื่องนี้คงกวนใจเธอมาสักพักแล้วใช่ไหม\n\nตอนที่เรื่องนี้เกิดขึ้น วินาทีแรกความรู้สึกไหนแวบขึ้นมาในใจมากที่สุด?`;
    }
  }

  res.write(
    `event: chunk\ndata: ${JSON.stringify({
      text: dynamicReply,
      options: quickOptions,
      checkinData: updatedCheckin,
    })}\n\n`
  );
  res.write(
    `event: done\ndata: ${JSON.stringify({
      fullText: dynamicReply,
      options: quickOptions,
      checkinData: updatedCheckin,
    })}\n\n`
  );
  res.end();
}
