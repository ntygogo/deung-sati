import { randomUUID } from 'node:crypto';
import { db } from '../db/database.js';
import { ensureLineSchema } from './lineSchema.js';
import { LINE_FREE, LINE_PLAN, LINE_WEB_URL, thaiDay } from './lineConfig.js';
import { createLineCheckout, lineBillingEnabled, linePaidUntil } from './lineBilling.js';
import { streamChatResponse } from '../aiProvider.js';
import { classifySafety } from '../safetyClassifier.js';
import type { ChatEngineTurnResponse } from '../../src/shared/chat-protocol/index.js';
import type { UsageMetadata } from './aiUsage.js';
import { lineChoiceInput, lineConversationChoices, isLineSummaryRequest, lineLoopSummary } from './lineConversation.js';

type Message = { role: string; content: string };
export interface LineReply { text: string; choices?: string[] }
interface User {
  id: string; consent_at: string | null; history_json: Message[] | string; loop_json: unknown;
  month_key: string; rounds: number; round_messages: number; last_chat: string | null;
  day_key: string; daily_messages: number; attempts: number; last_attempt: string | null;
  busy_event: string | null; busy_until: string | null;
}
interface Receipt { status: string; user_id: string; response_json: LineReply | string | null }
const parse = <T>(value: T | string): T => typeof value === 'string' ? JSON.parse(value) : value;
const iso = (n: number) => new Date(n).toISOString();
const stamp = (s: string | null) => s ? new Date(s).getTime() : 0;
const menu = ['มีเรื่องอยากเล่า', 'เช็กใจวันนี้', 'เขียนบันทึก', 'สิทธิ์ของฉัน'];
const welcome: LineReply = {
  text: `ดึงสติเป็น AI ช่วยรับฟังและค่อย ๆ มองสิ่งที่เกิดขึ้นกับใจ ไม่ใช่ผู้ให้บริการฉุกเฉินหรือผู้รักษา\n\nเมื่อกด “เริ่มคุย” เธอยินยอมให้เราส่งข้อความให้ผู้ให้บริการ AI และเก็บบทสนทนาล่าสุดเพื่อคุยต่อ พิมพ์ “ลบประวัติ” เพื่อล้างบริบทฝั่งดึงสติได้ ข้อความใน LINE ยังอยู่ตามการตั้งค่าของ LINE\n\nใช้ฟรี ${LINE_FREE.rounds} รอบ/เดือน รอบละไม่เกิน ${LINE_FREE.messagesPerRound} ข้อความ เริ่มรอบใหม่เมื่อเว้นเกิน 30 นาทีหรือกด “เริ่มเรื่องใหม่” เมนูไม่นับโควต้า`,
  choices: ['เริ่มคุย'],
};
export function boundedHistory(messages: Message[]) {
  const kept: Message[] = []; let size = 0;
  for (const m of messages.slice(-40).reverse()) {
    if (size + m.content.length > 24000) break;
    kept.unshift(m); size += m.content.length;
  }
  while (kept[0]?.role === 'assistant') kept.shift();
  return kept;
}
async function recordLineUsage(id: string | undefined, model: string, usage?: UsageMetadata, outcome = 'response') {
  if (!id) return;
  try {
    await db.execute(`INSERT INTO line_ai_usage (id,user_id,model,outcome,prompt_tokens,output_tokens,thought_tokens,created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [randomUUID(),id,model,outcome,usage?.promptTokenCount ?? null,
      usage?.candidatesTokenCount ?? null,usage?.thoughtsTokenCount ?? null,iso(Date.now())]);
  } catch { console.error('[LINE] Usage recording failed'); }
}
export interface Generated { text: string; success: boolean; crisis: boolean; loop?: unknown; choices?: string[] }
export async function generateLineReply(id: string, messages: Message[], loop: unknown): Promise<Generated> {
  let output: Generated | undefined;
  await streamChatResponse({ userId: id, channel: 'line', recordUsage: recordLineUsage, messages, loopGuide: loop,
    onAssistantToken() {}, onAssistantMeta() {},
    onDone(text, source, turn: ChatEngineTurnResponse) {
      const reviewReady = turn.loop_guide?.mode === 'review' && turn.quick_replies?.includes('สรุปแล้วบันทึก');
      output = { text: reviewReady ? 'เราเก็บส่วนที่เธอเล่าไว้แล้วนะ กด “สรุปที่คุยกัน” เพื่อดูสรุปในแชทได้เลย ส่วนที่ยังไม่ได้เล่าจะเว้นไว้ ไม่ต้องฝืนตอบให้ครบ' : text,
        success: source === 'gemini', crisis: turn.safety_state === 'crisis', loop: turn.loop_guide, choices: turn.quick_replies };
    },
  });
  if (!output) throw new Error('Missing LINE response');
  return output;
}
export async function prepareLineReply(id: string, eventId: string, input: string, now = Date.now(), generate = generateLineReply,
  checkout = createLineCheckout): Promise<LineReply | null> {
  await ensureLineSchema();
  const text = lineChoiceInput(input.trim());
  const crisis = (await classifySafety([{ role: 'user', content: text }])).mode === 'protect';
  const lease = randomUUID();
  const claim = await db.transaction(async tx => {
    await tx.execute(`INSERT INTO line_chat_users (id,created_at) VALUES ($1,$2) ON CONFLICT (id) DO NOTHING`, [id,iso(now)]);
    const user = (await tx.queryOne<User>('SELECT * FROM line_chat_users WHERE id=$1 FOR UPDATE', [id]))!;
    const prior = await tx.queryOne<Receipt>('SELECT * FROM line_chat_events WHERE id=$1', [eventId]);
    if (prior && prior.user_id !== id) throw new Error('LINE event owner mismatch');
    if (prior?.status === 'sent') return { reply: null };
    if (prior?.status === 'ready' && prior.response_json) return { reply: parse<LineReply>(prior.response_json) };
    if (stamp(user.busy_until) > now) throw new Error('LINE user busy; retry delivery');
    await tx.execute(`INSERT INTO line_chat_events (id,user_id,status,created_at) VALUES ($1,$2,'pending',$3)
      ON CONFLICT (id) DO NOTHING`, [eventId,id,iso(now)]);
    const reply = async (value: LineReply) => {
      await tx.execute("UPDATE line_chat_events SET status='ready',response_json=$1 WHERE id=$2", [JSON.stringify(value),eventId]);
      return { reply: value };
    };
    if (text === 'ลบประวัติ' || text === 'ยืนยันลบประวัติ') {
      if (text === 'ลบประวัติ') return reply({text:'ต้องการล้างบทสนทนาที่ดึงสติเก็บไว้และหยุดการจดจำใช่ไหม? สิทธิ์สมาชิกและโควต้ายังอยู่ ข้อความใน LINE ต้องลบในแอป LINE เอง', choices:['ยืนยันลบประวัติ','เมนู']});
      await tx.execute("UPDATE line_chat_users SET history_json='[]',loop_json=NULL,consent_at=NULL,last_chat=NULL,round_messages=0 WHERE id=$1", [id]);
      // Keep content-free tombstones so an old webhook cannot restore erased messages or consent.
      await tx.execute("UPDATE line_chat_events SET status='sent',response_json=NULL WHERE user_id=$1 AND id<>$2", [id,eventId]);
      return reply({text:'ล้างบทสนทนาฝั่งดึงสติแล้วจ้ะ สิทธิ์และโควต้ายังอยู่ ถ้าอยากเริ่มคุยอีกครั้ง พิมพ์ “เมนู” เพื่ออ่านและยินยอมใหม่'});
    }
    if (text === 'เปิดเว็บ' || text === 'เลี้ยงน้อง') return reply({text:`เข้าเว็บดึงสติได้ที่ ${LINE_WEB_URL}\nระบบเลี้ยงน้องยังเป็น Coming soon สิทธิ์แชท LINE แยกจากเว็บ และยังไม่เชื่อมประวัติข้ามช่องทาง`});
    const day = thaiDay(now), month = day.slice(0,7);
    const paidUntil = await linePaidUntil(id,now,tx);
    const rounds = user.month_key === month ? user.rounds : 0;
    const daily = user.day_key === day ? user.daily_messages : 0;
    if (text === 'สิทธิ์ของฉัน') return reply({text: paidUntil
      ? `สมาชิก LINE ถึง ${new Date(paidUntil).toLocaleString('th-TH',{timeZone:'Asia/Bangkok'})}\nวันนี้เหลือ ${Math.max(0,LINE_PLAN.dailyMessages-daily)} ข้อความ รีเซ็ตเที่ยงคืนไทย ไม่ต่ออายุอัตโนมัติ`
      : `เดือนนี้เริ่มรอบฟรีได้อีก ${Math.max(0,LINE_FREE.rounds-rounds)} รอบ รอบที่เริ่มแล้วคุยต่อได้ไม่เกิน ${LINE_FREE.messagesPerRound} ข้อความและเว้นช่วงไม่เกิน 30 นาที`,choices:['มีเรื่องอยากเล่า','สมัครสมาชิก']});
    if (text === 'สมัครสมาชิก' && !lineBillingEnabled(id)) return reply({text:'สมาชิกแชท LINE ยังไม่เปิดรับชำระเงินจ้ะ ตอนนี้ใช้รอบฟรีได้ก่อน',choices:menu});
    if (!user.consent_at && !crisis) {
      if (text !== 'เริ่มคุย') return reply(welcome);
      await tx.execute('UPDATE line_chat_users SET consent_at=$1 WHERE id=$2', [iso(now),id]);
      return reply({text:'พร้อมรับฟังแล้วจ้ะ วันนี้มีอะไรอยากเล่า หรืออยากเช็กความรู้สึกตัวเอง?',choices:menu});
    }
    const prompts: Record<string,string> = {
      'วิธีส่งข้อความ':'ตอนนี้ดึงสติอ่านได้เฉพาะข้อความจ้ะ ลองพิมพ์สิ่งที่อยากเล่าแทนรูป เสียง หรือสติกเกอร์นะ',
      'เมนู':'วันนี้อยากคุยแบบไหน?', 'เริ่มคุย':'พร้อมรับฟังแล้วจ้ะ เล่าได้เลย',
      'มีเรื่องอยากเล่า':'เล่าได้เลยจ้ะ วันนี้มีอะไรเกิดขึ้น?',
      'เช็กใจวันนี้':'ถ้าลองหยุดสังเกตตัวเองตอนนี้ ใจหรือร่างกายเป็นอย่างไรบ้าง? ยังเรียกความรู้สึกไม่ถูกก็เล่าเป็นคำธรรมดาได้',
      'เขียนบันทึก':'วันนี้มีเหตุการณ์ไหนอยากเขียนถึง? เริ่มจากสิ่งที่เกิดขึ้น แล้วค่อยเล่าว่ารู้สึกอย่างไรก็ได้ แชทนี้เก็บเฉพาะบริบทล่าสุด ยังไม่ใช่สมุดบันทึกถาวร',
    };
    if (prompts[text]) return reply({text:prompts[text],choices:menu});
    if (!crisis && isLineSummaryRequest(text)) {
      const loop = typeof user.loop_json === 'string' ? JSON.parse(user.loop_json) : user.loop_json;
      const summary = lineLoopSummary(loop);
      if (summary) return reply({text:summary,choices:['อยากระบายต่อ','เมนู','สิทธิ์ของฉัน']});
      // With no extracted fields, let the AI summarize the available conversation.
      // Do not claim a saved notebook or invent an eight-part completed loop.
    }
    if (text === 'เริ่มเรื่องใหม่') {
      await tx.execute("UPDATE line_chat_users SET history_json='[]',loop_json=NULL,last_chat=NULL,round_messages=0 WHERE id=$1", [id]);
      return reply({text:'เริ่มเรื่องใหม่ได้เลยจ้ะ ข้อความถัดไปจะเริ่มรอบใหม่ของแพ็กเกจฟรี',choices:menu});
    }
    if (!text || text.length > 4000) return reply({text:'ส่งเป็นข้อความไม่เกิน 4,000 ตัวอักษรต่อครั้งนะจ๊ะ'});
    const purchase = text === 'สมัครสมาชิก';
    const newRound = user.month_key !== month || now - stamp(user.last_chat) >= LINE_FREE.idleMs || user.round_messages >= LINE_FREE.messagesPerRound;
    if (!crisis && !purchase && ((paidUntil && daily >= LINE_PLAN.dailyMessages) || (!paidUntil && newRound && rounds >= LINE_FREE.rounds)))
      return reply({text:paidUntil ? 'วันนี้ใช้ครบ 50 ข้อความแล้วจ้ะ เริ่มคุยต่อได้หลังเที่ยงคืนไทย' : 'เดือนนี้ใช้รอบฟรีครบแล้วจ้ะ รอบฟรีจะกลับมาเดือนหน้า หรือดูสมาชิกแชท LINE ได้',choices:['สิทธิ์ของฉัน','สมัครสมาชิก']});
    const attempts = user.day_key === day ? user.attempts : 0;
    if (!crisis && (now - stamp(user.last_attempt) < 5000 || attempts >= 150))
      return reply({text:attempts >= 150 ? 'วันนี้มีการลองส่งหลายครั้งแล้วจ้ะ กลับมาลองอีกครั้งหลังเที่ยงคืนไทยนะ' : 'ขอเว้นสัก 5 วินาทีแล้วส่งใหม่อีกครั้งนะจ๊ะ'});
    await tx.execute(`UPDATE line_chat_users SET busy_event=$1,busy_until=$2,attempts=$3,last_attempt=$4,
      day_key=$5,daily_messages=$6 WHERE id=$7`, [lease,iso(now+90_000),attempts+1,iso(now),day,daily,id]);
    return { user, paidUntil, newRound, rounds, daily, day, month, purchase };
  });
  if ('reply' in claim) return claim.reply ?? null;
  try {
    let generated: Generated | undefined;
    let response: LineReply;
    // Quota windows are not topic boundaries. Only explicit new-topic/erase/unsend clears context.
    const previous = parse<Message[]>(claim.user.history_json);
    const messages = boundedHistory([...previous,{role:'user',content:text}]);
    if (claim.purchase) {
      const url = await checkout(id);
      response = {text:`สมาชิกแชท LINE ${LINE_PLAN.amount/100} บาท / 30 วัน\nคุย ${LINE_PLAN.dailyMessages} ข้อความต่อวัน รีเซ็ตเที่ยงคืนไทย จ่าย PromptPay ไม่ต่ออายุอัตโนมัติ ไม่รวมสิทธิ์เว็บหรือเลี้ยงน้อง\n${url}\nหลังชำระกลับมากด “สิทธิ์ของฉัน” เพื่อตรวจสอบ`, choices:['สิทธิ์ของฉัน']};
    } else {
      const loop = typeof claim.user.loop_json === 'string' ? JSON.parse(claim.user.loop_json) : claim.user.loop_json;
      generated = await generate(id,messages,loop);
      response = {text:generated.text,choices:generated.crisis ? undefined : lineConversationChoices(generated.loop,generated.choices)};
    }
    await db.transaction(async tx => {
      const current = await tx.queryOne<User>('SELECT * FROM line_chat_users WHERE id=$1 FOR UPDATE', [id]);
      if (current?.busy_event !== lease || stamp(current.busy_until) <= Date.now()) throw new Error('LINE lease expired');
      const counted = !!generated?.success && !generated.crisis;
      if (counted) {
        await tx.execute(`UPDATE line_chat_users SET history_json=$1,loop_json=$2,month_key=$3,rounds=$4,
          round_messages=$5,last_chat=$6,daily_messages=$7 WHERE id=$8`,
        [JSON.stringify(boundedHistory([...messages,{role:'assistant',content:generated!.text}])),JSON.stringify(generated!.loop ?? null),
          claim.month,claim.rounds+(!claim.paidUntil && claim.newRound?1:0),claim.newRound?1:claim.user.round_messages+1,
          iso(now),claim.daily+1,id]);
      }
      await tx.execute('UPDATE line_chat_users SET busy_event=NULL,busy_until=NULL WHERE id=$1', [id]);
      await tx.execute("UPDATE line_chat_events SET status='ready',response_json=$1 WHERE id=$2", [JSON.stringify(response),eventId]);
    });
    return response;
  } catch (e) {
    await db.execute('UPDATE line_chat_users SET busy_event=NULL,busy_until=NULL WHERE id=$1 AND busy_event=$2', [id,lease]);
    throw e;
  }
}
export async function markLineReplySent(eventId: string) {
  await db.execute("UPDATE line_chat_events SET status='sent',response_json=NULL WHERE id=$1", [eventId]);
}
export async function forgetUnsentLineContext(id: string, eventId: string) {
  await ensureLineSchema();
  await db.transaction(async tx => {
    const user = await tx.queryOne('SELECT id FROM line_chat_users WHERE id=$1 FOR UPDATE',[id]);
    if (!user || await tx.queryOne('SELECT id FROM line_chat_events WHERE id=$1',[eventId])) return;
    // We keep only recent context, not individual LINE message IDs. An unsend therefore
    // clears that entire context and invalidates in-flight writers, preserving quotas.
    await tx.execute("UPDATE line_chat_users SET history_json='[]',loop_json=NULL,busy_event=NULL,busy_until=NULL WHERE id=$1",[id]);
    await tx.execute("UPDATE line_chat_events SET status='sent',response_json=NULL WHERE user_id=$1",[id]);
    await tx.execute("INSERT INTO line_chat_events (id,user_id,status,created_at) VALUES ($1,$2,'sent',$3)",[eventId,id,iso(Date.now())]);
  });
}
