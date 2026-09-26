import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { SqliteDatabaseAdapter } from '../db/sqliteAdapter.js';
import { CompanionRepository } from '../repositories/companionRepository.js';
import { reserveCompanionDesign, DESIGN_REGISTRY_SCHEMA, CompanionDesignPoolExhausted } from '../repositories/companionDesignRegistry.js';
import { collectibleDesign, COLLECTIBLE_CAPACITY } from '../../src/shared/companionCollectible.js';
import { resolveCompanionAppearance } from '../../src/shared/companionAppearance.js';
import { remixPreview } from '../../src/shared/companionRemix.js';

async function setup(){
  const db=new SqliteDatabaseAdapter();
  for(const name of ['001_core_auth.sql','002_companion_dna.sql','006_completed_loops_and_dna_snapshot.sql','010_unique_companion_designs.sql'])await db.execute(readFileSync(new URL('../db/migrations/'+name,import.meta.url),'utf8'));
  return db;
}
async function addPet(db:SqliteDatabaseAdapter,id:string){
  await db.execute('INSERT INTO users(id,name,email,password_hash,salt) VALUES ($1,$2,$3,$4,$5)',[id,id,id+'@example.test','unused','unused']);
  await db.execute('INSERT INTO companions(id,user_id,seed,name,stage,unlocked_max_stage) VALUES ($1,$2,$3,$4,0,0)',[id,id,1,id]);
}
test('all 62,208 slots decode to distinct shape/color/pattern recipes; saved design survives JSON reload',()=>{
  const seen=new Set<string>();
  for(let i=0;i<COLLECTIBLE_CAPACITY;i++){
    const design=collectibleDesign(i);
    const key=JSON.stringify([design.palette,design.parts,design.pattern]);
    assert.equal(seen.has(key),false);seen.add(key);
  }
  assert.equal(seen.size,62208);
  const source={id:'mine',seed:123,snapshot:{dna_json:{collectibleDesign:collectibleDesign(43125)}}};
  const appearance=resolveCompanionAppearance(source);
  assert.equal(appearance.collectibleSerial,43126);
  assert.deepEqual(resolveCompanionAppearance(JSON.parse(JSON.stringify(source))),appearance);
  assert.equal(remixPreview(appearance).collectibleSerial,undefined);
});
test('10,000 reservations, colliding choices, retries and rollback never duplicate slots',async()=>{
  const db=new SqliteDatabaseAdapter();
  try{
    await db.execute(DESIGN_REGISTRY_SCHEMA);
    // Run the real allocator for 10,000 distinct owners using a dispersed order.
    for(let i=0;i<10000;i++)await db.transaction(tx=>reserveCompanionDesign(tx,'pet-'+i,(i*7919)%62208));
    const rows=await db.query<{slot_id:number}>('SELECT slot_id FROM companion_design_claims');
    assert.equal(rows.length,10000);assert.equal(new Set(rows.map(r=>r.slot_id)).size,10000);
    const sameStart=await Promise.all(Array.from({length:24},(_,i)=>db.transaction(tx=>reserveCompanionDesign(tx,'race-'+i,500))));
    assert.equal(new Set(sameStart.map(d=>d.slot)).size,24);
    const repeat=await Promise.all(Array.from({length:12},()=>db.transaction(tx=>reserveCompanionDesign(tx,'same-owner',500))));
    assert.equal(new Set(repeat.map(d=>d.slot)).size,1);
    await assert.rejects(db.transaction(async tx=>{await reserveCompanionDesign(tx,'rollback',500);throw Error('simulated snapshot failure');}));
    assert.equal(await db.queryOne('SELECT * FROM companion_design_claims WHERE companion_id = $1',['rollback']),null);
    await assert.rejects(db.execute('INSERT INTO companion_design_claims(slot_id,companion_id) VALUES ($1,$2)',[rows[0].slot_id,'duplicate-look']));
    await assert.rejects(db.execute('INSERT INTO companion_design_claims(slot_id,companion_id) VALUES ($1,$2)',[62208,'outside-pool']));
  }finally{await db.close();}
});
test('last available slot, full pool and retired owner are handled without recycling',async()=>{
  const db=new SqliteDatabaseAdapter();
  try{
    await db.execute(DESIGN_REGISTRY_SCHEMA);
    await db.execute(`WITH RECURSIVE slots(n) AS (SELECT 0 UNION ALL SELECT n+1 FROM slots WHERE n<62207)
      INSERT INTO companion_design_claims(slot_id,companion_id) SELECT n,'reserved-' || n FROM slots WHERE n<>17`);
    const last=await db.transaction(tx=>reserveCompanionDesign(tx,'last',62000));assert.equal(last.slot,17);
    await assert.rejects(db.transaction(tx=>reserveCompanionDesign(tx,'over-capacity',0)),CompanionDesignPoolExhausted);
    assert.equal((await db.transaction(tx=>reserveCompanionDesign(tx,'last',0))).slot,17);
    assert.equal(Number((await db.queryOne<{count:number}>('SELECT COUNT(*) AS count FROM companion_design_claims'))?.count),62208);
  }finally{await db.close();}
});
test('same-owner concurrent hatches are idempotent; different owners differ; legacy is preserved',async()=>{
  const db=await setup();
  try{
    for(const id of ['a','b','legacy'])await addPet(db,id);
    const repo=new CompanionRepository(db);
    const results=await Promise.all(Array.from({length:12},()=>repo.createDnaSnapshot('a','a',[])));
    assert.equal(new Set(results.map(r=>r.id)).size,1);
    const other=await repo.createDnaSnapshot('b','b',[]);
    assert.notEqual(other.dna_json.collectibleDesign.slot,results[0].dna_json.collectibleDesign.slot);
    await assert.rejects(repo.createDnaSnapshot('b','a',[]));
    await db.execute('INSERT INTO companion_dna_snapshots(id,companion_id,user_id,seed,dna_json,stats_summary_json) VALUES ($1,$2,$3,$4,$5,$6)',['legacy-snap','legacy','legacy','old',{primaryColor:'jade_mint'},{}]);
    assert.deepEqual((await repo.createDnaSnapshot('legacy','legacy',[])).dna_json,{primaryColor:'jade_mint'});
    await db.execute('DELETE FROM companions WHERE id = $1',['a']);
    assert.ok(await db.queryOne('SELECT * FROM companion_design_claims WHERE companion_id = $1',['a']));
  }finally{await db.close();}
});

