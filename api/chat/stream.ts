type VercelRequest = any;
type VercelResponse = any;
import { GoogleGenAI } from '@google/genai';
import {
  DUENG_SATI_UNIFIED_MASTER_PROMPT,
  isCrisisMessage,
  type ChatEngineTurnResponse,
  type SafetyState,
  type ConversationMode,
  type UserCognitiveCapacity,
  type UserConversationIntent,
  type ReadinessLevel,
  type KnownFieldDimension,
  type CheckinConsentState,
  type SuggestedIntervention,
  type CbtConversationStage,
} from '../../src/shared/chat-protocol';

function sanitizeResponse(raw: string): {
  assistant_message: string;
  turn: ChatEngineTurnResponse;
} {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  let parsed: any = null;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const match =
      cleaned.match(/"assistantMessage"\s*:\s*"((?:[^"\\]|\\.)*)"/s) ||
      cleaned.match(/"assistant_message"\s*:\s*"((?:[^"\\]|\\.)*)"/s);
    if (match && match[1]) {
      try {
        parsed = { assistantMessage: JSON.parse(`"${match[1]}"`) };
      } catch {
        parsed = { assistantMessage: match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') };
      }
    }
  }

  let assistantMsg = '';
  const rawMsg = parsed?.assistantMessage || parsed?.assistant_message;
  if (typeof rawMsg === 'string' && rawMsg.trim()) {
    assistantMsg = rawMsg.trim();
    if (assistantMsg.startsWith('{') && (assistantMsg.includes('"assistantMessage"') || assistantMsg.includes('"assistant_message"'))) {
      try {
        const inner = JSON.parse(assistantMsg);
        const innerMsg = inner.assistantMessage || inner.assistant_message;
        if (typeof innerMsg === 'string' && innerMsg.trim()) {
          assistantMsg = innerMsg.trim();
        }
      } catch {}
    }
  } else {
    assistantMsg = 'เรารับรู้และเข้าใจในสิ่งที่เธอเล่ามานะ... ลองบอกเพิ่มอีกนิดได้ไหมว่าจุดไหนที่ทำให้รู้สึกอึดอัดที่สุด?';
  }

  // Lightweight Thai spelling & spacing cleanup
  assistantMsg = assistantMsg
    .replace(/มีเซง\b|มีเซนส์\b/g, 'จับจังหวะได้')
    .replace(/\bเซง\b/g, 'เซ็ง')
    .replace(/(\S+)\s+\1/g, (_m, word) => (['มาก', 'จริง', 'บ่อย', 'ค่อย'].includes(word) ? `${word}ๆ` : word))
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

  const quickReplies =
    Array.isArray(parsed?.quickReplies) && parsed.quickReplies.length > 0
      ? parsed.quickReplies
      : Array.isArray(parsed?.quick_replies) && parsed.quick_replies.length > 0
      ? parsed.quick_replies
      : ['เล่าต่อ', 'ยังไม่แน่ใจ', 'ขอเวลาคิดแป๊บนะ'];

  const candidatePattern = parsed?.candidatePattern || parsed?.candidate_loop || null;

  let normalizedIntent: UserConversationIntent = 'vent';
  const rawIntent = parsed?.intent || parsed?.user_intent;
  if (rawIntent === 'understand' || rawIntent === 'understand_self' || rawIntent === 'understand_other') {
    normalizedIntent = 'understand';
  } else if (rawIntent === 'decide' || rawIntent === 'pause') {
    normalizedIntent = 'decide';
  } else if (rawIntent === 'change' || rawIntent === 'practice') {
    normalizedIntent = 'change';
  } else if (rawIntent === 'vent') {
    normalizedIntent = 'vent';
  } else {
    normalizedIntent = 'unknown';
  }

  const structuredTurn: ChatEngineTurnResponse = {
    assistant_message: assistantMsg,
    safety_state: (parsed?.safety || parsed?.safety_state || 'normal') as SafetyState,
    mode: (parsed?.mode || 'HOLD') as ConversationMode,
    capacity: (parsed?.capacity || 'medium') as UserCognitiveCapacity,
    user_intent: normalizedIntent,
    stage: (typeof parsed?.stage === 'number' ? parsed.stage : 1) as CbtConversationStage,
    intensity: typeof parsed?.intensity === 'number' ? parsed.intensity : 5,
    readiness: (parsed?.readiness || 'story') as ReadinessLevel,
    recommended_exercise: parsed?.recommendedExercise || parsed?.recommended_exercise || null,
    quick_replies: quickReplies,
    candidate_loop: candidatePattern,
    evidence_candidate: parsed?.evidenceCandidate || parsed?.evidence_candidate || null,
    known_fields: (parsed?.knownFields || parsed?.known_fields || []) as KnownFieldDimension[],
    checkin_consent: (parsed?.checkinConsent || parsed?.checkin_consent || 'idle') as CheckinConsentState,
    suggested_intervention: (parsed?.suggestedIntervention || parsed?.suggested_intervention || 'reflection') as SuggestedIntervention,
  };

  return { assistant_message: assistantMsg, turn: structuredTurn };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, requestId } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Invalid messages' });
  }

  const apiKey = process.env.GEMINI_API_KEY || '';

  // Setup Server-Sent Events headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const userMsgs = messages.filter((m: any) => m.role === 'user');
  const latestUser = (userMsgs[userMsgs.length - 1]?.content || userMsgs[userMsgs.length - 1]?.text || '').trim();

  // Priority 0: Safety & Crisis Gate
  if (isCrisisMessage(latestUser)) {
    const crisisText = `ความปลอดภัยและความรู้สึกของเธอสำคัญที่สุดในตอนนี้เลยนะ...\nขอให้เธอหยุดพัก หายใจเข้าลึกๆ ช้าๆ ก่อน\n\nหากรู้สึกว่าอารม้นท่วมท้นจนรับไม่ไหว ขอให้โทรหาสายด่วนฟรี 1323 (กรมสุขภาพจิต 24 ชม.) หรือโทร 02-107-7977 (สะมาริตันส์) หรือ 1669 / 191 เพื่อให้มีคนรับฟังและดูแลความปลอดภัยของเธอทันทีนะ 🌿`;
    const crisisTurn: ChatEngineTurnResponse = {
      assistant_message: crisisText,
      safety_state: 'crisis',
      mode: 'HOLD',
      capacity: 'low',
      user_intent: 'vent',
      stage: 1,
      intensity: 10,
      readiness: 'story',
      recommended_exercise: null,
      quick_replies: ['1323 กรมสุขภาพจิต', '02-107-7977 สะมาริตันส์', '1669 สายด่วนฉุกเฉิน'],
      suggested_intervention: 'ground',
    };

    res.write(`event: safety\ndata: ${JSON.stringify({ mode: 'protect', risk_type: ['crisis'] })}\n\n`);
    res.write(`event: assistant_token\ndata: ${JSON.stringify({ text: crisisText, requestId })}\n\n`);
    res.write(`event: chunk\ndata: ${JSON.stringify({ text: crisisText, requestId })}\n\n`);
    res.write(`event: assistant_meta\ndata: ${JSON.stringify(crisisTurn)}\n\n`);
    res.write(`event: done\ndata: ${JSON.stringify({ fullText: crisisText, source: 'gemini', structuredTurn: crisisTurn, options: crisisTurn.quick_replies })}\n\n`);
    return res.end();
  }

  // Primary: Live Gemini API Call with Candidate Fallbacks
  if (apiKey && apiKey.trim()) {
    const modelCandidates = ['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite-preview'];
    const validMessages = messages.filter((m: any) => (m.content || m.text || '').trim());
    const firstUserIdx = validMessages.findIndex((m: any) => m.role === 'user');
    const sliced = firstUserIdx >= 0 ? validMessages.slice(firstUserIdx) : validMessages;

    const contents = sliced.map((m: any) => ({
      role: m.role === 'assistant' || m.role === 'model' || m.role === 'ai' ? 'model' : 'user',
      parts: [{ text: m.content || m.text || '' }],
    }));

    const ai = new GoogleGenAI({ apiKey: apiKey.trim() });

    for (const modelCandidate of modelCandidates) {
      try {
        const response = await ai.models.generateContent({
          model: modelCandidate,
          contents,
          config: {
            systemInstruction: DUENG_SATI_UNIFIED_MASTER_PROMPT,
            temperature: 0.5,
            maxOutputTokens: 1000,
            responseMimeType: 'application/json',
          },
        });

        const rawText = response.text || '';
        if (rawText.trim()) {
          const { assistant_message, turn } = sanitizeResponse(rawText);

          res.write(`event: safety\ndata: ${JSON.stringify({ mode: 'normal' })}\n\n`);
          res.write(`event: assistant_token\ndata: ${JSON.stringify({ text: assistant_message, requestId })}\n\n`);
          res.write(`event: chunk\ndata: ${JSON.stringify({ text: assistant_message, requestId })}\n\n`);
          res.write(`event: assistant_meta\ndata: ${JSON.stringify(turn)}\n\n`);
          res.write(
            `event: done\ndata: ${JSON.stringify({
              requestId,
              fullText: assistant_message,
              source: 'gemini',
              structuredTurn: turn,
              options: turn.quick_replies,
            })}\n\n`
          );
          return res.end();
        }
      } catch (err: any) {
        console.warn(`[Vercel Serverless Stream]: Model ${modelCandidate} failed (${err?.status || err?.message}). Trying next...`);
      }
    }
  }

  // Honest Error State - NO Fake Local Dialogue
  const errorText = 'เมื่อกี้การเชื่อมต่อกับ AI ขัดข้องชั่วคราว ลองส่งใหม่อีกครั้งนะเธอ 🌱';
  const errorTurn: ChatEngineTurnResponse = {
    assistant_message: errorText,
    safety_state: 'normal',
    mode: 'HOLD',
    capacity: 'medium',
    user_intent: 'vent',
    stage: 1,
    intensity: 5,
    readiness: 'story',
    recommended_exercise: null,
    quick_replies: ['ลองส่งใหม่อีกครั้ง'],
    suggested_intervention: 'none',
  };

  res.write(`event: assistant_token\ndata: ${JSON.stringify({ text: errorText, requestId })}\n\n`);
  res.write(`event: chunk\ndata: ${JSON.stringify({ text: errorText, requestId })}\n\n`);
  res.write(`event: assistant_meta\ndata: ${JSON.stringify(errorTurn)}\n\n`);
  res.write(`event: done\ndata: ${JSON.stringify({ requestId, fullText: errorText, source: 'error', structuredTurn: errorTurn, options: errorTurn.quick_replies })}\n\n`);
  res.end();
}
