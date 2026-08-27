/**
 * Multi-turn test for Conversation UX Rules
 */
async function testMultiTurnUX() {
  const sessionId = `test-ux-multi-${Date.now()}`;
  console.log(`======================================================`);
  console.log(`TESTING MULTI-TURN CONVERSATION UX RULES`);
  console.log(`======================================================\n`);

  const messages = [
    {
      role: 'assistant',
      content: 'สวัสดีครับ... มีอะไรเกิดขึ้นกับคุณตอนนี้ เล่าให้ฟังได้นะ ไม่ต้องรีบเรียบเรียง'
    },
    {
      role: 'user',
      content: 'เขาส่งข้อความมาบอกว่า "เราคงไปกันต่อไม่ได้แล้ว" หลังจากที่ไม่ได้คุยกันมา 3 วัน'
    },
    {
      role: 'assistant',
      content: 'จู่ๆ ก็ได้รับข้อความแบบนั้นหลังจากที่ไม่ได้คุยกันมาพักหนึ่ง คงเป็นจังหวะที่ใจตกวูบและตั้งตัวไม่ทันเลยนะ\n\nในวินาทีที่เห็นข้อความนั้น ความรู้สึกแรกที่แวบเข้ามาในใจเธอคืออะไรครับ?'
    },
    {
      role: 'user',
      content: 'ชาไปทั้งตัวเลย แล้วก็แอบคิดว่าเพราะเรางี่เง่าเมื่ออาทิตย์ก่อนแน่ๆ'
    }
  ];

  console.log(`Sending Turn 2...`);
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

  console.log(`\nRESPONSE TURN 2 (Source: ${source}):\n${reply}\n`);
  console.log(`======================================================`);
}

testMultiTurnUX();
