/**
 * Test live multi-turn conversation: "เบื่อ" -> "ไม่รู้จะทำยังไงอะ"
 */
async function testBoredomScenario() {
  const sessionId = `test-boredom-${Date.now()}`;
  console.log(`======================================================`);
  console.log(`TESTING LIVE SCENARIO: "เบื่อ" -> "ไม่รู้จะทำยังไงอะ"`);
  console.log(`Session ID: ${sessionId}`);
  console.log(`======================================================\n`);

  const messages = [
    { role: 'assistant', content: 'สวัสดีครับ... มีอะไรเกิดขึ้นกับคุณตอนนี้ เล่าให้ฟังได้นะ ไม่ต้องรีบเรียบเรียง' }
  ];

  // TURN 1: User says "เบื่อ"
  messages.push({ role: 'user', content: 'เบื่อ' });
  console.log(`[TURN 1] History sent (${messages.length} messages):`);
  messages.forEach((m, i) => console.log(`  [${i + 1}] ${m.role.toUpperCase()}: "${m.content}"`));

  const res1 = await fetch('http://localhost:5173/api/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, messages })
  });

  const text1 = await res1.text();
  let reply1 = '';
  let source1 = '';
  for (const line of text1.split('\n')) {
    if (line.startsWith('data: ')) {
      try {
        const d = JSON.parse(line.slice(6));
        if (d.fullText) reply1 = d.fullText;
        if (d.source) source1 = d.source;
      } catch (e) {}
    }
  }

  console.log(`\n[TURN 1 RESPONSE (Source: ${source1})]:\n${reply1}\n`);
  messages.push({ role: 'assistant', content: reply1 });

  // TURN 2: User says "ไม่รู้จะทำยังไงอะ"
  messages.push({ role: 'user', content: 'ไม่รู้จะทำยังไงอะ' });
  console.log(`------------------------------------------------------`);
  console.log(`[TURN 2] History sent (${messages.length} messages):`);
  messages.forEach((m, i) => console.log(`  [${i + 1}] ${m.role.toUpperCase()}: "${m.content}"`));

  const res2 = await fetch('http://localhost:5173/api/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, messages })
  });

  const text2 = await res2.text();
  let reply2 = '';
  let source2 = '';
  for (const line of text2.split('\n')) {
    if (line.startsWith('data: ')) {
      try {
        const d = JSON.parse(line.slice(6));
        if (d.fullText) reply2 = d.fullText;
        if (d.source) source2 = d.source;
      } catch (e) {}
    }
  }

  console.log(`\n[TURN 2 RESPONSE (Source: ${source2})]:\n${reply2}\n`);

  // Verification checks
  const isRepeated = reply1.trim() === reply2.trim() || reply2.includes(reply1.slice(0, 30));
  console.log(`======================================================`);
  console.log(`VERIFICATION RESULT:`);
  console.log(`- Turn 1 and Turn 2 distinct? ${!isRepeated ? 'YES (PASS)' : 'NO (REPEATED)'}`);
  console.log(`- Turn 2 addressed stuck state? ${reply2.includes('ตื้อ') || reply2.includes('พัก') ? 'YES (PASS)' : 'NO'}`);
  console.log(`======================================================\n`);
}

testBoredomScenario();
