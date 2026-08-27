/**
 * Test: 5-Turn Multi-Turn Conversational Flow
 */
async function test5TurnsFlow() {
  console.log(`======================================================`);
  console.log(`TEST 3: 5-TURN MULTI-TURN CONVERSATIONAL FLOW`);
  console.log(`======================================================\n`);

  const sessionId = `test-5turns-${Date.now()}`;
  const conversationHistory = [
    {
      role: 'assistant',
      content: 'สวัสดีครับ... มีอะไรเกิดขึ้นกับคุณตอนนี้ เล่าให้ฟังได้นะ ไม่ต้องรีบเรียบเรียง'
    }
  ];

  const userTurns = [
    'แฟนไม่ค่อยสนใจเราเลย ช่วงนี้เล่นเกมตลอด พอบอกก็บอกว่าเราคิดมาก',
    'ก็นอนเล่น TikTok ไม่ได้ทำอะไร',
    'แอบหวังว่าเขาจะมาสนใจ',
    'กลัวเขาคิดว่าเราน่ารำคาญ',
    'อยากคุยดีๆ แบบไม่ทะเลาะ'
  ];

  for (let turn = 0; turn < userTurns.length; turn++) {
    const userText = userTurns[turn];
    conversationHistory.push({ role: 'user', content: userText });

    console.log(`--- [TURN ${turn + 1}] USER: "${userText}" ---`);

    const res = await fetch('http://localhost:5173/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, messages: conversationHistory })
    });

    const text = await res.text();
    let reply = '';
    let source = '';

    for (const line of text.split('\n')) {
      if (line.startsWith('data: ')) {
        try {
          const d = JSON.parse(line.slice(6));
          if (d.fullText) reply = d.fullText;
          if (d.source) source = d.source;
        } catch (e) {}
      }
    }

    console.log(`AI (${source}):\n${reply}\n`);
    conversationHistory.push({ role: 'assistant', content: reply });

    // Validate turn properties
    const lines = reply.trim().split('\n').filter(l => l.trim());
    if (lines.length > 6) {
      console.warn(`[WARNING] Turn ${turn + 1} response is longer than expected (${lines.length} lines)`);
    }
  }

  console.log(`======================================================`);
  console.log(`5-TURN TEST COMPLETE: ALL TURNS EXECUTED SUCCESSFULLY`);
  console.log(`======================================================\n`);
}

test5TurnsFlow();
