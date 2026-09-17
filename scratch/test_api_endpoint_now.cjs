async function testEndpoint() {
  console.log('Testing POST http://localhost:5173/api/chat/stream with "สวัสดี ทดสอบระบบ"...');

  try {
    const res = await fetch('http://localhost:5173/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'สวัสดี ทดสอบระบบ' }],
        sessionId: `test-${Date.now()}`,
      }),
    });

    console.log('HTTP Status:', res.status, res.statusText);
    console.log('Content-Type:', res.headers.get('content-type'));

    const text = await res.text();
    console.log('Raw Response Length:', text.length);

    const lines = text.split('\n');
    let fullAssistantMessage = '';
    let structuredTurn = null;
    let source = '';

    for (const l of lines) {
      if (l.startsWith('data: ')) {
        try {
          const parsed = JSON.parse(l.slice(6));
          if (parsed.fullText) fullAssistantMessage = parsed.fullText;
          if (parsed.structuredTurn) structuredTurn = parsed.structuredTurn;
          if (parsed.source) source = parsed.source;
        } catch {}
      }
    }

    console.log('\n--- Result Summary ---');
    console.log('Source Provider:', source);
    console.log('Assistant Message:\n', fullAssistantMessage || structuredTurn?.assistant_message || text.slice(0, 300));
    console.log('Structured Turn:', structuredTurn);
  } catch (err) {
    console.error('Fetch Error:', err.message);
  }
}

testEndpoint().catch(console.error);
