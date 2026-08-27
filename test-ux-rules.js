/**
 * Test Conversation UX Rules:
 * - 1 Turn = 1 Step
 * - 1 Question at a time
 * - Short (2-4 lines, 60-80 words)
 * - Reflect before asking
 * - Mobile cognitive load rule
 */
async function testConversationUXRules() {
  console.log(`======================================================`);
  console.log(`TESTING CONVERSATION UX RULES (1 Turn = 1 Step)`);
  console.log(`======================================================\n`);

  const sessionId = `test-ux-${Date.now()}`;
  const messages = [
    {
      role: 'assistant',
      content: 'สวัสดีครับ... มีอะไรเกิดขึ้นกับคุณตอนนี้ เล่าให้ฟังได้นะ ไม่ต้องรีบเรียบเรียง'
    },
    {
      role: 'user',
      content: 'เขาส่งข้อความมาบอกว่า "เราคงไปกันต่อไม่ได้แล้ว" หลังจากที่ไม่ได้คุยกันมา 3 วัน'
    }
  ];

  console.log(`Sending Turn 1...`);
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

  console.log(`\nRESPONSE RECEIVED (Source: ${source}):\n${reply}\n`);

  const lines = reply.trim().split('\n').filter(l => l.trim());
  const questionMarks = (reply.match(/\?/g) || []).length;
  const wordCount = reply.trim().split(/\s+/).length;

  console.log(`======================================================`);
  console.log(`UX RULES VERIFICATION:`);
  console.log(`- Line count: ${lines.length} lines (Expected: 2-4 lines)`);
  console.log(`- Word count: ~${wordCount} words (Expected: 30-80 words)`);
  console.log(`- Number of questions: ${questionMarks <= 1 ? '1 QUESTION (PASS)' : 'MULTIPLE QUESTIONS (CHECK)'}`);
  console.log(`======================================================\n`);
}

testConversationUXRules();
