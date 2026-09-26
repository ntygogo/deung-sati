import assert from 'node:assert/strict';
import { test } from 'node:test';
import { birthVisuals, companionMotion } from './companionBirthVisuals';
import { resolveCompanionAppearance } from './companionAppearance';

test('different practiced skills yield different rendered patterns and motion', () => {
  const keys = ['emotionalAwareness','somaticAwareness','cognitiveClarity','consciousAction'] as const;
  const recipes = keys.map(key => birthVisuals({emotionalAwareness:0,somaticAwareness:0,cognitiveClarity:0,consciousAction:0,[key]:20},42));
  assert.equal(new Set(recipes.map(r=>r.bodyPattern)).size,4);
  assert.equal(new Set(recipes.map(r=>r.movementPersonality)).size,4);
  recipes.forEach((recipe,i)=>assert.equal(recipe.practiceFocus,keys[i]));
});
test('tie breaks are stable and motion parameters stay gentle',()=>{
  const scores={emotionalAwareness:5,somaticAwareness:5,cognitiveClarity:5,consciousAction:5};
  assert.deepEqual(birthVisuals(scores,123),birthVisuals(scores,123));
  for(const id of ['serene_swaying','curious_peek','playful_bob','dreamy_drift']) for(const value of Object.values(companionMotion(id))) assert.ok(value>=.6 && value<=1.8);
});
test('persisted birth recipe wins over changed legacy DNA and survives JSON roundtrip',()=>{
  const source={id:'pet-a',seed:12,dna:{body_pattern:'water_ripples'},snapshot:{dna_json:{bodyPattern:'petal_marks',movementPersonality:'dreamy_drift',primaryColor:'jade_mint'}}};
  const original=resolveCompanionAppearance(source);
  assert.equal(original.traits.pattern.id,'petal_marks');
  assert.equal(original.traits.motion.id,'dreamy_drift');
  assert.equal(original.palette.id,'jade_mint');
  assert.deepEqual(resolveCompanionAppearance(JSON.parse(JSON.stringify(source))),original);
  assert.deepEqual(resolveCompanionAppearance({...source,dna:{body_pattern:'starlight_speckles'}}),original);
});
test('old snapshots keep their existing legacy pattern and motion',()=>{
  const source={id:'old',seed:99,dna:{body_pattern:'water_ripples',movement_personality:'serene_swaying'}};
  const before=resolveCompanionAppearance(source);
  const after=resolveCompanionAppearance({...source,snapshot:{dna_json:{skillsSummary:{consciousAction:20}}}});
  assert.deepEqual(after.traits.pattern,before.traits.pattern);
  assert.deepEqual(after.traits.motion,before.traits.motion);
  assert.equal(after.patternSeed,before.patternSeed);
});
