import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { apiApp } from '../apiRouter.js';
import { runMigrations } from '../db/migrator.js';
import { db } from '../db/database.js';
import { emptyJourney, validateJourney, journeyChat } from '../../src/shared/mindJourney.js';
await runMigrations();
const server=apiApp.listen(0,'127.0.0.1');await once(server,'listening');
const base=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
async function req(path:string,method='GET',body?:unknown,token?:string,owner?:string){return fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`} :{}),...(owner?{'X-DeungSati-Owner':owner}:{})},...(body?{body:JSON.stringify(body)}:{})});}
async function user(email:string){const r=await req('/auth/register','POST',{email,name:'Journey test',password:'Test-only-7491'});assert.equal(r.status,200);const {token}=await r.json() as {token:string};const me=await req('/auth/me','GET',undefined,token);const {id}=await me.json() as {id:string};return {token,id};}
try{
 const a=await user('journey-a@example.test'),b=await user('journey-b@example.test'),id=randomUUID();
 assert.equal((await req('/mind-journey')).status,401);
 assert.equal((await req('/mind-journey','GET',undefined,a.token,b.id)).status,409);
 const data={...emptyJourney(),emotions:['กังวล','มีหวัง'],event:'งานค้าง',care:'ขอความช่วยเหลือ'};
 const save=()=>req('/mind-journey/'+id,'PUT',{data,revision:0},a.token,a.id);
 assert.equal((await save()).status,200);assert.equal((await save()).status,200);
 let list=await (await req('/mind-journey','GET',undefined,a.token,a.id)).json() as any;assert.equal(list.entries.length,1);
 const login=await req('/auth/login','POST',{email:'journey-a@example.test',password:'Test-only-7491'});const {token}=await login.json() as any;
 assert.equal((await (await req('/mind-journey','GET',undefined,token,a.id)).json() as any).entries[0].event,'งานค้าง');
 assert.deepEqual((await (await req('/mind-journey','GET',undefined,b.token,b.id)).json() as any).entries,[]);
 assert.equal((await req('/mind-journey/'+id,'PUT',{data:{...data,event:'intrusion'},revision:1},b.token,b.id)).status,409);
 assert.equal((await req('/mind-journey/'+id+'?revision=1','DELETE',undefined,b.token,b.id)).status,409);
 const updated={...data,emotions:['สงบ']};
 assert.equal((await req('/mind-journey/'+id,'PUT',{data:updated,revision:1},a.token,a.id)).status,200);
 assert.equal((await req('/mind-journey/'+id,'PUT',{data,revision:1},a.token,a.id)).status,409);
 assert.equal((await req('/mind-journey/'+id,'PUT',{data:updated,revision:1},a.token,a.id)).status,200);
 assert.equal((await req('/mind-journey/'+randomUUID(),'PUT',{data:{...data,intensity:9},revision:0},a.token,a.id)).status,400);
 assert.throws(()=>validateJourney({...data,day:'2026-02-30'}));assert.throws(()=>validateJourney({...data,emotions:['invented']}));
 const loop={...emptyJourney('loop'),event:'ถูกทักเรื่องงาน',need:'การยอมรับ',needConfirmed:true,plan:'เมื่อถูกทัก จะถามว่าปรับส่วนไหน',outcome:'รู้ตัวหลังเหตุการณ์',reflection:'ครั้งหน้าลองใหม่'};
 assert.equal((await req('/mind-journey/'+randomUUID(),'PUT',{data:loop,revision:0},a.token,a.id)).status,200);
 assert.ok(journeyChat(loop).includes('ที่ฉันยืนยันแล้ว'));assert.ok(journeyChat({...loop,needConfirmed:false}).includes('ที่ยังไม่แน่ใจ'));
 assert.equal((await req('/mind-journey/'+id+'?revision=1','DELETE',undefined,a.token,a.id)).status,409);
 assert.equal((await req('/mind-journey/'+id+'?revision=2','DELETE',undefined,a.token,a.id)).status,200);
 console.log('PASS: account isolation, second session, create/update retries, stale writes/deletes, validation, partial loop, chat handoff');
}finally{server.close();await db.close();}
