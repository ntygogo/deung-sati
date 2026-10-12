import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { once } from 'node:events';
import { test } from 'node:test';
import express from 'express';
import type Stripe from 'stripe';
import { db, setTestDatabase } from '../db/database.js';
import { SqliteDatabaseAdapter } from '../db/sqliteAdapter.js';
import { PostgresDatabaseAdapter } from '../db/postgresAdapter.js';
import { prepareLineReply, markLineReplySent, forgetUnsentLineContext, type Generated } from '../services/lineChat.js';
import { ensureLineSchema } from '../services/lineSchema.js';
import { createLineWebhook, lineMessages } from '../routes/line.js';
import { createLineCheckout, handleLineStripeEvent, linePaidUntil, type LineOrder } from '../services/lineBilling.js';
import { thaiDay } from '../services/lineConfig.js';
import { allowLinePilot } from '../services/linePilot.js';
import { lineConversationChoices, lineChoiceInput, isLineSummaryRequest } from '../services/lineConversation.js';
import { prepareLoopChat, applyLoopChat } from '../../src/shared/chat-protocol/loopChatGuide.js';

process.env.NODE_ENV='test'; process.env.DB_DRIVER='sqlite';
const pgUrl=process.env.LINE_TEST_DATABASE_URL;
if(pgUrl && !['localhost','127.0.0.1'].includes(new URL(pgUrl).hostname)) throw new Error('LINE tests require isolated localhost PostgreSQL');
setTestDatabase(pgUrl?new PostgresDatabaseAdapter(pgUrl):new SqliteDatabaseAdapter(':memory:'));
await ensureLineSchema();
const now=Date.now(); let counter=0, calls=0;
const generator=async (_id:string,messages:{role:string;content:string}[]):Promise<Generated> => {
  calls++; return {text:'รับฟัง '+messages.at(-1)!.content,success:true,crisis:false};
};
const chat=(id:string,text:string,at=now+counter*6000) => prepareLineReply(id,`event-${++counter}`,text,at,generator);
const row=async(id:string)=>{const r=await db.queryOne<any>('SELECT * FROM line_chat_users WHERE id=$1',[id]);if(typeof r?.history_json==='string')r.history_json=JSON.parse(r.history_json);return r;};
await test('LINE chat, quotas, privacy, delivery and payments use an isolated DB and provider stubs',async t=>{
 try {
  await t.test('pilot invitation is single-recipient, replay-safe and expires',async()=>{
    process.env.LINE_PILOT_CODE='test-only-pilot-invitation-123456789';
    process.env.LINE_PILOT_EXPIRES_AT=new Date(now+60000).toISOString();
    assert.equal(await allowLinePilot('pilot-a','wrong',now),false);
    assert.equal(await allowLinePilot('pilot-a',process.env.LINE_PILOT_CODE,now),true);
    assert.equal(await allowLinePilot('pilot-b',process.env.LINE_PILOT_CODE,now),false);
    assert.equal(await allowLinePilot('pilot-a','hello',now),true);
    assert.equal(await allowLinePilot('pilot-a','hello',now+60001),false);
    delete process.env.LINE_PILOT_CODE; delete process.env.LINE_PILOT_EXPIRES_AT;
  });
  await t.test('consent before AI, menus do not charge, no web account required',async()=>{
    assert.match((await chat('alice','เรื่องส่วนตัว'))!.text,/ยินยอม/);assert.equal(calls,0);
    await chat('alice','เริ่มคุย');await chat('alice','เช็กใจวันนี้');
    assert.equal((await row('alice')).rounds,0);assert.equal((await row('alice')).daily_messages,0);
    await chat('alice','เหนื่อยจัง'); assert.equal(calls,1);assert.equal((await row('alice')).rounds,1);
    if(!pgUrl) assert.equal((await db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")).length,0);
  });
  await t.test('receipt retries reuse answer without AI or quota; sent receipts are no-ops',async()=>{
    const at=now+100000, id='duplicate-1', before=calls;
    const first=await prepareLineReply('alice',id,'คิดมาก',at,generator);
    const second=await prepareLineReply('alice',id,'คิดมาก',at,generator);
    assert.deepEqual(second,first);assert.equal(calls,before+1);
    await markLineReplySent(id);assert.equal(await prepareLineReply('alice',id,'คิดมาก',at,generator),null);
    await assert.rejects(prepareLineReply('bob',id,'คิดมาก',at,generator),/owner/);
  });
  await t.test('ten messages per free round, five rounds per month, month uses Bangkok',async()=>{
    await chat('quota','เริ่มคุย');
    for(let i=0;i<50;i++) await chat('quota','ข้อความ '+i,now+200000+i*6000);
    assert.equal((await row('quota')).rounds,5);assert.equal((await row('quota')).round_messages,10);
    const before=calls; assert.match((await chat('quota','อีกข้อความ',now+600000))!.text,/ครบ/);assert.equal(calls,before);
    assert.equal(thaiDay(Date.parse('2026-10-31T17:00:00Z')),'2026-11-01');
    const nextMonth=Date.parse(new Date(now).toISOString().slice(0,7)+'-01T00:00:00Z')+40*86400_000;
    await chat('quota','เดือนใหม่',nextMonth);assert.equal((await row('quota')).rounds,1);
  });
  await t.test('quota rollover preserves topic and loop; summary uses stored fields without AI or quota',async()=>{
    await chat('continuity','เริ่มคุย');
    const loop={mode:'review',fields:{trigger:'รถเมล์มาช้า',emotion_or_body:'หงุดหงิด'},skipped:[],asked:null,nextOfferAt:3};
    for(let i=0;i<10;i++) await prepareLineReply('continuity',`continuity-${i}`,i===0?'รถเมล์มาช้า':'เล่าต่อ '+i,now+100000+i*6000,
      async()=>({text:'รับฟังอยู่',success:true,crisis:false,loop}));
    await prepareLineReply('continuity','continuity-11','คุยต่อ',now+200000,async(_id,messages,previous)=>{
      assert.ok(messages.some(m=>m.content==='รถเมล์มาช้า'));
      assert.deepEqual(previous,loop);
      return {text:'คุยเรื่องเดิมต่อ',success:true,crisis:false,loop};
    });
    assert.equal((await row('continuity')).rounds,2);
    const before=(await row('continuity')).daily_messages;
    const summary=await chat('continuity','สรุปเลย',now+210000);
    assert.match(summary!.text,/รถเมล์มาช้า/);assert.match(summary!.text,/หงุดหงิด/);
    assert.match(summary!.text,/ยังไม่ได้เล่า/);assert.match(summary!.text,/ยังไม่ได้บันทึกลงสมุด/);
    assert.equal((await row('continuity')).daily_messages,before);
    assert.equal(summary!.choices!.at(-1),'สิทธิ์ของฉัน');
    await prepareLineReply('continuity','continuity-idle','เมื่อวานที่คุยกัน',now+220000+31*60000,async(_id,messages,previous)=>{
      assert.ok(messages.some(m=>m.content==='รถเมล์มาช้า'));assert.deepEqual(previous,loop);
      return {text:'จำเรื่องที่เล่าได้',success:true,crisis:false,loop};
    });
  });
  await t.test('contextual buttons are user actions, with entitlement last and working summary aliases',()=>{
    for(const mode of ['listening','offered','guided','review']) {
      const choices=lineConversationChoices({mode,fields:{},skipped:[],asked:null,nextOfferAt:3});
      assert.equal(choices.at(-1),'สิทธิ์ของฉัน');assert.ok(!choices.includes('เริ่มเรื่องใหม่'));
      const payload=lineMessages({text:'คำตอบ',choices})[0];
      assert.equal(payload.quickReply!.items.at(-1)!.action.text,'สิทธิ์ของฉัน');
      if(mode==='review') assert.equal(payload.quickReply!.items[0].action.label,'สรุปที่คุยกัน');
      if(mode==='offered') assert.ok(choices.includes('ค่อย ๆ สำรวจลูปด้วยกัน'));
    }
    assert.equal(lineChoiceInput('ยังเล่าไม่จบ'),'อยากระบายต่อ');
    assert.ok(isLineSummaryRequest('สรุปเลย'));assert.ok(isLineSummaryRequest('สรุปที่คุยกัน'));
    assert.ok(!isLineSummaryRequest('ไม่ต้องสรุป'));
  });
  await t.test('LINE first learns the story and feeling before offering modes; explicit exploration still works',()=>{
    const seed={mode:'listening',fields:{trigger:'รถเมล์มาช้า',emotion_or_body:'หงุดหงิด'},skipped:[],asked:null,nextOfferAt:2};
    const messages=[{role:'user',content:'รถเมล์มาช้า'},{role:'user',content:'หงุดหงิด'}];
    const turn={assistant_message:'ก่อนหน้านั้นเกิดอะไรขึ้นบ้าง?',quick_replies:[],safety_state:'normal'} as any;
    assert.equal(applyLoopChat(prepareLoopChat(messages,seed,'line'),{},turn).loop_guide!.mode,'listening');
    messages.push({role:'user',content:'รออยู่ที่ป้ายครึ่งชั่วโมงแล้ว'});
    assert.equal(applyLoopChat(prepareLoopChat(messages,seed,'line'),{},turn).loop_guide!.mode,'offered');
    assert.equal(applyLoopChat(prepareLoopChat(messages,{...seed,fields:{trigger:'รถเมล์มาช้า'}},'line'),{},turn).loop_guide!.mode,'listening');
    assert.equal(prepareLoopChat([{role:'user',content:'ค่อย ๆ สำรวจลูปด้วยกัน'}],undefined,'line').state.mode,'guided');
  });
  await t.test('new topic and inactivity start a round; user histories stay isolated',async()=>{
    await chat('new','เริ่มคุย');await chat('new','เรื่องแรก',now+200000);
    await chat('new','เริ่มเรื่องใหม่',now+210000);await chat('new','เรื่องสอง',now+220000);
    assert.equal((await row('new')).rounds,2);
    const history=JSON.stringify((await row('new')).history_json);assert.ok(!history.includes('เรื่องแรก'));
    assert.ok(!JSON.stringify((await row('alice')).history_json).includes('เรื่องสอง'));
    await chat('new','วันต่อมา',now+220000+31*60000);assert.equal((await row('new')).rounds,3);
  });
  await t.test('AI failures do not charge; crisis bypasses paywall without charging',async()=>{
    await chat('failure','เริ่มคุย');
    await prepareLineReply('failure','failed','hello',now+100000,async()=>({text:'ลองใหม่',success:false,crisis:false}));
    assert.equal((await row('failure')).rounds,0);
    let reached=false;
    await prepareLineReply('quota','crisis','อยากฆ่าตัวตาย',now+900000,async()=>{reached=true;return {text:'ช่วยเหลือ',success:true,crisis:true};});
    assert.equal(reached,true);
  });
  await t.test('busy users cannot spend twice, and expired workers cannot commit',async()=>{
    await chat('busy','เริ่มคุย');
    let release!:()=>void;let entered!:()=>void;const started=new Promise<void>(r=>entered=r);
    const work=prepareLineReply('busy','one','ข้อความ',now+100000,async()=>{entered();await new Promise<void>(r=>release=r);return {text:'ตอบ',success:true,crisis:false};});
    await started;
    await assert.rejects(prepareLineReply('busy','two','อีกข้อความ',now+100001,generator),/busy/);
    await db.execute('UPDATE line_chat_users SET busy_event=$1 WHERE id=$2',['new-owner','busy']);
    release();await assert.rejects(work,/lease/);assert.equal((await row('busy')).rounds,0);
  });
  await t.test('clear history removes stored content, preserves quota and replay tombstones',async()=>{
    const before=(await row('alice')).rounds;
    await chat('alice','ลบประวัติ',now+700000);await chat('alice','ยืนยันลบประวัติ',now+710000);
    const user=await row('alice');assert.deepEqual(user.history_json,[]);assert.equal(user.consent_at,null);assert.equal(user.rounds,before);
    assert.equal(await prepareLineReply('alice','duplicate-1','คิดมาก',now+720000,generator),null);
    assert.match((await chat('alice','อยากเล่าต่อ',now+730000))!.text,/ยินยอม/);
  });
  await t.test('LINE payload respects text lengths and never splits emoji',()=>{
    const messages=lineMessages({text:'🌿'.repeat(6000),choices:['เมนู']});
    assert.equal(messages.length,3);assert.ok(messages.every(m=>m.text.length<=4500&&!m.text.includes('\uFFFD')));
  });
  await t.test('unsend clears context and cancels stale writers without resetting quota',async()=>{
    await chat('unsend','เริ่มคุย');await chat('unsend','ข้อความส่วนตัว',now+200000);
    await forgetUnsentLineContext('unsend','unsend-event');
    assert.deepEqual((await row('unsend')).history_json,[]);assert.equal((await row('unsend')).rounds,1);
    await chat('unsend','ข้อความใหม่',now+220000);await forgetUnsentLineContext('unsend','unsend-event');
    assert.ok(JSON.stringify((await row('unsend')).history_json).includes('ข้อความใหม่'));
  });
  await t.test('webhook verifies raw signature before processing; ignores groups and unapproved pilot users',async()=>{
    process.env.LINE_ENABLED='true';process.env.LINE_CHANNEL_SECRET='fixture-secret';process.env.LINE_CHANNEL_ACCESS_TOKEN='fixture-token';
    process.env.LINE_TEST_USER_IDS='alice';
    let prepared=0, delivered=0,marked=0;
    const app=express();app.post('/line',express.raw({type:'application/json'}),createLineWebhook(async()=>{prepared++;return {text:'hi'};},async()=>{delivered++;},async()=>{marked++;}));
    const server=app.listen(0,'127.0.0.1');await once(server,'listening');
    const url=`http://127.0.0.1:${(server.address() as {port:number}).port}/line`;
    const post=(body:string,signBody=body)=>fetch(url,{method:'POST',headers:{'Content-Type':'application/json','x-line-signature':createHmac('sha256','fixture-secret').update(signBody).digest('base64')},body});
    try {
      const body=JSON.stringify({events:[{type:'message',webhookEventId:'http-1',timestamp:now,replyToken:'token',source:{type:'user',userId:'alice'},message:{type:'text',text:'hello'}}]});
      assert.equal((await post(body+' ',body)).status,401);assert.equal(prepared,0);
      assert.equal((await post(body)).status,200);assert.equal(prepared,1);assert.equal(delivered,1);assert.equal(marked,1);
      assert.equal((await post(body.replace('"user"','"group"'))).status,200);assert.equal(prepared,1);
      assert.equal((await post(body.replace('alice','other'))).status,200);assert.equal(prepared,1);
      assert.equal((await post('{"events":[]}')).status,200);
      process.env.LINE_ENABLED='false';assert.equal((await post(body)).status,503);process.env.LINE_ENABLED='true';
    } finally {server.close();}
  });
  await t.test('99 THB checkout is server-priced, gated, idempotent and separate from web purchases',async()=>{
    process.env.BILLING_MODE='test';process.env.STRIPE_SECRET_KEY='sk_test_fixture';process.env.STRIPE_WEBHOOK_SECRET='whsec_fixture';
    process.env.BILLING_APP_ORIGIN='https://example.test';process.env.LINE_TEST_USER_IDS='payer';
    await chat('payer','เริ่มคุย');
    await assert.rejects(createLineCheckout('payer'),/disabled/);
    process.env.LINE_BILLING_ENABLED='true';
    let remote:any, intent:any, refund=0, refundStatus='succeeded', checkoutCalls=0;
    const provider={checkout:{sessions:{create:async(params:any)=>{
      checkoutCalls++;assert.equal(params.mode,'payment');assert.deepEqual(params.payment_method_types,['promptpay']);
      assert.equal(params.line_items[0].price_data.unit_amount,9900);assert.equal(params.metadata.userId,undefined);
      remote={id:'cs_'+params.metadata.lineOrderId,url:'https://checkout.stripe.com/c/pay/test',livemode:false,
        metadata:params.metadata,client_reference_id:params.client_reference_id,amount_total:9900,currency:'thb',payment_status:'unpaid',status:'complete',payment_intent:null};return remote;
    },retrieve:async()=>remote}},paymentIntents:{retrieve:async()=>intent},refunds:{list:()=>({async *[Symbol.asyncIterator](){yield {status:refundStatus,amount:refund};}})}} as unknown as Stripe;
    await createLineCheckout('payer',provider);await createLineCheckout('payer',provider);assert.equal(checkoutCalls,1);
    const event=(type='checkout.session.completed')=>({id:'evt_line',type,livemode:false,data:{object:type.startsWith('checkout.')?remote:{payment_intent:intent.id}}}) as Stripe.Event;
    await handleLineStripeEvent(event(),provider);assert.equal(await linePaidUntil('payer'),null);
    remote.payment_status='paid';remote.payment_intent='pi_line';intent={id:'pi_line',livemode:false,metadata:remote.metadata,amount:9900,currency:'thb',status:'succeeded'};
    remote.amount_total=1;await assert.rejects(handleLineStripeEvent(event(),provider),/mismatch/);remote.amount_total=9900;
    await handleLineStripeEvent(event('checkout.session.async_payment_succeeded'),provider);
    const paid=(await db.queryOne<LineOrder>('SELECT * FROM line_chat_orders WHERE user_id=$1',['payer']))!;
    const end=await linePaidUntil('payer');assert.ok(end);assert.equal(Date.parse(paid.expires_at!)-Date.parse(paid.starts_at!),30*86400_000);
    await handleLineStripeEvent(event(),provider);assert.equal(await linePaidUntil('payer'),end);
    process.env.BILLING_MODE='live';assert.equal(await linePaidUntil('payer'),null);process.env.BILLING_MODE='test';
    await assert.rejects(handleLineStripeEvent({...event(),livemode:true},provider),/mode/);
    await db.execute('UPDATE line_chat_users SET day_key=$1,daily_messages=$2 WHERE id=$3',[thaiDay(now),50,'payer']);
    assert.match((await chat('payer','ข้อความที่51',now+500000))!.text,/ครบ 50/);
    refund=9900;refundStatus='pending';await handleLineStripeEvent(event('refund.updated'),provider);assert.equal(await linePaidUntil('payer'),end);
    refundStatus='succeeded';await handleLineStripeEvent(event('refund.updated'),provider);assert.equal(await linePaidUntil('payer'),null);
    refund=0;await handleLineStripeEvent(event(),provider);assert.equal(await linePaidUntil('payer'),null);
    if(!pgUrl) assert.equal((await db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='billing_orders'")).length,0);
  });
  await t.test('PostgreSQL concurrent duplicate webhooks invoke AI once',{skip:!pgUrl},async()=>{
    await chat('pg-concurrent','เริ่มคุย');const before=calls;
    const invoke=()=>prepareLineReply('pg-concurrent','pg-duplicate','hello',now+200000,generator);
    await Promise.allSettled([invoke(),invoke()]);await invoke();
    assert.equal(calls,before+1);assert.equal((await row('pg-concurrent')).daily_messages,1);
  });
 } finally {await db.close();}
});
