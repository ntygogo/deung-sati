const scenarios = [
  { label: 'Scenario A', text: 'เขาอ่านแล้วไม่ตอบ กูจะโทรไปด่าแม่งแล้ว' },
  { label: 'Scenario B', text: 'ไม่รู้ว่ารู้สึกอะไร' },
  { label: 'Scenario C', text: 'ทำไมเขาทำแบบนี้กับกู เขาคิดอะไรอยู่' },
  { label: 'Scenario D', text: 'กูจะส่งไปว่า เออไม่ต้องตอบแล้วก็ได้' },
  { label: 'Scenario E', text: 'กูไม่อยากเป็นคนแบบนี้แล้ว' },
  { label: 'Scenario F', text: 'เมื่อกี้กูพลาดอีกแล้ว' },
];

async function runTests() {
  for (const sc of scenarios) {
    console.log(`\n================== ${sc.label} ==================`);
    console.log(`User: "${sc.text}"`);

    const res = await fetch('http://localhost:5173/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: sc.text }],
        sessionId: `test-${Date.now()}`,
      }),
    });

    const text = await res.text();
    const lines = text.split('\n');
    let doneData = null;

    for (const l of lines) {
      if (l.startsWith('data: ')) {
        try {
          const parsed = JSON.parse(l.slice(6));
          if (parsed.structuredTurn) {
            doneData = parsed;
          }
        } catch {}
      }
    }

    if (doneData) {
      const st = doneData.structuredTurn;
      console.log(`Assistant: "${doneData.fullText || st.assistant_message}"`);
      console.log(`[Turn State] mode: ${st.mode}, safety: ${st.safety_state}, capacity: ${st.capacity}, intent: ${st.user_intent}, readiness: ${st.readiness}`);
      console.log(`[Exercise]: ${st.recommended_exercise?.id || 'none'} (${st.recommended_exercise?.reason || ''})`);
      console.log(`[Quick Replies]:`, st.quick_replies);
    } else {
      console.log('No structuredTurn returned. Response:', text.slice(0, 150));
    }
  }
}

runTests().catch(console.error);
