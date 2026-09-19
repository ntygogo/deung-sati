import assert from 'node:assert/strict';
import { ASSESSMENTS, answerLabel, calculateAssessment, getAssessment, interpretAssessment } from '../../src/shared/discoveryAssessments.ts';

const responses = (definition, values) => Object.fromEntries(definition.items.map((item, index) => [item.id, values[index]]));
for (const definition of ASSESSMENTS) {
  assert.equal(definition.items.length, 12, 'each version-1 assessment has 12 questions');
  assert.equal(new Set(definition.items.map(item => item.id)).size, 12, 'question ids are unique');
  assert.equal(definition.dimensions.length, 4);
  for (const dimension of definition.dimensions) {
    assert.equal(definition.items.filter(item => item.dimensionId === dimension.id).length, 3, 'each scored area has three questions');
  }
  const zero = responses(definition, Array(12).fill(0));
  const zeroScore = calculateAssessment(definition, zero);
  assert.equal(zeroScore.total, 0, 'zero is an answer, not a missing value');
  assert.equal(zeroScore.answeredCount, 12);
  assert.deepEqual(zeroScore.dimensions.map(item => item.score), [0, 0, 0, 0]);
  assert.equal(interpretAssessment(definition, zero).kind, 'all-zero');

  const maximum = responses(definition, Array(12).fill(3));
  assert.equal(calculateAssessment(definition, maximum).total, 36);
  assert.equal(interpretAssessment(definition, maximum).kind, 'all-max');
  for (const unscored of ['skip', 'na', 'unsure', null, undefined]) {
    const answers = responses(definition, Array(12).fill(unscored));
    const result = calculateAssessment(definition, answers);
    assert.equal(result.total, null, `${unscored} must not be turned into a zero or an estimated score`);
    assert.equal(result.answeredCount, 0);
    assert.ok(result.dimensions.every(item => item.score === null && item.answeredCount === 0));
    assert.equal(interpretAssessment(definition, answers).kind, 'incomplete');
    assert.deepEqual(interpretAssessment(definition, answers).suggestedDimensionIds, []);
  }
  const partial = responses(definition, [3, 2, 'skip', 0, 0, 0, 'na', 'unsure', null, 1, 2, 3]);
  const partialScore = calculateAssessment(definition, partial);
  assert.equal(partialScore.total, null);
  assert.equal(partialScore.answeredCount, 8);
  assert.deepEqual(partialScore.dimensions.map(item => item.score), [null, 0, null, 6]);
  assert.deepEqual(partialScore.dimensions.map(item => item.answeredCount), [2, 3, 0, 3]);

  const equal = responses(definition, Array(12).fill(2));
  assert.equal(calculateAssessment(definition, equal).total, 24);
  assert.equal(interpretAssessment(definition, equal).kind, 'equal');
  assert.deepEqual(interpretAssessment(definition, equal).suggestedDimensionIds, [], 'equal areas do not invent a singled-out weakness');

  const tied = responses(definition, [1, 1, 1, 1, 1, 1, 2, 2, 2, 3, 3, 3]);
  assert.deepEqual(interpretAssessment(definition, tied).suggestedDimensionIds, definition.dimensions.slice(0, 2).map(item => item.id), 'every tied lowest area is retained');

  const edited = { ...maximum, [definition.items[0].id]: 0 };
  assert.equal(calculateAssessment(definition, edited).total, 33, 'editing recomputes from current answers');
  assert.equal(calculateAssessment(definition, maximum).total, 36, 'scoring does not mutate the previous answers');
  assert.equal(calculateAssessment(definition, { ...maximum, [definition.items[0].id]: 'na' }).total, null, 'editing to unscored removes the total');
  assert.equal(calculateAssessment(definition, { ...zero, UNKNOWN: 3 }).total, 0, 'unrecognized keys cannot contribute to a score');
  for (const invalid of [-1, 4, 2.5, '3', NaN]) {
    assert.equal(calculateAssessment(definition, { ...maximum, [definition.items[0].id]: invalid }).total, null, 'invalid values cannot inflate a score');
  }
}

const boundary = getAssessment('self-boundary');
const sample = responses(boundary, [3, 2, 3, 2, 2, 2, 1, 0, 1, 2, 1, 1]);
const result = calculateAssessment(boundary, sample);
assert.equal(result.total, 20, 'published worked example stays reproducible');
assert.deepEqual(result.dimensions.map(item => item.score), [8, 6, 2, 4]);
assert.equal(interpretAssessment(boundary, sample).kind, 'notice-follow');
assert.deepEqual(interpretAssessment(boundary, sample).suggestedDimensionIds, ['follow']);
const tieWithFollow = responses(boundary, [3, 3, 3, 0, 1, 1, 1, 0, 1, 2, 2, 2]);
assert.deepEqual(interpretAssessment(boundary, tieWithFollow).suggestedDimensionIds, ['choose', 'follow']);
assert.equal(answerLabel(0, 'en'), 'Never');
assert.equal(answerLabel('skip', 'en'), 'Skip this question');
assert.notEqual(answerLabel(null, 'th'), answerLabel(0, 'th'));
assert.throws(() => getAssessment('unknown'), /Unknown assessment/);
console.log('Discovery assessment scoring: bilingual catalogs, zero/max, missing data, ties, worked example and edits passed.');
