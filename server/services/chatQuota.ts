import { randomUUID } from 'node:crypto';
import { db } from '../db/database.js';
import { CHAT_LIMITS, quotaWindow, type ChatQuotaStatus } from '../../src/shared/chatQuota.js';

let ready: Promise<void> | undefined;
async function schema() {
  ready ??= db.execute(`CREATE TABLE IF NOT EXISTS chat_quota_requests (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(80) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    request_id VARCHAR(100) NOT NULL,
    quota_day VARCHAR(10) NOT NULL,
    status VARCHAR(12) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    UNIQUE(user_id, request_id)
  )`).then(async () => { await db.execute('CREATE INDEX IF NOT EXISTS chat_quota_user_day ON chat_quota_requests(user_id, quota_day)'); }).catch(e => { ready = undefined; throw e; });
  await ready;
}
export class QuotaError extends Error {
  constructor(public code: string, message: string, public retryAfter = 5) { super(message); }
}
export async function quotaStatus(userId: string, paid: boolean, now = Date.now()): Promise<ChatQuotaStatus> {
  await schema();
  const window = quotaWindow(now);
  const row = await db.queryOne<{used: number}>(`SELECT COUNT(*) AS used FROM chat_quota_requests
    WHERE user_id = $1 AND quota_day = $2 AND status = 'succeeded'`, [userId, window.day]);
  const limit = paid ? CHAT_LIMITS.paid : CHAT_LIMITS.trial;
  const used = Number(row?.used || 0);
  return { limit, used, remaining: Math.max(0, limit - used), resetsAt: window.resetsAt, timezone: 'Asia/Bangkok' };
}
export async function reserveChat(userId: string, requestId: unknown, paid: boolean, now = Date.now()) {
  await schema();
  const clientId = typeof requestId === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(requestId) ? requestId : randomUUID();
  return db.transaction(async tx => {
    await tx.queryOne('SELECT id FROM users WHERE id = $1 FOR UPDATE', [userId]);
    const old = await tx.queryOne<{status:string}>('SELECT status FROM chat_quota_requests WHERE user_id = $1 AND request_id = $2', [userId, clientId]);
    if (old) throw new QuotaError('CHAT_REQUEST_DUPLICATE', 'ข้อความนี้ส่งแล้ว กรุณารอคำตอบหรือโหลดประวัติแชท');
    await tx.execute(`UPDATE chat_quota_requests SET status = 'failed' WHERE user_id = $1 AND status = 'pending' AND created_at < $2`, [userId, new Date(now - 5 * 60000).toISOString()]);
    const pending = await tx.queryOne(`SELECT id FROM chat_quota_requests WHERE user_id = $1 AND status = 'pending' LIMIT 1`, [userId]);
    if (pending) throw new QuotaError('CHAT_IN_PROGRESS', 'น้องกำลังตอบข้อความก่อนหน้า รอสักครู่นะ');
    const recent = await tx.queryOne('SELECT id FROM chat_quota_requests WHERE user_id = $1 AND created_at > $2 LIMIT 1', [userId, new Date(now - 5000).toISOString()]);
    if (recent) throw new QuotaError('CHAT_TOO_FAST', 'เว้นสัก 5 วินาทีแล้วส่งใหม่ได้นะ');
    const window = quotaWindow(now);
    const count = await tx.queryOne<{used:number; attempts:number}>(`SELECT COUNT(*) AS attempts, SUM(CASE WHEN status = 'succeeded' THEN 1 ELSE 0 END) AS used FROM chat_quota_requests WHERE user_id = $1 AND quota_day = $2`, [userId, window.day]);
    const limit = paid ? CHAT_LIMITS.paid : CHAT_LIMITS.trial;
    if (Number(count?.used || 0) >= limit) throw new QuotaError('CHAT_QUOTA_EXHAUSTED', 'วันนี้ใช้ข้อความครบแล้ว โควตาใหม่มาตอนเที่ยงคืนเวลาไทย ยังอ่านประวัติและเขียนสมุดได้เสมอนะ', Math.ceil((Date.parse(window.resetsAt)-now)/1000));
    if (Number(count?.attempts || 0) >= limit * 3) throw new QuotaError('CHAT_RETRY_LIMIT', 'วันนี้มีการลองส่งซ้ำจำนวนมาก กรุณาติดต่อผู้ดูแลหากยังใช้งานไม่ได้', Math.ceil((Date.parse(window.resetsAt)-now)/1000));
    const id = randomUUID();
    await tx.execute(`INSERT INTO chat_quota_requests (id,user_id,request_id,quota_day,status,created_at) VALUES ($1,$2,$3,$4,'pending',$5)`, [id,userId,clientId,window.day,new Date(now).toISOString()]);
    return id;
  });
}
export async function settleChat(id: string | undefined, success: boolean) {
  if (!id) return;
  const result = await db.execute(`UPDATE chat_quota_requests SET status = $1 WHERE id = $2 AND status = 'pending'`, [success ? 'succeeded' : 'failed', id]);
  if (success && !result.affectedRows) throw new Error('Chat reservation expired or already settled');
}

// Bound all client-supplied model context; never trust a client tier or quota.
export function boundChatInput(body: any) {
  if (!body || !Array.isArray(body.messages) || body.messages.length > 200) throw new Error('กรุณาเริ่มบทสนทนาใหม่');
  const messages = body.messages;
  for (const m of messages) if (!m || typeof (m.content ?? m.text) !== 'string') throw new Error('รูปแบบข้อความไม่ถูกต้อง');
  const latest = [...messages].reverse().find(m => m.role === 'user');
  if (!latest || !(latest.content ?? latest.text).trim()) throw new Error('กรุณาระบุข้อความ');
  if ((latest.content ?? latest.text).length > CHAT_LIMITS.messageChars) throw new Error('ส่งได้ครั้งละไม่เกิน 4,000 ตัวอักษร ลองแบ่งเรื่องเล่าเป็นช่วงสั้น ๆ นะ');
  for (const key of ['exerciseResult','loopGuide','pastLoopContext','sessionState']) {
    if (JSON.stringify(body[key] ?? null).length > 8000) throw new Error('บริบทข้อความยาวเกินไป กรุณาเริ่มบทสนทนาใหม่');
  }
  let chars = 0;
  const bounded = [];
  for (const m of [...messages].reverse()) {
    const text = m.content ?? m.text;
    if (chars + text.length > CHAT_LIMITS.contextChars) break;
    bounded.unshift(m); chars += text.length;
  }
  if (!bounded.includes(latest)) throw new Error('กรุณาส่งข้อความใหม่');
  body.messages = bounded;
}
