import assert from 'node:assert/strict';
import { test } from 'node:test';
import { collectionPreview, COMPANION_COLLECTIONS } from './companionArtDirection';
import { resolveCompanionAppearance } from './companionAppearance';

test('curated previews preserve saved birth identity and leave source untouched', () => {
  const original = resolveCompanionAppearance({ id: 'saved-pet', seed: 'saved-seed', snapshot: {dna_json: {bodyPattern:'water_ripples',primaryColor:'jade_mint'}} });
  const before = JSON.stringify(original);
  for(const collection of Object.keys(COMPANION_COLLECTIONS) as Array<keyof typeof COMPANION_COLLECTIONS>) {
    const preview = collectionPreview(original,collection);
    assert.equal(preview.identity,original.identity);
    assert.equal(preview.previewLamp,COMPANION_COLLECTIONS[collection].lampShape);
    assert.equal(preview.traits.pattern.id,COMPANION_COLLECTIONS[collection].pattern);
    assert.equal(preview.palette.label,COMPANION_COLLECTIONS[collection].name);
    assert.notEqual(preview.palette, original.palette);
  }
  assert.equal(JSON.stringify(original),before);
});
