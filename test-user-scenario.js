/**
 * Test for exact user reported scenario
 */
async function runUserScenarioTest() {
  const sessionId = `test-scenario-${Date.now()}`;
  console.log(`\n======================================================`);
  console.log(`STARTING USER SCENARIO TEST (Session ID: ${sessionId})`);
  console.log(`======================================================\n`);

  const turns = [
    // Turn 1
    "เขาบอกว่างานฉันไม่ดีพอ",
    // Turn 2
    "ตอนนั้นฉันรู้สึกว่าตัวเองไม่เก่งเลย",
    // Turn 3
    "ตึงบ่ากับแน่นหน้าอก",
    // Turn 4
    "ก้มหน้าเงียบ แล้วกลับมานั่งคิดวนคนเดียว",
    // Turn 5
    "งานค้างเยอะขึ้น แล้วก็รู้สึกหมดไฟ",
    // Turn 6
    "ลองลิสต์สิ่งที่เขาติ แล้วนัดคุยถามจุดที่ต้องปรับให้ชัดเจน"
  ];

  const messages = [
    { role: 'assistant', content: 'สวัสดีครับ... มีอะไรเกิดขึ้นกับคุณตอนนี้ เล่าให้ฟังได้นะ ไม่ต้องรีบเรียบเรียง' }
  ];

  for (let i = 0; i < turns.length; i++) {
    const userText = turns[i];
    console.log(`\n======================================================`);
    console.log(`TURN ${i + 1} PAYLOAD / HISTORY`);
    console.log(`======================================================`);
    messages.push({ role: 'user', content: userText });

    console.log(`Sending payload:`, JSON.stringify({ sessionId, messages }, null, 2));

    const res = await fetch('http://localhost:5173/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, messages }),
    });

    const responseText = await res.text();
    let assistantText = '';
    for (const line of responseText.split('\n')) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          if (data.fullText) assistantText = data.fullText;
        } catch (e) {}
      }
    }

    messages.push({ role: 'assistant', content: assistantText });

    console.log(`\n======================================================`);
    console.log(`TURN ${i + 1} RESPONSE:`);
    console.log(`"${assistantText}"`);
    console.log(`======================================================\n`);
  }
}

runUserScenarioTest();
