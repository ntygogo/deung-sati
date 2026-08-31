import { config } from './config.ts';
import { GoogleGenAI } from '@google/genai';
import { DUENG_SATI_UNIFIED_MASTER_PROMPT } from '../src/shared/chat-protocol/masterPrompt.ts';

async function test() {
  const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
  const response = await ai.models.generateContent({
    model: 'gemini-3.5-flash',
    contents: [
      { role: 'user', parts: [{ text: 'ทะเลาะกับแฟนเรื่องงานบ้าน รู้สึกเหนื่อยใจมาก' }] }
    ],
    config: {
      systemInstruction: DUENG_SATI_UNIFIED_MASTER_PROMPT,
      temperature: 0.5,
      maxOutputTokens: 1000,
      responseMimeType: 'application/json',
    },
  });
  console.log('=== FULL RAW GEMINI 3.5 FLASH RESPONSE ===');
  console.log(response.text);
  const parsed = JSON.parse(response.text || '{}');
  console.log('Parsed assistantMessage:', parsed.assistantMessage || parsed.assistant_message);
  console.log('Parsed intent:', parsed.intent);
  console.log('Parsed mode:', parsed.mode);
}
test().catch(console.error);
