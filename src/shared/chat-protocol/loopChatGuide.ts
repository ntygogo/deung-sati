import type { ChatEngineTurnResponse } from './structuredOutputSchema.js';

export const LOOP_CHAT_FIELDS = ['trigger', 'emotion_or_body', 'automatic_story', 'facts', 'needs', 'options', 'micro_action', 'reflection'] as const;
export type LoopChatField = typeof LOOP_CHAT_FIELDS[number];
export const LOOP_CHAT_START = 'ค่อย ๆ สำรวจลูปด้วยกัน';
export const LOOP_CHAT_VENT = 'อยากระบายต่อ';
export const LOOP_CHAT_SKIP = 'ข้ามข้อนี้ก่อน';
export const LOOP_CHAT_REVIEW = 'สรุปแล้วบันทึก';
export interface LoopChatGuide {
  mode: 'listening' | 'offered' | 'guided' | 'review';
  fields: Partial<Record<LoopChatField, string>>;
  skipped: LoopChatField[];
  asked: LoopChatField | null;
  nextOfferAt: number;
  helpAttempts?: Partial<Record<LoopChatField, number>>;
}
type Message = { role: string; content?: string; text?: string };
const questions: Record<LoopChatField, string> = {
  trigger: 'ก่อนรู้สึกแบบนี้ มีเหตุการณ์หรือคำพูดไหนมากระทบใจเธอ?',
  emotion_or_body: 'ตอนนั้นเธอรู้สึกอย่างไร? ถ้าสะดวกจะเล่าความรู้สึกในร่างกายด้วยก็ได้',
  automatic_story: 'ตอนนั้นมีความคิดหรือประโยคอะไรแวบขึ้นมาในหัว?',
  facts: 'ถ้าแยกจากความคิดเมื่อกี้ สิ่งที่รู้แน่ ๆ ว่าเกิดขึ้นจริงคืออะไร?',
  needs: 'ถ้าเรื่องนี้ดีขึ้นได้สักนิด เธออยากให้มีอะไรเปลี่ยนไป?',
  options: 'ตอนนี้พอมองเห็นทางเลือกอะไรที่เป็นไปได้บ้าง?',
  micro_action: 'ถ้าเลือกก้าวเล็ก ๆ ที่พอทำไหว เธออยากลองทำอะไร?',
  reflection: 'พอได้คุยเรื่องนี้ มีอะไรที่เธอเริ่มสังเกตเห็นต่างจากตอนแรกบ้าง? เล็กน้อยก็ได้นะ',
};
const helpText: Record<LoopChatField, [string, string]> = {
  trigger: ['หมายถึงจังหวะที่ใจเริ่มสะดุด ไม่ต้องเล่าทั้งเรื่องก็ได้ ก่อนหน้านั้นมีอะไรเกิดขึ้นหรือได้ยินคำพูดอะไรบ้าง?', 'ลองนึกถึงภาพเล็ก ๆ ภาพเดียว เช่น ตอนเปิดอ่านข้อความหรือตอนอยู่กับใคร มีช่วงไหนที่พอนึกออกไหม?'],
  emotion_or_body: ['ยังไม่ต้องหาชื่ออารมณ์ให้ถูกก็ได้ ลองสังเกตตอนนี้ว่าร่างกายหรือใจตรงไหนรู้สึกเปลี่ยนไปบ้าง?', 'ตัวอย่างอาจเป็นหนัก ๆ ตื้อ ๆ ว่าง ๆ หรือยังจับไม่ได้ ไม่จำเป็นต้องตรงกับเธอนะ มีคำไหนใกล้สิ่งที่รู้สึกอยู่ไหม?'],
  automatic_story: ['หมายถึงคำพูดที่ใจพูดกับตัวเองตอนนั้น ไม่ใช่สิ่งที่ต้องคิดให้ถูก เช่นความกังวลหรือการคาดเดา มีประโยคสั้น ๆ อะไรที่พอนึกออกไหม?', 'ลองเติมแค่ช่วงต้นว่า “ตอนนั้นฉันนึกว่า…” ก็ได้ ถ้ายังไม่มีคำพูดขึ้นมา เราพักข้อนี้ไว้ได้ มีอะไรแวบขึ้นมาบ้างไหม?'],
  facts: ['ข้อนี้แยกสิ่งที่เกิดขึ้นจากสิ่งที่เราคาดเดา เหมือนกล้องที่เห็นภาพและได้ยินเสียง ตอนนั้นมีใครพูดหรือทำอะไรที่เธอจำได้ชัดบ้าง?', 'เช่น “เขายังไม่ตอบข้อความ” เป็นสิ่งที่สังเกตได้ ส่วน “เขาไม่สนใจฉัน” ยังเป็นการตีความ ตัวอย่างนี้อาจไม่ใช่เรื่องของเธอ ในเรื่องที่เล่ามามีส่วนไหนที่สังเกตได้แบบแรกบ้าง?'],
  needs: ['ไม่ต้องรู้ความต้องการลึก ๆ ตอนนี้ก็ได้ เราหมายถึงสิ่งเล็ก ๆ ที่อาจช่วยให้ใจเบาลง ถ้าคนในเรื่องนี้ทำอะไรให้เธอได้สักอย่าง เธออยากให้เขาทำอะไร?', 'ลองดูเป็นตัวอย่างเฉย ๆ นะ บางคนอยากให้มีคนฟัง บางคนอยากได้คำอธิบายที่ชัดเจน บางคนแค่อยากพัก มีแบบไหนใกล้เธอบ้าง หรือยังไม่ตรงเลยก็ได้?'],
  options: ['ยังไม่ต้องตัดสินใจทำจริง เราแค่ลองมองว่ามีทางไหนบ้าง รวมถึงพักไว้ก่อนก็เป็นทางเลือกได้ ตอนนี้มีทางไหนที่รู้สึกฝืนน้อยที่สุด?', 'ตัวอย่างเช่นพักสักนิด ขอเวลา หรือคุยเมื่อพร้อม ไม่จำเป็นต้องใช้ตัวอย่างเหล่านี้นะ มีทางไหนที่พอเข้ากับสถานการณ์ของเธอไหม?'],
  micro_action: ['ไม่ต้องแก้ทั้งเรื่องหรือลงมือทันทีนะ แค่ก้าวเล็กมาก ๆ ที่เธอเลือกเอง เช่นขอเวลาคิดก่อน มีอะไรเล็กพอที่เธอพอทำไหวไหม?', 'ถ้ายังไม่พร้อมทำอะไร เราไม่ต้องตั้งภารกิจเพิ่มก็ได้ ตอนนี้อยากพักไว้ก่อน หรือมีก้าวเล็กกว่านั้นที่พอไหว?'],
  reflection: ['ไม่ต้องมีบทเรียนสวย ๆ ก็ได้นะ เช่นเริ่มเห็นว่าตัวเองเหนื่อย หรือยังมีเรื่องที่ไม่รู้ เมื่อเทียบกับตอนเริ่มคุย มีอะไรที่เธอสังเกตได้เพิ่มนิดหนึ่งไหม?', 'ถ้ายังไม่เห็นอะไรเพิ่มก็ไม่เป็นไร ไม่ได้แปลว่าคุยเสียเปล่า เราเก็บเท่าที่มีไว้ได้ ตอนนี้อยากพักข้อนี้ไว้ก่อนไหม?'],
};
function isHelpText(text: string): boolean {
  const t = text.trim().replace(/\s+/gu, '').replace(/[.!?…。！？]+$/u, '');
  return /^(?:(?:เรา|ฉัน|ผม|หนู|ยัง|ก็|ตอนนี้|เอ่อ|คือ))*(?:ไม่รู้|ไม่เข้าใจ|ไม่ค่อยเข้าใจ|ไม่แน่ใจ|นึกไม่ออก|คิดไม่ออก|ตอบไม่ได้|ตอบไม่ถูก|งง)(?:เลย|จริงๆ|นะ|ค่ะ|ครับ|อะ|อ่ะ|เหมือนกัน)*$/u.test(t) ||
    /^(?:(?:เรา|ฉัน|ผม|หนู|ยัง|ก็))*(?:ไม่รู้|ไม่เข้าใจ|ไม่แน่ใจ)(?:ว่า)?(?:ต้องการอะไร|จะตอบอะไร|จะตอบยังไง|คำถาม|ตัวเอง|ใจตัวเอง)/u.test(t) ||
    /^(?:ช่วยอธิบาย|ช่วยยกตัวอย่าง|ขอตัวอย่าง|ขอคำอธิบาย|หมายถึงอะไร|หมายความว่า|ต้องตอบยังไง|ต้องตอบอะไร)/u.test(t) ||
    /^(?:ความต้องการ|ข้อเท็จจริง|ความคิดอัตโนมัติ|ทางเลือก|การสะท้อนคิด)(?:คืออะไร|หมายถึงอะไร|คือยังไง)/u.test(t);
}
type LoopChatControl = 'start' | 'vent' | 'skip' | 'review';
function loopChatControl(text: string, offered = false): LoopChatControl | null {
  const input = text.normalize('NFC').trim().replace(/\s+/gu, '')
    .replace(/[.!?…。！？]+$/u, '').replace(/(?:(?:นะ|ค่ะ|คะ|ครับ|จ้า|จ้ะ|จ๊ะ|ฮะ|น้า))+$/u, '');
  if (/^(?:(?:อยาก|ขอ)?ระบาย(?:ต่อ|ก่อน|ต่อก่อน)?|(?:ขอ)?คุยต่อก่อน|ยังไม่พร้อม|ไม่อยากสำรวจ|ยังไม่อยากสำรวจ|ยังไม่พร้อมสำรวจ|ไม่พร้อมสำรวจ)$/u.test(input)) return 'vent';
  if (/^(?:(?:เรา|ฉัน|ผม|หนู)?(?:อยาก|ขอ|พร้อม|ช่วย)?(?:ลอง|เริ่ม)?สำรวจ(?:ลูป|เรื่องนี้|ตัวเอง)?(?:ด้วยกัน|กัน)?(?:ต่อ|เลย|ดู|หน่อย)?|(?:ขอ|อยาก)?ไป(?:ขั้นตอน)?(?:ถัดไป|ต่อ)|ค่อยๆสำรวจลูปด้วยกัน)$/u.test(input)) return 'start';
  if (offered && /^(?:ได้|ได้เลย|โอเค|ตกลง|เอาเลย|ลองดู|ลองเลย|ต่อเลย|พร้อม|พร้อมแล้ว)$/u.test(input)) return 'start';
  if (/^(?:ข้าม(?:ข้อนี้)?(?:ไป)?(?:ก่อน)?|ขอข้าม(?:ข้อนี้)?(?:ก่อน)?)$/u.test(input)) return 'skip';
  if (input === LOOP_CHAT_REVIEW) return 'review';
  return null;
}
// Consent and navigation are not observations to put into the user's trace.
const isControlText = (text: string) => loopChatControl(text, true) !== null;
export function isChatWrapUpIntent(text: string): boolean {
  const input = text.trim().toLowerCase().replace(/\s+/g, ' ');
  // A farewell must not match the syllable บาย inside ระบาย or สบาย.
  return /^(?:บ๊าย)?บาย(?:(?:นะ|จ้ะ|จ้า|ครับ|ค่ะ|คะ)|[ !.ๆ…])*$/u.test(input) ||
    ['พอแค่นี้', 'ไปนอนแล้ว', 'ไปทำงานก่อน', 'ขอตัวก่อน', 'แค่นี้ก่อน', 'ขอบคุณนะ', 'ขอบคุณมากนะ', 'จบการคุย', 'จบแค่นี้'].some(k => input.includes(k));
}
const textOf = (m: Message) => (m.content || m.text || '').trim();
export function prepareLoopChat(messages: Message[], previous?: unknown) {
  const input = previous && typeof previous === 'object' ? previous as Partial<LoopChatGuide> : {};
  const fields: LoopChatGuide['fields'] = {};
  const helpAttempts: NonNullable<LoopChatGuide['helpAttempts']> = {};
  for (const key of LOOP_CHAT_FIELDS) {
    const value = input.fields?.[key];
    if (typeof value === 'string' && value.trim()) fields[key] = value.trim().slice(0, 600);
    const attempts = input.helpAttempts?.[key];
    if (typeof attempts === 'number' && Number.isFinite(attempts)) helpAttempts[key] = Math.min(3, Math.max(0, Math.floor(attempts)));
  }
  const state: LoopChatGuide = {
    mode: ['listening', 'offered', 'guided', 'review'].includes(input.mode || '') ? input.mode! : 'listening',
    fields, helpAttempts,
    skipped: Array.isArray(input.skipped) ? input.skipped.filter(k => LOOP_CHAT_FIELDS.includes(k)) : [],
    asked: LOOP_CHAT_FIELDS.includes(input.asked as LoopChatField) ? input.asked! : null,
    nextOfferAt: typeof input.nextOfferAt === 'number' ? Math.max(2, input.nextOfferAt) : 2,
  };
  const userTexts = messages.filter(m => m.role === 'user').map(textOf);
  const latest = userTexts[userTexts.length - 1] || '';
  const count = userTexts.filter(t => t && !isControlText(t)).length;
  const control = loopChatControl(latest, state.mode === 'offered');
  if (control === 'start') { state.mode = 'guided'; state.skipped = []; }
  if (control === 'vent') {
    state.mode = 'listening'; state.asked = null; state.nextOfferAt = count + 3;
  }
  // If the user keeps telling their story, listen instead of repeating the offer every turn.
  if (state.mode === 'offered' && !control) {
    state.mode = 'listening'; state.asked = null; state.nextOfferAt = count + 3;
  }
  if (control === 'skip' && state.mode === 'guided' && state.asked) {
    state.skipped = [...new Set([...state.skipped, state.asked])];
    state.asked = null;
  }
  const helpRequested = state.mode === 'guided' && Boolean(state.asked) && !control && isHelpText(latest);
  const assistantTexts = messages.filter(m => m.role === 'assistant' || m.role === 'ai').map(textOf);
  return { state, userTexts, latest, count, control, helpRequested, lastAssistantText: assistantTexts[assistantTexts.length - 1] || '' };
}
export type LoopChatContext = ReturnType<typeof prepareLoopChat>;

