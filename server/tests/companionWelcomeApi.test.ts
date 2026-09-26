import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { SqliteDatabaseAdapter } from '../db/sqliteAdapter.js';
import { setTestDatabase } from '../db/database.js';
import { runMigrations } from '../db/migrator.js';
import { apiApp } from '../apiRouter.js';
import { needsCompanionWelcome } from '../../src/shared/companionWelcome.js';

test('HTTP accounts: 20 practices, distinct hatches, replay, naming, cross-device welcome state',async()=>{
  const db=new SqliteDatabaseAdapter();setTestDatabase(db);await runMigrations(db);
  const server=apiApp.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
  const address=server.address() as {port:number};const root=`http://127.0.0.1:${address.port}`;
  const request=async(path:string,token?:string,body?:unknown)=>{
    const response=await fetch(root+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json','X-DeungSati-Client':'true',...(token?{Authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});
    return {status:response.status,data:await response.json() as Record<string,any>};
  };
  const dna={primary_pink_shade:'soft_sakura',secondary_color:'#8BD3DD',gill_type:'triple_feather',cheek_feeler_type:'soft_droplet',head_light_type:'lantern',head_light_tip:'warm_glow',tail_type:'flowing_fin',body_pattern:'water_ripples',movement_personality:'dreamy_drift',safe_space_theme:'moonlit_pond'};
  try{
    const accounts:Array<{token:string;email:string;password:string}>=[];
    for(let owner=0;owner<2;owner++){
      const email=`qa-${randomUUID()}@example.invalid`,password=randomUUID();
      const registered=await request('/auth/register',undefined,{name:'QA',email,password});assert.equal(registered.status,200);
      const token=registered.data.token;
      const created=await request('/companion/create',token,{seed:100+owner,dna,name:'น้องทดสอบ'});assert.equal(created.status,200);
      assert.equal((await request('/companion/hatch',token,{})).status,400);
      for(let i=0;i<20;i++){
        const complete=await request('/loops/complete',token,{conversationId:`qa-${owner}-${i}`,idempotencyKey:`qa-${owner}-${i}`,trigger:`งานชิ้นที่ ${i} ยังไม่ได้รับคำตอบ`,emotionOrBody:'ใจเต้นและกังวล',automaticStory:'คิดว่างานอาจไม่ผ่าน',facts:'ยังไม่มีข้อความตอบกลับจากทีม',oldResponse:'วนอ่านแชทและเดาไปเอง',newChoice:'พักหายใจแล้วถามกำหนดตอบให้ชัด',emotionTag:'calm',learningTypes:['notice_emotion']});
        assert.equal(complete.status,200,JSON.stringify(complete.data));assert.equal(complete.data.progressCount,i+1);
      }
      accounts.push({token,email,password});
    }
    const hatch=await Promise.all(accounts.map(a=>request('/companion/hatch',a.token,{})));
    for(const h of hatch){assert.equal(h.status,200,JSON.stringify(h.data));assert.equal(needsCompanionWelcome(h.data.companion),true);}
    assert.notEqual(hatch[0].data.snapshot.dna_json.collectibleDesign.slot,hatch[1].data.snapshot.dna_json.collectibleDesign.slot);
    const retries=await Promise.all(Array.from({length:6},()=>request('/companion/hatch',accounts[0].token,{})));
    retries.forEach(r=>{assert.equal(r.status,200);assert.deepEqual(r.data.snapshot,hatch[0].data.snapshot);});
    assert.equal((await request('/companion/welcome',undefined,{name:'Unauthorized'})).status,401);
    assert.equal((await request('/companion/welcome',accounts[0].token,{name:' '.repeat(4)})).status,400);
    const welcome=await request('/companion/welcome',accounts[0].token,{name:'เจ้ามะม่วง'});
    assert.equal(welcome.status,200);assert.equal(welcome.data.companion.name,'เจ้ามะม่วง');assert.equal(needsCompanionWelcome(welcome.data.companion),false);
    assert.deepEqual(welcome.data.snapshot.dna_json,hatch[0].data.snapshot.dna_json);
    const replay=await request('/companion/welcome',accounts[0].token,{name:'stale device name'});assert.equal(replay.data.companion.name,'เจ้ามะม่วง');
    const login=await request('/auth/login',undefined,{email:accounts[0].email,password:accounts[0].password});
    const otherDevice=await request('/companion/me',login.data.token);
    assert.equal(otherDevice.data.companion.name,'เจ้ามะม่วง');assert.equal(needsCompanionWelcome(otherDevice.data.companion),false);
    const otherOwner=await request('/companion/me',accounts[1].token);assert.equal(needsCompanionWelcome(otherOwner.data.companion),true);
    assert.equal((await db.query('SELECT * FROM companion_design_claims')).length,2);
  }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));await db.close();}
});
