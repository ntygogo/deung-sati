import assert from 'node:assert/strict';
import { test } from 'node:test';
import { db, setTestDatabase } from '../db/database.js';
import { SqliteDatabaseAdapter } from '../db/sqliteAdapter.js';
import { PostgresDatabaseAdapter } from '../db/postgresAdapter.js';
import { runMigrations } from '../db/migrator.js';
import { authService } from '../services/authService.js';
import handler from '../../api/chat/stream.js';
import { apiApp } from '../apiRouter.js';
import { once } from 'node:events';
import { quotaWindow } from '../../src/shared/chatQuota.js';
import { reserveChat, settleChat, quotaStatus, boundChatInput } from '../services/chatQuota.js';

process.env.NODE_ENV = 'test';
const pgUrl = process.env.QUOTA_TEST_DATABASE_URL;
if (pgUrl && !['localhost','127.0.0.1'].includes(new URL(pgUrl).hostname)) throw new Error('Isolated localhost database required');
setTestDatabase(pgUrl ? new PostgresDatabaseAdapter(pgUrl) : new SqliteDatabaseAdapter(':memory:'));
await runMigrations();
const fixture = await authService.register('Quota fixture', `quota-${Date.now()}@example.test`, 'Fixture-only-long-password');
const user = fixture.user.id;
let now = Date.parse('2026-09-27T10:00:00Z');
const tick = () => now += 6000;

await test('daily quota, reservations and bounded input', async t => {
  try {
    await t.test('Bangkok midnight resets independently of host timezone', () => {
      assert.equal(quotaWindow(Date.parse('2026-09-27T16:59:59Z')).day, '2026-09-27');
      assert.equal(quotaWindow(Date.parse('2026-09-27T17:00:00Z')).day, '2026-09-28');
      assert.equal(quotaWindow(now).resetsAt, '2026-09-27T17:00:00.000Z');
    });
    await t.test('failed answer returns quota; one in-flight request per account; replay rejected', async () => {
      const id = await reserveChat(user, 'failed-first', false, now);
      await assert.rejects(reserveChat(user, 'other-device', false, tick()), {code:'CHAT_IN_PROGRESS'});
      await settleChat(id, false);
      assert.equal((await quotaStatus(user, false, now)).remaining, 30);
      await assert.rejects(reserveChat(user, 'failed-first', false, tick()), {code:'CHAT_REQUEST_DUPLICATE'});
    });
    await t.test('trial allows exactly 30 successful responses; paid upgrade allows 50 total', async () => {
      for (let i=0;i<30;i++) await settleChat(await reserveChat(user, `trial-${i}`, false, tick()), true);
      assert.equal((await quotaStatus(user, false, now)).remaining, 0);
      await assert.rejects(reserveChat(user, 'trial-blocked', false, tick()), {code:'CHAT_QUOTA_EXHAUSTED'});
      assert.equal((await quotaStatus(user, true, now)).remaining, 20);
      for (let i=30;i<50;i++) await settleChat(await reserveChat(user, `paid-${i}`, true, tick()), true);
      await assert.rejects(reserveChat(user, 'paid-blocked', true, tick()), {code:'CHAT_QUOTA_EXHAUSTED'});
      assert.equal((await quotaStatus(user, true, now)).used, 50);
      now=Date.parse('2026-09-27T17:00:00Z');
      assert.equal((await quotaStatus(user, false, now)).remaining,30);
    });
    await t.test('abandoned requests expire and cannot later consume or deliver another answer', async () => {
      const old=await reserveChat(user,'abandoned',false,tick());
      now+=301000;
      const next=await reserveChat(user,'after-abandoned',false,now);
      await assert.rejects(settleChat(old,true));
      await settleChat(next,true);
      assert.equal((await quotaStatus(user,false,now)).used,1);
    });
    await t.test('bounds latest message, history and hidden client context', () => {
      assert.throws(()=>boundChatInput({messages:[{role:'user',content:'ก'.repeat(4001)}]}));
      assert.throws(()=>boundChatInput({messages:[{role:'user',content:42}]}));
      assert.throws(()=>boundChatInput({messages:[{role:'user',content:'hello'}],exerciseResult:{value:'x'.repeat(8001)}}));
      const body={messages:[{role:'user',content:'x'.repeat(15000)},{role:'assistant',content:'x'.repeat(3000)},{role:'user',content:'ล่าสุด'}]};
      boundChatInput(body);
      assert.equal(body.messages.length,2);
      assert.equal(body.messages.at(-1)?.content,'ล่าสุด');
    });
    await t.test('both chat handlers release reservations when the provider is unavailable', async () => {
      process.env.GEMINI_API_KEY=''; process.env.GOOGLE_API_KEY='';
      const account=await authService.register('Quota endpoint', `quota-endpoint-${Date.now()}@example.test`, 'Fixture-only-long-password');
      const headers={authorization:`Bearer ${account.token}`};
      let output='';
      const response:any={locals:{},status(){return this;},json(){throw new Error('Unexpected rejection');},setHeader(){},writeHead(){},write(s:string){output+=s;},end(){}};
      await handler({method:'POST',headers,body:{messages:[{role:'user',content:'วันนี้อยากคุย'}],quotaRequestId:'vercel-failure'}},response);
      assert.match(output, /"source":"error"/);
      assert.equal((await quotaStatus(account.user.id,false)).used,0);
      assert.equal(Number((await db.queryOne<{n:number}>("SELECT COUNT(*) AS n FROM chat_quota_requests WHERE user_id = $1 AND status = 'pending'",[account.user.id]))?.n),0);
      const second=await authService.register('Quota express', `quota-express-${Date.now()}@example.test`, 'Fixture-only-long-password');
      const server=apiApp.listen(0,'127.0.0.1'); await once(server,'listening');
      try {
        const res=await fetch(`http://127.0.0.1:${(server.address() as {port:number}).port}/chat/stream`,{method:'POST',headers:{'Content-Type':'application/json',authorization:`Bearer ${second.token}`},body:JSON.stringify({messages:[{role:'user',content:'วันนี้อยากคุย'}],quotaRequestId:'express-failure'})});
        assert.equal(res.status,200); assert.match(await res.text(), /"source":"error"/);
        assert.equal((await quotaStatus(second.user.id,false)).used,0);
        const row=await db.queryOne<{n:number}>("SELECT COUNT(*) AS n FROM chat_quota_requests WHERE user_id = $1 AND status = 'pending'",[second.user.id]);
        assert.equal(Number(row?.n),0);
      } finally {server.close();}
    });
    await t.test('Postgres serializes simultaneous requests from multiple devices', {skip:!pgUrl}, async () => {
      now+=6000;
      const results=await Promise.allSettled(Array.from({length:8},(_,i)=>reserveChat(user,`concurrent-${i}`,true,now)));
      const winners=results.filter(r=>r.status==='fulfilled');
      assert.equal(winners.length,1);
      await settleChat(winners[0].value,true);
    });
  } finally { await db.close(); }
});
