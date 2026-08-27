import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const modelsToTry = [
  'gemini-3.7-flash',
  'gemini-3.5-flash',
  'gemini-3-flash-preview',
  'gemini-flash-latest',
  'gemini-2.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-pro-latest',
  'gemini-2.5-pro'
];

async function findWorkingModel() {
  const key = process.env.GEMINI_API_KEY.trim();
  const ai = new GoogleGenAI({ apiKey: key });

  for (const model of modelsToTry) {
    process.stdout.write(`Testing model: ${model} ... `);
    try {
      const response = await ai.models.generateContent({
        model,
        contents: 'Hello',
      });
      const text = response.text?.trim() || '';
      console.log(`SUCCESS! -> Reply: "${text}"`);
      return model;
    } catch (err) {
      console.log(`FAILED (${err.message?.slice(0, 80)}...)`);
    }
  }
}

findWorkingModel().then(m => console.log('\nBEST WORKING MODEL:', m));
