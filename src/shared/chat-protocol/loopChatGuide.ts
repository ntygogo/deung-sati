import type { ChatEngineTurnResponse } from './structuredOutputSchema.js';

export const LOOP_CHAT_FIELDS = ['trigger', 'emotion_or_body', 'automatic_story', 'facts', 'needs', 'options', 'micro_action', 'reflection'] as const;
export type LoopChatField = typeof LOOP_CHAT_FIELDS[number];
export const LOOP_CHAT_START = 'ค่อย ๆ สำรวจลูปด้วยกัน';
export const LOOP_CHAT_VENT = 'อยากระบายต่อ';
export const LOOP_CHAT_SKIP = 'ข้ามข้อนี้ก่อน';
export const LOOP_CHAT_HELP = 'ยังไม่รู้ ช่วยไกด์หน่อย';
export const LOOP_CHAT_REVIEW = 'สรุปแล้วบันทึก';
export interface LoopChatGuide {
  mode: 'listening' | 'offered' | 'guided' | 'review';
  fields: Partial<Record<LoopChatField, string>>;
  skipped: LoopChatField[];
  asked: LoopChatField | null;
  nextOfferAt: number;
  preferListening?: boolean;
  helpAttempts?: Partial<Record<LoopChatField, number>>;
  emotionSourceAfter?: number;
}
type Message = { role: string; content?: string; text?: string };
const questions: Record<LoopChatField, string> = {
  trigger: 'ก่อนรู้สึกแบบนี้ มีเหตุการณ์หรือคำพูดไหนมากระทบใจเธอ?',
  emotion_or_body: 'ตอนนั้นเป็นอย่างไรสำหรับเธอ? ใช้คำธรรมดาที่ใกล้กับตัวเอง หรือบอกว่ายังไม่รู้ก็ได้นะ',
  automatic_story: 'ตอนนั้นมีความคิดหรือประโยคอะไรแวบขึ้นมาในหัว?',
  facts: 'ลองดูเฉพาะสิ่งที่เห็นหรือได้ยินก่อน โดยยังไม่ต้องรู้เหตุผลของมัน ตอนนั้นเกิดอะไรขึ้นที่เธอจำได้บ้าง?',
  needs: 'ถ้าเรื่องนี้ดีขึ้นได้สักนิด เธออยากให้มีอะไรเปลี่ยนไป?',
  options: 'ตอนนี้พอมองเห็นทางเลือกอะไรที่เป็นไปได้บ้าง?',
  micro_action: 'ถ้าเลือกก้าวเล็ก ๆ ที่พอทำไหว เธออยากลองทำอะไร?',
  reflection: 'พอได้คุยเรื่องนี้ มีอะไรที่เธอเริ่มสังเกตเห็นต่างจากตอนแรกบ้าง? เล็กน้อยก็ได้นะ',
};
const helpText: Record<LoopChatField, [string, string]> = {
  trigger: ['หมายถึงจังหวะที่ใจเริ่มสะดุด ไม่ต้องเล่าทั้งเรื่องก็ได้ ก่อนหน้านั้นมีอะไรเกิดขึ้นหรือได้ยินคำพูดอะไรบ้าง?', 'ลองนึกถึงภาพเล็ก ๆ ภาพเดียว เช่น ตอนเปิดอ่านข้อความหรือตอนอยู่กับใคร มีช่วงไหนที่พอนึกออกไหม?'],
  emotion_or_body: ['ยังไม่ต้องหาชื่ออารมณ์ให้ถูกนะ ใช้คำธรรมดาอย่าง “ค้าง ๆ” หรือ “เฉย ๆ” ก็ได้ ตัวอย่างอาจไม่ตรงกับเธอเลย มีคำของเธอเองที่ใกล้กว่าไหม หรือยังไม่รู้ก็ได้?', 'เราไม่ต้องเลือกชื่ออารมณ์ตอนนี้ก็ได้ ถ้าคำไหนไม่ตรงไม่ต้องใช้ เราเว้นช่องนี้ไว้ก่อนและคุยจากเหตุการณ์ต่อได้ เธออยากพักข้อนี้ไว้ก่อนไหม?'],
  automatic_story: ['หมายถึงคำพูดที่ใจพูดกับตัวเองตอนนั้น ไม่ใช่สิ่งที่ต้องคิดให้ถูก เช่นความกังวลหรือการคาดเดา มีประโยคสั้น ๆ อะไรที่พอนึกออกไหม?', 'ลองเติมแค่ช่วงต้นว่า “ตอนนั้นฉันนึกว่า…” ก็ได้ ถ้ายังไม่มีคำพูดขึ้นมา เราพักข้อนี้ไว้ได้ มีอะไรแวบขึ้นมาบ้างไหม?'],
  facts: ['ข้อนี้แยกสิ่งที่เกิดขึ้นจากสิ่งที่เราคาดเดา เหมือนกล้องที่เห็นภาพและได้ยินเสียง ตอนนั้นมีใครพูดหรือทำอะไรที่เธอจำได้ชัดบ้าง?', 'เช่น “เขายังไม่ตอบข้อความ” เป็นสิ่งที่สังเกตได้ ส่วน “เขาไม่สนใจฉัน” ยังเป็นการตีความ ตัวอย่างนี้อาจไม่ใช่เรื่องของเธอ ในเรื่องที่เล่ามามีส่วนไหนที่สังเกตได้แบบแรกบ้าง?'],
  needs: ['ยังไม่ต้องตั้งชื่อความต้องการก็ได้ เช่น อยากพัก อยากได้ข้อมูลให้ชัด หรืออยากมีคนฟัง มีอย่างไหนใกล้สิ่งที่เธอขาดอยู่ตอนนี้บ้าง หรือยังไม่ตรงเลยก็ได้?', 'ลองนึกถึงตอนที่เรื่องนี้เบาลงนิดหนึ่ง อะไรเล็ก ๆ ที่มีเพิ่มขึ้นหรือหายไปแล้วจะช่วยเธอได้? ไม่ต้องเป็นสิ่งที่คนอื่นทำให้ก็ได้นะ'],
  options: ['ลองดูเป็นตัวอย่างก่อนนะ เราอาจพักการตัดสินใจไว้สักนิด หรือแยกเรื่องที่จัดการได้เพียงส่วนเดียวก่อน ยังไม่ต้องเลือกทำจริง มีทางไหนใกล้สิ่งที่เธอพอทำไหวไหม?', 'เราอาจลดสิ่งที่จะทำให้เล็กลง หรือขอข้อมูลที่ยังไม่ชัดก่อนตัดสินใจ ตัวอย่างอาจไม่ตรงกับเธอก็ได้ ตอนนี้ติดตรงไหนมากที่สุด?'],
  micro_action: ['ไม่ต้องแก้ทั้งเรื่องหรือลงมือทันทีนะ แค่ก้าวเล็กมาก ๆ ที่เธอเลือกเอง เช่นขอเวลาคิดก่อน มีอะไรเล็กพอที่เธอพอทำไหวไหม?', 'ถ้ายังไม่พร้อมทำอะไร เราไม่ต้องตั้งภารกิจเพิ่มก็ได้ ตอนนี้อยากพักไว้ก่อน หรือมีก้าวเล็กกว่านั้นที่พอไหว?'],
  reflection: ['ไม่ต้องมีบทเรียนสวย ๆ ก็ได้นะ เช่นเริ่มเห็นว่าตัวเองเหนื่อย หรือยังมีเรื่องที่ไม่รู้ เมื่อเทียบกับตอนเริ่มคุย มีอะไรที่เธอสังเกตได้เพิ่มนิดหนึ่งไหม?', 'ถ้ายังไม่เห็นอะไรเพิ่มก็ไม่เป็นไร ไม่ได้แปลว่าคุยเสียเปล่า เราเก็บเท่าที่มีไว้ได้ ตอนนี้อยากพักข้อนี้ไว้ก่อนไหม?'],
};
const practiceQuestions: Record<LoopChatField, string> = {
  trigger: 'มีเหตุการณ์หรือคำพูดไหนที่พอจำได้ว่าใจเริ่มสะดุด?',
  emotion_or_body: 'มีคำธรรมดาคำไหนใกล้กับที่เป็นอยู่ตอนนี้บ้าง? ยังไม่ต้องหาชื่ออารมณ์ให้ถูกนะ',
  automatic_story: 'ถ้าลองเติมว่า “ตอนนั้นฉันนึกว่า…” มีคำไหนผุดขึ้นมาบ้าง?',
  facts: 'ตอนนั้นมีใครพูดหรือทำอะไรที่เธอจำได้บ้าง?',
  needs: 'ถ้ามีอะไรช่วยให้เรื่องนี้เบาลงได้สักนิด เธออยากให้เป็นอะไร?',
  options: 'มีทางไหนที่เธอพอลองมองไว้ได้ โดยยังไม่ต้องเลือกทำจริง?',
  micro_action: 'มีก้าวเล็กแค่ไหนที่รู้สึกพอไหวสำหรับเธอ?',
  reflection: 'ตอนนี้มีอะไรที่เธอสังเกตเห็นเพิ่มขึ้นนิดหนึ่งบ้าง?',
};
function understandsExplanation(text: string, previousReply: string): boolean {
  const t = text.trim().replace(/\s+/gu, '').replace(/[.!?…。！？]+$/u, '').replace(/(?:นะ|ค่ะ|คะ|ครับ|จ้า|จ้ะ)+$/u, '');
  return /^(?:อ๋อ|อ้อ)?(?:เข้าใจแล้ว|พอเข้าใจแล้ว|เห็นภาพแล้ว|เข้าใจขึ้นแล้ว)$/u.test(t) ||
    (/เข้าใจ|เห็นภาพ|เห็นความต่าง|เห็นความแตกต่าง/u.test(previousReply) && /^(?:ใช่|อ๋อ|อ้อ|เข้าใจ)$/u.test(t));
}
function isHelpText(text: string): boolean {
  const t = text.trim().replace(/\s+/gu, '').replace(/[.!?…。！？]+$/u, '');
  return t === LOOP_CHAT_HELP.replace(/\s+/gu, '') || /^(?:(?:เรา|ฉัน|ผม|หนู|ยัง|ก็|ตอนนี้|เอ่อ|คือ))*(?:ไม่รู้|ไม่เข้าใจ|ไม่ค่อยเข้าใจ|ไม่แน่ใจ|นึกไม่ออก|คิดไม่ออก|ตอบไม่ได้|ตอบไม่ถูก|งง)(?:เลย|จริงๆ|นะ|ค่ะ|ครับ|อะ|อ่ะ|เหมือนกัน)*$/u.test(t) ||
    /^(?:(?:เรา|ฉัน|ผม|หนู|ยัง|ก็))*(?:ไม่รู้|ไม่เข้าใจ|ไม่แน่ใจ)(?:ว่า)?(?:ต้องการอะไร|จะตอบอะไร|จะตอบยังไง|คำถาม|ตัวเอง|ใจตัวเอง)/u.test(t) ||
    /^(?:ช่วยอธิบาย|ช่วยยกตัวอย่าง|ขอตัวอย่าง|ขอคำอธิบาย|หมายถึงอะไร|หมายความว่า|ต้องตอบยังไง|ต้องตอบอะไร)/u.test(t) ||
    /^(?:ความต้องการ|ข้อเท็จจริง|ความคิดอัตโนมัติ|ทางเลือก|การสะท้อนคิด)(?:คืออะไร|หมายถึงอะไร|คือยังไง)/u.test(t);
}
type LoopChatControl = 'start' | 'vent' | 'skip' | 'review' | 'explain' | 'pause';
const terminalExplore = /(?:^|[\s,.!])(?:เรา|ฉัน|ผม|หนู)?(?:อยาก|ขอ|พร้อม)สำรวจ(?:ลูป|เรื่องนี้|ตัวเอง)?(?:ต่อ|เลย|ด้วยกัน)?(?:นะ|ค่ะ|ครับ|จ้ะ|จ้า)?[.!?]*$/u;
function explorationRequestAtEnd(text: string): RegExpExecArray | null {
  const match = terminalExplore.exec(text.trim());
  if (!match || /(?:บอก(?:ว่า|ให้)?|ถามว่า|พูดว่า|คำว่า)[\s“"'「]*$/u.test(text.slice(0, match.index))) return null;
  return match;
}
function loopChatControl(text: string, offered = false): LoopChatControl | null {
  const input = text.normalize('NFC').trim().replace(/\s+/gu, '')
    .replace(/[.!?…。！？]+$/u, '').replace(/(?:(?:นะ|ค่ะ|คะ|ครับ|จ้า|จ้ะ|จ๊ะ|ฮะ|น้า))+$/u, '');
  if (/^(?:(?:อยาก|ขอ)?ระบาย(?:ต่อ|ก่อน|ต่อก่อน)?|(?:ขอ)?คุยต่อก่อน|ยังไม่พร้อม|ไม่อยากสำรวจ|ยังไม่อยากสำรวจ|ยังไม่พร้อมสำรวจ|ไม่พร้อมสำรวจ)$/u.test(input)) return 'vent';
  const ownRequest = !/[“”"'「」]|(?:เขา|เธอ|แม่|พ่อ|เพื่อน|หัวหน้า)(?:เคย)?บอก(?:ว่า|ให้)|ถามว่า|เขาอยาก|ไม่อยากให้ช่วย|ไม่ต้องพา|อย่าพา/u.test(input);
  if (explorationRequestAtEnd(text)) return 'start';
  if (ownRequest && /^(?:อยาก|ขอ)ระบาย(?:ต่อ|ก่อน|ต่อก่อน)(?:\s|[,.!])/u.test(text.trim())) return 'vent';
  if (ownRequest && /(?:^|[\s,.!])(?:อยาก|ขอ)(?:ให้)?(?:ฟัง|รับฟัง)(?:ก่อน|เฉยๆ)(?:\s|[,.!]|$)/u.test(text.trim())) return 'vent';
  if (ownRequest && /ขอข้าม(?:ข้อนี้)?(?:ไว้|ไป)?ก่อน$/u.test(input) && !/ไม่(?:อยาก)?ข้าม|อย่าข้าม/u.test(input)) return 'skip';
  if (ownRequest && /^(?:สำรวจคืออะไร|สำรวจยังไง|ต้องสำรวจอะไร|สำรวจหมายถึงอะไร)$/u.test(input)) return 'explain';
  if (ownRequest && (/^ช่วยพาไปทีละ(?:นิด|ข้อ)(?:ได้ไหม|หน่อย|ที)?$/u.test(input) || /(?:^|[\s,.!])ช่วยพาสำรวจ(?:ต่อ)?(?:หน่อย|ได้ไหม|ที)?(?:นะ|ค่ะ|ครับ)?$/u.test(text.trim()) || /^ช่วยหน่อยอยากเข้าใจ$/u.test(input))) return 'start';
  if (offered && ownRequest && /^(?:ได้|ได้เลย|โอเค|ตกลง)แต่(?:ขอ)?(?:อย่า|ไม่ต้อง)(?:ถามยาก|เร่ง|รีบ)$/u.test(input)) return 'start';
  if (ownRequest && /^(?:อยาก|ขอ)สำรวจ(?:ลูป|เรื่องนี้|ตัวเอง)?แต่(?:ยัง)?(?:ไม่รู้|ไม่แน่ใจ)(?:ว่าจะ|จะ)?ตอบ(?:ได้ไหม|ได้หรือเปล่า|ยังไง)$/u.test(input)) return 'start';
  if (ownRequest && /^(?:อยาก|ขอ)สำรวจ(?:ลูป|เรื่องนี้|ตัวเอง)?แต่.+/u.test(input) && !/แต่(?:วันนี้)?(?:ยัง)?(?:ไม่พร้อม|ไม่อยากสำรวจ|ขอพัก|เอาไว้ก่อน|เปลี่ยนใจ)/u.test(input)) return 'start';
  if (ownRequest && /(?:^|[\s,.!])(?:แค่)?อยู่เงียบ\s*ๆ(?:\s*ด้วยกัน)?\s*ก็พอ(?:นะ|ค่ะ|ครับ)?$/u.test(text.trim()) && !/ไม่อยากอยู่เงียบ|ไม่ต้องอยู่เงียบ/u.test(input)) return 'pause';
  if (ownRequest && !/ไม่อยาก(?:พัก|พอ)|ไม่ต้อง(?:พัก|พอ)/u.test(input) && /(?:^|[\s,.!])(?:วันนี้)?(?:ขออยู่แค่นี้ก่อน|วันนี้พอก่อน|ขอพอก่อน|ขอพักก่อน)(?:\s|$)/u.test(text.trim())) return 'pause';
  if (/^(?:(?:เรา|ฉัน|ผม|หนู)?(?:อยาก|ขอ|พร้อม|ช่วย)?(?:ลอง|เริ่ม)?สำรวจ(?:ลูป|เรื่องนี้|ตัวเอง)?(?:ด้วยกัน|กัน)?(?:ต่อ|เลย|ดู|หน่อย)?|(?:ขอ|อยาก)?ไป(?:ขั้นตอน)?(?:ถัดไป|ต่อ)|ค่อยๆสำรวจลูปด้วยกัน)$/u.test(input)) return 'start';
  if (offered && /^(?:ได้|ได้เลย|โอเค|ตกลง|เอาเลย|ลองดู|ลองเลย|ต่อเลย|พร้อม|พร้อมแล้ว)$/u.test(input)) return 'start';
  if (/^(?:ข้าม(?:ข้อนี้)?(?:ไป)?(?:ก่อน)?|ขอข้าม(?:ข้อนี้)?(?:ก่อน)?)$/u.test(input)) return 'skip';
  if (input === LOOP_CHAT_REVIEW) return 'review';
  return null;
}
// Consent and navigation are not observations to put into the user's trace.
const isControlText = (text: string) => loopChatControl(text, true) !== null;
function observationText(text: string): string {
  if (!isControlText(text)) return text;
  const request = explorationRequestAtEnd(text);
  return request ? text.slice(0, request.index).trim() : '';
}
const reportedThought = /(?:ทุกคน|คนอื่น|เขา|เธอ|แม่|พ่อ|เพื่อน|หัวหน้า)(?:ก็)?(?:คิดว่า|มองว่า|บอกว่า|บอกให้|คาดหวังว่า)/gu;
const ownThought = /(?:(?:เรา|ฉัน|ผม|หนู)(?:เอง)?(?:ก็|เลย|กลับ)?|ตอนนั้น)(?:คิดว่า|นึกว่า|เชื่อว่า|กลัวว่า)/gu;
function lastMatchIndex(text: string, pattern: RegExp): number {
  return [...text.matchAll(pattern)].at(-1)?.index ?? -1;
}
// Literal presence is necessary, but a quoted request or another person's belief
// is not automatically an observation belonging to this field.
function groundedObservation(key: LoopChatField, quote: string, source: string): boolean {
  let index = source.indexOf(quote);
  while (index >= 0) {
    const throughQuote = source.slice(0, index + quote.length);
    const before = source.slice(0, index);
    const reporting = lastMatchIndex(throughQuote, reportedThought);
    const endorsement = lastMatchIndex(throughQuote, ownThought);
    const isOthersThought = key === 'automatic_story' && reporting >= 0 && endorsement < reporting;
    const help = /(?:ช่วยยกตัวอย่าง|ขอ(?:แค่)?ตัวอย่าง|มีตัวอย่าง|ขอ(?:แค่)?ประโยค|หมายถึงอะไร|ทางเลือกคืออะไร)/u.exec(throughQuote);
    const userChoice = /(?:เรา|ฉัน|ผม|หนู)(?:จะ|อาจ|เลือก|อยากลอง)/u.exec(throughQuote);
    const isHelpFragment = ['options', 'micro_action', 'needs'].includes(key) && Boolean(help && (!userChoice || userChoice.index < help.index));
    const isLabelPreference = key === 'needs' && /(?:ใช้คำว่า|เรียกว่า|เรียกแบบนี้|ชื่ออารมณ์)/u.test(quote);
    const isUnchosenAction = key === 'micro_action' && /(?:ดีไหม|ได้ไหม|หรือเปล่า|ยังไม่พร้อม|ยังไม่อยากทำ|^(?:เรา|ฉัน|ผม|หนู)?อาจ)/u.test(quote);
    // Do not remove an attribution and promote its content to an observed fact.
    const isThoughtAsFact = key === 'facts' && (
      /^(?:เรา|ฉัน|ผม|หนู)?(?:คิดว่า|นึกว่า|เชื่อว่า|กลัวว่า)/u.test(quote) ||
      /(?:คิดว่า|นึกว่า|เชื่อว่า|กลัวว่า)$/u.test(before.trim())
    );
    if (!isOthersThought && !isHelpFragment && !isLabelPreference && !isUnchosenAction && !isThoughtAsFact) return true;
    index = source.indexOf(quote, index + quote.length);
  }
  return false;
}
function validObservation(key: LoopChatField, value: string): boolean {
  if (key === 'needs' && /(?:ใช้คำว่า|เรียกว่า|เรียกแบบนี้|ชื่ออารมณ์)/u.test(value)) return false;
  if (key !== 'automatic_story') return true;
  if (lastMatchIndex(value, reportedThought) >= 0 && lastMatchIndex(value, ownThought) < lastMatchIndex(value, reportedThought)) return false;
  // A body sensation or the act of self-criticism is not the content of a thought.
  return !/^(?:มัน)?(?:อัดแน่นในหัว|แน่นหน้าอก|ตึงที่ไหล่|จุกที่อก|หัวตื้อ)(?:ไปหมด|มาก|ๆ)?$/u.test(value.replace(/\s+/gu, '')) &&
    !/^(?:เอาแต่|ก็)?(?:ด่า|โทษ|ตำหนิ)ตัวเอง(?:มาก|ซ้ำ|ๆ)*$/u.test(value.replace(/\s+/gu, ''));
}
export function isChatWrapUpIntent(text: string): boolean {
  const input = text.normalize('NFC').trim().replace(/\s+/gu, '').replace(/[.!?…。！？]+$/u, '');
  // Only an explicit whole-message farewell ends a chat. Gratitude, negation,
  // reported speech, and the syllable บาย inside ระบาย/สบาย are not goodbyes.
  return /^(?:(?:วันนี้)?(?:ขอ)?(?:พอแค่นี้|แค่นี้ก่อน|จบการคุย|จบแค่นี้)(?:ก่อน)?|(?:เรา|ฉัน|ผม|หนู)?(?:จะ)?(?:ไปนอนแล้ว|ไปทำงานก่อน|ขอตัวก่อน)|(?:บ๊าย)?บาย)(?:นะ|จ้ะ|จ้า|ครับ|ค่ะ|คะ|ๆ)*$/u.test(input);
}
const textOf = (m: Message) => (m.content || m.text || '').trim();
const emotionWords = '(?:โกรธ|หงุดหงิด|รำคาญ|เศร้า|เสียใจ|น้อยใจ|อิจฉา|หึง|กลัว|กังวล|อาย|โล่ง|ดีใจ|อึดอัด|ตื้อ)';
function correctsEmotion(text: string): boolean {
  const t = text.replace(/[“”"'「」]/gu, '');
  if (/(?:เขา|แม่|พ่อ|เพื่อน|หัวหน้า)(?:บอก|ถาม)ว่า/u.test(t)) return false;
  return new RegExp(`(?:^|[\\s,.!?]|แต่)(?:(?:เรา|ฉัน|ผม|หนู)(?:ก็|ยัง)?)?(?:ไม่ได้|ไม่ใช่|ไม่)(?:รู้สึก)?${emotionWords}`, 'u').test(t) ||
    new RegExp(`(?:อย่า(?:เพิ่ง)?|ไม่ต้อง)(?:สรุป|บอก|เรียก)(?:ว่า)?(?:เรา|ฉัน)?${emotionWords}`, 'u').test(t) ||
    new RegExp(`(?:คำว่า${emotionWords}.{0,20}(?:ไม่แน่ใจ|ไม่ตรง)|(?:เรา|ฉัน)(?:ยัง)?ไม่แน่ใจว่า${emotionWords}|ขอแก้จาก${emotionWords}|ขอถอนคำว่า${emotionWords}|ไม่เอาคำว่า${emotionWords})`, 'u').test(t);
}
function groundedEmotionQuote(quote: string, source: string): boolean {
  if (new RegExp(`^(?:เรา|ฉัน)?(?:ไม่ได้|ไม่ใช่|ไม่)(?:รู้สึก)?${emotionWords}`, 'u').test(quote) || /^(?:ยัง)?(?:ไม่รู้|ไม่แน่ใจ|บอกไม่ได้|บอกไม่ถูก)(?:ว่า|จะ)/u.test(quote)) return false;
  let index = source.indexOf(quote);
  while (index >= 0) {
    const before = source.slice(0, index).split(/แต่|แค่|ตอนนี้|[.,!?\n]/u).pop()!.replace(/\s+/gu, '');
    const after = source.slice(index + quote.length);
    const denied = /(?:ไม่ได้|ไม่ใช่|ไม่|ไม่รู้สึก|อย่า(?:เพิ่ง)?(?:สรุป|บอก|เรียก)|ไม่ต้อง(?:สรุป|บอก|เรียก)|ขอถอนคำ|ขอแก้จาก)(?:ว่า)?(?:เรา|ฉัน)?$/u.test(before);
    const qualified = /มั้ง|เหมือน|อาจ|น่าจะ|คิดว่า|ไม่แน่ใจ/u.test(quote);
    const uncertain = (/(?:ไม่รู้|ไม่แน่ใจ|บอกไม่ได้|บอกไม่ถูก|ถ้า).{0,40}$/u.test(before) || /(?:คิดว่า|เหมือน|อาจ|น่าจะ)$/u.test(before) || /^[^\s,.!?]{0,12}มั้ง/u.test(after)) && !qualified;
    const someoneElse = /(?:เขา|แม่|พ่อ|เพื่อน|หัวหน้า)(?:กำลัง|รู้สึก)?$/u.test(before);
    const metaLabel = /คำว่า$/u.test(before) && /^(?:เราก็)?(?:ยัง)?ไม่แน่ใจ/u.test(after.replace(/\s+/gu, ''));
    if (!denied && !uncertain && !metaLabel && !someoneElse) return true;
    index = source.indexOf(quote, index + quote.length);
  }
  return false;
}
export function prepareLoopChat(messages: Message[], previous?: unknown) {
  const input = previous && typeof previous === 'object' ? previous as Partial<LoopChatGuide> : {};
  const fields: LoopChatGuide['fields'] = {};
  const helpAttempts: NonNullable<LoopChatGuide['helpAttempts']> = {};
  for (const key of LOOP_CHAT_FIELDS) {
    const value = input.fields?.[key];
    if (typeof value === 'string' && value.trim() && validObservation(key, value.trim())) fields[key] = value.trim().slice(0, 600);
    const attempts = input.helpAttempts?.[key];
    if (typeof attempts === 'number' && Number.isFinite(attempts)) helpAttempts[key] = Math.min(3, Math.max(0, Math.floor(attempts)));
  }
  const state: LoopChatGuide = {
    mode: ['listening', 'offered', 'guided', 'review'].includes(input.mode || '') ? input.mode! : 'listening',
    fields, helpAttempts,
    skipped: Array.isArray(input.skipped) ? input.skipped.filter(k => LOOP_CHAT_FIELDS.includes(k)) : [],
    asked: LOOP_CHAT_FIELDS.includes(input.asked as LoopChatField) ? input.asked! : null,
    nextOfferAt: typeof input.nextOfferAt === 'number' ? Math.max(2, input.nextOfferAt) : 2,
    preferListening: input.preferListening === true,
  };
  const userTexts = messages.filter(m => m.role === 'user').map(textOf);
  for (const key of LOOP_CHAT_FIELDS) {
    const value = state.fields[key];
    if (!value) continue;
    const sources = userTexts.filter(text => text.includes(value));
    if (sources.length && !sources.some(text => groundedObservation(key, value, text))) delete state.fields[key];
  }
  const latest = userTexts[userTexts.length - 1] || '';
  const preferredEmotion = /(?:^|\s|แต่)(?:เรา|ฉัน|ผม|หนู)?(?:ขอใช้คำ|ขอเรียก)ว่า/u.test(latest);
  const emotionCorrection = correctsEmotion(latest) || preferredEmotion;
  state.emotionSourceAfter = Number.isInteger(input.emotionSourceAfter) ? Math.max(0, Math.min(input.emotionSourceAfter!, userTexts.length - 1)) : 0;
  if (emotionCorrection) {
    const mentioned = latest.match(new RegExp(emotionWords, 'gu')) || [];
    // Rejecting "angry" must not erase an already accepted description such as "annoyed".
    if (preferredEmotion || mentioned.some(word => state.fields.emotion_or_body?.includes(word))) delete state.fields.emotion_or_body;
    state.emotionSourceAfter = Math.max(0, userTexts.length - 1);
  }
  const count = userTexts.filter(t => observationText(t)).length;
  const control = loopChatControl(latest, state.mode === 'offered');
  if (control === 'start') { state.mode = 'guided'; state.skipped = []; state.preferListening = false; }
  if (control === 'vent') {
    state.mode = 'listening'; state.asked = null; state.nextOfferAt = count + 3; state.preferListening = true;
  }
  if (control === 'pause') { state.mode = 'listening'; state.asked = null; state.preferListening = true; }
  if (control === 'explain') { state.mode = 'offered'; state.asked = null; }
  // If the user keeps telling their story, listen instead of repeating the offer every turn.
  if (state.mode === 'offered' && !control) {
    state.mode = 'listening'; state.asked = null; state.nextOfferAt = count + 3;
  }
  if (control === 'skip' && state.mode === 'guided' && state.asked) {
    state.skipped = [...new Set([...state.skipped, state.asked])];
    // Declining action while considering choices must not lead straight to another action question.
    if (/(?:ยัง)?ไม่พร้อมทำอะไร|ยังไม่อยากทำอะไร|ไม่พร้อมลงมือ|ไม่พร้อมคิดทางเลือก/u.test(latest)) {
      state.skipped = [...new Set([...state.skipped, 'options' as const, 'micro_action' as const])];
    }
    state.asked = null;
  }
  const assistantTexts = messages.filter(m => m.role === 'assistant' || m.role === 'ai').map(textOf);
  const lastAssistantText = assistantTexts[assistantTexts.length - 1] || '';
  const understood = state.mode === 'guided' && Boolean(state.asked && state.helpAttempts?.[state.asked]) && !control && understandsExplanation(latest, lastAssistantText);
  const helpRequested = state.mode === 'guided' && Boolean(state.asked) && !control && (isHelpText(latest) || understood);
  const requestedExercise = !/ไม่อยาก|ไม่ต้อง|อย่า|ยังไม่|บอกว่า/u.test(latest) && /(?:ขอ|อยาก|ช่วย|ลอง)(?:ฝึกหายใจ|ทำแบบฝึก|พาหายใจ|สอน(?:วิธี)?หายใจ|ทำgrounding)/u.test(latest.replace(/\s+/gu, ''));
  const deferOffer = /ไหม|เหรอ|หรือเปล่า|ยังไง|อย่างไร|หมายถึง|ขอ(?:แค่)?(?:ตัวอย่าง|ประโยค|คำอธิบาย)|อย่าเพิ่ง|ไม่ต้อง(?:สรุป|บอก|เรียก)/u.test(latest);
  return { state, userTexts, latest, count, control, helpRequested, understood, lastAssistantText, requestedExercise, emotionCorrection, preferredEmotion, deferOffer };
}
export type LoopChatContext = ReturnType<typeof prepareLoopChat>;

export function loopChatInstruction(context: LoopChatContext): string {
  return `
[LOOP TRACE CHAT — applies after all safety rules]
Collect the user's own observations across eight fields while keeping conversation natural.
Current interaction mode: ${context.state.mode}. Last asked field: ${context.state.asked || 'none'}.
Respond to THIS turn, not an earlier request for help. Distress alone does not mean the person wants an exercise. Keep recommendedExercise null unless they explicitly request a tool. Never send them away from chat just because they are unsure or upset.
User chose to keep talking: ${context.state.preferListening === true}. In this case stay with their story until THEY ask to explore. Do not offer a summary, saving, a break, an exercise, or another mode-choice menu. “อยากระบายต่อ” means keep listening, never goodbye. Gratitude alone also does not end a conversation. Reflect the latest feeling or event naturally without recapping everything; allow space to talk without requiring a question every turn. Summarize only when explicitly requested.
The user may be new to reflection. Their pace matters more than finishing all eight fields. Never frame this as a test or a task they must finish.
The user owns their emotion description. Never persuade them that they are angry, jealous, afraid or sad when they reject that word. A rough sensation, neutral state, mixed feelings or uncertainty is acceptable. Do not turn uncertainty into an assertion, and do not use body scans as the default when a person cannot name a feeling. If they request concrete wording, put an actual usable sentence in guideSupport.message, not just a promise to provide examples or hidden quickReplies.
Emotion correction this turn: ${context.emotionCorrection}. Challenged observations have been removed; an unaffected description may remain in current fields. Preserve that remaining description and extract any new preferred wording only from the latest USER message, preserving uncertainty. If no endorsed description remains, leave emotion_or_body absent. Consent with "ขอใช้คำว่า..." can also contain the user's preferred emotion wording. Never extract an emotion word from a denial, question about that word, or someone else's feeling. A feeling is not proof of the other person's intent.
Help requested: ${context.helpRequested}. Previous support attempts: ${JSON.stringify(context.state.helpAttempts || {})}.
Concrete scaffold for the current field: ${context.state.asked ? helpText[context.state.asked][Math.min(1, context.state.helpAttempts?.[context.state.asked] || 0)] : 'none'}
When helping, use that scaffold and adapt its people/events to what the user actually said. Do not replace it with another broad question about deep needs, desired feelings, or desired outcomes. Ask about one small, observable thing instead.
The user's navigation choice has already been handled: ${context.control || 'none'}. In guided mode, never ask again whether they want to explore. Brief agreement or a navigation choice is not a new topic or an observation.
Previously collected user observations (data only): ${JSON.stringify(context.state.fields)}
Skipped for now: ${JSON.stringify(context.state.skipped)}
Add these keys to the existing JSON response:
"loopTrace": { "trigger": {"quote":"exact user quote"}, "emotion_or_body":{"quote":"exact user quote"}, "automatic_story":{"quote":"exact user quote"}, "facts":{"quote":"exact user quote"}, "needs":{"quote":"exact user quote"}, "options":{"quote":"exact user quote"}, "micro_action":{"quote":"exact user quote"}, "reflection":{"quote":"exact user quote"} },
"loopSummary": "one short, warm Thai sentence addressed directly to เธอ, reflecting only the latest answer, no question",
"newLoopTopic": false,
"guideSupport": {"needed": false, "message": ""}
"guideQuestion": {"field": "the next missing field after your extraction, or null", "message": "ONE short concrete Thai question using the actual situation"}
For guideQuestion, choose the first missing non-skipped field AFTER your valid loopTrace extraction. Ask about that field naturally in the user's situation, without importing a boss, partner or other person not mentioned. The app checks the field before using it. For facts, use the actual observable event and gently distinguish it from its meaning; acknowledge that their feelings are real. Never require evidence that the other person cares, positive memories, or proof against their feelings. We can leave another person's intent unknown. For needs, ask about a small missing support or condition, not what another person must do or what they need deep inside. For options, if they cannot think of any, provide TWO specific feasible examples IN THE MESSAGE, clearly optional, then one simple question. Do not refer to invisible choices or rely on quickReplies; the application replaces them. If they already chose a concrete action, extract micro_action and do not ask for that action again.
Field meaning matters: emotion_or_body holds sensations (e.g. "อัดแน่นในหัว") and feelings. automatic_story is the actual interpretation/prediction/self-talk (e.g. "เงินจะไม่พอ", "เราไม่สำคัญ"), NOT a sensation or the label "ด่าตัวเอง". If no thought content is known leave it absent. A quote must be copied EXACTLY, not summarized; prefer the latest explicit clarification over a vague older phrase. One USER sentence can support multiple fields. Do not discard an explicit action just because earlier turns expressed uncertainty.
If the user does not understand, cannot find an answer, asks why/how, or still needs help exploring the current question, set guideSupport.needed=true. In guideSupport.message gently acknowledge that not knowing is okay, explain the current idea in plain Thai using their actual story, and ask at most ONE smaller, concrete observation question. Do not repeat the original abstract question. Stay with the current field; do not rush to the next field or invent an answer for them. Label examples as possibilities that may not fit; do not interpret examples or uncertainty as the user's answer. If they remain unsure, try a different angle and explicitly allow pausing. Brief genuine observations such as “เสียใจ” are valid answers, not a reason to interrogate them further.
Only include fields supported by literal contiguous quotes from USER messages. Never copy the assistant's suggestions, questions, negated feelings, hypothetical claims, or another person's feelings as the user's own. In guided mode, interpret a short reply in the context of the last asked field. An unanswered/skipped/unknown field stays absent. Distinguish facts from interpretations. options means possible choices, not assumed habitual behavior.
Source meaning and speaker must survive extraction. "ทุกคนคิดว่าเราต้องเศร้า" is OTHER PEOPLE's expectation, never the user's automatic_story. If they later say "เราเลยคิดว่าเราผิดปกติ", that later clause can be automatic_story. A request such as "มีตัวอย่างทางเลือกไหม" is not options; leave options absent and actually explain. "เรียกว่าอึดอัดไว้ก่อน" is a wording preference, not needs. "ฉันคิดว่าเขาไม่สนใจ" is a thought, not a fact, even if you copy only "เขาไม่สนใจ". Do not make fields look complete by moving a quote to an unrelated field.
GROUNDING CHECK for assistantMessage, loopSummary, guideSupport and guideQuestion: use only details the user has given. Do not add events, causes, motives or a more intense emotion to sound empathetic. Keep tentative wording tentative. You may respond directly without a reflective preface. In listening mode, do not ask about bodily sensations by default; use one concrete moment from the story. An explanation is not a diagnosis or a hidden-cause claim.
In listening mode leave quickReplies empty. Do not write fictional first-person answers for the user to tap (for example a deadline they never mentioned); let them supply their own account. Do not replace listening with a rest-versus-talk menu.
Examples of grounded conversational responses (adapt, do not copy their events into other cases):
- USER: "หัวหน้าเรียกคุยงาน อึดอัด ไม่รู้เรียกว่าอะไร" -> "เรียกว่าอึดอัดไว้ก่อนได้เลย ตอนคุยงานมีคำพูดช่วงไหนที่ยังติดอยู่ในหัวบ้าง?" Do not invent a sudden meeting, fear, or failure.
- USER: "แม่โทรให้ช่วย มันยุ่งในหัว ไม่รู้ว่าเหนื่อยหรือรำคาญ" -> "ยังไม่ต้องเลือกชื่อก็ได้ ก่อนแม่โทรมา เธอกำลังทำอะไรอยู่?" Do not invent a workload.
- USER: "เลิกกับแฟน ไม่ร้องไห้ มันว่าง ๆ" -> "ไม่จำเป็นต้องบังคับให้ตัวเองร้องไห้นะ ใช้คำว่าว่าง ๆ ตามที่เป็นอยู่ได้" Do not explain it as the mind protecting itself or require proof that they care.
- USER: "เพื่อนลืมวันเกิด ไม่เป็นไร แต่คิดถึงทั้งวัน" -> "เรื่องนี้ยังวนกลับมาในหัวอยู่ มีช่วงไหนที่เธอนึกถึงบ่อยเป็นพิเศษไหม?" Do not say their mouth and heart disagree.
- USER: "น้อยใจนิดนึงมั้ง" -> Keep "อาจ/มั้ง/ยังไม่แน่ใจ"; do not conclude a definite emotion or its cause.
Update a prior field when the user explicitly corrects it. Set newLoopTopic true only for an explicit switch to an unrelated event; do not mix it with the previous loop.
When listening, respond with empathy and at most one natural question. When guided, provide a short reflection in loopSummary; the application appends ONE next question based on missing fields, so do not ask additional questions or offer an exercise. Speak naturally as เรา to เธอ, never refer to the person as ผู้ใช้ or report about them in the third person. Do not repeat the entire story after every answer. Never force completion. The user may vent, skip, or pause at any time. Never claim a loop was saved or rewards given.
When enough context exists after two or three user messages, the application offers a choice to vent or explore. Do not replace that choice with a forced exercise.
Never ask the vent-versus-explore choice yourself; the application owns that invitation and its cooldown. If the user continues their story without choosing, keep listening.
When guideSupport is needed, its message REPLACES the routine next-field question. Explain only the current field with one easier question; do not include a second question in loopSummary. Do not repeat the previous assistant message.
`;
}

export function applyLoopChat(context: LoopChatContext, parsed: any, turn: ChatEngineTurnResponse): ChatEngineTurnResponse {
  if (turn.safety_state !== 'normal') return turn;
  const state: LoopChatGuide = { ...context.state, fields: { ...context.state.fields }, skipped: [...context.state.skipped], helpAttempts: { ...context.state.helpAttempts } };
  const explicitAction = state.mode === 'guided' && (state.asked === 'options' || state.asked === 'micro_action') && !context.control &&
    !/อาจ|ถ้า|หรือ|ไหม|ยังไม่แน่ใจ|ไม่รู้ว่า|ไม่พร้อม|ไม่อยาก|บอกว่า|[“”"'「」]/u.test(context.latest) &&
    /(?:^|\s|แล้ว)(?:เรา|ฉัน|ผม|หนู)?(?:จะ(?:ลอง)?|เลือกที่จะ)(?:ส่ง|เขียน|เปิด|ดู|บอก|ขอ|พัก|กันเวลา|เริ่ม|ทำแบบนั้น)/u.test(context.latest);
  if (explicitAction) {
    state.fields.micro_action = context.latest.slice(0, 600);
    if (!state.fields.options) state.fields.options = context.latest.slice(0, 600);
  }
  const explicitReflection = state.mode === 'guided' && state.asked === 'reflection' && !context.control &&
    /^(?:ตอนนี้)?(?:เริ่ม|เพิ่ง)(?:เห็น|รู้|เข้าใจ)ว่า/u.test(context.latest) && !/ไหม|หรือเปล่า|บอกว่า/u.test(context.latest);
  if (explicitReflection) state.fields.reflection = context.latest.slice(0, 600);
  let supportField = state.mode === 'guided' && state.asked && !context.control && !explicitAction && !explicitReflection &&
    (context.helpRequested || parsed?.guideSupport?.needed === true) ? state.asked : null;
  const newTopic = parsed?.newLoopTopic === true && !context.control && !supportField;
  if (newTopic) {
    state.fields = {}; state.skipped = []; state.asked = null; state.mode = 'listening'; state.helpAttempts = {};
    state.emotionSourceAfter = Math.max(0, context.userTexts.length - 1);
    state.nextOfferAt = context.count + 1;
  }
  for (const key of LOOP_CHAT_FIELDS) {
    // Help-seeking is not an answer, even if the model also emits an extraction.
    if ((supportField && !(key === 'emotion_or_body' && context.emotionCorrection)) || (key === 'micro_action' && explicitAction) || (key === 'reflection' && explicitReflection)) continue;
    const quote = parsed?.loopTrace?.[key]?.quote;
    if (typeof quote === 'string' && quote.trim().length >= 2 && quote.length <= 600 &&
        (newTopic ? [context.latest] : key === 'emotion_or_body' ? context.userTexts.slice(state.emotionSourceAfter || 0) : context.userTexts).some(raw => {
          const t = key === 'emotion_or_body' && context.preferredEmotion && raw === context.latest ? raw : observationText(raw);
          return Boolean(t) && (!isHelpText(t) || (key === 'options' && /^(?:เรา|ฉัน|ผม|หนู)(?:อาจลอง|จะลอง|เลือกที่จะ)/u.test(quote.trim()) && t.includes('แต่' + quote.trim()))) && !understandsExplanation(t, '') && t.includes(quote.trim()) && groundedObservation(key, quote.trim(), t) && (key !== 'emotion_or_body' || groundedEmotionQuote(quote.trim(), t));
        }) &&
        validObservation(key, quote.trim()) && !/^(?:ยังไม่รู้|ไม่รู้|ไม่แน่ใจ|ยังไม่ได้สำรวจ|ข้ามข้อนี้ก่อน)$/u.test(quote.trim())) {
      state.fields[key] = quote.trim();
    }
  }
  // Even if the model misses the help signal, do not repeat an unanswered abstract question.
  if (!supportField && state.mode === 'guided' && state.asked && !context.control && !state.fields[state.asked]) {
    supportField = state.asked;
  }
  const rawSummary = typeof parsed?.loopSummary === 'string' ? parsed.loopSummary.trim().slice(0, 400) : '';
  // Optional reflection must not turn the user's explicit uncertainty into certainty.
  const uncertainty = /มั้ง|ไม่แน่ใจ|บอกไม่ถูก|บอกไม่ได้/u;
  const summary = uncertainty.test(context.latest) && !/มั้ง|ไม่แน่ใจ|บอกไม่ถูก|บอกไม่ได้|อาจ|ยังไม่ชัด/u.test(rawSummary) ? '' : rawSummary;
  let message = turn.assistant_message;
  let replies = turn.quick_replies;
  if (context.control === 'pause') {
    message = 'ได้เลย เราพักตรงนี้ได้ ไม่ต้องหาคำตอบเพิ่มตอนนี้นะ';
    replies = [];
  } else if (context.control === 'explain') {
    message = 'คือค่อย ๆ ดูจากเรื่องที่เธอเล่าว่าเกิดอะไรขึ้น ใจรู้สึกหรือตีความอย่างไร แล้วมีอะไรที่ช่วยเธอได้บ้าง เราถามทีละนิด ตอบว่าไม่รู้หรือข้ามได้เสมอนะ';
    replies = [LOOP_CHAT_START, LOOP_CHAT_VENT];
  } else if (context.control === 'vent') {
    // Keep this transition independent of model wrap-up/exercise suggestions.
    message = 'ได้เลย เล่าต่อได้ตามจังหวะของเธอนะ เราฟังอยู่';
    replies = [];
  } else if (state.mode === 'listening' && !state.preferListening && context.count >= state.nextOfferAt &&
      (state.fields.trigger || state.fields.emotion_or_body) && !context.control && !context.deferOffer) {
    state.mode = 'offered';
    message = [summary || 'เราเริ่มเห็นประเด็นจากที่เธอเล่าแล้วนะ', 'ตอนนี้อยากระบายต่อ หรือค่อย ๆ สำรวจเรื่องนี้ไปด้วยกันทีละส่วน?'].join('\n\n');
    replies = [LOOP_CHAT_VENT, LOOP_CHAT_START];
  } else if (state.mode === 'guided') {
    const missing = supportField || LOOP_CHAT_FIELDS.find(key => !state.fields[key] && !state.skipped.includes(key));
    state.asked = missing || null;
    if (supportField && context.understood) {
      // Understanding an explanation is progress, but is not yet an answer to the trace field.
      state.helpAttempts![supportField] = 0;
      message = `ค่อย ๆ ลองจากเรื่องของเธอก็ได้นะ ${practiceQuestions[supportField]}`;
      replies = [LOOP_CHAT_HELP, LOOP_CHAT_SKIP, LOOP_CHAT_VENT];
    } else if (supportField) {
      const attempts = Math.min(3, (state.helpAttempts?.[supportField] || 0) + 1);
      state.helpAttempts![supportField] = attempts;
      const personalized = typeof parsed?.guideSupport?.message === 'string' ? parsed.guideSupport.message.trim() : '';
      const vagueNeedsQuestion = supportField === 'needs' && /ลึก\s*ๆ|ผลลัพธ์|อยากให้ตัวเองรู้สึก|อยากให้.*ออกมาเป็น/u.test(personalized);
      const invisibleOptions = /(?:สองทาง|สองตัวเลือก|ตัวเลือกเหล่านี้|ทางเลือกต่อไปนี้)/u.test(personalized) && !/เช่น|ทางแรก|ทางที่หนึ่ง|1[.)]|หรือ/u.test(personalized);
      message = attempts >= 3
        ? 'ยังหาคำตอบไม่ได้ก็ไม่เป็นไรนะ ไม่ต้องฝืนให้ครบ เราพักข้อนี้ไว้และเก็บสิ่งที่คุยแล้วได้ เธออยากระบายต่อหรือข้ามข้อนี้ไปก่อน?'
        : personalized && personalized.length <= 900 && personalized !== context.lastAssistantText && !vagueNeedsQuestion && !invisibleOptions && !personalized.includes(questions[supportField])
          ? personalized : helpText[supportField][attempts - 1];
      replies = attempts >= 3 ? [LOOP_CHAT_SKIP, LOOP_CHAT_VENT] : [LOOP_CHAT_HELP, LOOP_CHAT_SKIP, LOOP_CHAT_VENT];
    } else if (missing) {
      const reflection = context.control === 'start'
        ? 'ได้เลย เราค่อย ๆ ดูไปด้วยกัน ตอบเท่าที่พร้อมก็พอนะ'
        : context.control === 'skip' ? 'ข้ามไว้ก่อนได้เลยนะ' : summary;
      const tailored = parsed?.guideQuestion;
      const abstractNeeds = missing === 'needs' && /ลึก\s*ๆ|ผลลัพธ์|อยากให้ตัวเองรู้สึก/u.test(tailored?.message || '');
      const disputingFacts = missing === 'facts' && /ยังใส่ใจ|ยังแคร์|ยังต้องการ|ต้องการเราอยู่|ห่วงใย|หลักฐาน.*(?:หักล้าง|โต้แย้ง)|ในอดีต/u.test(tailored?.message || '');
      // Reflection is about what was noticed in chat, not another task or an action assumed completed.
      const question = missing !== 'reflection' && missing !== 'facts' && tailored?.field === missing && typeof tailored.message === 'string' &&
        !abstractNeeds && !disputingFacts &&
        tailored.message.trim().length >= 10 && tailored.message.length <= 500 && tailored.message.trim() !== context.lastAssistantText
          ? tailored.message.trim() : questions[missing];
      message = [reflection, question].filter(Boolean).join('\n\n');
      replies = [LOOP_CHAT_HELP, LOOP_CHAT_SKIP, LOOP_CHAT_VENT];
    } else {
      state.mode = 'review';
      const complete = LOOP_CHAT_FIELDS.every(key => state.fields[key]);
      message = complete
        ? 'เราได้สำรวจครบทั้ง 8 ส่วนจากที่เธอเล่าแล้วนะ อยากตรวจสรุปก่อนบันทึกไหม?'
        : 'เราเก็บส่วนที่เธอพร้อมเล่าไว้แล้ว ช่องที่ข้ามจะเว้นไว้ อยากตรวจสรุปเพื่อเก็บเป็นแบบร่างไหม?';
      replies = [LOOP_CHAT_REVIEW, LOOP_CHAT_VENT];
    }
  }
  const f = state.fields;
  return {
    ...turn, assistant_message: message, quick_replies: state.mode === 'listening' ? [] : replies, loop_guide: state,
    ...(state.mode !== 'listening' || state.preferListening || !context.requestedExercise ? { recommended_exercise: null } : {}),
    extracted_loop: { ...f, old_response: f.options, new_choice: f.micro_action, desires: f.needs, insights: f.reflection },
  };
}

export function loopChatReview(guide?: LoopChatGuide) {
  if (!guide || !LOOP_CHAT_FIELDS.some(k => guide.fields[k])) return {};
  const f = guide.fields;
  const complete = Boolean(f.trigger && f.emotion_or_body && f.automatic_story && f.facts &&
    f.automatic_story !== f.facts && (f.micro_action || f.reflection));
  const value = (key: LoopChatField) => f[key] || 'ยังไม่ได้สำรวจ';
  return {
    trigger: value('trigger'), emotionOrBody: value('emotion_or_body'),
    automaticStory: value('automatic_story'), facts: value('facts'), needs: value('needs'),
    desires: value('needs'),
    conversationStatus: complete ? 'complete_loop' as const : 'partial_loop' as const,
    detectedSkills: {
      emotional_awareness: Boolean(f.emotion_or_body),
      somatic_awareness: /แน่น|เกร็ง|ใจสั่น|หายใจ|ปวด|ตัวสั่น|เหงื่อ/u.test(f.emotion_or_body || ''),
      cognitive_clarity: Boolean(f.facts && f.automatic_story && f.facts !== f.automatic_story),
      conscious_action: Boolean(f.micro_action),
    },
    options: value('options'), oldResponse: value('options'), microAction: value('micro_action'),
    newChoice: value('micro_action'), reflection: value('reflection'), insights: value('reflection'),
  };
}
