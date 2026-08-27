import type { ChatMessage, LoopMapData } from '../types';

export interface ClientAiResponse {
  text: string;
  safetyMode?: 'normal' | 'explore' | 'protect';
  suggestedLoop?: Partial<LoopMapData>;
}

/**
 * Client-Side Autonomous AI Empathetic CBT & Mindful Loop Engine
 * Guarantees 100% uptime on Vercel, Netlify, Mobile, and offline static builds.
 */
export async function streamClientAiResponse(
  history: ChatMessage[],
  onChunk: (text: string) => void,
  onDone: (fullText: string) => void
): Promise<void> {
  const userMessages = history.filter((m) => m.role === 'user');
  const latestUserMsg = userMessages[userMessages.length - 1]?.text || '';
  const turnCount = userMessages.length;

  let responseText = '';

  // 1. Safety Check (Protect mode)
  if (/อยากตาย|ไม่อยากอยู่แล้ว|ทำร้ายตัวเอง|กรีดแขน|กินยาตาย|ฆ่าตัวตาย/i.test(latestUserMsg)) {
    responseText = `ความปลอดภัยและความรู้สึกของคุณสำคัญที่สุดในตอนนี้เลยนะ...
ขอให้คุณหยุดพัก หายใจเข้าลึกๆ ช้าๆ ก่อน

หากรู้สึกว่าอารมณ์ท่วมท้นจนรับไม่ไหว หรืออยู่ในภาวะวิกฤต ขอให้โทรหาสายด่วนฟรี 1323 (กรมสุขภาพจิต 24 ชม.) หรือโทร 02-107-7977 (สะมาริตันส์) เพื่อให้มีผู้เชี่ยวชาญคอยรับฟังและดูแลความปลอดภัยคุณทันทีนะครับ`;
  }
  // 2. Feeling confused / stuck
  else if (/ไม่รู้(จะทำยังไง|อะ|เลย|อ่ะ)|ตัน|คิดไม่ออก|มึน|สับสน|เคว้ง/i.test(latestUserMsg)) {
    responseText = `เวลาที่หัวมันตื้อและคิดไม่ออก การพยายามเค้นหาคำตอบมักจะยิ่งทำให้เหนื่อยกว่าเดิม

งั้นเราลองพักเรื่องการหาทางออกไว้ก่อน... ตอนนี้แค่ระบายสิ่งที่อึดอัดออกมา หรืออยากพักเงียบๆ สักแป๊บดี?`;
  }
  // 3. Boredom / Burnout
  else if (/^เบื่อ$|^เซ็ง$|^เหนื่อย$|หมดไฟ|ล้า|หมดแรง/i.test(latestUserMsg.trim())) {
    responseText = `เหมือนตอนนี้พลังงานข้างในมันล้าจนไม่อยากแบกอะไรแล้ว

ความรู้สึกนี้มันมาจากเรื่องไหนเป็นพิเศษไหม เช่น งาน คนรอบข้าง หรือรู้สึกเฉื่อยชาไปหมดเลย?`;
  }
  // 4. Anger / Frustration
  else if (/โกรธ|โมโห|เกลียด|หงุดหงิด|ล่ก|ประสาทเสีย|ด่า/i.test(latestUserMsg)) {
    responseText = `เข้าใจเลย ความโกรธมันทำให้ข้างในร้อนและใจเต้นแรงมาก

ก่อนที่เราจะตัดสินใจทำอะไรต่อ ลองถอนหายใจลึกๆ 1 ครั้ง... อะไรคือคำพูดหรือการกระทำที่ไปสะกิดให้รู้สึกโกรธที่สุดในตอนนั้น?`;
  }
  // 5. Relationship / Hurt
  else if (/แฟน|คนรัก|เพื่อน|หัวหน้า|ไม่สนใจ|เมิน|ทิ้ง|นอกใจ|น้อยใจ/i.test(latestUserMsg)) {
    responseText = `ฟังแล้วรู้สึกได้ถึงความน้อยใจและความเจ็บข้างในเลยนะ... เหมือนเราให้ความสำคัญกับเขา แต่กลับไม่ได้สิ่งที่คาดหวังตอบกลับมา

ตอนที่เกิดเรื่องนั้นขึ้น ในใจลึกๆ คุณอยากให้เขาทำหรือพูดอะไรกับคุณมากที่สุด?`;
  }
  // 6. Progressive turn-based conversational CBT
  else if (turnCount === 1) {
    responseText = `รับฟังอยู่นะครับ... เรื่องนี้คงกวนใจคุณมาสักพักแล้วใช่ไหม

ตอนที่เหตุการณ์นี้เกิดขึ้น ความรู้สึกแรกที่แวบขึ้นมาในใจคืออะไร? (เช่น กลัว, โกรธ, รู้สึกไม่ปลอดภัย, หรือน้อยใจ)`;
  } else if (turnCount === 2) {
    responseText = `เข้าใจเลยครับ พอรู้สึกแบบนั้น หัวเรามันมักจะเริ่มคิดแปลความหมายไปเองโดยอัตโนมัติ

ตอนนั้นคุณกำลังบอกตัวเองว่ายังไงอยู่บ้าง? (เช่น "ฉันคงไม่ดีพอ", "เขาไม่แคร์ฉัน", หรือ "ไม่มีใครช่วยฉันได้")`;
  } else if (turnCount === 3) {
    responseText = `สิ่งที่น่าสนใจคือ... ความคิดนั้นมันพาให้เราตอบสนองแบบเดิมๆ อัตโนมัติ (เช่น เงียบ, ประชด, หรือถอยหนี)

ถ้าเรามองดูตัวเองจากมุมมองของผู้ใหญ่ที่มีสติ... คุณคิดว่ามีทางเลือกอื่นที่เราทำได้ โดยไม่ต้องทำร้ายตัวเองหรือคนอื่นไหม?`;
  } else {
    responseText = `พอได้ลองมองย้อนดูแบบนี้ ความรู้สึกข้างในเริ่มเบาลงบ้างไหม หรือยังมีจุดไหนที่ยังติดค้างในใจอีก เล่าต่อได้เลยนะ`;
  }

  // Stream text smoothly with typewriter effect
  let currentIndex = 0;
  const chunkSize = 3;
  const interval = setInterval(() => {
    if (currentIndex < responseText.length) {
      const nextSlice = responseText.slice(currentIndex, currentIndex + chunkSize);
      onChunk(nextSlice);
      currentIndex += chunkSize;
    } else {
      clearInterval(interval);
      onDone(responseText);
    }
  }, 18);
}
