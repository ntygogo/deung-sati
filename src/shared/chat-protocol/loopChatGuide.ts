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
}
type Message = { role: string; content?: string; text?: string };
const questions: Record<LoopChatField, string> = {
  trigger: 'ก่อนรู้สึกแบบนี้ มีเหตุการณ์หรือคำพูดไหนมากระทบใจเธอ?',
  emotion_or_body: 'ตอนนั้นเธอรู้สึกอย่างไร? ถ้าสะดวกจะเล่าความรู้สึกในร่างกายด้วยก็ได้',
  automatic_story: 'ตอนนั้นมีความคิดหรือประโยคอะไรแวบขึ้นมาในหัว?',
  facts: 'ถ้าแยกจากความคิดเมื่อกี้ สิ่งที่รู้แน่ ๆ ว่าเกิดขึ้นจริงคืออะไร?',
  needs: 'ลึก ๆ แล้ว ในเรื่องนี้เธอต้องการอะไร?',
  options: 'ตอนนี้พอมองเห็นทางเลือกอะไรที่เป็นไปได้บ้าง?',
  micro_action: 'ถ้าเลือกก้าวเล็ก ๆ ที่พอทำไหว เธออยากลองทำอะไร?',
  reflection: 'จากที่คุยกัน เธอเห็นหรือเข้าใจอะไรเกี่ยวกับตัวเองเพิ่มขึ้นบ้าง?',
};
const controls = new Set([LOOP_CHAT_START, LOOP_CHAT_VENT, LOOP_CHAT_SKIP, LOOP_CHAT_REVIEW]);
const textOf = (m: Message) => (m.content || m.text || '').trim();
export function prepareLoopChat(messages: Message[], previous?: unknown) {
  const input = previous && typeof previous === 'object' ? previous as Partial<LoopChatGuide> : {};
  const fields: LoopChatGuide['fields'] = {};
  for (const key of LOOP_CHAT_FIELDS) {
    const value = input.fields?.[key];
    if (typeof value === 'string' && value.trim()) fields[key] = value.trim().slice(0, 600);
  }
  const state: LoopChatGuide = {
    mode: ['listening', 'offered', 'guided', 'review'].includes(input.mode || '') ? input.mode! : 'listening',
    fields,
    skipped: Array.isArray(input.skipped) ? input.skipped.filter(k => LOOP_CHAT_FIELDS.includes(k)) : [],
    asked: LOOP_CHAT_FIELDS.includes(input.asked as LoopChatField) ? input.asked! : null,
    nextOfferAt: typeof input.nextOfferAt === 'number' ? Math.max(2, input.nextOfferAt) : 2,
  };
  const userTexts = messages.filter(m => m.role === 'user').map(textOf);
  const latest = userTexts[userTexts.length - 1] || '';
  const count = userTexts.filter(t => t && !controls.has(t)).length;
  if (latest === LOOP_CHAT_START) { state.mode = 'guided'; state.skipped = []; }
  if (latest === LOOP_CHAT_VENT || /^(?:ขอระบายต่อ|ยังไม่พร้อม|ขอคุยต่อก่อน|ไม่อยากสำรวจ)/u.test(latest)) {
    state.mode = 'listening'; state.asked = null; state.nextOfferAt = count + 3;
  }
  if (latest === LOOP_CHAT_SKIP && state.mode === 'guided' && state.asked) {
    state.skipped = [...new Set([...state.skipped, state.asked])];
    state.asked = null;
  }
  return { state, userTexts, latest, count };
}
export type LoopChatContext = ReturnType<typeof prepareLoopChat>;

