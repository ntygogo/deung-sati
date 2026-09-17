const { GoogleGenAI } = require('@google/genai');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function testModels() {
  const apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
  console.log('isKeyPresent:', Boolean(apiKey));

  const candidates = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-3.6-flash',
  ];

  for (const m of candidates) {
    try {
      console.log(`Testing model: ${m}...`);
      const ai = new GoogleGenAI({ apiKey });
      const res = await ai.models.generateContent({
        model: m,
        contents: 'สวัสดี ตอบกลับสั้นๆ 1 คำ',
      });
      console.log(`✓ Model ${m} SUCCESS:`, res.text?.trim());
    } catch (err) {
      console.log(`✗ Model ${m} failed:`, err.status || err.code, (err.message || '').slice(0, 100));
    }
  }
}

testModels().catch(console.error);
