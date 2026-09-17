import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const source = readFileSync(new URL('../repositories/loopRepository.ts', import.meta.url), 'utf8');
const js = stripTypeScriptTypes(source.replace(/^import .*;\r?\n/gm, ''), { mode: 'strip' })
  .replace(/export /g, '');
const writes = [];
const row = { id: 'trace-test', user_id: 'user-test', raw_data_json: {}, title: 'test', summary: 'test' };
const adapter = {
  queryOne: async (sql) => sql.includes('FROM loop_traces') ? row : null,
  execute: async (sql, params) => { writes.push({ sql, params }); return { affectedRows: 1 }; },
};
const Repository = new Function('crypto', 'db', 'companionRepository', 'validateLoopForConfirmation', `${js}; return LoopRepository;`)(crypto, adapter, {}, () => ({ valid: true }));
const repo = new Repository(adapter);
await repo.createTrace('user-test', { trigger: 'event', emotionTags: ['anxious'], practicedSkills: ['awareness'] });
let write = writes.pop();
assert(write.sql.includes('INSERT INTO loop_traces'));
assert.deepEqual(JSON.parse(write.params[12]), ['anxious']);
assert.deepEqual(JSON.parse(write.params[13]), ['awareness']);
await repo.updateTrace('trace-test', 'user-test', { emotionTags: [], practicedSkills: ['clarity'] });
write = writes.pop();
for (const column of ['emotion_tags_json', 'practiced_skills_json']) {
  const index = Number(write.sql.match(new RegExp(`${column} = \\$(\\d+)`))[1]) - 1;
  assert.equal(typeof write.params[index], 'string');
  assert(Array.isArray(JSON.parse(write.params[index])));
}
console.log('PASS: actual trace create/update methods bind JSON arrays as JSON text, including empty arrays.');
