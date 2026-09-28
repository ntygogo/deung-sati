import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { apiApp } from '../apiRouter.js';
import { runMigrations } from '../db/migrator.js';
import { db } from '../db/database.js';
import { trialStatus } from '../services/betaTrial.js';
await runMigrations();
const server=apiApp.listen(0,'127.0.0.1');await once(server,'listening');
const base=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
async function req(path:string,method='GET',body?:unknown,token?:string,owner?:string){return fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`} :{}),...(owner?{'X-DeungSati-Owner':owner}:{})},...(body?{body:JSON.stringify(body)}:{})});}
async function user(email:string){const r=await req('/auth/register','POST',{email,name:'Notebook test',password:'Test-only-7491'});assert.equal(r.status,200);const {token}=await r.json() as {token:string};const me=await req('/auth/me','GET',undefined,token);const {id}=await me.json() as {id:string};return {token,id};}
try{
 const a=await user('notebook-a@example.test'),b=await user('notebook-b@example.test');
 assert.equal((await req('/notebook')).status,401);
 assert.equal((await req('/notebook','GET',undefined,a.token,b.id)).status,409);
 const id=randomUUID(),body={kind:'free',text:'ทดสอบบันทึกส่วนตัว'};
 assert.equal((await req('/notebook/'+id,'PUT',body,a.token,a.id)).status,200);
 assert.equal((await req('/notebook/'+id,'PUT',body,a.token,a.id)).status,200);
 const login=await req('/auth/login','POST',{email:'notebook-a@example.test',password:'Test-only-7491'});const {token:secondSession}=await login.json() as {token:string};
 let data=await (await req('/notebook','GET',undefined,secondSession,a.id)).json() as {entries:any[]};assert.equal(data.entries.length,1);assert.equal(data.entries[0].text,body.text);
 assert.equal((await req('/notebook/'+id,'PUT',body,b.token,b.id)).status,409);
 await req('/notebook/'+id,'DELETE',undefined,b.token,b.id);
 assert.deepEqual((await (await req('/notebook','GET',undefined,b.token,b.id)).json() as {entries:any[]}).entries,[]);
 assert.equal((await req('/notebook/'+randomUUID(),'PUT',{kind:'free',text:'x'.repeat(10001)},a.token,a.id)).status,400);
 await trialStatus(a.id,true);await db.execute('UPDATE beta_trials SET expires_at = $1 WHERE user_id = $2',[new Date(Date.now()-1000).toISOString(),a.id]);
 assert.equal((await req('/notebook/'+randomUUID(),'PUT',{kind:'gratitude',text:'ยังเขียนได้'},a.token,a.id)).status,200);
 data=await (await req('/notebook','GET',undefined,a.token,a.id)).json() as {entries:any[]};assert.equal(data.entries.length,2);
 await req('/notebook/'+id,'DELETE',undefined,a.token,a.id);
 data=await (await req('/notebook','GET',undefined,a.token,a.id)).json() as {entries:any[]};assert.equal(data.entries.length,1);
 console.log('PASS notebook: authentication, owner isolation, second-session persistence, retry deduplication, validation, expired access, deletion');
}finally{server.close();await db.close();}
