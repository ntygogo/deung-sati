/**
 * Live multi-turn test with external Gemini architecture
 */
async function runGeminiMultiTurnTest() {
  const sessionId = `gemini-session-${Date.now()}`;
  console.log(`\n======================================================`);
  console.log(`RUNNING GEMINI LIVE MULTI-TURN TEST (Session ID: ${sessionId})`);
  console.log(`======================================================\n`);

  const turns = [
    // Turn 1
    "เขาบอกว่างานฉันไม่ดีพอ",
    // Turn 2
    "ตอนนั้นฉันรู้สึกว่าตัวเองไม่เก่งเลย",
    // Turn 3
    "มวนๆ ที่หัว",
    // Turn 4
    "ก้มหน้าเงียบ แล้วกลับมานั่งคิดวนคนเดียว",
    // Turn 5
    "งานค้างเยอะขึ้น แล้วก็รู้สึกหมดไฟ",
    // Turn 6
    "กลัวว่าถ้าถามไปตรงๆ เขาจะหาว่าเราไม่ยอมรับคำวิจารณ์",
    // Turn 7
    "ลองลิสต์สิ่งที่เขาติ แล้วนัดคุยถามจุดที่ต้องปรับให้ชัดเจน",
    // Turn 8
    "พอเห็นภาพแบบนี้ รู้สึกว่าความตึงที่หัวเบาลงไปเยอะเลย"
  ];

  const messages = [
    { role: 'assistant', content: 'สวัสดีครับ... มีอะไรเกิดขึ้นกับคุณตอนนี้ เล่าให้ฟังได้นะ ไม่ต้องรีบเรียบเรียง' }
  ];

  for (let i = 0; i < turns.length; i++) {
    const userText = turns[i];
    messages.push({ role: 'user', content: userText });

    console.log(`\n======================================================`);
    console.log(`TURN ${i + 1}`);
    console.log(`- Number of History Messages Sent: ${messages.length}`);
    console.log(`- Latest User Message: "${userText}"`);
    console.log(`======================================================`);

    const res = await fetch('http://localhost:5173/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, messages }),
    });

    const responseText = await res.text();
    let assistantText = '';
    let source = '';
    for (const line of responseText.split('\n')) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          if (data.fullText) assistantText = data.fullText;
          if (data.source) source = data.source;
        } catch (e) {}
      }
    }

    messages.push({ role: 'assistant', content: assistantText });

    console.log(`RESPONSE (Source: ${source}):\n"${assistantText}"\n`);
  }
}

runGeminiMultiTurnTest();
