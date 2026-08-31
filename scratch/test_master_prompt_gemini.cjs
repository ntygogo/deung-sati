const { GoogleGenAI } = require('@google/genai');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const DUENG_SATI_MASTER_PROMPT = `คุณคือ "ดึงสติ" (Deung Sati) ผู้ช่วยฝึกการรู้เท่าทันความคิด อารมณ์ และการหยุดก่อนตอบสนอง
ตอบกลับเป็น JSON object ตามโครงสร้างนี้:
{
  "assistant_message": "ข้อความภาษาไทยสั้นๆ อบอุ่น นุ่มนวล",
  "safety_state": "normal",
  "mode": "HOLD",
  "capacity": "medium",
  "user_intent": "vent",
  "readiness": "story",
  "recommended_exercise": null,
  "quick_replies": ["คุยต่อ", "พักสักครู่"]
}`;

async function testPrompt() {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  console.log('isKeyPresent:', Boolean(apiKey));

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: 'gemini-3.6-flash',
    contents: [{ role: 'user', parts: [{ text: 'สวัสดี ทดสอบระบบ' }] }],
    config: {
      systemInstruction: DUENG_SATI_MASTER_PROMPT,
      temperature: 0.7,
      maxOutputTokens: 1000,
      responseMimeType: 'application/json',
    },
  });

  console.log('✓ Gemini 3.6 Flash Structured Output Result:');
  console.log(response.text);
}

testPrompt().catch((err) => {
  console.error('Error (masked):', (err.message || '').replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_KEY]'));
});
