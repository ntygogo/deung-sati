const { GoogleGenAI } = require('@google/genai');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function testSafe() {
  const apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
  console.log('isKeyPresent:', Boolean(apiKey));
  const model = process.env.AI_MODEL || 'gemini-3.6-flash';
  console.log('Gemini model configured:', model);

  try {
    const ai = new GoogleGenAI({ apiKey });
    const res = await ai.models.generateContent({
      model: model,
      contents: 'สวัสดี ทดสอบระบบ ตอบกลับสั้นๆ 1 ประโยค',
    });
    console.log('Gemini Direct Call: SUCCESS');
    console.log('Real Gemini Response Text:', res.text?.trim());
  } catch (err) {
    console.log('Gemini Direct Call: FAILED');
    console.log('Status Code:', err.status || err.statusCode || err.code);
    console.log('Error Message (masked):', (err.message || '').replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_API_KEY]').slice(0, 200));
  }
}

testSafe().catch(console.error);
