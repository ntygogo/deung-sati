import http from 'http';

function postChat(messages: Array<{ role: string; content: string }>, reqId: number): Promise<{ status: number; raw: string; parsedEvents: any[] }> {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      messages,
      sessionId: 'test-hold-see-transition',
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

async function runHoldSeeTest() {
  console.log('===========================================================');
  console.log('TESTING NATURAL HOLD → SEE TRANSITION (NO COMFORT LOOP)');
  console.log('===========================================================\n');

  // TURN 1: User says "เหนื่อย" -> Expect HOLD mode
  console.log('[TURN 1] User: "เหนื่อย"');
  const t1 = await postChat([{ role: 'user', content: 'เหนื่อย' }], 1);
  const t1Done = t1.parsedEvents.find(e => e.event === 'done');
  const t1Meta = t1.parsedEvents.find(e => e.event === 'assistant_meta');
  console.log('Turn 1 Mode:', t1Meta?.data?.mode, 'Intent:', t1Meta?.data?.user_intent);
  console.log('Turn 1 Assistant:', t1Done?.data?.fullText, '\n');

  // TURN 2: User provides concrete event + unfairness: "หัวหน้าว่าแรง สั่งงานนู่นนี่จนไม่ได้พักเลย"
  console.log('[TURN 2] User: "หัวหน้าว่าแรง สั่งงานนู่นนี่จนไม่ได้พักเลย"');
  const historyT2 = [
    { role: 'user', content: 'เหนื่อย' },
    { role: 'assistant', content: t1Done?.data?.fullText || 'เหนื่อยมากเลยใช่ไหม' },
    { role: 'user', content: 'หัวหน้าว่าแรง สั่งงานนู่นนี่จนไม่ได้พักเลย' }
  ];
  const t2 = await postChat(historyT2, 2);
  const t2Done = t2.parsedEvents.find(e => e.event === 'done');
  const t2Meta = t2.parsedEvents.find(e => e.event === 'assistant_meta');
  const msgT2 = t2Done?.data?.fullText || '';
  console.log('Turn 2 Mode:', t2Meta?.data?.mode, 'Intent:', t2Meta?.data?.user_intent);
  console.log('Turn 2 Assistant:', msgT2);
  console.log('Turn 2 Quick Replies:', t2Meta?.data?.quick_replies);

  const isModeSee = t2Meta?.data?.mode === 'SEE' || t2Meta?.data?.user_intent === 'understand';
  const notRepetitiveRest = !msgT2.includes('อยากพักเงียบๆ ไหม') && !msgT2.includes('อยากพักหรือคุยต่อ');

  console.log('\n[EVALUATION]:');
  console.log('- Naturally entered SEE / understand:', isModeSee ? 'YES ✅' : 'NO ❌');
  console.log('- Did NOT ask repetitive "อยากพักหรือคุยต่อ":', notRepetitiveRest ? 'YES ✅' : 'NO ❌');
  console.log('===========================================================');
}

runHoldSeeTest().catch(console.error);
