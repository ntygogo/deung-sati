import { config } from './config.ts';
import { DUENG_SATI_MASTER_PROMPT } from './prompts/duengSatiSystemPrompt.ts';
import type { SafetyClassification } from './safetyClassifier.ts';
import { GoogleGenAI } from '@google/genai';

export interface StreamChatParams {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  safety: SafetyClassification;
  onChunk: (text: string) => void;
  onDone: (fullText: string, source: 'gemini' | 'fallback') => void;
  onError: (err: Error) => void;
}

/**
 * Primary Conversational Brain: External Gemini Multi-Turn Streaming
 *
 * Pattern:
 * SYSTEM INSTRUCTION + FULL CONVERSATION HISTORY + CURRENT USER MESSAGE
 * -> GEMINI (gemini-3.7-flash with dynamic resilient failover)
 * -> RESPONSE STREAM
 */
export async function streamChatResponse({
  messages,
  safety,
  onChunk,
  onDone,
  onError,
}: StreamChatParams) {
  const apiKey = config.geminiApiKey;
  const isKeyPresent = Boolean(apiKey);
  const primaryModel = config.aiModel || 'gemini-3.7-flash';

  console.log(`\n======================================================`);
  console.log(`[AI PROVIDER DISPATCH]`);
  console.log(`- Provider: Google GenAI SDK (@google/genai v2.17.1)`);
  console.log(`- Primary Model: ${primaryModel}`);
  console.log(`- API Key Present: ${isKeyPresent ? 'true' : 'false'}`);
  console.log(`- Method: GoogleGenAI.models.generateContentStream`);
  console.log(`- Full Conversation History Sent (${messages.length} messages):`);
  messages.forEach((m, idx) => {
    console.log(`  [${idx + 1}] ${m.role.toUpperCase()}: "${m.content}"`);
  });
  console.log(`======================================================\n`);

  // Build active system instruction based on Safety mode
  let systemInstruction = DUENG_SATI_MASTER_PROMPT;
  if (safety.mode === 'protect') {
    systemInstruction += `\n\n[CRITICAL SAFETY OVERRIDE: PROTECT MODE ACTIVE]\nReason: ${safety.reason}\nPriority: Immediate physical safety. Stop deep psychological exploration. Keep response short, calm, and grounding. Encourage calling emergency services (191, 1669, 1323) if in immediate danger.`;
  } else if (safety.mode === 'explore') {
    systemInstruction += `\n\n[SAFETY NOTICE: EXPLORE MODE ACTIVE]\nReason: ${safety.reason}\nAcknowledge strong emotion without judgment. Create space between feelings and action. Check gently if there is immediate intent or danger.`;
  }

  // 1. Primary Path: Real External Gemini Multi-Turn Streaming with Resilient Model Chain
  if (isKeyPresent) {
    const candidateModels = [
      primaryModel,
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-2.5-flash',
      'gemini-1.5-pro',
      'gemini-flash-latest',
    ].filter((m, idx, arr) => arr.indexOf(m) === idx);

    const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
    const contents = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    for (const modelCandidate of candidateModels) {
      try {
        console.log(`[AI Provider] Attempting streaming with model: ${modelCandidate}...`);
        const streamResult = await ai.models.generateContentStream({
          model: modelCandidate,
          contents,
          config: {
            systemInstruction,
            temperature: safety.mode === 'protect' ? 0.2 : 0.7,
            maxOutputTokens: safety.mode === 'protect' ? 600 : 3000,
          },
        });

        let fullText = '';
        for await (const chunk of streamResult) {
          const chunkText = chunk.text || '';
          if (chunkText) {
            fullText += chunkText;
            onChunk(chunkText);
          }
        }

        if (fullText.trim()) {
          console.log(`[RESPONSE GENERATED - SOURCE: GEMINI (${modelCandidate})]:\n${fullText}\n`);
          onDone(fullText, 'gemini');
          return;
        }
      } catch (err: any) {
        console.warn(`[AI Provider] Model ${modelCandidate} failed (${err?.status || err?.message?.slice(0, 80)}). Trying next candidate...`);
      }
    }
  } else {
    console.warn('[AI Provider] Notice: GEMINI_API_KEY is not configured in .env. Using context-aware fallback.');
  }

  // 2. Context-Aware Dynamic Fallback Generator (Non-orchestrated, responsive, anti-repetitive):
  try {
    const userMessages = messages.filter((m) => m.role === 'user');
    const assistantMessages = messages.filter((m) => m.role === 'assistant');
    const latestUserMsg = userMessages[userMessages.length - 1]?.content || '';
    const turnCount = userMessages.length;
    const previousAssistantTexts = assistantMessages.map((m) => m.content);

    let fallbackText = '';

    if (safety.mode === 'protect') {
      fallbackText =
        'ความปลอดภัยของคุณสำคัญที่สุดในตอนนี้ ขอให้คุณหยุดพัก หายใจลึกๆ ก่อน และหากมีอันตรายเฉพาะหน้า ขอให้โทร 191 หรือ 1669 ทันทีนะ';
    }
    // Feeling stuck / "ไม่รู้จะทำยังไง"
    else if (/ไม่รู้(จะทำยังไง|อะ|เลย|อ่ะ)|ตัน|คิดไม่ออก|มึน|สับสน/i.test(latestUserMsg)) {
      fallbackText = `เวลาที่หัวมันตื้อและคิดไม่ออก การพยายามเค้นหาคำตอบมักจะยิ่งทำให้เหนื่อยกว่าเดิม

งั้นเราลองพักเรื่องทางออกไว้ก่อน ตอนนี้แค่อยากได้พื้นที่บ่น หรืออยากพักเงียบๆ สักแป๊บดี?`;
    }
    // User expresses boredom / "เบื่อ"
    else if (/^เบื่อ$|^เซ็ง$|^เหนื่อย$/i.test(latestUserMsg.trim())) {
      fallbackText = `เหมือนตอนนี้พลังงานข้างในมันล้าจนไม่อยากจับอะไรเลย

ความรู้สึกนี้มันมาจากเรื่องไหนเป็นพิเศษไหม เช่น งาน คน หรือแค่เฉื่อยไปหมด?`;
    }
    // Clarifications / Disagreements
    else if (/(^|\s)(เกี่ยว(อะไร|ไร)|หมายถึง|ยังไง|ห้ะ|อะไรนะ|ไม่เข้าใจ|งง|ทำไมถึงคิด|ไม่เห็นเกี่ยว|หมายความว่า|หมายถึงยังไง)($|\s|\?|!|อะ|วะ|นะ)/i.test(latestUserMsg)) {
      fallbackText = `เออ เมื่อกี้เราโยงไกลไปหน่อย 😅

ถ้าดึงกลับมาที่เรื่องจริงตรงหน้า ตอนนี้อะไรคือสิ่งที่กวนใจเธอที่สุด?`;
    }
    // Money / survival concerns
    else if (/ไม่มีเงิน|ไม่มีแดก|ไม่มีตัง|อดตาย|จน|เงินไม่พอ/i.test(latestUserMsg)) {
      fallbackText = `จริง ถ้างานคือเงิน เราก็ไม่ได้มีอิสระจะพูดว่าไม่เสมอไป

ถ้ายังต้องรักษางานนี้ไว้ มีงานชิ้นไหนที่พอจะคุยขอเลื่อนกำหนดส่งได้บ้างไหม?`;
    }
    // Fear of being fired
    else if (/โดนไล่ออก|ตกงาน/i.test(latestUserMsg)) {
      fallbackText = `เข้าใจเลย ความกังวลเรื่องตกงานมันทำให้เราไม่กล้าปฏิเสธตรงๆ

ถ้าไม่พูดว่า "ไม่ทำ" แต่ให้หัวหน้าช่วยเลือกแทนว่าอยากให้เน้นงานไหนก่อน เธอคิดว่าพอจะคุยได้ไหม?`;
    }
    // TikTok / scrolling reaction (Ask Before Interpreting)
    else if (/tiktok|มือถือ|ไถ|เล่นเกม|ดูคลิป|ดูยูทูป/i.test(latestUserMsg) && turnCount <= 3) {
      fallbackText = `ตอนที่ไถ TikTok อยู่ ใกล้กับข้อไหนมากกว่า?

- แค่อยากไม่คิดเรื่องนี้
- แอบหวังว่าเขาจะมาสนใจ
- ไม่ได้คิดอะไร ทำไปเฉยๆ
- อื่นๆ`;
    }
    // Dynamic progressive conversational context (One turn = One step, Reflect before asking in spoken Thai)
    else if (turnCount === 1) {
      fallbackText = `ฟังแล้วน้อยใจนะ เหมือนเราอยากให้เขาสนใจเราบ้าง

เวลาเขาเล่นเกมแล้วไม่สนใจ ปกติเธอทำอะไร?`;
    } else if (turnCount === 2) {
      fallbackText = `เหมือนพอเจอแบบนั้น เธอก็เลือกถอยออกมาก่อน

ตอนนั้นในใจลึกๆ มันหวังให้เขาทำอะไรมากที่สุด?`;
    } else {
      fallbackText = `พอได้คุยแบบนี้แล้ว ความรู้สึกข้างในเริ่มชัดขึ้นบ้างไหม หรือยังมีเรื่องไหนที่ยังติดอยู่ในใจอีก?`;
    }

    // Anti-repetition check against previous assistant messages
    if (previousAssistantTexts.some((prev) => prev.includes(fallbackText.slice(0, 30)))) {
      fallbackText = `เราอยู่ตรงนี้และพร้อมฟังนะ ถ้าอยากเล่าอะไรต่อ พิมพ์มาได้เลย`;
    }

    console.log(`[RESPONSE GENERATED - SOURCE: FALLBACK]:\n${fallbackText}\n`);

    // Stream fallback tokens smoothly
    let currentIdx = 0;
    const chunkSize = 4;
    const interval = setInterval(() => {
      if (currentIdx < fallbackText.length) {
        const nextSlice = fallbackText.slice(currentIdx, currentIdx + chunkSize);
        onChunk(nextSlice);
        currentIdx += chunkSize;
      } else {
        clearInterval(interval);
        onDone(fallbackText, 'fallback');
      }
    }, 15);
  } catch (err) {
    onError(err instanceof Error ? err : new Error(String(err)));
  }
}
