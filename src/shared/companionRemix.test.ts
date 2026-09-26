import assert from 'node:assert/strict';
import { test } from 'node:test';
import { collectionPreview } from './companionArtDirection';
import { resolveCompanionAppearance } from './companionAppearance';
import { remixPreview, remixArt, selectRemixPalette, REMIX_PALETTES } from './companionRemix';

test('remix controls preserve identity and isolated controls retain the other choices',()=>{
  const base=collectionPreview(resolveCompanionAppearance({id:'saved',seed:45}),'flower');
  const saved=JSON.stringify(base);
  let seed=83;const rng=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
  const first=remixPreview(base,'all',rng);
  const colors=remixPreview(first,'colors',rng);
  assert.deepEqual(colors.previewRemix?.parts,first.previewRemix?.parts);
  assert.deepEqual(colors.traits,first.traits);
  assert.equal(colors.patternSeed,first.patternSeed);
  assert.notEqual(colors.previewRemix?.palette,first.previewRemix?.palette);
  for(const source of [base,first]){
    const parts=remixPreview(source,'parts',rng);
    assert.deepEqual(remixArt(parts),remixArt(source));
    assert.deepEqual(parts.traits,source.traits);
    assert.equal(parts.patternSeed,source.patternSeed);
    assert.equal(parts.identity,base.identity);
  }
  for(let i=0;i<REMIX_PALETTES.length;i++){
    const selected=selectRemixPalette(first,i);
    assert.equal(selected.palette.body,REMIX_PALETTES[i].body);
    assert.deepEqual(selected.previewRemix?.parts,first.previewRemix?.parts);
  }
  assert.equal(collectionPreview(first,'water').previewRemix,undefined);
  assert.equal(JSON.stringify(base),saved);
  const shapes=new Set(),palettes=new Set(),patterns=new Set();
  for(let i=0;i<200;i++){
    const look=remixPreview(first,'all',rng);
    shapes.add(JSON.stringify(look.previewRemix?.parts));palettes.add(look.previewRemix?.palette);patterns.add(look.traits.pattern.id);
    assert.equal(look.identity,base.identity);
  }
  assert.ok(shapes.size>150);assert.equal(palettes.size,11);assert.equal(patterns.size,4);
});
