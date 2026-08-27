/**
 * Test: Natural Spoken Thai Tone (Zero Clinical Jargon)
 */
async function testNaturalThaiTone() {
  console.log(`======================================================`);
  console.log(`TEST 1: NATURAL SPOKEN THAI TONE (NO THERAPIST JARGON)`);
  console.log(`======================================================\n`);

  const forbiddenPhrases = [
    'ความรู้สึกที่ถูกมองข้ามหรือขาดการใส่ใจ',
    'กำลังเผชิญกับเรื่องนี้อยู่เพียงลำพัง',
    'หลีกหนีไปอยู่ในโลกของตัวเอง',
    'จากสิ่งที่คุณเล่ามา',
    'ดูเหมือนว่าคุณกำลัง',
    'สะท้อนให้เห็นว่า',
    'การที่คุณยอมรับว่า',
    'คุณค่าในตัวคุณ',
    'เกาะกุมใจเธออยู่',
    'กลไกการป้องกันตัวเอง'
  ];

  const sessionId = `test-tone-${Date.now()}`;
  const messages = [
    {
      role: 'assistant',
      content: 'สวัสดีครับ... มีอะไรเกิดขึ้นกับคุณตอนนี้ เล่าให้ฟังได้นะ ไม่ต้องรีบเรียบเรียง'
    },
    {
      role: 'user',
      content: 'แฟนไม่ค่อยสนใจเราเลย ช่วงนี้เล่นเกมตลอด พอบอกก็บอกว่าเราคิดมาก'
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

  const foundForbidden = forbiddenPhrases.filter(p => reply.includes(p));
  console.log(`- Forbidden Clinical Phrases Found: ${foundForbidden.length === 0 ? 'NONE (PASS)' : foundForbidden.join(', ')}`);

  const lines = reply.trim().split('\n').filter(l => l.trim());
  console.log(`- Line Count: ${lines.length} lines (Short & Spoken: ${lines.length <= 4 ? 'PASS' : 'TOO LONG'})`);

  if (foundForbidden.length > 0) {
    console.error('FAILED: Found forbidden clinical therapist phrases in response');
    process.exit(1);
  }
}

testNaturalThaiTone();
