import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const models = ['gemini-3.7-flash', 'gemini-3.5-flash', 'gemini-3-flash-preview', 'gemini-flash-latest'];

async function testAll() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY.trim() });
  for (const m of models) {
    try {
      const res = await ai.models.generateContent({ model: m, contents: 'สวัสดี' });
      console.log(`[${m}] -> OK: "${res.text?.trim()?.slice(0, 30)}"`);
    } catch (e) {
      console.log(`[${m}] -> FAILED: ${e.message?.slice(0, 60)}`);
    }
  }
}

testAll();
