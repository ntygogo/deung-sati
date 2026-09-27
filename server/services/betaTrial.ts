import { boundChatInput, quotaStatus, reserveChat, QuotaError } from './chatQuota.js';
import { paidCoverage } from './billing.js';
import { db } from '../db/database.js';
import { BETA_TRIAL_DAYS, type BetaTrialStatus } from '../../src/shared/betaTrial.js';
import { CHAT_ONLY_BETA } from '../../src/shared/release.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import type { Response, NextFunction } from 'express';
let ready: Promise<void> | undefined;
async function ensureSchema() {
  ready ??= db.execute(`CREATE TABLE IF NOT EXISTS beta_trials (
    user_id VARCHAR(80) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    interested_at TIMESTAMPTZ
  )`).then(() => undefined).catch(e => { ready = undefined; throw e; });
  await ready;
}
export async function trialStatus(userId: string, start = false, now = Date.now()): Promise<BetaTrialStatus> {
  await ensureSchema();
  if (start) await db.execute(
    'INSERT INTO beta_trials (user_id, started_at, expires_at) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO NOTHING',
    [userId, new Date(now).toISOString(), new Date(now + BETA_TRIAL_DAYS * 86400000).toISOString()]);
  const row = await db.queryOne<{started_at: string; expires_at: string; interested_at: string | null}>('SELECT * FROM beta_trials WHERE user_id = $1', [userId]);
  if (!row) return {state:'not_started',startedAt:null,expiresAt:null,daysRemaining:BETA_TRIAL_DAYS,interested:false};
  const end = new Date(row.expires_at).getTime();
  if (!Number.isFinite(end)) throw new Error('Invalid trial expiry');
  return {state: now >= end ? 'expired' : 'active', startedAt:new Date(row.started_at).toISOString(), expiresAt:new Date(end).toISOString(), daysRemaining:Math.max(0,Math.ceil((end-now)/86400000)),interested:!!row.interested_at};
}
export async function recordTrialInterest(userId: string): Promise<BetaTrialStatus> {
  await ensureSchema();
  await db.execute('UPDATE beta_trials SET interested_at = COALESCE(interested_at, $1) WHERE user_id = $2',[new Date().toISOString(),userId]);
  return trialStatus(userId);
}
async function baseAccessStatus(userId: string, start = false, now = Date.now()): Promise<BetaTrialStatus> {
  let trial = await trialStatus(userId, false, now);
  const paid = await paidCoverage(userId, Date.parse(trial.expiresAt || '') || 0, now);
  if (start && !paid.hasPurchased) trial = await trialStatus(userId, true, now);
  if (paid.paidUntil) return {...trial, state:'active', expiresAt:paid.paidUntil,
    daysRemaining:Math.ceil((Date.parse(paid.paidUntil)-now)/86400000), paidUntil:paid.paidUntil, paymentMode:'test'};
  if (paid.hasPurchased && trial.state === 'not_started') return {...trial,state:'expired',daysRemaining:0};
  return trial;
}
export async function chatAccessStatus(userId: string, start = false, now = Date.now()): Promise<BetaTrialStatus> {
  const access = await baseAccessStatus(userId, start, now);
  return {...access, quota: await quotaStatus(userId, !!access.paidUntil, now)};
}
export async function requireBetaTrial(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!CHAT_ONLY_BETA) { next(); return; }
  if (!req.userId) { res.status(401).json({error:'กรุณาเข้าสู่ระบบก่อน'}); return; }
  if (!Array.isArray(req.body?.messages) || !req.body.messages.some((m: any) => m?.role === 'user' && typeof (m.content ?? m.text) === 'string' && (m.content ?? m.text).trim())) { res.status(400).json({error:'กรุณาระบุข้อความ'}); return; }
  try { boundChatInput(req.body); } catch (e) { res.status(400).json({error:(e as Error).message}); return; }
  try {
    const trial = await chatAccessStatus(req.userId, true);
    if (trial.state === 'expired') {
      res.status(403).json({code:'BETA_TRIAL_EXPIRED',error:'ครบช่วงทดลอง 14 วันแล้ว ยังย้อนอ่านประวัติได้เสมอนะ',trial}); return;
    }
    res.locals ??= {};
    res.locals.chatReservation = await reserveChat(req.userId, req.body.quotaRequestId ?? req.body.requestId, !!trial.paidUntil);
    next();
  } catch (e) {
    if (e instanceof QuotaError) { res.setHeader('Retry-After', String(e.retryAfter)); res.status(429).json({code:e.code,error:e.message}); return; }
    res.status(503).json({error:'ยังตรวจสอบสิทธิ์ทดลองไม่ได้ กรุณาลองอีกครั้ง'});
  }
}

