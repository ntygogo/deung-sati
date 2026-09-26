import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CompanionRepository } from '../repositories/companionRepository.js';
import type { IDatabaseAdapter } from '../db/types.js';

test('hatch stores practiced-skill visuals once and preserves existing snapshot on retry', async () => {
  let saved: any = null;
  let writes = 0;
  const adapter = {
    async queryOne(sql: string) {
      if(sql.includes('companion_growth_dna')) return {primary_pink_shade:'jade_mint',secondary_color:'#BDEDDD'};
      return saved;
    },
    async execute(_sql: string, params: any[]) { writes++; saved={id:params[0],seed:params[3],dna_json:params[4]}; },
  } as unknown as IDatabaseAdapter;
  const repo=new CompanionRepository(adapter);
  const loops=Array.from({length:20},(_,i)=>({id:String(i),emotion_tag:'calm',learning_types_json:[],somatic_awareness:1,emotional_awareness:0,cognitive_clarity:0,conscious_action:0}));
  const first=await repo.createDnaSnapshot('pet','user',loops);
  assert.equal(first.dna_json.bodyPattern,'water_ripples');
  assert.equal(first.dna_json.movementPersonality,'serene_swaying');
  assert.equal(first.dna_json.primaryColor,'jade_mint');
  assert.equal(first.dna_json.skillsSummary.somaticAwareness,20);
  const again=await repo.createDnaSnapshot('pet','user',loops.map(l=>({...l,conscious_action:100})));
  assert.deepEqual(again,first);
  assert.equal(writes,1);
});
