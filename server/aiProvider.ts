import { config } from './config.ts';
import { DUENG_SATI_MASTER_PROMPT } from './prompts/duengSatiMasterPrompt.ts';
import type { SafetyClassification } from './safetyClassifier.ts';
import { GoogleGenAI } from '@google/genai';
import { isCrisisMessage } from '../src/shared/chat-protocol/index.ts';
import { generateDynamicCBTResponse } from '../src/utils/aiClientEngine.ts';
import type {
  ChatMessage,
  EmotionalCheckinData,
  CbtConversationStage,
} from '../src/shared/chat-protocol/index.ts';

export interface StreamChatParams {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  safety: SafetyClassification;
  sessionState?: {
    cbtStage?: CbtConversationStage;
    checkinState?: EmotionalCheckinData;
  };
  onChunk: (text: string) => void;
  onDone: (
    fullText: string,
    source: 'gemini' | 'fallback',
    options?: string[],
    checkinData?: EmotionalCheckinData,
    exerciseCard?: any
  ) => void;
  onError: (err: Error) => void;
}

/**
 * Primary Conversational Brain: External Gemini Multi-Turn Streaming
 * with Seamless Shared Protocol Fallback
 */
export async function streamChatResponse({
  messages,
  safety,
  sessionState,
  onChunk,
  onDone,
  onError,
}: StreamChatParams) {
  const apiKey = config.geminiApiKey;
  const isKeyPresent = Boolean(apiKey);
  const primaryModel = config.aiModel || 'gemini-3.6-flash';

  const userMessages = messages.filter((m) => m.role === 'user');
  const latestUserMsg = userMessages[userMessages.length - 1]?.content || '';

  // 0. Priority 0: Crisis Safety Gate
  if (isCrisisMessage(latestUserMsg) || safety.mode === 'protect') {
    const crisisText = `ความปลอดภัยและความรู้สึกของเธอสำคัญที่สุดในตอนนี้เลยนะ...\nขอให้เธอหยุดพัก หายใจเข้าลึกๆ ช้าๆ ก่อน\n\nหากรู้สึกว่าอารมณ์ท่วมท้นจนรับไม่ไหว ขอให้โทรหาสายด่วนฟรี 1323 (กรมสุขภาพจิต 24 ชม.) หรือโทร 02-107-7977 (สะมาริตันส์) หรือ 1669 / 191 เพื่อให้มีคนรับฟังและดูแลความปลอดภัยของเธอทันทีนะ 🌿`;
    let currentIdx = 0;
    const interval = setInterval(() => {
      if (currentIdx < crisisText.length) {
        onChunk(crisisText.slice(currentIdx, currentIdx + 4));
        currentIdx += 4;
      } else {
        clearInterval(interval);
        onDone(crisisText, 'fallback');
      }
    }, 12);
    return;
  }

  // 1. Attempt Gemini Streaming if API key is present
  if (isKeyPresent) {
    const modelCandidates = [
      primaryModel,
      'gemini-3.6-flash',
      'gemini-2.5-flash',
      'gemini-1.5-flash',
    ];
    const uniqueCandidates = Array.from(new Set(modelCandidates));

    for (const modelCandidate of uniqueCandidates) {
      try {
        const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
        const validMessages = messages.filter((m) => m.content && m.content.trim());
        const firstUserIdx = validMessages.findIndex((m) => m.role === 'user');
        const sliced = firstUserIdx >= 0 ? validMessages.slice(firstUserIdx) : validMessages;

        const contents = sliced.map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }));

        const stream = await ai.models.generateContentStream({
          model: modelCandidate,
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
            onChunk(textChunk);
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
  }

  // 2. Shared Protocol Deterministic Fallback Generator
  try {
    const chatHistory: ChatMessage[] = messages.map((m, idx) => ({
      id: `msg-${idx}`,
      role: m.role === 'user' ? 'user' : 'ai',
      text: m.content,
    }));

    const checkinState = sessionState?.checkinState || { step: 'idle' };
    const cbtStage = sessionState?.cbtStage || 1;

    const dynamicRes = generateDynamicCBTResponse(chatHistory, checkinState, cbtStage);
    const fallbackText = dynamicRes.text;

    console.log(`[RESPONSE GENERATED - SOURCE: FALLBACK]:\n${fallbackText}\n`);

    let currentIdx = 0;
    const chunkSize = 4;
    const interval = setInterval(() => {
      if (currentIdx < fallbackText.length) {
        onChunk(fallbackText.slice(currentIdx, currentIdx + chunkSize));
        currentIdx += chunkSize;
      } else {
        clearInterval(interval);
        onDone(
          fallbackText,
          'fallback',
          dynamicRes.options,
          dynamicRes.checkinData,
          dynamicRes.exerciseCard
        );
      }
    }, 12);
  } catch (err) {
    onError(err instanceof Error ? err : new Error(String(err)));
  }
}
