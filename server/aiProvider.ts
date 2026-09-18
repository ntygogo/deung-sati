import { config } from './config.js';
import { GoogleGenAI } from '@google/genai';
import { prepareLoopChat, loopChatInstruction, applyLoopChat, type LoopChatContext } from '../src/shared/chat-protocol/loopChatGuide.js';
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
} from '../src/shared/chat-protocol/index.js';
import { classifySafety, type SafetyClassification } from './safetyClassifier.js';

export interface StreamChatResponseParams {
  messages: Array<{ role: string; content: string }>;
  safety?: SafetyClassification;
  sessionState?: any;
  requestId?: number;
  exerciseResult?: any;
  loopGuide?: unknown;
  onAssistantToken: (token: string) => void;
  onAssistantMeta: (meta: ChatEngineTurnResponse) => void;
  onDone: (
    fullText: string,
    source: 'gemini' | 'error',
    structuredTurn: ChatEngineTurnResponse
  ) => void;
  onError?: (err: Error) => void;
}

/**
 * Robust Sanitizer & Parser for Deung Sati AI Responses (V1 SSOT Architecture).
 * Guarantees that assistant_message is ALWAYS pure natural human text and NEVER raw JSON.
 */
export function sanitizeDeungSatiResponse(raw: string, loopContext?: LoopChatContext): {
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
    // Regex extraction fallback for assistantMessage / assistant_message
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

  // Map legacy / sub-intents to the 5 V1 official intents
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

  // Server-authoritative Loop Readiness calculation (Strict 6-part check)
  const extracted6 = parsed?.extracted6PartLoop || parsed?.extracted_loop || null;
  const trig = (extracted6?.trigger || candidatePattern?.trigger || '').trim();
  const emo = (extracted6?.emotion_or_body || candidatePattern?.emotion || '').trim();
  const story = (extracted6?.automatic_story || candidatePattern?.interpretation || '').trim();
  const facts = (extracted6?.facts || (parsed?.facts ? String(parsed.facts) : '')).trim();
  const oldResp = (extracted6?.old_response || (extracted6 as any)?.options || candidatePattern?.habitual_action || '').trim();
  const newCh = (extracted6?.new_choice || (extracted6 as any)?.micro_action || candidatePattern?.new_choice || '').trim();
  const needs = (extracted6?.needs || (extracted6 as any)?.desires || (candidatePattern as any)?.need || '').trim();
  const reflection = ((extracted6 as any)?.reflection || (extracted6 as any)?.insights || '').trim();

  const hasAll6 =
    trig.length >= 3 &&
    emo.length >= 2 &&
    story.length >= 3 &&
    facts.length >= 3 &&
    oldResp.length >= 3 &&
    newCh.length >= 3;

  const isDistinct =
    new Set([
      trig.toLowerCase(),
      emo.toLowerCase(),
      story.toLowerCase(),
      facts.toLowerCase(),
      oldResp.toLowerCase(),
      newCh.toLowerCase(),
    ]).size >= 5;

  let loopReadiness: 'collecting' | 'ready' = 'collecting';
  if (hasAll6 && isDistinct) {
    loopReadiness = 'ready';
  }

  // Preserve extracted loop even if partial (do not discard when collecting)
  let extractedLoop: any = null;
  if (trig || emo || story || facts || needs || oldResp || newCh || reflection) {
    extractedLoop = {
      trigger: trig || undefined,
      emotion_or_body: emo || undefined,
      automatic_story: story || undefined,
      facts: facts || undefined,
      needs: needs || undefined,
      options: oldResp || undefined,
      micro_action: newCh || undefined,
      reflection: reflection || undefined,
      // Backward-compatible aliases
      desires: needs || undefined,
      old_response: oldResp || undefined,
      new_choice: newCh || undefined,
      insights: reflection || undefined,
    };
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
    loop_readiness: loopReadiness,
    extracted_loop: extractedLoop,
  };

  const guidedTurn = loopContext ? applyLoopChat(loopContext, parsed, structuredTurn) : structuredTurn;
  return { assistant_message: guidedTurn.assistant_message, turn: guidedTurn };
}

