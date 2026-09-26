import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { CompanionRepository } from '../repositories/companionRepository.js';
import { SqliteDatabaseAdapter } from '../db/sqliteAdapter.js';

test('hatch persists practiced skills, reserved recipe and returns identical snapshot on retry', async () => {
  const db=new SqliteDatabaseAdapter();
  try {
    for(const name of ['001_core_auth.sql','002_companion_dna.sql','006_completed_loops_and_dna_snapshot.sql'])await db.execute(readFileSync(new URL('../db/migrations/'+name,import.meta.url),'utf8'));
    await db.execute('INSERT INTO users(id,name,email,password_hash,salt) VALUES ($1,$2,$3,$4,$5)',['user','Test','test@example.test','unused','unused']);
    await db.execute('INSERT INTO companions(id,user_id,seed,name) VALUES ($1,$2,$3,$4)',['pet','user',1,'Test']);
    const repo=new CompanionRepository(db);
    const loops=Array.from({length:20},(_,i)=>({id:String(i),emotion_tag:'calm',learning_types_json:[],somatic_awareness:1}));
    const first=await repo.createDnaSnapshot('pet','user',loops);
    assert.equal(first.dna_json.bodyPattern,'water_ripples');
    assert.equal(first.dna_json.movementPersonality,'serene_swaying');
    assert.equal(first.dna_json.skillsSummary.somaticAwareness,20);
    assert.equal(first.dna_json.collectibleDesign.edition,'v1');
    assert.deepEqual(await repo.createDnaSnapshot('pet','user',loops.map(l=>({...l,conscious_action:100}))),first);
    assert.equal((await db.query('SELECT * FROM companion_design_claims')).length,1);
  }finally{await db.close();}
});
