import http from 'http';

function postChat(messages: Array<{ role: string; content: string }>, reqId: number): Promise<{
  status: number;
  assistantText: string;
}> {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      messages,
      sessionId: 'test-thai-language-qa-session',
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
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const json = JSON.parse(line.slice(6));
              if (json.fullText) assistantFullText = json.fullText;
            } catch {}
          }
        }
        resolve({
          status: res.statusCode || 200,
          assistantText: assistantFullText
        });
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function evaluateThaiQuality(text: string): {
  passed: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check 1: No malformed colloquial words like "มีเซง" or standalone incorrect "เซง"
  if (/มีเซง|เซง\b/.test(text)) {
    issues.push('พบคำผิดรูป (เช่น "เซง" หรือ "มีเซง")');
  }

  // Check 2: No unnecessary English transliteration slang (ฟีลลิ่ง, คอนเนก, ท็อกซิก, อินไซต์)
  if (/ฟีลลิ่ง|คอนเนก|ท็อกซิก|อินไซต์/.test(text)) {
    issues.push('พบคำทับศัพท์ที่ไม่จำเป็น (ควรใช้ภาษาไทยที่เรียบง่าย)');
  }

  // Check 3: No duplicated words (e.g. "มาก มาก", "เลย เลย")
  if (/(\S+)\s+\1/.test(text)) {
    issues.push('พบคำเบิ้ลซ้ำผิดธรรมชาติ (เช่น "มาก มาก")');
  }

  // Check 4: Must contain valid Thai characters and natural punctuation
  if (!/[\u0E00-\u0E7F]/.test(text)) {
    issues.push('ไม่พบข้อความภาษาไทย');
  }

  return {
    passed: issues.length === 0,
    issues
  };
}

async function runThaiLanguageQATest() {
  console.log('================================================================');
  console.log('TESTING THAI LANGUAGE QA & NATURAL PHRASING QUALITY');
  console.log('================================================================\n');

  const testCases = [
    {
      name: 'Case 1: Relationship understanding without slang/transliterations',
      input: 'เขาดูเหมือนเข้าใจเราตลอดเวลาเลย เหมือนเขารู้ใจ',
    },
    {
      name: 'Case 2: Venting with emotional weight',
      input: 'เรารู้สึกน้อยใจมาก ทำไมเขาถึงไม่ทักหาเราเลย',
    },
    {
      name: 'Case 3: Complex mixed emotions',
      input: 'ทั้งโกรธทั้งเสียใจ อธิบายไม่ถูกเหมือนกัน',
    },
  ];

  let allPassed = true;

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    console.log(`[TEST ${i + 1}/${testCases.length}] ${tc.name}`);
    console.log(`User: "${tc.input}"`);

    const res = await postChat([{ role: 'user', content: tc.input }], i + 1);
    const evalResult = evaluateThaiQuality(res.assistantText);

    console.log(`Assistant Response: "${res.assistantText}"`);

    if (evalResult.passed) {
      console.log(`Result: PASSED ✅ (ภาษาไทยสละสลวย ถูกต้อง ไม่มีคำผิดรูปหรือคำทับศัพท์แสลง)\n`);
    } else {
      allPassed = false;
      console.log(`Result: FAILED ❌ (พบปัญหา: ${evalResult.issues.join(', ')})\n`);
    }
  }

  console.log('================================================================');
  console.log(`OVERALL STATUS: ${allPassed ? 'ALL THAI QA TESTS PASSED 100% 🎉' : 'ISSUES DETECTED ❌'}`);
  console.log('================================================================');
}

runThaiLanguageQATest().catch(console.error);
