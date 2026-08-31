const { GoogleGenAI } = require('@google/genai');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function testGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log('Testing with API Key present:', Boolean(apiKey));

  const models = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-3.6-flash'];
  for (const m of models) {
    try {
      console.log(`Testing model: ${m}...`);
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: m,
        contents: 'ตอบกลับว่า "สวัสดี สติมาแล้ว" เป็นภาษาไทยสั้นๆ',
      });
      console.log(`✓ Model ${m} succeeded:`, response.text?.trim());
      return m;
    } catch (err) {
      console.log(`✗ Model ${m} error:`, err.message?.slice(0, 150));
    }
  }
}

testGemini().catch(console.error);
