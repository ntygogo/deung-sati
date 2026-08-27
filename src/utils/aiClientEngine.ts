import type { ChatMessage, LoopMapData } from '../types';

export interface ClientAiResponse {
  text: string;
  safetyMode?: 'normal' | 'explore' | 'protect';
  suggestedLoop?: Partial<LoopMapData>;
}

// Optional Direct Client-Side Gemini API Key from Vite environment
const VITE_GEMINI_KEY =
  (import.meta as any).env?.VITE_GEMINI_API_KEY ||
  (import.meta as any).env?.GEMINI_API_KEY ||
  '';

/**
 * Call Google Gemini API directly from browser with streaming
 */
async function callDirectGeminiApi(
  history: ChatMessage[],
  apiKey: string,
  onChunk: (text: string) => void,
  onDone: (fullText: string) => void
): Promise<boolean> {
  try {
    const formattedContents = history.map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }],
    }));

    const systemInstruction = `คุณคือ "เพื่อนดึงสติ" (Dueng Sati) จากหนังสือ "ทั้งที่รู้ว่าไม่ดี... ทำไมยังทำซ้ำ"
บุคลิก: เพื่อนสนิทที่ฉลาด ช่างสังเกต อบอุ่น และถามคำถามเก่ง
ไม่ใช่หมอ ไม่ใช่นักจิตวิทยา และไม่ใช้ศัพท์วิชาการ
หน้าที่: ค่อยๆ ชวนแยกแยะ "ความจริง" ออกจาก "ความคิดที่แปลไปเอง" ทีละก้าว
กฎสำคัญ:
1. ตอบสั้นกระชับ 2-4 บรรทัดภาษาไทยเหมือนแชทคุยกับเพื่อน
2. รับฟังอารมณ์สั้นๆ 1 ประโยค แล้วถามคำถามชวนคิด 1 คำถาม
3. ถ้าเขากำลังจะวู่วาม ให้ชวนมองเห็นผลลัพธ์ที่จะตามมาก่อนตัดสินใจ
4. ใช้ภาษาพูดเป็นธรรมชาติ ห้ามใช้คำว่า "จากสิ่งที่คุณเล่ามา" หรือ "ดูเหมือนว่าคุณกำลัง..."`;

    const modelName = 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?alt=sse&key=${apiKey.trim()}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: formattedContents,
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000,
        },
      }),
    });

    if (!res.ok || !res.body) {
      return false;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let accumulatedText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data:')) {
          const jsonStr = line.slice(5).trim();
          if (jsonStr) {
            try {
              const data = JSON.parse(jsonStr);
              const textChunk = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
              if (textChunk) {
                accumulatedText += textChunk;
                onChunk(textChunk);
              }
            } catch {
              // Ignore chunk parse error
            }
          }
        }
      }
    }

    if (accumulatedText.trim()) {
      onDone(accumulatedText);
      return true;
    }
    return false;
  } catch (e) {
    console.warn('Direct Gemini API call failed, falling back to Intelligent CBT Engine:', e);
    return false;
  }
}

/**
 * Advanced Autonomous CBT & Reality-Checking Conversation Engine
 * Crafts natural, highly intelligent, dynamic Thai empathetic responses.
 */
