const { GoogleGenAI } = require('@google/genai');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function diagnose() {
  console.log('==================================================');
  console.log('BACKEND & GEMINI DIRECT DIAGNOSTIC REPORT');
  console.log('==================================================');

  // 1. Env check
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
  const model = process.env.AI_MODEL || 'gemini-3.6-flash';
  console.log('1. Server-side API key detected:', Boolean(apiKey));
  console.log('   Key format preview:', apiKey ? `${apiKey.slice(0, 8)}...${apiKey.slice(-6)} (length: ${apiKey.length})` : 'EMPTY');
  console.log('   Configured AI Model:', model);

  // 2. Direct Gemini SDK call test
  console.log('\n2. Testing Direct @google/genai Call with message: "สวัสดี ทดสอบระบบ"...');
  try {
    const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
    const res = await ai.models.generateContent({
      model: model,
      contents: 'สวัสดี ทดสอบระบบ',
    });
    console.log('✓ Gemini API direct call succeeded!');
    console.log('Response text:', res.text);
  } catch (err) {
    console.log('✗ Gemini API direct call failed with error:');
    console.log('   Status Code:', err.status || err.statusCode || err.code);
    console.log('   Error Message:', err.message);
    if (err.errorDetails) console.log('   Details:', err.errorDetails);
  }

  // 3. HTTP Request to localhost:5173/api/chat/stream
  console.log('\n3. Testing Local Dev Server endpoint: POST http://localhost:5173/api/chat/stream ...');
  try {
    const res = await fetch('http://localhost:5173/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'สวัสดี ทดสอบระบบ' }],
        sessionId: `diag-${Date.now()}`,
      }),
    });

    console.log('   HTTP Status:', res.status, res.statusText);
    console.log('   Content-Type:', res.headers.get('content-type'));

    const rawBody = await res.text();
    console.log('   Response Body (first 500 chars):\n', rawBody.slice(0, 500));
  } catch (err) {
    console.log('✗ Fetch to http://localhost:5173/api/chat/stream failed:', err.message);
  }
}

diagnose().catch(console.error);
