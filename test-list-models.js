import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

async function listModels() {
  const key = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey: key.trim() });
  try {
    const list = await ai.models.list();
    console.log('Available models:');
    for await (const m of list) {
      if (m.name.includes('gemini') || m.name.includes('flash')) {
        console.log(' -', m.name);
      }
    }
  } catch (err) {
    console.error('List models error:', err.message || err);
  }
}

listModels();
