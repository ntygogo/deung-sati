import assert from 'node:assert/strict';
import { test } from 'node:test';
import { once } from 'node:events';
import Stripe from 'stripe';
import { db, setTestDatabase } from '../db/database.js';
import { SqliteDatabaseAdapter } from '../db/sqliteAdapter.js';
import { PostgresDatabaseAdapter } from '../db/postgresAdapter.js';
import { runMigrations } from '../db/migrator.js';
import { apiApp } from '../apiRouter.js';
import { reserveOrder, applyPayment, ordersForUser, type BillingOrder, type PaymentSnapshot } from '../services/billing.js';
import { trialStatus, chatAccessStatus, requireBetaTrial } from '../services/betaTrial.js';
import { createCheckout, reconcileOrder, handleStripeEvent } from '../services/stripeBilling.js';
import { billingConfigured } from '../services/billingConfig.js';
import { estimateUsage, recordAiUsage } from '../services/aiUsage.js';

process.env.NODE_ENV='test';
process.env.DB_DRIVER='sqlite';
const pgUrl=process.env.BILLING_TEST_DATABASE_URL;
if(pgUrl && !['localhost','127.0.0.1'].includes(new URL(pgUrl).hostname)) throw new Error('Tests require an isolated localhost database');
setTestDatabase(pgUrl?new PostgresDatabaseAdapter(pgUrl):new SqliteDatabaseAdapter(':memory:'));
await runMigrations();
const server=apiApp.listen(0,'127.0.0.1');await once(server,'listening');
const base=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
async function http(path:string,token?:string,method='GET',body?:unknown,headers:Record<string,string>={}){
  return fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`} : {}),...headers},body:body===undefined?undefined:typeof body==='string'?body:JSON.stringify(body)});
}
async function signup(email:string){const response=await http('/auth/register',undefined,'POST',{name:'Billing fixture',email,password:'Test-only-long-password-7429'});assert.equal(response.status,200);const {token}=await response.json() as {token:string};const me=await(await http('/auth/me',token)).json() as {id:string};return {token,id:me.id};}
const alice=await signup('billing-a@example.test'),bob=await signup('billing-b@example.test');
const now=Date.now(), day=86400000;
const secret='whsec_local_fixture_only';
const fixtureStripe=new Stripe('sk_test_localfixtureonly');
function setup(){process.env.BILLING_MODE='test';process.env.STRIPE_SECRET_KEY='sk_test_localfixtureonly';process.env.STRIPE_WEBHOOK_SECRET=secret;process.env.BILLING_APP_ORIGIN='https://example.test';process.env.BILLING_TEST_USER_IDS=[alice.id,bob.id].join(',');process.env.BILLING_ADMIN_USER_IDS=alice.id;}
function snapshot(order:BillingOrder,extra:Partial<PaymentSnapshot>={}):PaymentSnapshot{return {orderId:order.id,userId:order.user_id!,sessionId:order.session_id||'cs_test_'+order.id,paymentIntent:'pi_'+order.id,amount:order.amount,currency:order.currency,paid:true,expired:false,failed:false,refundedAmount:0,livemode:false,...extra};}
let first:BillingOrder, second:BillingOrder;
let checkoutParams:Stripe.Checkout.SessionCreateParams|undefined;
let checkoutIdem:string|undefined;
let remoteSession:any;
let remoteIntent:any;
let refundState='succeeded';
const provider={checkout:{sessions:{create:async(params:Stripe.Checkout.SessionCreateParams,opts:{idempotencyKey:string})=>{
  checkoutParams=params;checkoutIdem=opts.idempotencyKey;
  remoteSession={id:'cs_test_'+params.metadata!.orderId,url:'https://checkout.stripe.com/c/pay/test_fixture',livemode:false,metadata:params.metadata,client_reference_id:params.client_reference_id,amount_total:14900,currency:'thb',payment_status:'unpaid',status:'open',payment_intent:null};return remoteSession;
},retrieve:async()=>remoteSession}},paymentIntents:{retrieve:async()=>remoteIntent},refunds:{list:()=>({async *[Symbol.asyncIterator](){yield {status:refundState,amount:remoteIntent.latest_charge?.amount_refunded||0};}})}} as unknown as Stripe;

await test('billing integration — isolated database, no Stripe/AI network calls',async t=>{
 try{
  await t.test('anonymous, closed checkout, and server admin authorization',async()=>{
    assert.equal((await http('/billing/status')).status,401);
    assert.equal((await http('/billing/checkout',alice.token,'POST',{})).status,503);
    assert.equal((await http('/billing/admin/report',bob.token)).status,403);
    setup();
  });
  await t.test('trial remains 14 days and checkout reserves a server-priced idempotent order',async()=>{
    const trial=await trialStatus(alice.id,true,now);
    assert.equal(Date.parse(trial.expiresAt!)-Date.parse(trial.startedAt!),14*day);
    await createCheckout(alice.id,provider);
    first=(await ordersForUser(alice.id))[0];
    assert.equal(checkoutParams!.line_items![0].price_data!.unit_amount,14900);
    assert.equal(checkoutParams!.mode,'payment');assert.deepEqual(checkoutParams!.payment_method_types,['promptpay']);
    assert.equal(checkoutIdem,'billing-order-'+first.id);
    assert.equal((await reserveOrder(alice.id)).id,first.id);
    await createCheckout(alice.id,provider);
    assert.equal((await ordersForUser(alice.id)).length,1);
  });
  await t.test('return URL and unpaid completion cannot grant access; account isolation',async()=>{
    assert.equal((await http('/billing/status?billing=return',alice.token)).status,200);
    remoteSession.status='complete';
    await reconcileOrder(first,'evt_unpaid',false,provider);
    assert.equal((await ordersForUser(alice.id))[0].paid_at,null);
    assert.equal((await http('/billing/orders/'+first.id+'/reconcile',bob.token,'POST',{})).status,404);
  });
  await t.test('verified payment extends from trial end; repeat events and stale failures never double grant',async()=>{
    remoteSession.payment_status='paid';remoteSession.payment_intent='pi_'+first.id;
    remoteIntent={id:remoteSession.payment_intent,livemode:false,metadata:{orderId:first.id},amount:14900,currency:'thb',latest_charge:{amount_refunded:0}};
    await reconcileOrder(first,'evt_paid',false,provider);
    const before=(await ordersForUser(alice.id))[0];
    assert.equal(new Date(before.starts_at!).getTime(),now+14*day);
    assert.equal(new Date(before.expires_at!).getTime(),now+44*day);
    await reconcileOrder(first,'evt_paid',false,provider);
    await reconcileOrder(first,'evt_another_delivery',true,provider);
    await applyPayment(snapshot(first,{paid:false,failed:true}),null,'evt_stale_failed');
    assert.equal(new Date((await ordersForUser(alice.id))[0].expires_at!).getTime(),new Date(before.expires_at!).getTime());
    assert.equal((await ordersForUser(alice.id))[0].status,'paid');
    const access=await chatAccessStatus(alice.id,false,now+15*day);assert.equal(access.state,'active');
    assert.equal(access.paymentMode,'test');
  });
  await t.test('mismatched amount, currency, owner, session and live mode roll back without a receipt',async()=>{
    for(const bad of [{amount:1},{currency:'usd'},{userId:bob.id},{sessionId:'cs_other'},{livemode:true}]){
      await assert.rejects(()=>applyPayment(snapshot(first,bad),null,'evt_bad_'+Object.keys(bad)[0]));
    }
    assert.equal((await db.query('SELECT * FROM billing_events WHERE id LIKE $1',['evt_bad_%'])).length,0);
  });
  await t.test('early renewal stacks and expired renewal starts from payment time',async()=>{
    second=await reserveOrder(alice.id,now+1000);
    assert.notEqual(second.id,first.id);
    await applyPayment(snapshot(second),new Date(now+14*day).toISOString(),'evt_renew',now+1000);
    const updated=(await ordersForUser(alice.id)).find(o=>o.id===second.id)!;
    assert.equal(new Date(updated.starts_at!).getTime(),now+44*day);assert.equal(new Date(updated.expires_at!).getTime(),now+74*day);
    const order=await reserveOrder(bob.id);
    await applyPayment(snapshot(order),new Date(now-day).toISOString(),'evt_after_expiry',now);
    const paid=(await ordersForUser(bob.id))[0];assert.equal(new Date(paid.starts_at!).getTime(),now);assert.equal(new Date(paid.expires_at!).getTime(),now+30*day);
  });
  await t.test('partial refund retains access; full refund revokes only that pass and cannot be undone by stale snapshots',async()=>{
    await applyPayment(snapshot(first,{refundedAmount:3000}),null,'evt_partial',now+day);
    assert.equal((await chatAccessStatus(alice.id,false,now+15*day)).state,'active');
    await applyPayment(snapshot(first,{refundedAmount:14900}),null,'evt_refund',now+day);
    await applyPayment(snapshot(first),null,'evt_stale_success',now+day);
    assert.equal((await ordersForUser(alice.id)).find(o=>o.id===first.id)!.status,'refunded');
    assert.equal((await chatAccessStatus(alice.id,false,now+15*day)).state,'expired','must not bridge refunded coverage gap');
    assert.equal((await chatAccessStatus(alice.id,false,now+45*day)).state,'active','later independent purchase is preserved');
    const cancelled=await reserveOrder(bob.id,now+2000);
    await applyPayment(snapshot(cancelled,{refundedAmount:14900}),null,'evt_refund_before_success');
    assert.equal((await ordersForUser(bob.id)).find(o=>o.id===cancelled.id)!.expires_at,null);
  });
  await t.test('sandbox access is isolated and live keys fail closed',async()=>{
    process.env.BILLING_TEST_USER_IDS=bob.id;
    assert.equal((await chatAccessStatus(alice.id,false,now+45*day)).state,'expired');
    assert.equal((await http('/billing/checkout',alice.token,'POST',{})).status,503);
    process.env.STRIPE_SECRET_KEY='sk_live_not_real';assert.equal(billingConfigured(),false);
    setup();
  });
  await t.test('webhook checks raw signature, freshness and mode before processing',async()=>{
    const payload=JSON.stringify({id:'evt_ignored',type:'customer.created',livemode:false,data:{object:{id:'cus_test'}}});
    const sign=(data:string,timestamp?:number)=>fixtureStripe.webhooks.generateTestHeaderString({payload:data,secret,timestamp});
    assert.equal((await http('/billing/webhook',undefined,'POST',payload,{'stripe-signature':'bad'})).status,400);
    assert.equal((await http('/billing/webhook',undefined,'POST',payload,{'stripe-signature':sign(payload)})).status,200);
    assert.equal((await http('/billing/webhook',undefined,'POST',payload+' ',{'stripe-signature':sign(payload)})).status,400);
    assert.equal((await http('/billing/webhook',undefined,'POST',payload,{'stripe-signature':sign(payload,1)})).status,400);
    const live=payload.replace('"livemode":false','"livemode":true');
    assert.equal((await http('/billing/webhook',undefined,'POST',live,{'stripe-signature':sign(live)})).status,400);
    const event={id:'evt_provider_refund',type:'charge.refunded',livemode:false,data:{object:{payment_intent:'pi_'+first.id}}} as Stripe.Event;
    // Current provider snapshot is authoritative, not a refund value from the event.
    remoteIntent.latest_charge.amount_refunded=14900;
    await handleStripeEvent(event,provider);
  });
  await t.test('usage includes cache and thinking, unknown cost stays unknown; admin report never includes chat',async()=>{
    const metadata={promptTokenCount:1000,cachedContentTokenCount:200,candidatesTokenCount:100,thoughtsTokenCount:50};
    const rate={input:1,output:4,cachedInput:.1};
    assert.equal(estimateUsage(metadata,rate),.00142);
    assert.equal(estimateUsage(undefined,rate),null);
    assert.equal(estimateUsage(metadata,{input:1,output:4}),null);
    process.env.AI_MODEL_RATES_USD=JSON.stringify({'fixture-model':rate});
    await recordAiUsage(alice.id,'fixture-model',metadata);
    await recordAiUsage(alice.id,'fixture-model',undefined,'provider_error');
    const report=await(await http('/billing/admin/report',alice.token)).json() as any;
    assert.equal(Number(report.usage[0].attempts),2);assert.equal(Number(report.usage[0].unpriced_attempts),1);
    assert.equal(Number(report.usage[0].estimated_usd),.00142);
    const rows=await db.query('SELECT * FROM ai_usage');assert.equal('messages' in rows[0],false);
    assert.equal((await http('/billing/admin/report',bob.token)).status,403);
  });
  await t.test('cookie mutations need CSRF header; expired chat is denied while archive remains available',async()=>{
    assert.equal((await http('/billing/checkout',undefined,'POST',{}, {Cookie:`deung_sati_session=${alice.token}`})).status,403);
    let status=0,next=false;
    await db.execute('UPDATE beta_trials SET expires_at = $1 WHERE user_id = $2',[new Date(now-day).toISOString(),alice.id]);
    await requireBetaTrial({userId:alice.id,body:{messages:[{role:'user',content:'hello'}]}} as any,{status(n:number){status=n;return this;},json(){return this;}} as any,()=>{next=true;});
    assert.equal(status,403);assert.equal(next,false);
    assert.equal((await http('/loops/conversations',alice.token)).status,200);
  });
  await t.test('live checkout, isolated entitlements, replay, mode mismatch and refunds',async()=>{
    const previousTestOrders=(await ordersForUser(alice.id)).map(o=>o.id);
    process.env.BILLING_MODE='live';process.env.STRIPE_SECRET_KEY='rk_live_fixtureonly';
    assert.equal(billingConfigured(),true);
    assert.equal((await ordersForUser(alice.id)).length,0);
    const create=provider.checkout.sessions.create;
    const liveProvider={...provider,checkout:{sessions:{...provider.checkout.sessions,create:async(...args:any[])=>{const session=await (create as any)(...args);session.livemode=true;return session;}}}} as unknown as Stripe;
    await createCheckout(alice.id,liveProvider);
    const live=(await ordersForUser(alice.id))[0];assert.equal(live.mode,'live');
    assert.ok(!checkoutParams!.line_items![0].price_data!.product_data!.name.includes('ทดสอบ'));
    assert.equal((await chatAccessStatus(alice.id)).state,'expired');
    remoteSession.payment_status='paid';remoteSession.payment_intent='pi_live_'+live.id;
    remoteIntent={id:remoteSession.payment_intent,livemode:true,metadata:{orderId:live.id},amount:14900,currency:'thb',latest_charge:{amount_refunded:0}};
    await reconcileOrder(live,'evt_live_paid',false,liveProvider);
    const paid=(await ordersForUser(alice.id))[0];
    assert.equal(Date.parse(paid.expires_at!)-Date.parse(paid.starts_at!),30*day);
    assert.equal((await chatAccessStatus(alice.id)).paymentMode,'live');
    assert.equal((await chatAccessStatus(alice.id)).quota?.limit,50);
    await reconcileOrder(paid,'evt_live_paid',false,liveProvider);
    assert.equal((await ordersForUser(alice.id))[0].expires_at,paid.expires_at);
    remoteIntent.livemode=false;await assert.rejects(reconcileOrder(paid,undefined,false,liveProvider));remoteIntent.livemode=true;
    await assert.rejects(applyPayment(snapshot(paid),null,'evt_wrong_mode'));
    remoteIntent.latest_charge.amount_refunded=5000;
    await handleStripeEvent({id:'evt_live_partial',type:'charge.refunded',livemode:true,data:{object:{payment_intent:remoteIntent.id}}} as Stripe.Event,liveProvider);
    assert.equal((await ordersForUser(alice.id))[0].status,'partially_refunded');
    remoteIntent.latest_charge.amount_refunded=14900;
    refundState='pending';
    await handleStripeEvent({id:'evt_live_pending',type:'refund.updated',livemode:true,data:{object:{payment_intent:remoteIntent.id}}} as Stripe.Event,liveProvider);
    assert.equal((await ordersForUser(alice.id))[0].status,'partially_refunded');
    refundState='failed';
    await handleStripeEvent({id:'evt_live_failed',type:'refund.failed',livemode:true,data:{object:{payment_intent:remoteIntent.id}}} as Stripe.Event,liveProvider);
    assert.equal((await ordersForUser(alice.id))[0].status,'partially_refunded');
    refundState='succeeded';
    await handleStripeEvent({id:'evt_live_full',type:'refund.updated',livemode:true,data:{object:{payment_intent:remoteIntent.id}}} as Stripe.Event,liveProvider);
    assert.equal((await chatAccessStatus(alice.id)).state,'expired');
    const payload=JSON.stringify({id:'evt_live_ignored',type:'customer.created',livemode:true,data:{object:{}}});
    const signature=fixtureStripe.webhooks.generateTestHeaderString({payload,secret});
    assert.equal((await http('/billing/webhook',undefined,'POST',payload,{'stripe-signature':signature})).status,200);
    const testPayload=payload.replace('"livemode":true','"livemode":false');
    assert.equal((await http('/billing/webhook',undefined,'POST',testPayload,{'stripe-signature':fixtureStripe.webhooks.generateTestHeaderString({payload:testPayload,secret})})).status,400);
    setup();assert.deepEqual((await ordersForUser(alice.id)).map(o=>o.id),previousTestOrders);
  });
  await t.test('Postgres serializes concurrent purchases and duplicate delivery',{skip:!pgUrl},async()=>{
    const charlie=await signup('billing-c@example.test');process.env.BILLING_TEST_USER_IDS+=','+charlie.id;
    const one=await reserveOrder(charlie.id,now-2*3600000),two=await reserveOrder(charlie.id,now);
    await Promise.all([applyPayment(snapshot(one),null,'evt_concurrent_a',now),applyPayment(snapshot(two),null,'evt_concurrent_b',now)]);
    const orders=await ordersForUser(charlie.id);assert.equal(orders.length,2);
    const end=Math.max(...orders.map(o=>new Date(o.expires_at!).getTime()));assert.equal(end,now+60*day);
    await Promise.all([applyPayment(snapshot(one),null,'evt_duplicate',now),applyPayment(snapshot(one),null,'evt_duplicate',now)]);
    assert.equal(Math.max(...(await ordersForUser(charlie.id)).map(o=>new Date(o.expires_at!).getTime())),end);
  });
 }finally{server.close();await db.close();}
});

