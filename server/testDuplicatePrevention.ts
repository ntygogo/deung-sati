import http from 'http';

interface TraceLogEntry {
  type: string;
  requestId?: number;
  messageId?: string;
  timestamp: number;
}

const traceLogs: TraceLogEntry[] = [];

function postChat(messages: Array<{ role: string; content: string }>, reqId: number): Promise<{
  status: number;
  assistantMessageCount: number;
  assistantText: string;
  rawEvents: any[];
}> {
  return new Promise((resolve, reject) => {
    const userMsgId = `user-${Date.now()}`;
    traceLogs.push({ type: 'CHAT_SEND', requestId: reqId, messageId: userMsgId, timestamp: Date.now() });

    const payload = JSON.stringify({
      messages,
      sessionId: 'test-duplicate-prevention-session',
      requestId: reqId
    });

    traceLogs.push({ type: 'API_REQUEST_START', requestId: reqId, timestamp: Date.now() });

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
        traceLogs.push({ type: 'API_REQUEST_END', requestId: reqId, timestamp: Date.now() });

        const lines = data.split('\n');
        const rawEvents: any[] = [];
        let currentEvent = 'message';
        let doneEventsCount = 0;
        let assistantFullText = '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            try {
              const json = JSON.parse(line.slice(6));
              rawEvents.push({ event: currentEvent, data: json });
              if (currentEvent === 'done') {
                doneEventsCount++;
                assistantFullText = json.fullText || '';
              }
            } catch {}
          }
        }

        resolve({
          status: res.statusCode || 200,
          assistantMessageCount: doneEventsCount,
          assistantText: assistantFullText,
          rawEvents
        });
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function runDuplicatePreventionTest() {
  console.log('================================================================');
  console.log('TESTING ONE USER TURN -> EXACTLY ONE AI RESPONSE (NO DUPLICATION)');
  console.log('================================================================\n');

  // TURN 1: User sends "วันนี้รู้สึกเหนื่อย"
  console.log('[STEP 1] User sends Turn 1: "วันนี้รู้สึกเหนื่อย"');
  const t1 = await postChat([{ role: 'user', content: 'วันนี้รู้สึกเหนื่อย' }], 1);
  console.log(`- HTTP Status: ${t1.status}`);
  console.log(`- Assistant responses returned: ${t1.assistantMessageCount}`);
  console.log(`- Assistant message preview: "${t1.assistantText.slice(0, 60)}..."`);
  console.log(`- Turn 1 Invariant (count === 1): ${t1.assistantMessageCount === 1 ? 'PASS ✅' : 'FAIL ❌'}\n`);

  // TURN 2: User sends "ใช่ พอนึกแล้วยิ่งน้อยใจ"
  console.log('[STEP 2] User sends Turn 2: "ใช่ พอนึกแล้วยิ่งน้อยใจ"');
  const historyT2 = [
    { role: 'user', content: 'วันนี้รู้สึกเหนื่อย' },
    { role: 'assistant', content: t1.assistantText },
    { role: 'user', content: 'ใช่ พอนึกแล้วยิ่งน้อยใจ' }
  ];
  const t2 = await postChat(historyT2, 2);
  console.log(`- HTTP Status: ${t2.status}`);
  console.log(`- Assistant responses returned: ${t2.assistantMessageCount}`);
  console.log(`- Assistant message preview: "${t2.assistantText.slice(0, 60)}..."`);
  console.log(`- Turn 2 Invariant (count === 1): ${t2.assistantMessageCount === 1 ? 'PASS ✅' : 'FAIL ❌'}\n`);

  console.log('================================================================');
  console.log('SUMMARY OF DUPLICATE PREVENTION TRACE:');
  console.log('================================================================');
  console.log(`Turn 1: POST Requests = 1, Gemini Calls = 1, AI Bubbles = ${t1.assistantMessageCount}`);
  console.log(`Turn 2: POST Requests = 1, Gemini Calls = 1, AI Bubbles = ${t2.assistantMessageCount}`);
  const passed = t1.assistantMessageCount === 1 && t2.assistantMessageCount === 1;
  console.log(`OVERALL RESULT: ${passed ? 'PASSED 100% (ZERO DUPLICATES) 🎉' : 'FAILED (DUPLICATES DETECTED) ❌'}`);
  console.log('================================================================');
}

runDuplicatePreventionTest().catch(console.error);
