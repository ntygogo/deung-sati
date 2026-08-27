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
      'gemini-3.6-flash',
      'gemini-3.7-flash',
      'gemini-flash-latest',
      primaryModel,
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
    const latestUserMsg = userMessages[userMessages.length - 1]?.content || '';
    const turnCount = userMessages.length;

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
      fallbackText = `ตอนที่หยิบมือถือมาไถดูคลิป ตอนนั้นในใจแค่รู้สึกเบื่ออยากพักสมอง หรือแอบอยากหนีจากเรื่องที่กวนใจอยู่เหรอ?`;
    }
    // Dynamic Context-Aware Semantic CBT Generator
    const hasRelationship = /แฟน|คนรัก|คนคุย|เขา|เธอ|สามี|ภรรยา/i.test(latestUserMsg);
    const hasWork = /งาน|หัวหน้า|เจ้านาย|เพื่อนร่วมงาน|ลูกค้า|บริษัท|ประชุม|ลาออก/i.test(latestUserMsg);
    const hasFamily = /แม่|พ่อ|ครอบครัว|พี่|น้อง|ญาติ/i.test(latestUserMsg);
    const hasFriends = /เพื่อน|กลุ่ม|แก๊ง|เพื่อนสนิท/i.test(latestUserMsg);

    const hasAnger = /โกรธ|โมโห|หงุดหงิด|เกลียด|ประสาทเสีย|หัวร้อน|ด่า/i.test(latestUserMsg);
    const hasSadness = /น้อยใจ|เสียใจ|ร้องไห้|นอยด์|โดดเดี่ยว|เจ็บ|ไม่สวย|อ้วน|ขี้เหร่/i.test(latestUserMsg);
    const hasExhaustion = /เหนื่อย|ล้า|หมดไฟ|ท้อ|เบื่อ|เซ็ง|หมดแรง/i.test(latestUserMsg);
    const hasAnxiety = /กังวล|กลัว|เครียด|แพนิก|ไม่มั่นใจ|ล่ก|ฟุ้งซ่าน/i.test(latestUserMsg);

    const cleanSnippet = latestUserMsg.length > 30 ? `${latestUserMsg.slice(0, 30)}...` : latestUserMsg;

    if (turnCount === 1) {
      if (hasFriends && (hasSadness || hasAnger)) {
        fallbackText = `ฟังดูเจ็บและกระทบความรู้สึกมากเลยนะ... คำพูดจากเพื่อนหรือคนรอบข้างบางทีก็สร้างแผลในใจเราได้ลึกจริงๆ\n\nตอนที่ได้ยินคำนั้น วินาทีแรกในใจคุณรู้สึกยังไงบ้าง? (เช่น โกรธ, เสียใจ, หรือรู้สึกไม่มั่นใจในตัวเอง)`;
      } else if (hasRelationship && hasSadness) {
        fallbackText = `ฟังแล้วสัมผัสได้ถึงความน้อยใจเลยนะ... เวลาคนที่เราแคร์ทำตัวนิ่งใส่หรือไม่เป็นอย่างที่หวัง มันเจ็บข้างในมากจริงๆ\n\nตอนที่เกิดเรื่องนั้นขึ้น ในใจลึกๆ คุณอยากให้เขาทำหรือพูดอะไรกับคุณมากที่สุด?`;
      } else if (hasWork && (hasExhaustion || hasAnger)) {
        fallbackText = `เรื่องงานเวลามีเรื่องให้ปวดหัว มันดูดพลังชีวิตเราไปหมดเลยเนอะ...\n\nอะไรคือสิ่งที่ทำให้คุณรู้สึกเหนื่อยหรือหงุดหงิดกับเรื่องนี้มากที่สุดในตอนนี้?`;
      } else if (hasFamily) {
        fallbackText = `เรื่องในครอบครัวมักเป็นเรื่องที่ละเอียดอ่อนและกระทบใจเราได้ลึกที่สุดเนอะ...\n\nอะไรคือสิ่งที่ทำให้คุณรู้สึกอึดอัดใจกับเรื่องนี้มากที่สุด?`;
      } else if (hasAnxiety) {
        fallbackText = `ความกังวลใจมันทำให้ข้างในรู้สึกกระวนกระวายและคิดวนไม่หยุดเลยเนอะ...\n\nอะไรคือสิ่งเลวร้ายที่สุดที่คุณกำลังกลัวว่าจะเกิดขึ้นจากเรื่องนี้?`;
      } else if (hasExhaustion) {
        fallbackText = `เหมือนตอนนี้พลังงานข้างในมันล้าจนไม่อยากแบกอะไรแล้วเนอะ...\n\nความรู้สึกเหนื่อยนี้มันสะสมมาจากเรื่องไหนเป็นพิเศษไหม?`;
      } else {
        fallbackText = `รับฟังอยู่นะครับ... เรื่อง "${cleanSnippet}" คงกวนใจคุณมาสักพักแล้วใช่ไหม\n\nตอนที่เรื่องนี้เกิดขึ้น ความรู้สึกแรกที่แวบขึ้นมาในใจคืออะไร?`;
      }
    } else if (turnCount === 2) {
      fallbackText = `เข้าใจเลยครับ พอความรู้สึกนั้นเกิดขึ้น สมองเรามักจะเริ่มสร้าง "เรื่องเล่าในหัว" ต่อทันที\n\nตอนนั้นคุณกำลังบอกตัวเองว่ายังไงอยู่บ้าง? (เช่น "ฉันคงไม่ดีพอ", "เขาไม่แคร์ฉัน", หรือ "ทำไมต้องเป็นแบบนี้")`;
    } else if (turnCount === 3) {
      fallbackText = `สิ่งที่น่าสนใจคือ... ความคิดนั้นมันมักจะพาให้เราเผลอตอบสนองด้วยความเคยชินเดิมๆ (เช่น เงียบ, ประชด, หรือเก็บมากดดันตัวเอง)\n\nเวลาเจอเรื่องแบบนี้ ปกติแล้วคุณมักจะทำยังไงต่อ แล้วผลที่ตามมามันช่วยให้สบายใจขึ้นจริงไหม?`;
    } else if (turnCount === 4) {
      fallbackText = `ถ้าเราลองมองดูตัวเองจากมุมมองของเพื่อนที่มีสติ และรักตัวเอง...\n\nคุณคิดว่ามีทางเลือกอื่นที่เราทำได้ โดยไม่ต้องรับเอาคำตัดสินของคนอื่นมาทำร้ายใจตัวเองไหม?`;
    } else {
      fallbackText = `พอได้ลองมองย้อนดูแบบนี้ ความรู้สึกข้างในเริ่มเบาลงบ้างไหม หรือยังมีจุดไหนที่ยังติดค้างในใจอีก เล่าต่อได้เลยนะ`;
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
