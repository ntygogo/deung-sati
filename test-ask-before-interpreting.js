/**
 * Test: Ask Before Interpreting (No Premature Over-Interpretation)
 */
async function testAskBeforeInterpreting() {
  console.log(`======================================================`);
  console.log(`TEST 2: ASK BEFORE INTERPRETING (TIKTOK SCENARIO)`);
  console.log(`======================================================\n`);

  const sessionId = `test-ask-before-${Date.now()}`;
  const messages = [
    {
      role: 'assistant',
      content: 'สวัสดีครับ... มีอะไรเกิดขึ้นกับคุณตอนนี้ เล่าให้ฟังได้นะ ไม่ต้องรีบเรียบเรียง'
    },
    {
      role: 'user',
      content: 'แฟนไม่ค่อยสนใจเราเลย ช่วงนี้เล่นเกมตลอด พอบอกก็บอกว่าเราคิดมาก'
    },
    {
      role: 'assistant',
      content: 'ฟังแล้วน้อยใจนะ เหมือนเราอยากให้เขาสนใจเราบ้าง\n\nเวลาเขาเล่นเกมแล้วไม่สนใจ ปกติเธอทำอะไร?'
    },
    {
      role: 'user',
      content: 'ก็นอนเล่น TikTok ไม่ได้ทำอะไร'
    }
  ];

  const res = await fetch('http://localhost:5173/api/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, messages })
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

  console.log(`[RESPONSE (Source: ${source})]:\n${reply}\n`);

  const hasPrematureLabel = /หลีกหนี|โลกของตัวเอง|กลไก|ปกป้องตัวเอง|coping mechanism/i.test(reply);
  const hasQuestionOrChoices = reply.includes('?') || reply.includes('-') || reply.includes('ข้อไหน') || reply.includes('รู้สึก');

  console.log(`- Premature Psychological Labeling: ${!hasPrematureLabel ? 'NO (PASS)' : 'YES (FAILED)'}`);
  console.log(`- Asks / Offers Choices to Confirm Meaning: ${hasQuestionOrChoices ? 'YES (PASS)' : 'NO'}`);

  if (hasPrematureLabel) {
    console.error('FAILED: Model prematurely interpreted behavior without asking user first');
    process.exit(1);
  }
}

testAskBeforeInterpreting();
