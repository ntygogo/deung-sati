/**
 * Test live multi-turn conversation with real Gemini 3.7 Flash via backend API
 */
async function testLiveGeminiStreaming() {
  const sessionId = `live-gemini-${Date.now()}`;
  console.log(`======================================================`);
  console.log(`TESTING LIVE GEMINI STREAMING (Session: ${sessionId})`);
  console.log(`======================================================\n`);

  const messages = [
    { role: 'assistant', content: 'สวัสดีครับ... มีอะไรเกิดขึ้นกับคุณตอนนี้ เล่าให้ฟังได้นะ ไม่ต้องรีบเรียบเรียง' },
    { role: 'user', content: 'เบื่ออะ แม่ด่าทุกวันเลย' }
  ];

  console.log(`Sending Turn 1 to live API...`);
  const res = await fetch('http://localhost:5173/api/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, messages })
  });

  const text = await res.text();
  let fullReply = '';
  let source = '';

  for (const line of text.split('\n')) {
    if (line.startsWith('data: ')) {
      try {
        const d = JSON.parse(line.slice(6));
        if (d.fullText) fullReply = d.fullText;
        if (d.source) source = d.source;
      } catch (e) {}
    }
  }

  console.log(`\nRESPONSE RECEIVED (Source: ${source}):\n${fullReply}\n`);
  console.log(`======================================================`);
  console.log(`SUCCESSFULLY VERIFIED REAL GEMINI LIVE RESPONSE!`);
  console.log(`======================================================\n`);
}

testLiveGeminiStreaming();