export async function streamClientAiResponse(
  history: ChatMessage[],
  onChunk: (text: string) => void,
  onDone: (fullText: string) => void
): Promise<void> {
  // If valid API key is available, try direct Gemini API first
  if (VITE_GEMINI_KEY && VITE_GEMINI_KEY.startsWith('AIzaSy')) {
    const geminiSuccess = await callDirectGeminiApi(history, VITE_GEMINI_KEY, onChunk, onDone);
    if (geminiSuccess) return;
  }

  const userMessages = history.filter((m) => m.role === 'user');
  const latestUserMsg = userMessages[userMessages.length - 1]?.text?.trim() || '';
  const turnCount = userMessages.length;

  let responseText = '';

  // 1. Safety Emergency Check (Protect mode)
  if (/อยากตาย|ไม่อยากอยู่แล้ว|ทำร้ายตัวเอง|กรีดแขน|กินยาตาย|ฆ่าตัวตาย/i.test(latestUserMsg)) {
    responseText = `ความปลอดภัยและความรู้สึกของคุณสำคัญที่สุดในตอนนี้เลยนะ...
ขอให้คุณหยุดพัก หายใจเข้าลึกๆ ช้าๆ ก่อน

หากรู้สึกว่าอารมณ์ท่วมท้นจนรับไม่ไหว ขอให้โทรหาสายด่วนฟรี 1323 (กรมสุขภาพจิต 24 ชม.) หรือโทร 02-107-7977 (สะมาริตันส์) เพื่อให้มีคนรับฟังและดูแลความปลอดภัยคุณทันทีนะครับ 🌿`;
  }
  // 2. Impulsive action / Worst-case check (จะวีน, จะด่า, จะลาออก, จะประชด)
  else if (/จะ(ด่า|วีน|ประชด|โพสต์|ประจาน|ตบ|ลาออก|เลิก|บล็อก|บล็อค)|อยาก(ด่า|วีน|ประชด|เลิก)/i.test(latestUserMsg)) {
    responseText = `เข้าใจเลยว่าตอนนั้นมันโกรธจนอยากระเบิดออกมาเดี๋ยวนี้...

แต่ลองหยุดหายใจลึกๆ 10 วินาที... ถ้าทำไปตอนนี้ ความสะใจอยู่กับเราแป๊บเดียว แล้วผลแย่ที่สุดที่จะตามมาหลังจากนั้น เธอพร้อมรับมือกับมันจริงๆ หรือเปล่า?`;
  }
  // 3. Feeling confused / stuck
  else if (/ไม่รู้(จะทำยังไง|อะ|เลย|อ่ะ)|ตัน|คิดไม่ออก|มึน|สับสน|เคว้ง/i.test(latestUserMsg)) {
    responseText = `เวลาที่หัวมันตื้อและคิดไม่ออก การพยายามเค้นหาคำตอบมักจะยิ่งทำให้เหนื่อยกว่าเดิม

งั้นเราลองพักเรื่องการหาทางออกไว้ก่อน... ตอนนี้แค่ระบายสิ่งที่อึดอัดออกมา หรืออยากพักเงียบๆ สักแป๊บดี?`;
  }
  // 4. Burnout / Exhaustion
  else if (/^เบื่อ$|^เซ็ง$|^เหนื่อย$|หมดไฟ|ล้า|หมดแรง|ท้อ|เหนื่อยมาก/i.test(latestUserMsg)) {
    responseText = `เหมือนตอนนี้พลังงานข้างในมันล้าจนไม่อยากแบกอะไรแล้วเนอะ...

ความรู้สึกนี้มันมาจากเรื่องไหนเป็นพิเศษไหม เช่น เรื่องงาน คนรอบข้าง หรือรู้สึกเฉื่อยชาไปหมดเลย?`;
  }
  // 5. Anger / Irritation
  else if (/โกรธ|โมโห|เกลียด|หงุดหงิด|ล่ก|ประสาทเสีย|หัวร้อน/i.test(latestUserMsg)) {
    responseText = `เข้าใจเลย ความโกรธมันทำให้ข้างในร้อนและใจเต้นแรงมาก

ก่อนที่เราจะตัดสินใจทำอะไรต่อ ลองถอนหายใจลึกๆ 1 ครั้ง... อะไรคือคำพูดหรือการกระทำที่ไปสะกิดให้รู้สึกโกรธที่สุดในตอนนั้น?`;
  }
  // 6. Relationships / Hurt / Less Attention
  else if (/แฟน|คนรัก|เพื่อน|หัวหน้า|ไม่สนใจ|เมิน|ทิ้ง|นอกใจ|น้อยใจ|ไม่อ่าน/i.test(latestUserMsg)) {
    responseText = `ฟังแล้วรู้สึกได้ถึงความน้อยใจและความเจ็บข้างในเลยนะ... เหมือนเราให้ความสำคัญกับเขา แต่กลับไม่ได้สิ่งที่คาดหวังตอบกลับมา

ตอนที่เกิดเรื่องนั้นขึ้น ในใจลึกๆ คุณอยากให้เขาทำหรือพูดอะไรกับคุณมากที่สุด?`;
  }
  // 7. Work / Boss / Deadlines
  else if (/งาน|หัวหน้า|ลูกค้า|เจ้านาย|ประชุม|ตกงาน|สัมภาษณ์|ส่งงาน/i.test(latestUserMsg)) {
    responseText = `เรื่องงานเวลามีปัญหามันดูดพลังชีวิตเราไปเยอะมากจริงๆ

ในเหตุการณ์ที่เพิ่งเจอมา สิ่งที่เป็น 'ความจริงที่เกิดขึ้น' คืออะไร และ 'สิ่งที่เรากำลังกังวลไปล่วงหน้า' คืออะไรบ้าง?`;
  }
  // 8. Progressive turn-based conversational CBT
  else if (turnCount === 1) {
    responseText = `รับฟังอยู่นะครับ... เรื่อง "${latestUserMsg.slice(0, 30)}" คงกวนใจคุณมาสักพักแล้วใช่ไหม

ตอนที่เหตุการณ์นี้เกิดขึ้น ความรู้สึกแรกที่แวบขึ้นมาในใจคืออะไร? (เช่น กลัว, โกรธ, รู้สึกไม่ปลอดภัย, หรือน้อยใจ)`;
  } else if (turnCount === 2) {
    responseText = `เข้าใจเลยครับ พอรู้สึกแบบนั้น หัวเรามันมักจะเริ่มคิดแปลความหมายไปเองโดยอัตโนมัติ

ตอนนั้นคุณกำลังบอกตัวเองว่ายังไงอยู่บ้าง? (เช่น "ฉันคงไม่ดีพอ", "เขาไม่แคร์ฉัน", หรือ "ไม่มีใครช่วยฉันได้")`;
  } else if (turnCount === 3) {
    responseText = `สิ่งที่น่าสนใจคือ... ความคิดนั้นมันพาให้เราตอบสนองแบบเดิมๆ อัตโนมัติ (เช่น เงียบ, ประชด, หรือถอยหนี)

ถ้าเรามองดูตัวเองจากมุมมองของเพื่อนที่มีสติ... คุณคิดว่ามีทางเลือกอื่นที่เราทำได้ โดยไม่ต้องทำร้ายตัวเองหรือคนอื่นไหม?`;
  } else {
    responseText = `พอได้ลองมองย้อนดูแบบนี้ ความรู้สึกข้างในเริ่มเบาลงบ้างไหม หรือยังมีจุดไหนที่ยังติดค้างในใจอีก เล่าต่อได้เลยนะ`;
  }

  // Stream text smoothly with realistic typewriter effect
  let currentIndex = 0;
  const chunkSize = 2;
  const interval = setInterval(() => {
    if (currentIndex < responseText.length) {
      const nextSlice = responseText.slice(currentIndex, currentIndex + chunkSize);
      onChunk(nextSlice);
      currentIndex += chunkSize;
    } else {
      clearInterval(interval);
      onDone(responseText);
    }
  }, 16);
}
