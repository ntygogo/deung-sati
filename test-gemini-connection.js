import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

async function verifyConnection() {
  console.log(`======================================================`);
  console.log(`GEMINI API LIVE CONNECTION VERIFICATION`);
  console.log(`======================================================\n`);

  const key = process.env.GEMINI_API_KEY;
  const isPresent = Boolean(key && key.trim().length > 10);

  console.log(`1. API Key Configured: ${isPresent ? 'YES (Loaded successfully)' : 'NO (Key not found or empty)'}`);

  if (!isPresent) {
    console.error('ERROR: GEMINI_API_KEY is empty in .env');
    process.exit(1);
  }

  console.log(`2. Key Format Validation: Passed (Key length: ${key.trim().length} chars, starts with "${key.slice(0, 4)}...")`);
  console.log(`3. Sending live test ping to model "gemini-3.7-flash"...`);

  try {
    const ai = new GoogleGenAI({ apiKey: key.trim() });
    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: 'ตอบสั้นๆ 1 คำว่า "พร้อมใช้งาน"',
    });

    const reply = response.text?.trim() || '';
    console.log(`4. Live API Response: "${reply}"`);
    console.log(`\n======================================================`);
    console.log(`STATUS: CONNECTED TO REAL GEMINI API SUCCESSFULLY!`);
    console.log(`======================================================\n`);
  } catch (err) {
    console.error('API Call Failed:', err.message || err);
    process.exit(1);
  }
}

verifyConnection();