export async function streamChatResponse(params: StreamChatResponseParams): Promise<void> {
  const { messages, safety, requestId, exerciseResult, loopGuide, onAssistantToken, onAssistantMeta, onDone } = params;

  try {
    const loopContext = prepareLoopChat(messages, loopGuide);
    const startTime = Date.now();
    const lastMsg = messages[messages.length - 1];
    const latestUserMsg = lastMsg?.content || '';
    const apiKey = config.geminiApiKey || '';
    const isKeyPresent = Boolean(apiKey.trim().length > 0);
    const primaryModel = config.aiModel || 'gemini-3.5-flash';

    console.log(`[API_RECEIVED] requestId=${requestId ?? '1'}`);

    // Priority 0: Crisis Triage Gate (Immediate safety response)
    const currentSafety = safety || await classifySafety(messages);
    if (currentSafety.mode === 'protect' || isCrisisMessage(latestUserMsg)) {
      const isDomesticViolence = currentSafety.risk_type?.includes('domestic_violence');
      const crisisText = isDomesticViolence
        ? `ความปลอดภัยของเธอสำคัญที่สุดเลยนะ... ตอนนี้เธอปลอดภัยดีไหม?\n\nถ้าทำได้โดยไม่เพิ่มความเสี่ยง ลองไปอยู่ในจุดที่ปลอดภัยหรือใกล้คนที่ช่วยได้ หากตกอยู่ในอันตรายหรือรู้สึกไม่ปลอดภัย ขอให้โทรแจ้งสายด่วนช่วยเหลือสังคม 1300 (พม. 24 ชม.) หรือโทร 191 ได้ทันทีนะ เราอยู่ตรงนี้พร้อมช่วยคิดหาความปลอดภัยไปด้วยกัน 🌿`
        : `ความปลอดภัยและความรู้สึกของเธอสำคัญที่สุดในตอนนี้เลยนะ...\nขอให้เธอหยุดพัก หายใจเข้าลึกๆ ช้าๆ ก่อน\n\nหากรู้สึกว่าอารมณ์ท่วมท้นจนรับไม่ไหว ขอให้โทรหาสายด่วนฟรี 1323 (กรมสุขภาพจิต 24 ชม.) หรือโทร 02-107-7977 (สะมาริตันส์) หรือ 1669 / 191 เพื่อให้มีคนรับฟังและดูแลความปลอดภัยของเธอทันทีนะ 🌿`;
      const fullCrisisTurn: ChatEngineTurnResponse = {
        assistant_message: crisisText,
        safety_state: 'crisis',
        mode: 'HOLD',
        capacity: 'low',
        user_intent: 'vent',
        stage: 1,
        intensity: 10,
        readiness: 'story',
        recommended_exercise: null,
        quick_replies: isDomesticViolence
          ? ['1300 ศูนย์ช่วยเหลือสังคม', '191 แจ้งเหตุด่วน', 'ตอนนี้ปลอดภัยแล้ว']
          : ['1323 กรมสุขภาพจิต', '02-107-7977 สะมาริตันส์', '1669 สายด่วนฉุกเฉิน'],
        candidate_loop: null,
        evidence_candidate: null,
        suggested_intervention: 'ground',
      };

      onAssistantToken(crisisText);
      onAssistantMeta(fullCrisisTurn);
      onDone(crisisText, 'gemini', fullCrisisTurn);
      return;
    }

    if (!isKeyPresent) {
      throw new Error('GEMINI_API_KEY is not configured in .env file.');
    }

    // Active candidate models with verified live quota
    const modelCandidates = [
      primaryModel,
      'gemini-3.5-flash',
      'gemini-3.5-flash-lite',
      'gemini-3.1-flash-lite-preview',
    ];
    const uniqueCandidates = Array.from(new Set(modelCandidates));

    // Keep only recent non-empty messages
    const validMessages = messages.filter((m) => m.content && m.content.trim());
    const recentMessages = validMessages.slice(-12);
    const firstUserIdx = recentMessages.findIndex((m) => m.role === 'user');
    const sliced = firstUserIdx >= 0 ? recentMessages.slice(firstUserIdx) : recentMessages;

    const contents = sliced.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    if (exerciseResult) {
      const exId = exerciseResult.exercise_id || exerciseResult.exerciseId || 'exercise';
      const outcome = exerciseResult.result?.outcome || exerciseResult.outcome || 'completed';
      const inputs = exerciseResult.result?.user_inputs || exerciseResult.user_inputs || {};
      const timing = exerciseResult.timing || 'immediate';

      let inputDetails = '';
      const inputEntries = Object.entries(inputs);
      if (inputEntries.length > 0) {
        inputDetails = '\nข้อมูลที่ผู้ใช้บันทึกไว้ในเครื่องมือ:';
        for (const [k, v] of inputEntries) {
          inputDetails += `\n- ${k}: "${v}"`;
        }
      }

      let contextStr = '';
      if (timing === 'immediate') {
        const isBeforeSpeak = exId === 'before_speak';
        const specificGuidance = isBeforeSpeak
          ? `\nข้อกำหนดเฉพาะสำหรับ Before Speak:
- ห้ามชมเชย ห้ามอธิบายกระบวนการ ("เราเห็นความตั้งใจของเธอ...")
- ใช้ประโยคที่เกลาได้มาสานต่อโดยตรง สั้น กระชับ (ไม่เกิน 35 คำ)
- ถามไม่เกิน 1 คำถาม เช่น "แบบนี้ใกล้กับสิ่งที่เธออยากพูดจริงๆ ไหม?" หรือ "ตอนนี้ยังอยากส่งทันทีอยู่ไหม?"`
          : '';

        contextStr = `[INTERNAL EXERCISE CONTEXT — ผู้ใช้เพิ่งทำแบบฝึกหัดเสร็จสิ้นในเทิร์นนี้]
ข้อมูลด้านล่างคือคำตอบที่ผู้ใช้บันทึกไว้ในเครื่องมือ ไม่ใช่ประโยคที่ผู้ใช้พิมพ์คุยเอง
ข้อกำหนดสำคัญสำหรับการตอบ:
1. สานต่อบทสนทนาจากสิ่งที่ค้นพบโดยตรง สั้น กระชับ 1–2 ประโยค (แนะนำ <= 35–40 คำไทย)
2. สะท้อนรายละเอียดรูปธรรมสั้นๆ 1 อย่าง ห้ามทวนเรื่องเล่าทั้งกระบิ และห้ามถามซ้ำสิ่งที่ผู้ใช้ตอบมาแล้ว
3. ห้ามชมเชย ห้ามเทศน์จิตวิทยา ห้ามอธิบายว่า AI กำลังทำอะไร
4. หากมีส่วนที่ไม่รู้แน่ชัด (Unknown): ต้องคงสภาพความไม่รู้ไว้ชัดเจนด้วยภาษาธรรมชาติที่รักษาความไม่แน่ชัด เช่น "เรายังสรุปเหตุผลของเขาไม่ได้", "ยังไม่มีข้อมูลพอจะรู้ว่าเขาคิดอะไร", "ยังไม่รู้แน่ชัด" ห้ามคาดเดาเหตุผลแทนคนอื่นเด็ดขาด
5. ถามได้ไม่เกิน 1 คำถามต่อเทิร์น${specificGuidance}

รายละเอียดแบบฝึกหัด:
- แบบฝึกหัด: ${exId}
- ผลลัพธ์หลังฝึก: ${outcome}${inputDetails}`;
      } else {
        contextStr = `[INTERNAL EXERCISE CONTEXT — บริบทอ้างอิงจากแบบฝึกหัดก่อนหน้านี้]
ผู้ใช้เคยทำแบบฝึกหัด ${exId} ในบทสนทนานี้ และบันทึกข้อมูลไว้ดังนี้:${inputDetails}
(คำแนะนำ: ใช้เป็นข้อมูลเบื้องหลังเมื่อเกี่ยวข้องเท่านั้น ห้ามถามซ้ำในสิ่งที่ผู้ใช้เคยตอบไว้แล้ว และไม่ต้องยัดเยียดกล่าวถึงแบบฝึกหัดนี้หากไม่สอดคล้องกับข้อความล่าสุด)`;
      }

      contents.push({
        role: 'user',
        parts: [{ text: contextStr }],
      });
    }

    let lastError: any = null;

    const generationTemperature =
      exerciseResult && (!exerciseResult.timing || exerciseResult.timing === 'immediate')
        ? 0.2
        : 0.5;

    for (const modelCandidate of uniqueCandidates) {
      try {
        console.log(`[AI_CALL_START] requestId=${requestId ?? '1'} model=${modelCandidate}`);
        const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
        const response = await ai.models.generateContent({
          model: modelCandidate,
          contents,
          config: {
            systemInstruction: DUENG_SATI_UNIFIED_MASTER_PROMPT + loopChatInstruction(loopContext),
            temperature: generationTemperature,
            maxOutputTokens: 2048,
            thinkingConfig: {
              thinkingBudget: 0,
            },
            responseMimeType: 'application/json',
          },
        });

        const rawText = response.text || '';
        if (rawText.trim()) {
          const { assistant_message, turn } = sanitizeDeungSatiResponse(rawText, loopContext);
          const latencyMs = Date.now() - startTime;

          console.log(`[AI_CALL_END] requestId=${requestId ?? '1'} model=${modelCandidate} status=200 latency=${latencyMs}ms`);

          // Stream natural token for the user bubble
          onAssistantToken(assistant_message);
          // Send internal metadata separately
          onAssistantMeta(turn);
          // Complete the turn
          onDone(assistant_message, 'gemini', turn);
          return;
        }
      } catch (err: any) {
        lastError = err;
        const status = err?.status || err?.statusCode || '';
        console.warn(`[AI Provider] Model ${modelCandidate} call failed (${status}). Trying next candidate...`);
      }
    }

    throw lastError || new Error('All Gemini model candidates failed to respond.');
  } catch (err: any) {
    console.error('[AI Provider Error]:', err?.status || err?.code, err?.message);
    const fallbackErrorText = 'เมื่อกี้การเชื่อมต่อกับ AI ขัดข้องชั่วคราว ลองส่งใหม่อีกครั้งนะเธอ 🌱';
    const errorTurn: ChatEngineTurnResponse = {
      assistant_message: fallbackErrorText,
      safety_state: 'normal',
      mode: 'HOLD',
      capacity: 'medium',
      user_intent: 'vent',
      stage: 1,
      intensity: 5,
      readiness: 'story',
      recommended_exercise: null,
      quick_replies: ['ลองส่งใหม่อีกครั้ง'],
      candidate_loop: null,
      evidence_candidate: null,
      suggested_intervention: 'none',
    };
    onAssistantToken(fallbackErrorText);
    onAssistantMeta(errorTurn);
    onDone(fallbackErrorText, 'error', errorTurn);
  }
}
