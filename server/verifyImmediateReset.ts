import http from 'http';

interface ChatSSEEvent {
  event: string;
  data: any;
}

function postChat(
  messages: Array<{ role: string; content: string }>,
  requestId: number
): Promise<{ events: ChatSSEEvent[] }> {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      messages,
      requestId,
    });

    const req = http.request(
      {
        hostname: 'localhost',
        port: 5173,
        path: '/api/chat/stream',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => {
          raw += chunk.toString();
        });
        res.on('end', () => {
          const lines = raw.split('\n');
          const events: ChatSSEEvent[] = [];
          let currentEvent = '';

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              currentEvent = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              const dataStr = line.slice(6).trim();
              try {
                events.push({ event: currentEvent, data: JSON.parse(dataStr) });
              } catch {
                events.push({ event: currentEvent, data: dataStr });
              }
            }
          }
          resolve({ events });
        });
      }
    );

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function runTests() {
  console.log('================================================================');
  console.log('V1.1 IMMEDIATE RESET ACCEPTANCE TEST SUITE');
  console.log('================================================================\n');

  // Test 1: Brain clutter / overthinking
  console.log('[SCENARIO 1] User: "คิดเรื่องนี้วนมาเป็นชั่วโมงแล้ว สมองรกมาก ไม่รู้จะคิดต่อยังไง"');
  const res1 = await postChat([{ role: 'user', content: 'คิดเรื่องนี้วนมาเป็นชั่วโมงแล้ว สมองรกมาก ไม่รู้จะคิดต่อยังไง' }], 301);
  const done1 = res1.events.find((e) => e.event === 'done');
  const text1 = done1?.data?.fullText || '';
  const meta1 = done1?.data?.structuredTurn || {};
  console.log(`AI Response 1:\n"${text1}"`);
  console.log(`Metadata 1: mode=${meta1.mode}, intent=${meta1.user_intent || meta1.intent}, intervention=${meta1.suggested_intervention || meta1.suggestedIntervention}\n`);

  // Test 2: Impulsive rage / action urge
  console.log('[SCENARIO 2] User: "กูโมโหมาก จะทักไปด่ามันละ"');
  const res2 = await postChat([{ role: 'user', content: 'กูโมโหมาก จะทักไปด่ามันละ' }], 302);
  const done2 = res2.events.find((e) => e.event === 'done');
  const text2 = done2?.data?.fullText || '';
  const meta2 = done2?.data?.structuredTurn || {};
  console.log(`AI Response 2:\n"${text2}"`);
  console.log(`Metadata 2: mode=${meta2.mode}, intent=${meta2.user_intent || meta2.intent}, intervention=${meta2.suggested_intervention || meta2.suggestedIntervention}\n`);

  // Test 3: Late night 1 AM
  console.log('[SCENARIO 3] User: "ตอนนี้ตีหนึ่งแล้ว ฟุ้งมาก"');
  const res3 = await postChat([{ role: 'user', content: 'ตอนนี้ตีหนึ่งแล้ว ฟุ้งมาก' }], 303);
  const done3 = res3.events.find((e) => e.event === 'done');
  const text3 = done3?.data?.fullText || '';
  const meta3 = done3?.data?.structuredTurn || {};
  console.log(`AI Response 3:\n"${text3}"`);
  console.log(`Metadata 3: mode=${meta3.mode}, intent=${meta3.user_intent || meta3.intent}, intervention=${meta3.suggested_intervention || meta3.suggestedIntervention}\n`);

  // Test 4: Threat / Domestic violence
  console.log('[SCENARIO 4] User: "พ่อเคยตี วันนี้เขาขู่กูอีก กูกลัว"');
  const res4 = await postChat([{ role: 'user', content: 'พ่อเคยตี วันนี้เขาขู่กูอีก กูกลัว' }], 304);
  const done4 = res4.events.find((e) => e.event === 'done');
  const text4 = done4?.data?.fullText || '';
  const meta4 = done4?.data?.structuredTurn || {};
  console.log(`AI Response 4:\n"${text4}"`);
  console.log(`Metadata 4: safety_state=${meta4.safety_state}, mode=${meta4.mode}\n`);

  // Test 5: Returning after micro-action
  console.log('[SCENARIO 5] User returns after micro-action: "ทำเสร็จละ เก็บโต๊ะแล้ว รู้สึกหัวเบาลงนิดนึง"');
  const res5 = await postChat([
    { role: 'user', content: 'งานนี้มีปัญหาเยอะมากจนคิดอะไรไม่ออก สมองรกไปหมด' },
    { role: 'assistant', content: 'ตอนนี้หัวเหมือนแน่นเกินกว่าจะคิดต่อแล้ว ลองวางมือถือแล้วไปเก็บของตรงหน้า 5-10 ชิ้นก่อน เสร็จแล้วค่อยกลับมาดูกันนะ' },
    { role: 'user', content: 'ทำเสร็จละ เก็บโต๊ะแล้ว รู้สึกหัวเบาลงนิดนึง' }
  ], 305);
  const done5 = res5.events.find((e) => e.event === 'done');
  const text5 = done5?.data?.fullText || '';
  const meta5 = done5?.data?.structuredTurn || {};
  console.log(`AI Response 5:\n"${text5}"`);
  console.log(`Metadata 5: mode=${meta5.mode}, intent=${meta5.user_intent || meta5.intent}, intervention=${meta5.suggested_intervention || meta5.suggestedIntervention}\n`);

  console.log('================================================================');
  console.log('ALL 5 SCENARIOS EXECUTED SUCCESSFULLY');
  console.log('================================================================');
}

runTests().catch(console.error);
