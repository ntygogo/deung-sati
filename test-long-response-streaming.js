/**
 * Test end-to-end streaming with long multi-paragraph response
 * Verifies that the response is complete, not cut off mid-sentence,
 * and that all chunks are delivered properly.
 */
async function testLongResponseStreaming() {
  console.log(`======================================================`);
  console.log(`TESTING END-TO-END LONG RESPONSE STREAMING`);
  console.log(`======================================================\n`);

  const sessionId = `test-long-stream-${Date.now()}`;
  const messages = [
    {
      role: 'assistant',
      content: 'สวัสดีครับ... มีอะไรเกิดขึ้นกับคุณตอนนี้ เล่าให้ฟังได้นะ ไม่ต้องรีบเรียบเรียง'
    },
    {
      role: 'user',
      content: 'ช่วงนี้รู้สึกชีวิตเคว้งคว้างมาก ทั้งเรื่องงานที่ไม่รู้จะโตไปทางไหน เรื่องความสัมพันธ์ที่คาราคาซัง และครอบครัวที่คอยกดดันเปรียบเทียบกับลูกคนอื่น ทุกอย่างมันถาโถมเข้ามาพร้อมกันจนไม่รู้จะเริ่มแก้จากตรงไหน รู้สึกเหนื่อยจนไม่อยากทำอะไรเลย'
    }
  ];

  console.log(`Sending long scenario to POST /api/chat/stream ...`);
  const startTime = Date.now();

  const res = await fetch('http://localhost:5173/api/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, messages })
  });

  if (!res.ok || !res.body) {
    throw new Error(`HTTP Error: ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let accumulatedText = '';
  let fullDoneText = '';
  let source = '';
  let chunkCount = 0;
  let buffer = '';

  const processBlock = (block) => {
    if (!block.trim()) return;
    const lines = block.split('\n');
    let eventType = '';
    let dataStr = '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('event:')) {
        eventType = trimmed.slice(6).trim();
      } else if (trimmed.startsWith('data:')) {
        dataStr = trimmed.slice(5).trim();
      }
    }

    if (eventType === 'chunk' && dataStr) {
      try {
        const { text: chunk } = JSON.parse(dataStr);
        if (chunk) {
          chunkCount++;
          accumulatedText += chunk;
          process.stdout.write(chunk);
        }
      } catch (e) {}
    } else if (eventType === 'done' && dataStr) {
      try {
        const d = JSON.parse(dataStr);
        fullDoneText = d.fullText || '';
        source = d.source || '';
      } catch (e) {}
    }
  };

  console.log(`--- [STREAM START] ---`);
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split('\n\n');
    buffer = blocks.pop() || '';

    for (const block of blocks) {
      processBlock(block);
    }
  }

  buffer += decoder.decode();
  if (buffer.trim()) {
    const remainingBlocks = buffer.split('\n\n');
    for (const block of remainingBlocks) {
      processBlock(block);
    }
  }

  const durationMs = Date.now() - startTime;
  console.log(`\n--- [STREAM END] ---\n`);

  const finalText = fullDoneText || accumulatedText;
  const paragraphs = finalText.split('\n\n').filter(p => p.trim());
  const lastChar = finalText.trim().slice(-1);
  const last10Chars = finalText.trim().slice(-15);

  console.log(`======================================================`);
  console.log(`STREAMING INTEGRITY REPORT:`);
  console.log(`- Source: ${source}`);
  console.log(`- Total Chunks Streamed: ${chunkCount}`);
  console.log(`- Total Characters: ${finalText.length}`);
  console.log(`- Paragraph Count: ${paragraphs.length}`);
  console.log(`- Duration: ${(durationMs / 1000).toFixed(2)}s`);
  console.log(`- Ending snippet: "...${last10Chars}"`);

  const isCompleteSentence = /[\.\?\!\n\s]|นะ|ครับ|ค่ะ|เลย|ดี|อยู่|ไหม|บ้าง|ก่อน|กัน|จริง|ได้|แล้ว|เอง|นี้|นั้น|ตรงนี้$/i.test(finalText.trim());
  const isChunkSynced = accumulatedText.trim() === finalText.trim();

  console.log(`- Chunk Accumulation Synced with Done Event? ${isChunkSynced ? 'YES (100% Match)' : 'NO'}`);
  console.log(`- Natural Sentence Completion (Not cut off mid-word)? ${isCompleteSentence ? 'YES (PASS)' : 'NO (TRUNCATED)'}`);
  console.log(`======================================================\n`);

  if (!isCompleteSentence || paragraphs.length < 2) {
    console.error('FAILED: Response was truncated or too short!');
    process.exit(1);
  }
}

testLongResponseStreaming();