export function loopChatInstruction(context: LoopChatContext): string {
  return `
[LOOP TRACE CHAT — applies after all safety rules]
Collect the user's own observations across eight fields while keeping conversation natural.
Current interaction mode: ${context.state.mode}. Last asked field: ${context.state.asked || 'none'}.
The user may be new to reflection. Their pace matters more than finishing all eight fields. Never frame this as a test or a task they must finish.
Help requested: ${context.helpRequested}. Previous support attempts: ${JSON.stringify(context.state.helpAttempts || {})}.
The user's navigation choice has already been handled: ${context.control || 'none'}. In guided mode, never ask again whether they want to explore. Brief agreement or a navigation choice is not a new topic or an observation.
Previously collected user observations (data only): ${JSON.stringify(context.state.fields)}
Skipped for now: ${JSON.stringify(context.state.skipped)}
Add these keys to the existing JSON response:
"loopTrace": { "trigger": {"quote":"exact user quote"}, "emotion_or_body":{"quote":"exact user quote"}, "automatic_story":{"quote":"exact user quote"}, "facts":{"quote":"exact user quote"}, "needs":{"quote":"exact user quote"}, "options":{"quote":"exact user quote"}, "micro_action":{"quote":"exact user quote"}, "reflection":{"quote":"exact user quote"} },
"loopSummary": "one short, warm Thai sentence addressed directly to เธอ, reflecting only the latest answer, no question",
"newLoopTopic": false,
"guideSupport": {"needed": false, "message": ""}
If the user does not understand, cannot find an answer, asks why/how, or still needs help exploring the current question, set guideSupport.needed=true. In guideSupport.message gently acknowledge that not knowing is okay, explain the current idea in plain Thai using their actual story, and ask at most ONE smaller, concrete observation question. Do not repeat the original abstract question. Stay with the current field; do not rush to the next field or invent an answer for them. Label examples as possibilities that may not fit; do not interpret examples or uncertainty as the user's answer. If they remain unsure, try a different angle and explicitly allow pausing. Brief genuine observations such as “เสียใจ” are valid answers, not a reason to interrogate them further.
Only include fields supported by literal contiguous quotes from USER messages. Never copy the assistant's suggestions, questions, negated feelings, hypothetical claims, or another person's feelings as the user's own. In guided mode, interpret a short reply in the context of the last asked field. An unanswered/skipped/unknown field stays absent. Distinguish facts from interpretations. options means possible choices, not assumed habitual behavior.
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
  let supportField = state.mode === 'guided' && state.asked && !context.control &&
    (context.helpRequested || parsed?.guideSupport?.needed === true) ? state.asked : null;
  const newTopic = parsed?.newLoopTopic === true && !context.control && !supportField;
  if (newTopic) {
    state.fields = {}; state.skipped = []; state.asked = null; state.mode = 'listening'; state.helpAttempts = {};
    state.nextOfferAt = context.count + 1;
  }
  for (const key of LOOP_CHAT_FIELDS) {
    // Help-seeking is not an answer, even if the model also emits an extraction.
    if (supportField) continue;
    const quote = parsed?.loopTrace?.[key]?.quote;
    if (typeof quote === 'string' && quote.trim().length >= 2 && quote.length <= 600 &&
        (newTopic ? [context.latest] : context.userTexts).some(t => !isControlText(t) && !isHelpText(t) && t.includes(quote.trim())) &&
        !/^(?:ยังไม่รู้|ไม่รู้|ไม่แน่ใจ|ยังไม่ได้สำรวจ|ข้ามข้อนี้ก่อน)$/u.test(quote.trim())) {
      state.fields[key] = quote.trim();
    }
  }
  // Even if the model misses the help signal, do not repeat an unanswered abstract question.
  if (!supportField && state.mode === 'guided' && state.asked && !context.control && !state.fields[state.asked]) {
    supportField = state.asked;
  }
  const summary = typeof parsed?.loopSummary === 'string' ? parsed.loopSummary.trim().slice(0, 400) : '';
  let message = turn.assistant_message;
  let replies = turn.quick_replies;
  if (state.mode === 'listening' && context.count >= state.nextOfferAt &&
      (state.fields.trigger || state.fields.emotion_or_body) && !context.control) {
    state.mode = 'offered';
    message = [summary || 'เราเริ่มเห็นประเด็นจากที่เธอเล่าแล้วนะ', 'ตอนนี้อยากระบายต่อ หรือค่อย ๆ สำรวจเรื่องนี้ไปด้วยกันทีละส่วน?'].join('\n\n');
    replies = [LOOP_CHAT_VENT, LOOP_CHAT_START];
  } else if (state.mode === 'guided') {
    const missing = supportField || LOOP_CHAT_FIELDS.find(key => !state.fields[key] && !state.skipped.includes(key));
    state.asked = missing || null;
    if (supportField) {
      const attempts = Math.min(3, (state.helpAttempts?.[supportField] || 0) + 1);
      state.helpAttempts![supportField] = attempts;
      const personalized = typeof parsed?.guideSupport?.message === 'string' ? parsed.guideSupport.message.trim() : '';
      message = attempts >= 3
        ? 'ยังหาคำตอบไม่ได้ก็ไม่เป็นไรนะ ไม่ต้องฝืนให้ครบ เราพักข้อนี้ไว้และเก็บสิ่งที่คุยแล้วได้ เธออยากระบายต่อหรือข้ามข้อนี้ไปก่อน?'
        : personalized && personalized.length <= 900 && personalized !== context.lastAssistantText && !personalized.includes(questions[supportField])
          ? personalized : helpText[supportField][attempts - 1];
      replies = [LOOP_CHAT_SKIP, LOOP_CHAT_VENT];
    } else if (missing) {
      const reflection = context.control === 'start'
        ? 'ได้เลย เราค่อย ๆ ดูไปด้วยกัน ตอบเท่าที่พร้อมก็พอนะ'
        : context.control === 'skip' ? 'ข้ามไว้ก่อนได้เลยนะ' : summary;
      const question = missing === 'facts' && !state.fields.automatic_story
        ? 'ในเหตุการณ์นี้ สิ่งที่รู้แน่ ๆ ว่าเกิดขึ้นจริงคืออะไร?' : questions[missing];
      message = [reflection, question].filter(Boolean).join('\n\n');
      replies = [LOOP_CHAT_SKIP, LOOP_CHAT_VENT];
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
    ...turn, assistant_message: message, quick_replies: replies, loop_guide: state,
    ...(state.mode !== 'listening' ? { recommended_exercise: null } : {}),
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
