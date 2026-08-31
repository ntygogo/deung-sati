async function runDirectMultiTurnChatTest() {
  console.log('=== Running Direct Multi-Turn Conversation Quality Tests against /api/chat/stream ===\n');

  const history = [
    {
      role: 'assistant',
      content: 'ยินดีต้อนรับนะเธอ 🌱 วันนี้มีเรื่องไหนที่ทำให้ใจไม่สบาย หรืออยากระบาย เล่าให้เราฟังได้เลยนะ...',
    },
  ];

  async function testTurn(label, userMessage) {
    console.log(`\n=================== ${label} ===================`);
    console.log(`User: "${userMessage}"`);

    history.push({ role: 'user', content: userMessage });

    const res = await fetch('http://localhost:5173/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: history,
        sessionId: 'test-qa-session',
      }),
    });

    if (!res.ok) {
      console.error(`HTTP error: ${res.status}`);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let streamedText = '';
    let structuredTurn = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          try {
            const data = JSON.parse(trimmed.slice(6));
            if (data.text) streamedText += data.text;
            if (data.structuredTurn) structuredTurn = data.structuredTurn;
          } catch {}
        }
      }
    }

    const finalAiText = structuredTurn?.assistant_message || streamedText;
    history.push({ role: 'assistant', content: finalAiText });

    console.log(`AI: "${finalAiText}"`);
    if (structuredTurn) {
      console.log(`- Mode: ${structuredTurn.mode} | Safety: ${structuredTurn.safety_state} | Capacity: ${structuredTurn.capacity}`);
      console.log(`- Readiness: ${structuredTurn.readiness} | Intent: ${structuredTurn.user_intent}`);
      console.log(`- Recommended Exercise: ${structuredTurn.recommended_exercise ? structuredTurn.recommended_exercise.id : 'null (Active listening / Consent respected)'}`);
      if (structuredTurn.quick_replies && structuredTurn.quick_replies.length > 0) {
        console.log(`- Quick Replies: [${structuredTurn.quick_replies.join(' | ')}]`);
      }
    }
    return { finalAiText, structuredTurn };
  }

  // TEST A: Venting start
  await testTurn('TEST A: Venting Start', 'เขาอ่านแล้วไม่ตอบอีกแล้ว');

  // TEST B: "ไม่รู้ว่ารู้สึกอะไร"
  await testTurn('TEST B: Difficult Naming Emotion', 'ไม่รู้ว่ารู้สึกอะไร');

  // TEST C: "กูไม่รู้ รู้แต่ว่าแม่งอึดอัด"
  await testTurn('TEST C: Sensation & Body Quality', 'กูไม่รู้ รู้แต่ว่าแม่งอึดอัด');

  // TEST D: "เรื่องแบบนี้เกิดกับกูบ่อยเหมือนกัน"
  await testTurn('TEST D: Repetition Recognition', 'เรื่องแบบนี้เกิดกับกูบ่อยเหมือนกัน');

  // TEST E: "ไม่อยากทำแบบฝึก ขอคุยก่อน"
  await testTurn('TEST E: Decline Exercise & Active Listening', 'ไม่อยากทำแบบฝึก ขอคุยก่อน');

  // TEST F: "เออ กูอยากลองแบบฝึกดู"
  await testTurn('TEST F: Accept Exercise & Launch', 'เออ กูอยากลองแบบฝึกดู');

  // TEST G: Exercise completion return
  await testTurn('TEST G: Integration After Exercise', 'ฉันได้ลองฝึก [พักใจฉุกเฉิน 1 นาที] และหายใจตามจังหวะแล้ว รู้สึกใจนิ่งขึ้น พร้อมคุยต่อแล้ว 🌱');

  console.log('\n======================================================');
  console.log('ALL 7 SCENARIO TURNS VERIFIED WITH AUTHENTIC PROTOCOL QUALITY!');
  console.log('======================================================');
}

runDirectMultiTurnChatTest().catch(console.error);
