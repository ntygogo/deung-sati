import assert from 'node:assert/strict';
import { once } from 'node:events';
import { test } from 'node:test';
import { db,setTestDatabase } from '../db/database.js';
import { SqliteDatabaseAdapter } from '../db/sqliteAdapter.js';
import { PostgresDatabaseAdapter } from '../db/postgresAdapter.js';
import { runMigrations } from '../db/migrator.js';
import { apiApp } from '../apiRouter.js';
import { prepareLineReply } from '../services/lineChat.js';
import { lineMessages } from '../routes/line.js';
import { reviewLineNotebook } from '../services/lineNotebook.js';

process.env.NODE_ENV='test';process.env.DB_DRIVER='sqlite';process.env.LINE_NOTEBOOK_ORIGIN='https://preview.example.test';
const pgUrl=process.env.LINE_TEST_DATABASE_URL;
if(pgUrl&&!['localhost','127.0.0.1'].includes(new URL(pgUrl).hostname))throw new Error('Isolated localhost PostgreSQL required');
setTestDatabase(pgUrl?new PostgresDatabaseAdapter(pgUrl):new SqliteDatabaseAdapter(':memory:'));
await runMigrations();
const server=apiApp.listen(0,'127.0.0.1');await once(server,'listening');
const base=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
let counter=0;
const now=Date.now();
const fields={trigger:'รถเมล์มาช้า',emotion_or_body:'หงุดหงิด'};
const chat=(id:string,text:string)=>prepareLineReply(id,`import-event-${++counter}`,text,now+counter*6000,async()=>({text:'พร้อมสรุป',success:true,crisis:false,loop:{mode:'review',fields,skipped:[],asked:null,nextOfferAt:3}}));
async function request(path:string,body:unknown,session?:string,owner?:string){
  return fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...(session?{Authorization:`Bearer ${session}`} : {}),...(owner?{'X-DeungSati-Owner':owner}:{})},body:JSON.stringify(body)});
}
async function account(name:string){
  const r=await request('/auth/register',{name,email:`${name}@example.test`,password:'Fixture-only-8492!'});assert.equal(r.status,200);
  const {token}=await r.json() as {token:string};
  const me=await fetch(base+'/auth/me',{headers:{Authorization:`Bearer ${token}`}});
  return {token,id:(await me.json() as {id:string}).id};
}
await test('LINE notebook: verified identity, consent, isolation, idempotency, deletion and zero growth',async()=>{
 try{
  const a=await account('line-notebook-a'),b=await account('line-notebook-b');
  await chat('notebook-line-a','เริ่มคุย');await chat('notebook-line-a','รถเมล์มาช้า');
  await chat('notebook-line-b','เริ่มคุย');await chat('notebook-line-b','รถเมล์มาช้า');
  const summary=await chat('notebook-line-a','สรุปเลย');assert.ok(summary!.choices!.includes('บันทึกลงสมุด'));
  const reply=await chat('notebook-line-a','บันทึกลงสมุด');assert.ok(reply!.link);
  const action=lineMessages(reply!)[0].quickReply!.items[0].action;assert.ok('uri' in action);
  const token=new URL(action.uri).hash.slice(1);assert.equal(token.length,64);
  assert.ok(!JSON.stringify(await db.query('SELECT * FROM line_notebook_transfers')).includes(token));
  assert.equal((await request('/line/notebook/review',{token})).status,401);
  assert.equal((await request('/line/notebook/review',{token},a.token,b.id)).status,409);
  assert.deepEqual(await (await request('/line/notebook/review',{token},a.token,a.id)).json(),{linked:false});
  assert.equal((await request('/line/notebook/save',{token,fields},a.token,a.id)).status,403);
  const link=await (await request('/line/notebook/link',{token},a.token,a.id)).json() as {command:string};
  assert.ok(link.command);
  assert.match((await chat('notebook-line-b',link.command))!.text,/ใช้กับบทสนทนานี้ไม่ได้/);
  assert.deepEqual(await reviewLineNotebook(a.id,token),{linked:false});
  assert.match((await chat('notebook-line-a',link.command))!.text,/เชื่อมบัญชีแล้ว/);
  const review=await (await request('/line/notebook/review',{token},a.token,a.id)).json() as {fields:unknown};assert.deepEqual(review.fields,fields);
  assert.equal((await request('/line/notebook/review',{token},b.token,b.id)).status,403);
  const csrf=await fetch(base+'/line/notebook/save',{method:'POST',headers:{'Content-Type':'application/json',Cookie:`deung_sati_session=${a.token}`,'X-DeungSati-Owner':a.id},body:JSON.stringify({token,fields})});assert.equal(csrf.status,403);
  const before=await Promise.all(['completed_loops','wallets','companions'].map(table=>db.query(`SELECT * FROM ${table}`)));
  const edited={...fields,needs:'อยากไปถึงตรงเวลา'};
  if(pgUrl){
    const results=await Promise.all([1,2].map(()=>request('/line/notebook/save',{token,fields:edited},a.token,a.id)));
    assert.ok(results.every(r=>r.status===200));
    const receipts=await Promise.all(results.map(r=>r.json() as Promise<{duplicate:boolean}>));
    assert.equal(receipts.filter(r=>!r.duplicate).length,1);
  }else{
    const first=await request('/line/notebook/save',{token,fields:edited},a.token,a.id);assert.equal(first.status,200);assert.equal((await first.json() as {duplicate:boolean}).duplicate,false);
  }
  assert.equal((await (await request('/line/notebook/save',{token,fields:edited},a.token,a.id)).json() as {duplicate:boolean}).duplicate,true);
  assert.deepEqual(await Promise.all(['completed_loops','wallets','companions'].map(table=>db.query(`SELECT * FROM ${table}`))),before);
  const entries=await db.query<{id:string;text:string}>('SELECT * FROM notebook_entries WHERE user_id=$1',[a.id]);assert.equal(entries.length,1);assert.match(entries[0].text,/อยากไปถึงตรงเวลา/);
  assert.equal((await db.query('SELECT * FROM notebook_entries WHERE user_id=$1',[b.id])).length,0);
  const again=await chat('notebook-line-a','บันทึกลงสมุด');const token2=new URL(again!.link!.url).hash.slice(1);
  assert.equal((await request('/line/notebook/review',{token},a.token,a.id)).status,410);
  assert.deepEqual(await reviewLineNotebook(a.id,token2),{linked:true,saved:true});
  await fetch(base+'/notebook/'+entries[0].id,{method:'DELETE',headers:{Authorization:`Bearer ${a.token}`,'X-DeungSati-Owner':a.id}});
  assert.equal((await db.query('SELECT * FROM line_notebook_sources WHERE entry_id=$1',[entries[0].id])).length,0);
  await request('/line/notebook/save',{token:token2,fields},a.token,a.id);
  assert.equal((await db.query('SELECT * FROM notebook_entries WHERE user_id=$1',[a.id])).length,0);
  await chat('notebook-line-a','ยกเลิกเชื่อมบัญชี');assert.equal((await db.query('SELECT * FROM line_web_links WHERE line_id=$1',['notebook-line-a'])).length,0);
  assert.equal((await request('/line/notebook/review',{token:token2},a.token,a.id)).status,410);
  const pending=await chat('notebook-line-b','บันทึกลงสมุด');const pendingToken=new URL(pending!.link!.url).hash.slice(1);
  await assert.rejects(reviewLineNotebook(b.id,pendingToken,now+2*3600000),/หมดอายุ/);
  await chat('notebook-line-b','ยืนยันลบประวัติ');
  assert.equal((await request('/line/notebook/review',{token:pendingToken},b.token,b.id)).status,410);
 }finally{server.close();await db.close();}
});
