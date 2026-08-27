import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || '';
console.log('Testing with API key:', apiKey ? `${apiKey.substring(0, 6)}...` : 'NONE');

const ai = new GoogleGenAI({ apiKey: apiKey.trim() });

async function test() {
  const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.5-pro'];
  for (const m of models) {
    try {
      console.log(`Trying ${m}...`);
      const response = await ai.models.generateContent({
        model: m,
        contents: 'สวัสดี ตอบสั้นๆ 1 ประโยค',
      });
      console.log(`SUCCESS with ${m}:`, response.text);
      break;
    } catch (e: any) {
      console.log(`Failed ${m}:`, e?.message || e);
    }
  }
}

test();
