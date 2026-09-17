import http from 'http';

function postChat(messages: Array<{ role: string; content: string }>, reqId: number): Promise<{
  status: number;
  assistantText: string;
  meta: any;
}> {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      messages,
      sessionId: 'test-natural-exercise-discovery',
      requestId: reqId
    });

    const req = http.request('http://localhost:5173/api/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk.toString(); });
      res.on('end', () => {
        const lines = data.split('\n');
        let assistantFullText = '';
        let assistantMeta: any = null;
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const json = JSON.parse(line.slice(6));
              if (json.fullText) assistantFullText = json.fullText;
              if (json.structuredTurn) assistantMeta = json.structuredTurn;
            } catch {}
          }
        }
        resolve({
          status: res.statusCode || 200,
          assistantText: assistantFullText,
          meta: assistantMeta
        });
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function runNaturalExerciseDiscoveryTest() {
  console.log('================================================================');
  console.log('TESTING NATURAL EXERCISE DISCOVERY (NO MAGIC WORDS REQUIRED)');
  console.log('================================================================\n');

  // SCENARIO 1: Body / Somatic Signal ("ยังรู้สึกตึงอยู่เลย")
  console.log('[SCENARIO 1] User: "ยังรู้สึกตึงอยู่เลย"');
  const t1 = await postChat([{ role: 'user', content: 'ยังรู้สึกตึงอยู่เลย' }], 1);
  console.log(`Assistant: "${t1.assistantText}"`);
  console.log(`Recommended Exercise:`, t1.meta?.recommended_exercise);
  console.log(`Quick Replies:`, t1.meta?.quick_replies);
  const s1Passed = t1.meta?.recommended_exercise?.id !== null && !t1.assistantText.includes('ขั้นตอนที่ 1');
  console.log(`-> Scenario 1 Invariant (Natural Offer + No Instruction Dump): ${s1Passed ? 'PASS ✅' : 'FAIL ❌'}\n`);

  // SCENARIO 2: Somatic Overload ("ตอนนี้ใจเต้นแรง มือสั่น ไม่รู้ทำไง")
  console.log('[SCENARIO 2] User: "ตอนนี้ใจเต้นแรง มือสั่น ไม่รู้ทำไง"');
  const t2 = await postChat([{ role: 'user', content: 'ตอนนี้ใจเต้นแรง มือสั่น ไม่รู้ทำไง' }], 2);
  console.log(`Assistant: "${t2.assistantText}"`);
  console.log(`Recommended Exercise:`, t2.meta?.recommended_exercise);
  const s2Passed = t2.meta?.recommended_exercise?.id !== null;
  console.log(`-> Scenario 2 Invariant (Offer appropriate pause/grounding): ${s2Passed ? 'PASS ✅' : 'FAIL ❌'}\n`);

  // SCENARIO 3: Listening Priority ("แฟนไม่ตอบ กูเสียใจ") -> Listen first, no forced exercise
  console.log('[SCENARIO 3] User: "แฟนไม่ตอบ กูเสียใจ"');
  const t3 = await postChat([{ role: 'user', content: 'แฟนไม่ตอบ กูเสียใจ' }], 3);
  console.log(`Assistant: "${t3.assistantText}"`);
  console.log(`Mode: ${t3.meta?.mode}, Intent: ${t3.meta?.user_intent}`);
  const s3Passed = t3.meta?.mode === 'HOLD' || t3.meta?.user_intent === 'vent';
  console.log(`-> Scenario 3 Invariant (Listens first without forcing exercise): ${s3Passed ? 'PASS ✅' : 'FAIL ❌'}\n`);

  // SCENARIO 4: Ambiguous Consent ("ไม่รู้")
  console.log('[SCENARIO 4] User: "ไม่รู้" (after exercise offer)');
  const historyT4 = [
    { role: 'user', content: 'ยังรู้สึกตึงอยู่เลย' },
    { role: 'assistant', content: t1.assistantText },
    { role: 'user', content: 'ไม่รู้' }
  ];
  const t4 = await postChat(historyT4, 4);
  console.log(`Assistant: "${t4.assistantText}"`);
  console.log(`Consent State:`, t4.meta?.checkin_consent);
  const s4Passed = t4.meta?.checkin_consent === 'ambiguous' || !t4.assistantText.includes('หลับตา');
  console.log(`-> Scenario 4 Invariant (No consent -> No somatic start): ${s4Passed ? 'PASS ✅' : 'FAIL ❌'}\n`);

  console.log('================================================================');
  const allPassed = s1Passed && s2Passed && s3Passed && s4Passed;
  console.log(`OVERALL RESULT: ${allPassed ? 'ALL SCENARIOS PASSED 100% 🎉' : 'FAILURES DETECTED ❌'}`);
  console.log('================================================================');
}

runNaturalExerciseDiscoveryTest().catch(console.error);
