import { trialStatus } from '../services/betaTrial.js';
import { db } from '../db/database.js';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { apiApp } from '../apiRouter.js';
import { runMigrations } from '../db/migrator.js';
import { betaScreenAllowed } from '../../src/shared/release.js';
import handler from '../../api/chat/stream.js';
import { authService } from '../services/authService.js';

process.env.NODE_ENV = 'test';
process.env.DB_DRIVER = 'sqlite';
await runMigrations();
const server = apiApp.listen(0, '127.0.0.1');
await once(server, 'listening');
const address = server.address() as {port: number};
const base = `http://127.0.0.1:${address.port}`;
async function request(path: string, method = 'GET', body?: unknown, token?: string) {
  return fetch(base + path, {method, headers: {'Content-Type': 'application/json', ...(token ? {Authorization: `Bearer ${token}`} : {})}, body: body ? JSON.stringify(body) : undefined});
}
try {
  assert.equal((await request('/chat/stream', 'POST', {messages:[{role:'user',content:'hello'}]})).status,401);
  const signup = await request('/auth/register','POST',{name:'Beta test',email:'beta@example.test',password:'Test-only-7491'});
  assert.equal(signup.status,200);
  const {token} = await signup.json() as {token: string};
  for (const path of ['/companion/create','/companion/hatch','/wallet/purchase','/user/future-self']) {
    assert.equal((await request(path,'POST',{},token)).status,404,path);
  }
  for (const screen of ['companion','profile','journey','beforeSpeak','perspective']) assert.equal(betaScreenAllowed(screen),false);
  for (const screen of ['home','chat','pause']) assert.equal(betaScreenAllowed(screen),true);
  const doc = {revision:0,messages:[{id:'u1',role:'user',text:'วันนี้อยากพัก',createdAt:Date.now()}]};
  const saved = await request('/loops/conversations/beta-test','PUT',doc,token);
  assert.equal(saved.status,200,await saved.text());
  const login = await request('/auth/login','POST',{email:'beta@example.test',password:'Test-only-7491'});
  const otherDevice = (await login.json() as {token: string}).token;
  const read = await request('/loops/conversations/beta-test','GET',undefined,otherDevice);
  assert.equal((await read.json() as {conversation:{messages:{text:string}[]}}).conversation.messages[0].text,doc.messages[0].text);
  const second = await request('/auth/register','POST',{name:'Other',email:'other@example.test',password:'Test-only-7491'});
  const otherToken = (await second.json() as {token: string}).token;
  assert.equal((await request('/loops/conversations/beta-test','GET',undefined,otherToken)).status,404);
  assert.equal((await request('/loops/conversations/beta-test','PUT',doc,otherToken)).status,404);
  // Production has its own handler: verify auth, including cookie CSRF, before model work.
  async function callHandler(headers: Record<string,string>, cookies = {}) {
    let status = 200; let ended = false;
    const res:any = {status(n:number){status=n;return this;},json(){ended=true;return this;},writeHead(n:number){status=n;},write(){},end(){ended=true;}};
    await handler({method:'POST',headers,cookies,body:{messages:[]}},res);
    assert.equal(ended,true); return status;
  }
  assert.equal(await callHandler({}),401);
  assert.equal(await callHandler({Authorization:'unused',authorization:`Bearer ${token}`}),400);
  assert.equal(await callHandler({}, {deung_sati_session:token}),403);
  assert.equal(await callHandler({'x-deungsati-client':'true'},{deung_sati_session:token}),400);
  const me = await request('/auth/me','GET',undefined,token);
  const userId = (await me.json() as {id:string}).id;
  assert.equal((await trialStatus(userId)).state,'not_started');
  const starts = await Promise.all([trialStatus(userId,true),trialStatus(userId,true)]);
  assert.equal(starts[0].startedAt,starts[1].startedAt);
  assert.equal(new Date(starts[0].expiresAt!).getTime()-new Date(starts[0].startedAt!).getTime(),14*86400000);
  assert.equal((await trialStatus(userId,false,new Date(starts[0].expiresAt!).getTime()-1)).state,'active');
  assert.equal((await trialStatus(userId,false,new Date(starts[0].expiresAt!).getTime())).state,'expired');
  await db.execute('UPDATE beta_trials SET expires_at = $1 WHERE user_id = $2',[new Date(Date.now()-1000).toISOString(),userId]);
  assert.equal((await request('/chat/stream','POST',{messages:[{role:'user',content:'hello'}]},token)).status,403);
  assert.equal((await request('/loops/conversations/beta-test','GET',undefined,token)).status,200);
  assert.equal((await request('/beta/interest','POST',{},token)).status,200);
  assert.equal((await trialStatus(userId)).interested,true);
  assert.equal((await trialStatus(userId,true)).state,'expired','reload must never restart a trial');
  let deniedStatus=0;
  await handler({method:'POST',headers:{authorization:`Bearer ${token}`},cookies:{},body:{messages:[{role:'user',content:'hello'}]}},{status(n:number){deniedStatus=n;return this;},json(){return this;}});
  assert.equal(deniedStatus,403,'production handler denies expired trials');
  await authService.logout(token);
  assert.equal((await request('/chat/stream','POST',{messages:[]},token)).status,401);
  console.log('PASS beta: sign-up, second-session persistence, account isolation, auth/CSRF in both handlers, disabled routes, exact 14-day expiry, no resets, read-only archive, interest and logout');
} finally { server.close(); }
