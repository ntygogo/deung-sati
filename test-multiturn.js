/**
 * Multi-turn Integration Test for DuengSati Session Conversation State
 */
async function runMultiTurnTest() {
  const sessionId = `test-session-${Date.now()}`;
  console.log(`\n======================================================`);
  console.log(`STARTING MULTI-TURN INTEGRATION TEST (Session ID: ${sessionId})`);
  console.log(`======================================================\n`);

  const turns = [
    // Turn 1
    "หัวหน้าเค้าบอกให้งานเพิ่ม",
    // Turn 2: Multiple dimensions (Feeling + Story)
    "โกรธ รู้สึกว่าเค้าเอาเปรียบ",
    // Turn 3: Body sensation
    "ตึงหัว ตึงหลัง",
    // Turn 4: Habitual action
    "เราก็ยอมรับงานมาทำเงียบๆ ไม่กล้าปฏิเสธ",
    // Turn 5: Result
    "งานล้นมือ แบกความเครียดสะสมคนเดียว จนทำงานอื่นไม่ทัน",
    // Turn 6: Underlying fear/need
    "กลัวว่าถ้าปฏิเสธ เขาจะมองว่าเราไม่ให้ความร่วมมือหรือไม่สู้งาน",
    // Turn 7: Exploring choice
    "ถ้าลองนัดคุยเรื่องการจัดลำดับความสำคัญของงานใหม่ตรงๆ ก็น่าจะดีกว่าเงียบ",
    // Turn 8: Reflection
    "พอเห็นภาพแบบนี้ รู้สึกว่าความตึงที่หัวเบาลงไปเยอะเลย"
  ];

  const messages = [];

  for (let i = 0; i < turns.length; i++) {
    const userText = turns[i];
    console.log(`\n------------------------------------------------------`);
    console.log(`TURN ${i + 1} USER: "${userText}"`);
    console.log(`------------------------------------------------------`);

    messages.push({ role: 'user', content: userText });

    // Call /api/chat/stream
    const res = await fetch('http://localhost:5173/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, messages }),
    });

    if (!res.ok) {
      console.error(`HTTP error: ${res.status}`);
      break;
    }

    const responseText = await res.text();
    
    // Parse SSE lines
    const lines = responseText.split('\n');
    let assistantText = '';
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          if (data.fullText) {
            assistantText = data.fullText;
          }
        } catch (e) {}
      }
    }

    messages.push({ role: 'assistant', content: assistantText });

    console.log(`ASSISTANT RESPONSE:\n${assistantText}\n`);

    // Fetch accumulated session state from /api/session/:sessionId
    const stateRes = await fetch(`http://localhost:5173/api/session/${sessionId}`);
    const stateData = await stateRes.json();

    console.log(`ACCUMULATED STATE (Turn ${i + 1}):`);
    console.log(`  • Fact:             [${stateData.state.fact.join(', ')}]`);
    console.log(`  • Feeling:          [${stateData.state.feeling.join(', ')}]`);
    console.log(`  • Body Sensation:   [${stateData.state.body_sensation.join(', ')}]`);
    console.log(`  • Story:            [${stateData.state.story.join(', ')}]`);
    console.log(`  • Fear / Need:      [${stateData.state.fear_or_need.join(', ')}]`);
    console.log(`  • Action:           [${stateData.state.action.join(', ')}]`);
    console.log(`  • Result:           [${stateData.state.result.join(', ')}]`);
    console.log(`  • New Choice:       [${stateData.state.new_choice.join(', ')}]`);
    console.log(`  • Last Asked Dim:   ${stateData.state.last_question_dimension}`);
  }

  // TEST LONG FIRST MESSAGE WITH 4-5 DIMENSIONS
  console.log(`\n======================================================`);
  console.log(`TESTING LONG FIRST MESSAGE (Multiple Dimensions in 1 Turn)`);
  console.log(`======================================================\n`);

  const longSessionId = `test-long-session-${Date.now()}`;
  const longUserText = "หัวหน้าโยนงานมาอีกแล้ว เราโกรธมาก รู้สึกเหมือนเขาเห็นเราเป็นคนที่ปฏิเสธไม่ได้ ตึงหลังไปหมดเลย แต่ก็ยอมรับมาทำเงียบๆ";
  
  console.log(`USER: "${longUserText}"\n`);

  const longRes = await fetch('http://localhost:5173/api/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: longSessionId,
      messages: [{ role: 'user', content: longUserText }],
    }),
  });

  const longResText = await longRes.text();
  let longAssistantText = '';
  for (const line of longResText.split('\n')) {
    if (line.startsWith('data: ')) {
      try {
        const data = JSON.parse(line.slice(6));
        if (data.fullText) longAssistantText = data.fullText;
      } catch (e) {}
    }
  }

  console.log(`ASSISTANT RESPONSE:\n${longAssistantText}\n`);

  const longStateRes = await fetch(`http://localhost:5173/api/session/${longSessionId}`);
  const longStateData = await longStateRes.json();

  console.log(`ACCUMULATED STATE AFTER SINGLE MESSAGE:`);
  console.log(`  • Fact:             [${longStateData.state.fact.join(', ')}]`);
  console.log(`  • Feeling:          [${longStateData.state.feeling.join(', ')}]`);
  console.log(`  • Body Sensation:   [${longStateData.state.body_sensation.join(', ')}]`);
  console.log(`  • Story:            [${longStateData.state.story.join(', ')}]`);
  console.log(`  • Action:           [${longStateData.state.action.join(', ')}]`);
  console.log(`  • Unanswered:       [${longStateData.state.unanswered_dimensions.join(', ')}]`);
  console.log(`  • Next Asked Dim:   ${longStateData.state.last_question_dimension}`);
}

runMultiTurnTest();
