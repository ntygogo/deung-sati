async function testTwoMessagesLive() {
  console.log('Testing 2-message conversation against live dev server API: http://localhost:5173/api/chat/stream ...');

  const sessionId = `live-session-${Date.now()}`;

  // Message 1
  console.log('\n--- Turn 1 ---');
  const user1 = 'เขาอ่านแล้วไม่ตอบอีกแล้ว กูหงุดหงิดมาก';
  console.log(`User 1: "${user1}"`);

  const res1 = await fetch('http://localhost:5173/api/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: user1 }],
      sessionId,
    }),
  });

  const text1 = await res1.text();
  let aiResponse1 = '';
  let turn1Data = null;
  let source1 = '';

  for (const line of text1.split('\n')) {
    if (line.startsWith('data: ')) {
      try {
        const d = JSON.parse(line.slice(6));
        if (d.fullText) aiResponse1 = d.fullText;
        if (d.structuredTurn) turn1Data = d.structuredTurn;
        if (d.source) source1 = d.source;
      } catch {}
    }
  }

  console.log(`HTTP Status 1: ${res1.status}`);
  console.log(`Provider 1: ${source1}`);
  console.log(`AI Assistant 1: "${aiResponse1 || turn1Data?.assistant_message}"`);
  console.log(`Mode: ${turn1Data?.mode}, Capacity: ${turn1Data?.capacity}, Intent: ${turn1Data?.user_intent}`);

  // Message 2
  console.log('\n--- Turn 2 (with conversation history) ---');
  const user2 = 'กูควรทำยังไงดี';
  console.log(`User 2: "${user2}"`);

  const history = [
    { role: 'user', content: user1 },
    { role: 'assistant', content: aiResponse1 || turn1Data?.assistant_message },
    { role: 'user', content: user2 },
  ];

  const res2 = await fetch('http://localhost:5173/api/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: history,
      sessionId,
    }),
  });

  const text2 = await res2.text();
  let aiResponse2 = '';
  let turn2Data = null;
  let source2 = '';

  for (const line of text2.split('\n')) {
    if (line.startsWith('data: ')) {
      try {
        const d = JSON.parse(line.slice(6));
        if (d.fullText) aiResponse2 = d.fullText;
        if (d.structuredTurn) turn2Data = d.structuredTurn;
        if (d.source) source2 = d.source;
      } catch {}
    }
  }

  console.log(`HTTP Status 2: ${res2.status}`);
  console.log(`Provider 2: ${source2}`);
  console.log(`AI Assistant 2 (Contextual response): "${aiResponse2 || turn2Data?.assistant_message}"`);
  console.log(`Mode: ${turn2Data?.mode}, Exercise: ${turn2Data?.recommended_exercise?.id || 'none'}`);
}

testTwoMessagesLive().catch(console.error);
