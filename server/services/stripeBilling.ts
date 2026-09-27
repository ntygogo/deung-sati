import Stripe from 'stripe';
import { db } from '../db/database.js';
import { billingConfigured, billingOrigin, canUseBilling, billingMode, billingOrdersTable } from './billingConfig.js';
import { applyPayment, reserveOrder, type BillingOrder } from './billing.js';
import { trialStatus } from './betaTrial.js';

export function stripeClient() {
  if (!billingConfigured()) throw new Error('Billing is not configured');
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { maxNetworkRetries: 2, timeout: 15000 });
}

export async function createCheckout(userId: string, stripe = stripeClient()) {
  if (!canUseBilling(userId)) throw new Error('Billing unavailable');
  const origin = billingOrigin();
  const order = await reserveOrder(userId);
  // The order ID doubles as the provider idempotency key, including retries
  // following a timeout after Stripe accepted the original request.
  const session = await stripe.checkout.sessions.create({
    mode: 'payment', payment_method_types: ['promptpay'],
    client_reference_id: order.id,
    metadata: { orderId: order.id, userId },
    payment_intent_data: { metadata: { orderId: order.id, userId } },
    line_items: [{ quantity: 1, price_data: {
      currency: order.currency, unit_amount: order.amount,
      product_data: { name: `ดึงสติ — สิทธิ์แชท 30 วัน${order.mode === 'test' ? ' (ทดสอบ)' : ''}`, description: order.mode === 'test' ? 'รายการทดสอบ ไม่มีการเรียกเก็บเงินจริง' : 'แชท 50 ข้อความต่อวัน รีเซ็ตเที่ยงคืนไทย ไม่ต่ออายุอัตโนมัติ' },
    } }],
    expires_at: Math.floor(new Date(order.created_at).getTime() / 1000) + 3600,
    success_url: `${origin}/?billing=return&order=${order.id}`,
    cancel_url: `${origin}/?billing=cancel&order=${order.id}`,
  }, { idempotencyKey: `billing-order-${order.id}` });
  if (!session.url || session.livemode !== (order.mode === 'live')) throw new Error('Checkout mode mismatch');
  const url = new URL(session.url);
  if (url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com') throw new Error('Unexpected checkout destination');
  await db.execute(`UPDATE ${billingOrdersTable()} SET session_id = $1, checkout_url = $2 WHERE id = $3`, [session.id, session.url, order.id]);
  return { orderId: order.id, url: session.url };
}

function idOf(value: string | {id: string} | null): string | null { return typeof value === 'string' ? value : value?.id || null; }

export async function reconcileOrder(order: BillingOrder, eventId?: string, failed = false, stripe = stripeClient()) {
  if (order.mode !== billingMode()) throw new Error('Order mode mismatch');
  if (!order.session_id) throw new Error('Checkout creation still pending');
  const session = await stripe.checkout.sessions.retrieve(order.session_id);
  const paymentIntent = idOf(session.payment_intent);
  let refundedAmount = 0;
  if (paymentIntent) {
    const intent = await stripe.paymentIntents.retrieve(paymentIntent, { expand: ['latest_charge'] });
    if (intent.livemode !== (order.mode === 'live') || intent.metadata.orderId !== order.id || intent.amount !== order.amount || intent.currency !== order.currency) throw new Error('Payment intent mismatch');
    // Only completed refunds revoke access. Pending/failed refunds are not money returned.
    for await (const refund of stripe.refunds.list({ payment_intent: paymentIntent, limit: 100 })) {
      if (refund.status === 'succeeded') refundedAmount += refund.amount;
    }
  }
  const userId = session.metadata?.userId || '';
  if (session.metadata?.orderId !== order.id || session.client_reference_id !== order.id) throw new Error('Checkout ownership mismatch');
  const trial = order.user_id ? await trialStatus(order.user_id) : null;
  await applyPayment({ orderId: order.id, userId, sessionId: session.id, paymentIntent,
    amount: session.amount_total ?? -1, currency: session.currency || '', paid: session.payment_status === 'paid',
    expired: session.status === 'expired', failed, refundedAmount, livemode: session.livemode,
  }, trial?.expiresAt || null, eventId);
}

export async function handleStripeEvent(event: Stripe.Event, stripe = stripeClient()) {
  if (event.livemode !== (billingMode() === 'live')) throw new Error('Event mode mismatch');
  let order: BillingOrder | null = null;
  if (['checkout.session.completed', 'checkout.session.async_payment_succeeded', 'checkout.session.async_payment_failed', 'checkout.session.expired'].includes(event.type)) {
    const session = event.data.object as Stripe.Checkout.Session;
    order = await db.queryOne<BillingOrder>(`SELECT * FROM ${billingOrdersTable()} WHERE id = $1`, [session.metadata?.orderId || '']);
    if (!order) return; // Unrelated events on a shared Stripe account.
    if (order.session_id && order.session_id !== session.id) throw new Error('Session mismatch');
    // A webhook may win the race with checkout creation. Persist the signed
    // session ID; authoritative API verification still precedes fulfillment.
    if (!order.session_id) { order.session_id = session.id; }
  } else if (['charge.refunded', 'refund.updated', 'refund.created', 'refund.failed'].includes(event.type)) {
    const object = event.data.object as Stripe.Charge | Stripe.Refund;
    const paymentIntent = idOf(object.payment_intent);
    if (!paymentIntent) return;
    const intent = await stripe.paymentIntents.retrieve(paymentIntent);
    order = await db.queryOne<BillingOrder>(`SELECT * FROM ${billingOrdersTable()} WHERE id = $1`, [intent.metadata.orderId || '']);
    if (!order) return;
  } else return;
  await reconcileOrder(order, event.id, event.type === 'checkout.session.async_payment_failed', stripe);
}

