/**
 * Live API Test for exact sequence with "มวนๆที่หัว"
 */
async function runExactTurnTest() {
  const sessionId = `live-test-session-${Date.now()}`;
  console.log(`\n======================================================`);
  console.log(`RUNNING LIVE API EXACT TURN TEST (Session ID: ${sessionId})`);
  console.log(`======================================================\n`);

  const turns = [
    // Turn 1
    "เขาบอกว่างานฉันไม่ดีพอ",
    // Turn 2
    "ตอนนั้นฉันรู้สึกว่าตัวเองไม่เก่งเลย",
    // Turn 3: Exact phrase that previously failed
    "มวนๆที่หัว",
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
    messages.push({ role: 'user', content: userText });

    console.log(`\n------------------------------------------------------`);
    console.log(`TURN ${i + 1} USER: "${userText}"`);
    console.log(`------------------------------------------------------`);

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

    console.log(`ASSISTANT RESPONSE:\n${assistantText}\n`);

    // Fetch accumulated state
    const stateRes = await fetch(`http://localhost:5173/api/session/${sessionId}`);
    const stateData = await stateRes.json();
    console.log(`STATE AFTER TURN ${i + 1}:`);
    console.log(`  • Fact:             [${stateData.state.fact.join(', ')}]`);
    console.log(`  • Story:            [${stateData.state.story.join(', ')}]`);
    console.log(`  • Body Sensation:   [${stateData.state.body_sensation.join(', ')}]`);
    console.log(`  • Action:           [${stateData.state.action.join(', ')}]`);
    console.log(`  • Result:           [${stateData.state.result.join(', ')}]`);
    console.log(`  • New Choice:       [${stateData.state.new_choice.join(', ')}]`);
    console.log(`  • Last Asked Dim:   ${stateData.state.last_question_dimension}`);
  }
}

runExactTurnTest();
