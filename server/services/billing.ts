import { randomUUID } from 'node:crypto';
import { db } from '../db/database.js';
import { BILLING_PLAN, canUseBilling, billingMode, billingOrdersTable, billingEventsTable } from './billingConfig.js';
import { ensureBillingSchema } from './billingSchema.js';

export interface BillingOrder {
  id: string; user_id: string | null; mode: 'test' | 'live'; plan_id: string;
  amount: number; currency: string; days: number; status: string;
  session_id: string | null; checkout_url: string | null; payment_intent: string | null;
  refunded_amount: number; created_at: string; paid_at: string | null;
  starts_at: string | null; expires_at: string | null;
}
const iso = (v: string | Date | number) => new Date(v).toISOString();
const day = 86400000;
const timestamp = (value: string | null) => value ? new Date(value).getTime() : 0;

export async function ordersForUser(userId: string) {
  await ensureBillingSchema();
  return db.query<BillingOrder>(`SELECT * FROM ${billingOrdersTable()} WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`, [userId]);
}

// Walk continuous coverage, not MAX(expires_at): a refunded earlier pass must
// never unlock a future pass across a gap. Other purchased passes are preserved.
export function coverageEnd(orders: BillingOrder[], now: number, trialEnd: number): string | null {
  let cursor = Math.max(now, trialEnd || 0);
  let covered = false;
  for (const order of [...orders].sort((a, b) => timestamp(a.starts_at) - timestamp(b.starts_at))) {
    if (!['paid', 'partially_refunded'].includes(order.status) || !order.starts_at || !order.expires_at) continue;
    const start = timestamp(order.starts_at), end = timestamp(order.expires_at);
    if (start <= cursor && end > cursor) { cursor = end; covered = true; }
  }
  return covered ? iso(cursor) : null;
}

export async function paidCoverage(userId: string, trialEnd: number, now = Date.now()) {
  if (!canUseBilling(userId)) return { paidUntil: null, hasPurchased: false };
  const orders = await ordersForUser(userId);
  return { paidUntil: coverageEnd(orders, now, trialEnd), hasPurchased: orders.some(o => !!o.paid_at) };
}

export async function reserveOrder(userId: string, now = Date.now()): Promise<BillingOrder> {
  await ensureBillingSchema();
  return db.transaction(async tx => {
    await tx.queryOne('SELECT id FROM users WHERE id = $1 FOR UPDATE', [userId]);
    const pending = await tx.queryOne<BillingOrder>(`SELECT * FROM ${billingOrdersTable()}
      WHERE user_id = $1 AND status = 'pending' AND created_at > $2 ORDER BY created_at DESC LIMIT 1`,
    [userId, iso(now - 31 * 60000)]);
    if (pending) return pending;
    const id = randomUUID();
    await tx.execute(`INSERT INTO ${billingOrdersTable()} (id,user_id,mode,plan_id,amount,currency,days,status,created_at)
      VALUES ($1,$2,'${billingMode()}',$3,$4,$5,$6,'pending',$7)`,
    [id, userId, BILLING_PLAN.id, BILLING_PLAN.amount, BILLING_PLAN.currency, BILLING_PLAN.days, iso(now)]);
    return (await tx.queryOne<BillingOrder>(`SELECT * FROM ${billingOrdersTable()} WHERE id = $1`, [id]))!;
  });
}

export interface PaymentSnapshot {
  orderId: string; userId: string; sessionId: string; paymentIntent: string | null;
  amount: number; currency: string; paid: boolean; expired: boolean;
  failed: boolean; refundedAmount: number; livemode: boolean;
}

// Only called after a Stripe API retrieval (or an explicit test fixture).
// User lock serializes different purchases; the order update and event receipt
// commit together so retries cannot grant a second 30-day pass.
export async function applyPayment(snapshot: PaymentSnapshot, trialEnd: string | null, eventId?: string, now = Date.now()) {
  await ensureBillingSchema();
  return db.transaction(async tx => {
    const owner = await tx.queryOne('SELECT id FROM users WHERE id = $1 FOR UPDATE', [snapshot.userId]);
    const order = await tx.queryOne<BillingOrder>(`SELECT * FROM ${billingOrdersTable()} WHERE id = $1 FOR UPDATE`, [snapshot.orderId]);
    if (!order || snapshot.livemode !== (order.mode === 'live') || order.mode !== billingMode() || snapshot.amount !== order.amount || snapshot.currency !== order.currency
      || (order.user_id !== null && snapshot.userId !== order.user_id)
      || (order.session_id && snapshot.sessionId !== order.session_id)
      || (order.payment_intent && snapshot.paymentIntent !== order.payment_intent)
      || !Number.isInteger(snapshot.refundedAmount) || snapshot.refundedAmount < 0 || snapshot.refundedAmount > order.amount) {
      throw new Error('Payment verification mismatch');
    }
    if (eventId) {
      const result = await tx.execute(`INSERT INTO ${billingEventsTable()} (id,processed_at) VALUES ($1,$2) ON CONFLICT (id) DO NOTHING`, [eventId, iso(now)]);
      if (!result.affectedRows) return;
    }
    const refunded = Math.max(order.refunded_amount, snapshot.refundedAmount);
    if (!snapshot.paid) {
      if (!order.paid_at) await tx.execute(`UPDATE ${billingOrdersTable()} SET status = $1 WHERE id = $2`, [snapshot.expired ? 'expired' : snapshot.failed ? 'failed' : 'pending', order.id]);
      return;
    }
    let startsAt = order.starts_at, expiresAt = order.expires_at;
    if (!order.paid_at && owner && order.user_id && refunded < order.amount) {
      const existing = await tx.query<BillingOrder>(`SELECT * FROM ${billingOrdersTable()} WHERE user_id = $1 AND status IN ('paid','partially_refunded')`, [order.user_id]);
      const latest = existing.reduce((end, item) => Math.max(end, timestamp(item.expires_at) || 0), Math.max(now, timestamp(trialEnd) || 0));
      startsAt = iso(latest); expiresAt = iso(latest + order.days * day);
    }
    await tx.execute(`UPDATE ${billingOrdersTable()} SET status = $1, session_id = $2, payment_intent = $3,
      refunded_amount = $4, paid_at = $5, starts_at = $6, expires_at = $7 WHERE id = $8`,
    [refunded === order.amount ? 'refunded' : refunded > 0 ? 'partially_refunded' : 'paid', snapshot.sessionId,
      snapshot.paymentIntent, refunded, order.paid_at || iso(now), startsAt, expiresAt, order.id]);
  });
}

