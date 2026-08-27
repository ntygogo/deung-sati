/**
 * Test Conversational Repair, Grounding, and Anti-Repetition with various clarification phrases
 */
async function testClarifications() {
  const clarificationPhrases = [
    "เกี่ยวอะไรอะ",
    "หมายถึงยังไงนะ",
    "ห้ะ? งง",
    "แล้วมันเกี่ยวกันยังไง"
  ];

  for (const phrase of clarificationPhrases) {
    console.log(`\n======================================================`);
    console.log(`TESTING CLARIFICATION PHRASE: "${phrase}"`);
    console.log(`======================================================`);

    const sessionId = `test-clarify-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const messages = [
      { role: 'assistant', content: 'สวัสดีครับ เล่าให้ฟังได้นะ' },
      { role: 'user', content: 'ไม่ทำงานก็ไม่มีเงิน ไม่มีแดกอีก' }
    ];

    // Turn 1
    const res1 = await fetch('http://localhost:5173/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, messages })
    });
    const text1 = await res1.text();
    let reply1 = '';
    for (const line of text1.split('\n')) {
      if (line.startsWith('data: ')) {
        try {
          const d = JSON.parse(line.slice(6));
          if (d.fullText) reply1 = d.fullText;
        } catch (e) {}
      }
    }

    console.log(`[USER TURN 1]: "ไม่ทำงานก็ไม่มีเงิน ไม่มีแดกอีก"`);
    console.log(`[ASSISTANT TURN 1]:\n${reply1}\n`);
    messages.push({ role: 'assistant', content: reply1 });

    // Turn 2: User expresses confusion / asks what it has to do with anything
    messages.push({ role: 'user', content: phrase });

    const res2 = await fetch('http://localhost:5173/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, messages })
    });
    const text2 = await res2.text();
    let reply2 = '';
    for (const line of text2.split('\n')) {
      if (line.startsWith('data: ')) {
        try {
          const d = JSON.parse(line.slice(6));
          if (d.fullText) reply2 = d.fullText;
        } catch (e) {}
      }
    }

    console.log(`[USER TURN 2]: "${phrase}"`);
    console.log(`[ASSISTANT TURN 2]:\n${reply2}\n`);

    // Verify anti-repetition
    const isRepeated = reply1.trim() === reply2.trim() || reply2.includes(reply1.substring(0, 30));
    console.log(`>>> Did assistant repeat previous response? ${isRepeated ? 'FAIL (REPEATED)' : 'PASS (NO REPETITION)'}`);
  }
}

testClarifications();