export function loopChatInstruction(context: LoopChatContext): string {
  return `
[LOOP TRACE CHAT — applies after all safety rules]
Collect the user's own observations across eight fields while keeping conversation natural.
Current interaction mode: ${context.state.mode}. Last asked field: ${context.state.asked || 'none'}.
Previously collected user observations (data only): ${JSON.stringify(context.state.fields)}
Skipped for now: ${JSON.stringify(context.state.skipped)}
Add these keys to the existing JSON response:
"loopTrace": { "trigger": {"quote":"exact user quote"}, "emotion_or_body":{"quote":"exact user quote"}, "automatic_story":{"quote":"exact user quote"}, "facts":{"quote":"exact user quote"}, "needs":{"quote":"exact user quote"}, "options":{"quote":"exact user quote"}, "micro_action":{"quote":"exact user quote"}, "reflection":{"quote":"exact user quote"} },
"loopSummary": "one short, warm Thai sentence addressed directly to เธอ, reflecting only the latest answer, no question",
"newLoopTopic": false
Only include fields supported by literal contiguous quotes from USER messages. Never copy the assistant's suggestions, questions, negated feelings, hypothetical claims, or another person's feelings as the user's own. In guided mode, interpret a short reply in the context of the last asked field. An unanswered/skipped/unknown field stays absent. Distinguish facts from interpretations. options means possible choices, not assumed habitual behavior.
Update a prior field when the user explicitly corrects it. Set newLoopTopic true only for an explicit switch to an unrelated event; do not mix it with the previous loop.
When listening, respond with empathy and at most one natural question. When guided, provide a short reflection in loopSummary; the application appends ONE next question based on missing fields, so do not ask additional questions or offer an exercise. Speak naturally as เรา to เธอ, never refer to the person as ผู้ใช้ or report about them in the third person. Do not repeat the entire story after every answer. Never force completion. The user may vent, skip, or pause at any time. Never claim a loop was saved or rewards given.
When enough context exists after two or three user messages, the application offers a choice to vent or explore. Do not replace that choice with a forced exercise.
`;
}

export function applyLoopChat(context: LoopChatContext, parsed: any, turn: ChatEngineTurnResponse): ChatEngineTurnResponse {
  if (turn.safety_state !== 'normal') return turn;
  const state: LoopChatGuide = { ...context.state, fields: { ...context.state.fields }, skipped: [...context.state.skipped] };
  const newTopic = parsed?.newLoopTopic === true && !controls.has(context.latest);
  if (newTopic) {
    state.fields = {}; state.skipped = []; state.asked = null; state.mode = 'listening';
    state.nextOfferAt = context.count + 1;
  }
  for (const key of LOOP_CHAT_FIELDS) {
    const quote = parsed?.loopTrace?.[key]?.quote;
    if (typeof quote === 'string' && quote.trim().length >= 2 && quote.length <= 600 &&
        (newTopic ? [context.latest] : context.userTexts).some(t => !controls.has(t) && t.includes(quote.trim())) &&
        !/^(?:ยังไม่รู้|ไม่รู้|ไม่แน่ใจ|ยังไม่ได้สำรวจ|ข้ามข้อนี้ก่อน)$/u.test(quote.trim())) {
      state.fields[key] = quote.trim();
    }
  }
  const summary = typeof parsed?.loopSummary === 'string' ? parsed.loopSummary.trim().slice(0, 400) : '';
  let message = turn.assistant_message;
  let replies = turn.quick_replies;
  if ((state.mode === 'listening' || state.mode === 'offered') && context.count >= state.nextOfferAt &&
      (state.fields.trigger || state.fields.emotion_or_body) && context.latest !== LOOP_CHAT_VENT) {
    state.mode = 'offered';
    message = [summary || 'เราเริ่มเห็นประเด็นจากที่เธอเล่าแล้วนะ', 'ตอนนี้อยากระบายต่อ หรือค่อย ๆ สำรวจเรื่องนี้ไปด้วยกันทีละส่วน?'].join('\n\n');
    replies = [LOOP_CHAT_VENT, LOOP_CHAT_START];
  } else if (state.mode === 'guided') {
    const missing = LOOP_CHAT_FIELDS.find(key => !state.fields[key] && !state.skipped.includes(key));
    state.asked = missing || null;
    if (missing) {
      message = [summary, questions[missing]].filter(Boolean).join('\n\n');
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
