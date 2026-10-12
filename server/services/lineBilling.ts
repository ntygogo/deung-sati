import { randomUUID } from 'node:crypto';
import type Stripe from 'stripe';
import { db } from '../db/database.js';
import type { IDatabaseAdapter } from '../db/types.js';
import { billingConfigured, billingMode, billingOrigin } from './billingConfig.js';
import { stripeClient } from './stripeBilling.js';
import { ensureLineSchema } from './lineSchema.js';
import { LINE_PLAN, lineUserAllowed } from './lineConfig.js';

export interface LineOrder {
  id: string; user_id: string; mode: string; amount: number; currency: string; days: number;
  status: string; session_id: string | null; checkout_url: string | null; payment_intent: string | null;
  refunded_amount: number; created_at: string; paid_at: string | null; starts_at: string | null; expires_at: string | null;
}
const iso = (n: number) => new Date(n).toISOString();
const stamp = (v: string | null) => v ? new Date(v).getTime() : 0;
export function lineBillingEnabled(id: string) {
  return process.env.LINE_BILLING_ENABLED === 'true' && billingConfigured() && lineUserAllowed(id)
    && (billingMode() === 'live' || (process.env.LINE_TEST_USER_IDS || '').split(',').map(s => s.trim()).includes(id));
}
export async function linePaidUntil(id: string, now = Date.now(), tx: IDatabaseAdapter = db) {
  const orders = await tx.query<LineOrder>(`SELECT * FROM line_chat_orders
    WHERE user_id=$1 AND mode=$2 AND status IN ('paid','partially_refunded') ORDER BY starts_at`, [id, billingMode() || 'live']);
  let cursor = now;
  for (const order of orders) if (stamp(order.starts_at) <= cursor && stamp(order.expires_at) > cursor) cursor = stamp(order.expires_at);
  return cursor > now ? iso(cursor) : null;
}
export async function createLineCheckout(id: string, provider?: Stripe) {
  if (!lineBillingEnabled(id)) throw new Error('LINE checkout disabled');
  const stripe = provider || stripeClient();
  await ensureLineSchema();
  const now = Date.now();
  const order = await db.transaction(async tx => {
    const owner = await tx.queryOne('SELECT id FROM line_chat_users WHERE id=$1 FOR UPDATE', [id]);
    if (!owner) throw new Error('Unknown LINE user');
    const pending = await tx.queryOne<LineOrder>(`SELECT * FROM line_chat_orders WHERE user_id=$1 AND mode=$2
      AND status='pending' AND created_at>$3 ORDER BY created_at DESC LIMIT 1`, [id, billingMode(), iso(now - 30 * 60_000)]);
    if (pending) return pending;
    const orderId = randomUUID();
    await tx.execute(`INSERT INTO line_chat_orders (id,user_id,mode,amount,currency,days,status,created_at)
      VALUES ($1,$2,$3,$4,$5,$6,'pending',$7)`, [orderId,id,billingMode(),LINE_PLAN.amount,LINE_PLAN.currency,LINE_PLAN.days,iso(now)]);
    return (await tx.queryOne<LineOrder>('SELECT * FROM line_chat_orders WHERE id=$1', [orderId]))!;
  });
  if (order.checkout_url) return order.checkout_url;
  const metadata = { lineOrderId: order.id, product: 'deung-sati-line-v1' };
  const session = await stripe.checkout.sessions.create({
    mode: 'payment', payment_method_types: ['promptpay'], client_reference_id: order.id,
    metadata, payment_intent_data: { metadata },
    line_items: [{ quantity: 1, price_data: { currency: order.currency, unit_amount: order.amount,
      product_data: { name: `ดึงสติใน LINE — 30 วัน${order.mode === 'test' ? ' (ทดสอบ)' : ''}`,
        description: `แชท ${LINE_PLAN.dailyMessages} ข้อความต่อวัน รีเซ็ตเที่ยงคืนไทย ไม่ต่ออายุอัตโนมัติ ไม่รวมสิทธิ์เว็บหรือเลี้ยงน้อง` } } }],
    expires_at: Math.floor(stamp(order.created_at) / 1000) + 3600,
    success_url: `${billingOrigin()}/api/line/payment-return`,
    cancel_url: `${billingOrigin()}/api/line/payment-return?cancel=1`,
  }, { idempotencyKey: `line-order-${order.id}` });
  if (!session.url || session.livemode !== (order.mode === 'live')) throw new Error('LINE checkout mode mismatch');
  const url = new URL(session.url);
  if (url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com') throw new Error('Unexpected checkout URL');
  await db.execute('UPDATE line_chat_orders SET session_id=$1, checkout_url=$2 WHERE id=$3', [session.id, session.url, order.id]);
  return session.url;
}
const idOf = (v: string | { id: string } | null) => typeof v === 'string' ? v : v?.id;
// Called only after the existing Stripe endpoint has verified its raw signature.
// No redirect, user-supplied amount, or LINE message can grant a paid entitlement.
export async function handleLineStripeEvent(event: Stripe.Event, provider?: Stripe) {
  const relevant = ['checkout.session.completed','checkout.session.async_payment_succeeded','checkout.session.async_payment_failed',
    'checkout.session.expired','charge.refunded','refund.created','refund.updated','refund.failed'];
  if (!relevant.includes(event.type)) return;
  if (event.livemode !== (billingMode() === 'live')) throw new Error('LINE event mode mismatch');
  const stripe = provider || stripeClient();
  let orderId: string | undefined;
  let sessionId: string | undefined;
  if (event.type.startsWith('checkout.')) {
    const session = event.data.object as Stripe.Checkout.Session;
    orderId = session.metadata?.lineOrderId;
    sessionId = session.id;
  } else {
    const intentId = idOf((event.data.object as Stripe.Refund).payment_intent);
    if (!intentId) return;
    orderId = (await stripe.paymentIntents.retrieve(intentId)).metadata.lineOrderId;
  }
  if (!orderId) return; // Existing web purchases remain exclusively in their original handler.
  await ensureLineSchema();
  const order = await db.queryOne<LineOrder>('SELECT * FROM line_chat_orders WHERE id=$1', [orderId]);
  if (!order) throw new Error('Unknown LINE order');
  sessionId ||= order.session_id || undefined;
  if (!sessionId || (order.session_id && order.session_id !== sessionId)) throw new Error('LINE session mismatch');
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.id !== sessionId || session.livemode !== (order.mode === 'live') || order.mode !== billingMode()
    || session.metadata?.lineOrderId !== order.id || session.metadata?.product !== 'deung-sati-line-v1'
    || session.client_reference_id !== order.id || session.amount_total !== order.amount || session.currency !== order.currency)
    throw new Error('LINE payment mismatch');
  const intentId = idOf(session.payment_intent);
  let refunded = 0;
  if (intentId) {
    const intent = await stripe.paymentIntents.retrieve(intentId);
    if (intent.livemode !== session.livemode || intent.metadata.lineOrderId !== order.id
      || intent.metadata.product !== 'deung-sati-line-v1' || intent.amount !== order.amount || intent.currency !== order.currency
      || (session.payment_status === 'paid' && intent.status !== 'succeeded')) throw new Error('LINE intent mismatch');
    for await (const refund of stripe.refunds.list({ payment_intent: intentId, limit: 100 })) {
      if (refund.status === 'succeeded') refunded += refund.amount;
    }
  } else if (session.payment_status === 'paid') throw new Error('Missing paid intent');
  if (!Number.isInteger(refunded) || refunded < 0 || refunded > order.amount) throw new Error('Invalid refund');
  await db.transaction(async tx => {
    await tx.queryOne('SELECT id FROM line_chat_users WHERE id=$1 FOR UPDATE', [order.user_id]);
    const current = (await tx.queryOne<LineOrder>('SELECT * FROM line_chat_orders WHERE id=$1 FOR UPDATE', [order.id]))!;
    if ((current.session_id && current.session_id !== session.id) || (current.payment_intent && current.payment_intent !== intentId))
      throw new Error('LINE order changed');
    if (session.payment_status !== 'paid') {
      if (!current.paid_at) await tx.execute('UPDATE line_chat_orders SET status=$1 WHERE id=$2',
        [session.status === 'expired' ? 'expired' : event.type.endsWith('failed') ? 'failed' : 'pending', order.id]);
      return;
    }
    refunded = Math.max(refunded, current.refunded_amount);
    let start = current.starts_at, end = current.expires_at;
    if (!current.paid_at && refunded < current.amount) {
      const rows = await tx.query<LineOrder>(`SELECT * FROM line_chat_orders WHERE user_id=$1 AND mode=$2
        AND status IN ('paid','partially_refunded')`, [order.user_id,order.mode]);
      const latest = rows.reduce((v,r) => Math.max(v,stamp(r.expires_at)),Date.now());
      start = iso(latest); end = iso(latest + order.days * 86400_000);
    }
    await tx.execute(`UPDATE line_chat_orders SET status=$1,session_id=$2,payment_intent=$3,refunded_amount=$4,
      paid_at=$5,starts_at=$6,expires_at=$7 WHERE id=$8`,
    [refunded === current.amount ? 'refunded' : refunded > 0 ? 'partially_refunded' : 'paid',session.id,intentId,
      refunded,current.paid_at || iso(Date.now()),start,end,order.id]);
  });
}
