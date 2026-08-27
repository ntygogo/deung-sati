import type { ChatMessage, LoopMapData } from '../types';

export interface ClientAiResponse {
  text: string;
  safetyMode?: 'normal' | 'explore' | 'protect';
  suggestedLoop?: Partial<LoopMapData>;
}

// Optional Direct Client-Side Gemini API Key
const VITE_GEMINI_KEY =
  (import.meta as any).env?.VITE_GEMINI_API_KEY ||
  (import.meta as any).env?.GEMINI_API_KEY ||
  '';

/**
 * Call Google Gemini API directly from browser with streaming if key is present
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
3. ห้ามพูดซ้ำกับประโยคเดิมที่เคยตอบไปแล้วในแชท`;

    const modelName = 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?alt=sse&key=${apiKey.trim()}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: formattedContents,
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig: {
          temperature: 0.75,
          maxOutputTokens: 1000,
        },
      }),
    });

    if (!res.ok || !res.body) return false;

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
 * Intelligent Context-Aware Semantic Reflection Generator
 */
function generateDynamicCBTResponse(history: ChatMessage[]): string {
  const userMessages = history.filter((m) => m.role === 'user');
  const aiMessages = history.filter((m) => m.role === 'ai');
  const latestMsg = userMessages[userMessages.length - 1]?.text?.trim() || '';
  const previousAiText = aiMessages.map((m) => m.text).join(' ');
  const turnCount = userMessages.length;

  // 1. Critical Safety Triage
  if (/อยากตาย|ไม่อยากอยู่แล้ว|ทำร้ายตัวเอง|กรีดแขน|กินยาตาย|ฆ่าตัวตาย/i.test(latestMsg)) {
    return `ความปลอดภัยและความรู้สึกของคุณสำคัญที่สุดในตอนนี้เลยนะ...
ขอให้คุณหยุดพัก หายใจเข้าลึกๆ ช้าๆ ก่อน

หากรู้สึกว่าอารมณ์ท่วมท้นจนรับไม่ไหว ขอให้โทรหาสายด่วนฟรี 1323 (กรมสุขภาพจิต 24 ชม.) หรือโทร 02-107-7977 (สะมาริตันส์) เพื่อให้มีคนรับฟังและดูแลความปลอดภัยคุณทันทีนะครับ 🌿`;
  }

  // 2. Impulsive Danger / Revenge / Sudden Decision (จะวีน, จะด่า, จะเลิก, จะลาออก)
  if (/จะ(ด่า|วีน|ประชด|โพสต์|ประจาน|ตบ|ตี|ลาออก|เลิก|บล็อก|บล็อค)|อยาก(ด่า|วีน|ประชด|เลิก|บล็อก)/i.test(latestMsg)) {
    const impulses = [
      `เข้าใจเลยว่าตอนนั้นมันโกรธจนอยากระเบิดออกมาเดี๋ยวนี้...\n\nแต่ลองหยุดหายใจลึกๆ 10 วินาที... ถ้าทำไปตอนนี้ ความสะใจอยู่กับเราแป๊บเดียว แล้วผลแย่ที่สุดที่จะตามมาหลังจากนั้น เธอพร้อมรับมือกับมันจริงๆ หรือเปล่า?`,
      `ฟังดูโกรธและอยากทำอะไรบางอย่างให้จบๆ ไปเลยเนอะ...\n\nลองถามตัวเองดูว่า ถ้าเราตอบโต้ไปด้วยความโกรธตอนนี้ มันจะช่วยแก้ปัญหา หรือจะยิ่งทำให้เราเสียเปรียบในระยะยาว?`,
      `ใจเย็นๆ ก่อนนะ... ความรู้สึกโกรธมันเป็นเรื่องจริง แต่การกระทำตอนโกรธมักพาเราไปติดกับดักเดิมๆ\n\nตอนนี้สิ่งที่คุณอยากได้ยินหรืออยากให้เกิดขึ้นจริงๆ คืออะไรกันแน่?`,
    ];
    return impulses.find((res) => !previousAiText.includes(res.slice(0, 20))) || impulses[0];
  }

  // 3. Extract Entity Context & Emotional Tone
  const hasRelationship = /แฟน|คนรัก|คนคุย|เขา|เธอ|สามี|ภรรยา/i.test(latestMsg);
  const hasWork = /งาน|หัวหน้า|เจ้านาย|เพื่อนร่วมงาน|ลูกค้า|บริษัท|ประชุม|ลาออก|เงินเดือน/i.test(latestMsg);
  const hasFamily = /แม่|พ่อ|ครอบครัว|พี่|น้อง|ญาติ/i.test(latestMsg);
  const hasFriends = /เพื่อน|กลุ่ม|แก๊ง|เพื่อนสนิท/i.test(latestMsg);

  const hasAnger = /โกรธ|โมโห|หงุดหงิด|เกลียด|ประสาทเสีย|หัวร้อน/i.test(latestMsg);
  const hasSadness = /น้อยใจ|เสียใจ|ร้องไห้|นอยด์|โดดเดี่ยว|เจ็บ/i.test(latestMsg);
  const hasExhaustion = /เหนื่อย|ล้า|หมดไฟ|ท้อ|เบื่อ|เซ็ง|หมดแรง|ขี้เกียจ/i.test(latestMsg);
  const hasAnxiety = /กังวล|กลัว|เครียด|แพนิก|ไม่มั่นใจ|ล่ก|ฟุ้งซ่าน/i.test(latestMsg);
  const hasConfusion = /ไม่รู้|ตัน|คิดไม่ออก|มึน|สับสน|เคว้ง|งง/i.test(latestMsg);

  // Short snippet of what user said
  const cleanSnippet = latestMsg.length > 25 ? `${latestMsg.slice(0, 25)}...` : latestMsg;

  // 4. Multi-turn Progressive Mindful Socratic Engine
  // Turn 1: Empathy & Grounding reflection
  if (turnCount === 1) {
    if (hasRelationship && hasSadness) {
      return `ฟังแล้วสัมผัสได้ถึงความน้อยใจเลยนะ... เวลาคนที่เราแคร์ทำตัวนิ่งใส่หรือไม่เป็นอย่างที่หวัง มันเจ็บข้างในมากจริงๆ\n\nตอนที่เกิดเรื่องนี้ขึ้น ในใจลึกๆ คุณอยากให้เขาทำหรือพูดอะไรกับคุณมากที่สุด?`;
    }
    if (hasFamily && (hasSadness || hasAnger)) {
      return `เรื่องในครอบครัวมักเป็นเรื่องที่ละเอียดอ่อนและกระทบใจเราได้ลึกที่สุดเนอะ...\n\nอะไรคือคำพูดหรือการกระทำในบ้านที่ทำให้คุณรู้สึกอึดอัดใจมากที่สุดในตอนนี้?`;
    }
    if (hasFriends && hasSadness) {
      return `การรู้สึกเหมือนถูกเพื่อนมองข้ามหรือไม่เป็นส่วนหนึ่ง มันชวนให้รู้สึกโดดเดี่ยวและนอยด์จริงๆ นะ...\n\nตอนที่รู้เรื่องนี้ ในหัวมันแวบความคิดอะไรขึ้นมาเป็นอย่างแรก?`;
    }
    if (hasWork && (hasExhaustion || hasAnger)) {
      return `เรื่องงานเวลามีเรื่องให้ปวดหัว มันดูดพลังชีวิตเราไปหมดเลยเนอะ...\n\nอะไรคือสิ่งที่ทำให้คุณรู้สึกเหนื่อยหรือหงุดหงิดกับเรื่องนี้มากที่สุดในตอนนี้?`;
    }
    if (hasAnxiety) {
      return `ความกังวลใจมันทำให้ข้างในรู้สึกกระวนกระวายและคิดวนไม่หยุดเลยเนอะ...\n\nอะไรคือสิ่งเลวร้ายที่สุดที่คุณกำลังกลัวว่าจะเกิดขึ้นจากเรื่องนี้?`;
    }
    if (hasConfusion) {
      return `เวลาที่ในหัวมันตื้อและคิดไม่ออก การพยายามเค้นหาคำตอบมักจะยิ่งทำให้ล้ากว่าเดิม\n\nงั้นเราลองพักเรื่องการหาทางออกไว้สักแป๊บ... ตอนนี้แค่ระบายสิ่งที่ติดค้างอยู่ในใจออกมา เล่าให้ฟังได้เลยนะ`;
    }
    if (hasExhaustion) {
      return `เหมือนตอนนี้พลังงานข้างในมันล้าจนไม่อยากแบกอะไรแล้วเนอะ...\n\nความรู้สึกเหนื่อยนี้มันสะสมมาจากเรื่องไหนเป็นพิเศษไหม?`;
    }

    return `รับฟังอยู่นะครับ... เรื่อง "${cleanSnippet}" คงกวนใจคุณมาสักพักแล้วใช่ไหม\n\nตอนที่เหตุการณ์นี้เกิดขึ้น ความรู้สึกแรกที่แวบขึ้นมาในใจคืออะไร? (เช่น กลัว, โกรธ, รู้สึกไม่ปลอดภัย, หรือน้อยใจ)`;
  }

  // Turn 2: Separate Fact from Story (แยกความจริง vs ความคิด)
  if (turnCount === 2) {
    if (hasAnger || hasSadness) {
      return `เข้าใจเลยครับ พอความรู้สึกนั้นเกิดขึ้น สมองเรามักจะเริ่มสร้าง "เรื่องเล่าในหัว" ต่อทันที\n\nตอนนั้นคุณกำลังบอกตัวเองว่ายังไงอยู่บ้าง? (เช่น "เขาไม่เห็นค่าฉัน", "ฉันไม่ดีพอ", หรือ "ทำไมต้องเป็นแบบนี้ตลอด")`;
    }
    return `พอได้ฟังแล้วเห็นภาพชัดขึ้นเลยครับ...\n\nถ้าเราลองแยกดู ระหว่าง "สิ่งที่เป็นความจริงที่เกิดขึ้นตรงๆ" กับ "สิ่งที่เรากำลังคิดกังวลไปเอง" คุณคิดว่า 2 อย่างนี้ต่างกันยังไงบ้าง?`;
  }

  // Turn 3: Identify Habitual Pattern & Hidden Need (มองเห็นลูปเดิมๆ)
  if (turnCount === 3) {
    return `สิ่งที่น่าสนใจคือ... ความคิดนั้นมันมักจะพาให้เราเผลอตอบสนองด้วยความเคยชินเดิมๆ (เช่น เงียบ, ประชด, ไถมือถือ, หรือโทษตัวเอง)\n\nเวลาเจอเรื่องแบบนี้ ปกติแล้วคุณมักจะทำอะไรต่อ แล้วผลลัพธ์ที่ตามมามันทำให้สบายใจขึ้นจริงไหม?`;
  }

  // Turn 4: Conscious Choice & Loop Solution (สร้างทางเลือกใหม่)
  if (turnCount === 4) {
    return `ถ้าเรามองดูสถานการณ์นี้จากมุมมองของเพื่อนที่มีสติ และรักตัวเอง...\n\nคุณคิดว่ามีทางเลือกอื่นที่เราทำได้ โดยที่ไม่ต้องทำร้ายตัวเองหรือเหนื่อยใจแบบเดิมไหม? ลองคิดมาสัก 1-2 ทางเลือกดูนะ`;
  }

  // Turn 5+: Mindful Integration & Closure
  const closures = [
    `พอได้ลองสะท้อนและมองย้อนดูแบบนี้ ความรู้สึกข้างในเริ่มเบาลงบ้างไหม หรือยังมีจุดไหนที่ยังติดค้างในใจอีก เล่าต่อได้เลยนะ`,
    `ดีมากๆ เลยที่คุณได้หยุดมองเห็นลูปความคิดของตัวเอง... การมีสติไม่ได้แปลว่าต้องหายโกรธทันที แต่คือการรู้ทันว่าใจกำลังเป็นอะไร\n\nตอนนี้อยากบันทึกลูปนี้เก็บไว้ หรืออยากคุยต่อเรื่องไหนอีกไหม?`,
    `การได้ระบายและเห็นตัวเองชัดขึ้นคือจุดเริ่มต้นของการหลุดจากลูปเดิมๆ เสมอ... ตอนนี้ใจรู้สึกนิ่งขึ้นบ้างหรือยังครับ?`,
  ];

  return closures[(turnCount) % closures.length];
}

/**
 * Advanced Autonomous CBT & Reality-Checking Conversation Engine
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

  const responseText = generateDynamicCBTResponse(history);

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