for(const full of [false,true])test(full?'a full collection preserves the 20th practice without hatching or milestone rewards':'20th practice atomically issues a reserved design and hatch reward',async()=>{
  const {runMigrations}=await import('../db/migrator.js');
  const {LoopRepository}=await import('../repositories/loopRepository.js');
  const db=new SqliteDatabaseAdapter();
  try{
    await runMigrations(db);await addPet(db,'full');
    if(full)await db.execute(`WITH RECURSIVE slots(n) AS (SELECT 0 UNION ALL SELECT n+1 FROM slots WHERE n<62207)
      INSERT INTO companion_design_claims(slot_id,companion_id) SELECT n,'reserved-' || n FROM slots`);
    for(let i=0;i<19;i++)await db.execute(`INSERT INTO completed_loops(id,user_id,conversation_id,idempotency_key,trigger,emotion_or_body,automatic_story,facts,old_response,new_choice,emotion_tag,learning_types_json,progress_counted)
      VALUES ($1,$2,$3,$4,'work','worried','I may fail','No feedback yet','ruminate','ask tomorrow','calm','[]',TRUE)`,['prior-'+i,'full','conv','prior-'+i]);
    const repo=new LoopRepository(db);
    const fields={conversationId:'conv',trigger:'หัวหน้าอ่านแล้วไม่ตอบ',emotionOrBody:'กังวลและใจสั่น',automaticStory:'เขาคงไม่ชอบงานของเรา',facts:'ยังไม่มีข้อความตอบกลับ',oldResponse:'คิดวนและโทษตัวเอง',newChoice:'รอถึงพรุ่งนี้แล้วถามให้ชัด',desires:'อยากเข้าใจ',insights:'ยังไม่รู้ว่าเขาคิดอย่างไร'};
    await repo.createTrace({id:'twentieth',userId:'full',...fields});
    const result=await repo.confirmGrowthEvent('full','twentieth',{...fields,skills:{emotional_awareness:1}});
    assert.equal(result.success,true);assert.equal(result.progressCount,20);
    assert.equal(result.newlyHatched,!full);
    assert.equal(result.hatchUnavailable,full?'COMPANION_DESIGN_POOL_EXHAUSTED':undefined);
    assert.equal(result.companion.stage,full?0:1);
    if(full)assert.equal(result.snapshot,null);
    else assert.equal(result.snapshot.dna_json.collectibleDesign.edition,'v1');
    assert.equal((await db.query("SELECT * FROM currency_transactions WHERE event_type = 'hatch_milestone'")).length,full?0:2);
  }finally{await db.close();}
});

test('snapshot write failure rolls back the reservation and can retry safely',async()=>{
  const db=await setup();
  try{
    await addPet(db,'failure');
    const failing=new Proxy(db,{get(target,key){
      if(key==='transaction')return (callback:any)=>db.transaction(tx=>callback({...tx,execute:async(sql:string,params?:any[])=>{
        if(sql.includes('INSERT INTO companion_dna_snapshots'))throw Error('snapshot write failure');
        return tx.execute(sql,params);
      }}));
      const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;
    }});
    await assert.rejects(new CompanionRepository(failing).createDnaSnapshot('failure','failure',[]),/snapshot write failure/);
    assert.equal((await db.query('SELECT * FROM companion_design_claims')).length,0);
    assert.equal((await db.query('SELECT * FROM companion_dna_snapshots')).length,0);
    const retried=await new CompanionRepository(db).createDnaSnapshot('failure','failure',[]);
    assert.equal(retried.dna_json.collectibleDesign.edition,'v1');
  }finally{await db.close();}
});
