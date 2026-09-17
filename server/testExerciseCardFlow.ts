import http from 'http';

function postChat(messages: Array<{ role: string; content: string }>, reqId: number): Promise<{ status: number; raw: string; parsedEvents: any[] }> {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      messages,
      sessionId: 'test-exercise-card-flow',
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
        const parsedEvents: any[] = [];
        let currentEvent = 'message';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            try {
              const json = JSON.parse(line.slice(6));
              parsedEvents.push({ event: currentEvent, data: json });
            } catch {}
          }
        }
        resolve({ status: res.statusCode || 200, raw: data, parsedEvents });
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function runExerciseFlowTest() {
  console.log('===========================================================');
  console.log('TESTING GUIDED EXERCISE CARD & POST-EXERCISE CONVERSATION');
  console.log('===========================================================\n');

  // TURN 1: User says impulsive anger -> AI offers exercise
  console.log('[TURN 1] User: "หัวหน้าด่าแรงมาก โกรธจนมือสั่น"');
  const t1 = await postChat([{ role: 'user', content: 'หัวหน้าด่าแรงมาก โกรธจนมือสั่น' }], 1);
  const t1Done = t1.parsedEvents.find(e => e.event === 'done');
  const t1Meta = t1.parsedEvents.find(e => e.event === 'assistant_meta');
  console.log('Turn 1 Mode:', t1Meta?.data?.mode, 'Exercise Offered:', t1Meta?.data?.recommended_exercise?.id || 'none');
  console.log('Turn 1 Assistant:', t1Done?.data?.fullText, '\n');

  // TURN 2: User completes exercise and reports result back
  const postExerciseText = 'ได้ทำแบบฝึกหัด หยุดพักหายใจ 1 นาที เสร็จแล้ว (ทำเสร็จแล้ว รู้สึกเบาลงและมีสติมากขึ้น)';
  console.log(`[TURN 2] User: "${postExerciseText}"`);
  const historyT2 = [
    { role: 'user', content: 'หัวหน้าด่าแรงมาก โกรธจนมือสั่น' },
    { role: 'assistant', content: t1Done?.data?.fullText || 'เข้าใจเลยนะ' },
    { role: 'user', content: postExerciseText }
  ];
  const t2 = await postChat(historyT2, 2);
  const t2Done = t2.parsedEvents.find(e => e.event === 'done');
  const t2Meta = t2.parsedEvents.find(e => e.event === 'assistant_meta');
  const msgT2 = t2Done?.data?.fullText || '';
  console.log('Turn 2 Mode:', t2Meta?.data?.mode, 'Intent:', t2Meta?.data?.user_intent);
  console.log('Turn 2 Assistant Response:', msgT2);
  console.log('Turn 2 Quick Replies:', t2Meta?.data?.quick_replies);

  const passes = msgT2.length > 0 && !msgT2.includes('{');
  console.log('\n[EVALUATION]:');
  console.log('- Post-exercise conversation continues naturally:', passes ? 'YES ✅' : 'NO ❌');
  console.log('===========================================================');
}

runExerciseFlowTest().catch(console.error);
