import { Router, type Request, type Response } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { BILLING_PLAN, billingConfigured, canUseBilling, inUserList, billingMode, billingOrdersTable } from '../services/billingConfig.js';
import { ensureBillingSchema } from '../services/billingSchema.js';
import { ordersForUser } from '../services/billing.js';
import { createCheckout, reconcileOrder, handleStripeEvent, stripeClient } from '../services/stripeBilling.js';
import { db } from '../db/database.js';
import { chatAccessStatus } from '../services/betaTrial.js';

export async function stripeWebhook(req: Request, res: Response) {
  if (!billingConfigured()) { res.status(503).json({error:'Billing not configured'}); return; }
  if (!Buffer.isBuffer(req.body)) { res.status(400).json({error:'Raw body required'}); return; }
  let event;
  try { event = stripeClient().webhooks.constructEvent(req.body, req.headers['stripe-signature'] as string, process.env.STRIPE_WEBHOOK_SECRET!); }
  catch { res.status(400).json({error:'Invalid signature'}); return; }
  if (event.livemode !== (billingMode() === 'live')) { res.status(400).json({error:'Event mode mismatch'}); return; }
  try { await ensureBillingSchema(); await handleStripeEvent(event); res.json({received:true}); }
  catch { console.error('[Billing] Event processing failed', event.id); res.status(500).json({error:'Retry delivery'}); }
}

export const billingRouter = Router();
billingRouter.use(requireAuth);
billingRouter.use((_req,res,next) => { res.setHeader('Cache-Control','private, no-store'); next(); });
billingRouter.get('/status', async (req: AuthenticatedRequest,res) => {
  try {
    const orders = await ordersForUser(req.userId!);
    res.json({ mode: billingMode(), enabled: billingConfigured() && canUseBilling(req.userId!), plan:BILLING_PLAN,
      isAdmin: inUserList('BILLING_ADMIN_USER_IDS', req.userId!), access: await chatAccessStatus(req.userId!),
      orders: orders.map(o => ({id:o.id,amount:o.amount,currency:o.currency,status:o.status,createdAt:o.created_at,
        paidAt:o.paid_at,startsAt:o.starts_at,expiresAt:o.expires_at,refundedAmount:o.refunded_amount,mode:o.mode})) });
  } catch { res.status(503).json({error:'ยังโหลดข้อมูลการชำระเงินไม่ได้ กรุณาลองอีกครั้ง'}); }
});
billingRouter.post('/checkout', async (req: AuthenticatedRequest,res) => {
  if (!billingConfigured() || !canUseBilling(req.userId!)) { res.status(503).json({error:'ยังไม่เปิดรับชำระเงินจริง ขณะนี้ทดสอบเฉพาะบัญชีที่กำหนดไว้'}); return; }
  try { res.json(await createCheckout(req.userId!)); }
  catch (error) {
    // Never log provider messages, headers, request bodies or credentials.
    const e = error as { type?: string; code?: string; statusCode?: number; requestId?: string; raw?: { detail?: { code?: string } } };
    const safeToken = (value: unknown) => typeof value === 'string' && /^[A-Za-z0-9_]{1,80}$/.test(value) ? value : undefined;
    console.error('[Billing] Checkout failed', {
      type: safeToken(e?.type), code: safeToken(e?.code),
      connectionCode: safeToken(e?.raw?.detail?.code),
      keyFormatValid: /^(sk|rk)_(test|live)_[A-Za-z0-9]+$/.test(process.env.STRIPE_SECRET_KEY || ''),
      status: typeof e?.statusCode === 'number' ? e.statusCode : undefined,
      requestId: typeof e?.requestId === 'string' && /^req_[A-Za-z0-9]+$/.test(e.requestId) ? e.requestId : undefined,
    });
    res.status(503).json({error:'ยังเปิดหน้าชำระเงินไม่ได้ กรุณาลองอีกครั้ง'});
  }
});
billingRouter.post('/orders/:id/reconcile', async (req: AuthenticatedRequest,res) => {
  if (!billingConfigured() || !canUseBilling(req.userId!)) { res.status(503).json({error:'ระบบทดสอบยังไม่พร้อม'}); return; }
  try {
    const orders = await ordersForUser(req.userId!);
    const order = orders.find(o => o.id === req.params.id);
    if (!order) { res.status(404).json({error:'ไม่พบรายการ'}); return; }
    await reconcileOrder(order);
    res.json({ok:true});
  } catch { res.status(503).json({error:'ยังยืนยันยอดไม่ได้ กรุณารอสักครู่แล้วตรวจสอบอีกครั้ง'}); }
});
billingRouter.get('/admin/report', async (req: AuthenticatedRequest,res) => {
  if (!inUserList('BILLING_ADMIN_USER_IDS', req.userId!)) { res.status(403).json({error:'Forbidden'}); return; }
  try {
    await ensureBillingSchema();
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const sales = await db.queryOne(`SELECT COUNT(*) AS orders, COALESCE(SUM(amount),0) AS gross_satang,
      COALESCE(SUM(refunded_amount),0) AS refunded_satang FROM ${billingOrdersTable()} WHERE paid_at >= $1`, [since]);
    const usage = await db.query(`SELECT model, COUNT(*) AS attempts, SUM(prompt_tokens) AS prompt_tokens,
      SUM(output_tokens) AS output_tokens, SUM(thought_tokens) AS thought_tokens, SUM(estimated_usd) AS estimated_usd,
      SUM(CASE WHEN estimated_usd IS NULL THEN 1 ELSE 0 END) AS unpriced_attempts
      FROM ai_usage WHERE created_at >= $1 GROUP BY model`, [since]);
    const perUser = await db.query(`SELECT user_id, COUNT(*) AS attempts, SUM(estimated_usd) AS estimated_usd,
      SUM(CASE WHEN estimated_usd IS NULL THEN 1 ELSE 0 END) AS unpriced_attempts
      FROM ai_usage WHERE created_at >= $1 GROUP BY user_id ORDER BY attempts DESC LIMIT 100`, [since]);
    const orders = await db.query(`SELECT id,user_id,status,amount,refunded_amount,created_at,paid_at,starts_at,expires_at
      FROM ${billingOrdersTable()} ORDER BY created_at DESC LIMIT 100`);
    await chatAccessStatus(req.userId!);
    const trial = await db.queryOne('SELECT COUNT(*) AS started FROM beta_trials WHERE started_at >= $1', [since]);
    const buyers = await db.queryOne(`SELECT COUNT(DISTINCT user_id) AS buyers FROM ${billingOrdersTable()} WHERE paid_at >= $1 AND refunded_amount < amount`, [since]);
    res.json({since,mode:billingMode(),sales,usage,perUser,orders,trial,buyers,
      note:billingMode() === 'live' ? 'ยอดชำระที่ยืนยันแล้วก่อนหักค่าธรรมเนียม ต้นทุน AI เป็นประมาณการ ต้องเทียบบิลและยอดโอนจากผู้ให้บริการ' : 'ยอดขายเป็นรายการทดสอบ ไม่ใช่เงินจริง'});
  } catch { res.status(503).json({error:'ยังโหลดรายงานไม่ได้'}); }
});

