import assert from 'node:assert/strict';
import { once } from 'node:events';
import express from 'express';
import cookieParser from 'cookie-parser';
import { SqliteDatabaseAdapter } from '../db/sqliteAdapter.js';
import { setTestDatabase } from '../db/database.js';
import { runMigrations } from '../db/migrator.js';
import { AuthService } from '../services/authService.js';
import { UserRepository } from '../repositories/userRepository.js';
import { DiscoveryRepository, MAX_DISCOVERY_RECORDS } from '../repositories/discoveryRepository.js';
import { discoveryRouter } from '../routes/discovery.js';
import { validateDiscoveryRecord, type DiscoveryRecord } from '../../src/shared/discovery.js';

// Deliberately use a fresh in-memory database, never environment databases.
const db = new SqliteDatabaseAdapter(':memory:');
setTestDatabase(db);
await runMigrations(db);
for (const owner of ['a', 'b']) {
  await db.execute('INSERT INTO users (id, name, email, password_hash, salt) VALUES ($1, $2, $3, $4, $5)', [owner, owner, `${owner}@example.test`, 'unused', 'unused']);
  await db.execute('INSERT INTO wallets (user_id, xp, level, shells, memory_crystals) VALUES ($1, 0, 1, 0, 0)', [owner]);
}
const repository = new DiscoveryRepository(db);
const users = new UserRepository(db);
const assessment = (id = 'assessment-0001'): DiscoveryRecord => ({
  id, kind: 'assessment', version: 1, locale: 'th', createdAt: '2026-09-19T12:00:00.000Z',
  data: { assessmentId: 'self-boundary', answers: { SB01: 0, SB02: 'na', SB03: 'unsure', SB04: 'skip' }, feedback: '', focus: '' },
});
const emotion = (id = 'emotion-0001'): DiscoveryRecord => ({
  id, kind: 'emotion', version: 1, locale: 'th', createdAt: '2026-09-19T12:00:00.000Z',
  data: { context: 'ยังไม่รู้ว่าเกิดอะไรขึ้น', story: '', emotions: ['unsure'], customEmotion: '', intensity: null, body: '', needs: [], customNeed: '', goal: null },
});
const practice = (id = 'practice-0001'): DiscoveryRecord => ({
  id, kind: 'practice', version: 1, locale: 'en', createdAt: '2026-09-19T12:00:00.000Z',
  data: { exerciseId: 'boundary', sourceLabel: 'Self boundary', fields: { action: 'Ask for time' }, obstacle: '', status: 'planned', outcome: null, reflection: '', nextStep: '' },
});
const fails = (fn: () => Promise<unknown>, status: number) => assert.rejects(fn, error => typeof error === 'object' && error !== null && 'status' in error && error.status === status);
const stripSaved = (value: any): DiscoveryRecord => { const { revision: _revision, updatedAt: _updatedAt, ...result } = value; return result; };
const ledgerBefore = await db.query('SELECT * FROM wallets ORDER BY user_id');

assert.deepEqual(await repository.get('a'), { ownerId: 'a', records: [] });
const first = await repository.create('a', { record: assessment() });
assert.equal(first.record.revision, 1);
assert.equal(first.record.kind, 'assessment');
if (first.record.kind !== 'assessment') throw new Error('Unexpected type');
assert.equal(first.record.data.answers.SB01, 0, 'zero is a valid answer');
assert.equal(first.record.data.answers.SB05, null, 'missing answers stay missing, never zero');
assert.equal((await repository.create('a', { record: assessment() })).record.revision, 1, 'POST retry after a lost response is idempotent');
const parallelRetry = await Promise.all([repository.create('a', { record: emotion('parallel-0001') }), repository.create('a', { record: emotion('parallel-0001') })]);
assert.deepEqual(parallelRetry[0], parallelRetry[1], 'concurrent create retries resolve to one record');
await repository.delete('a', 'parallel-0001', { revision: 1 });
assert.equal((await new DiscoveryRepository(db).get('a')).records.length, 1, 'a fresh repository restores persisted answers');
assert.deepEqual((await repository.get('b')).records, [], 'owner isolation on reads');
await fails(() => repository.create('b', { record: assessment() }), 404);
await fails(() => repository.update('b', first.record.id, { record: assessment(), revision: 1 }), 404);
await fails(() => repository.delete('b', first.record.id, { revision: 1 }), 404);
await fails(() => repository.create('a', { record: { ...assessment('invalid-0001'), score: 100 } }), 400);
await fails(() => repository.create('a', { record: { ...assessment('invalid-0001'), data: { ...assessment().data, answers: { SB99: 3 } } } }), 400);
await fails(() => repository.create('a', { record: { ...assessment('invalid-0001'), data: { ...assessment().data, answers: { SB01: 4 } } } }), 400);
await fails(() => repository.create('a', { record: { ...assessment('invalid-0001'), data: { ...assessment().data, answers: { SB01: undefined } } } }), 400);
await fails(() => repository.create('a', { record: { ...assessment('invalid-0001'), createdAt: '2026-02-30T12:00:00.000Z' } }), 400);
await fails(() => repository.create('a', { record: { ...assessment('invalid-0001'), locale: 'xx' } }), 400);
await fails(() => repository.create('a', { record: { ...assessment('invalid-0001'), data: { ...assessment().data, focus: 'name' } } }), 400);
await fails(() => repository.create('a', { record: { ...assessment('invalid-0001'), data: { assessmentId: 'emotional-awareness', answers: {}, feedback: '', focus: 'choose' } } }), 400);
const corrected = stripSaved(first.record);
if (corrected.kind !== 'assessment') throw new Error('Unexpected type');
corrected.data = { ...corrected.data, answers: { ...corrected.data.answers, SB01: 2 }, feedback: 'partly', focus: 'notice' };
const updated = await repository.update('a', corrected.id, { record: corrected, revision: 1 });
assert.equal(updated.record.revision, 2, 'answer corrections are allowed');
assert.equal((await repository.update('a', corrected.id, { record: corrected, revision: 1 })).record.revision, 2, 'PUT lost-response retry is idempotent');
await fails(() => repository.update('a', corrected.id, { record: assessment(), revision: 1 }), 409);
await fails(() => repository.update('a', corrected.id, { record: { ...corrected, createdAt: '2026-09-20T12:00:00.000Z' }, revision: 2 }), 400);
await fails(() => repository.update('a', corrected.id, { record: { ...corrected, locale: 'en' }, revision: 2 }), 400);
await fails(() => repository.update('a', corrected.id, { record: { ...emotion(), id: corrected.id }, revision: 2 }), 400);
await fails(() => repository.update('a', corrected.id, { record: corrected, revision: 0 }), 400);

const e = emotion();
await repository.create('a', { record: e });
await fails(() => repository.create('a', { record: { ...e, id: 'invalid-0002', data: { ...e.data, emotions: ['invented'] } } }), 400);
await fails(() => repository.create('a', { record: { ...e, id: 'invalid-0002', data: { ...e.data, intensity: 11 } } }), 400);
await fails(() => repository.create('a', { record: { ...e, id: 'invalid-0002', data: { ...e.data, context: ' ', emotions: [] } } }), 400);
await fails(() => repository.create('a', { record: { ...e, id: 'invalid-0002', data: { ...e.data, body: 'a'.repeat(1001) } } }), 400);
await fails(() => repository.create('a', { record: { ...e, id: 'invalid-0002', data: { ...e.data, emotions: ['happy', 'calm', 'proud', 'grateful', 'sad', 'angry', 'anxious', 'tired', 'lonely'] } } }), 400);
await fails(() => repository.create('a', { record: { ...e, id: 'invalid-0002', data: { ...e.data, needs: ['rest', 'clarity', 'support', 'space', 'connection', 'fairness', 'autonomy', 'meaning', 'celebrate'] } } }), 400);
const p = practice();
await repository.create('a', { record: p });
await fails(() => repository.create('a', { record: { ...p, id: 'invalid-0003', data: { ...p.data, status: 'tried' } } }), 400);
await fails(() => repository.create('a', { record: { ...p, id: 'invalid-0003', data: { ...p.data, outcome: 'helpful' } } }), 400);
await fails(() => repository.create('a', { record: { ...p, id: 'invalid-0003', data: { ...p.data, fields: JSON.parse('{"__proto__":"bad"}') } } }), 400);
await fails(() => repository.create('a', { record: { ...p, id: 'invalid-0003', data: { ...p.data, fields: { note: 'a'.repeat(1001) } } } }), 400);
const tried = { ...p, data: { ...p.data, status: 'tried', outcome: 'same', reflection: 'I tried and felt the same' } };
await repository.update('a', p.id, { record: tried, revision: 1 });
assert.equal((await repository.get('a')).records.length, 3);
const exported = await users.exportUserData('a');
assert.equal(exported.selfDiscovery.length, 3, 'account export includes every saved assessment, emotion and practice');
assert.equal(exported.selfDiscovery.find((item: any) => item.id === p.id).data.reflection, 'I tried and felt the same');

// Real HTTP middleware checks with locally created sessions; no outside service.
const auth = new AuthService(db);
const tokenA = await auth.createSession('a');
const tokenB = await auth.createSession('b');
const app = express();
app.use(express.json({ limit: '750kb' })); app.use(cookieParser()); app.use('/user/discovery', discoveryRouter);
const server = app.listen(0, '127.0.0.1');
await once(server, 'listening');
const address = server.address();
if (!address || typeof address === 'string') throw new Error('No test port');
const url = `http://127.0.0.1:${address.port}/user/discovery`;
try {
  const unauth = await fetch(url); assert.equal(unauth.status, 401); assert.match(unauth.headers.get('cache-control') ?? '', /no-store/);
  const missingOwner = await fetch(url, { headers: { Authorization: `Bearer ${tokenA}` } }); assert.equal(missingOwner.status, 409);
  const switched = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${tokenB}`, 'X-DeungSati-Owner': 'a', 'Content-Type': 'application/json' }, body: JSON.stringify({ record: emotion('switched-0001') }) });
  assert.equal(switched.status, 409); assert.equal((await switched.json() as { code: string }).code, 'ACCOUNT_CHANGED');
  assert.equal((await repository.get('b')).records.length, 0, 'account switch guard runs before writes');
  const cookieWithoutCsrf = await fetch(url, { method: 'POST', headers: { Cookie: `deung_sati_session=${tokenA}`, 'X-DeungSati-Owner': 'a', 'Content-Type': 'application/json' }, body: JSON.stringify({ record: emotion('csrf-0001') }) });
  assert.equal(cookieWithoutCsrf.status, 403);
  const headers = { Authorization: `Bearer ${tokenA}`, 'X-DeungSati-Owner': 'a', 'Content-Type': 'application/json' };
  const routeCreate = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ record: emotion('http-emotion-0001') }) });
  assert.equal(routeCreate.status, 200); assert.equal((await routeCreate.json() as { record: { revision: number } }).record.revision, 1);
  const read = await fetch(url, { headers }); assert.equal((await read.json() as { records: unknown[] }).records.length, 4); assert.match(read.headers.get('cache-control') ?? '', /no-store/);
  const routeUpdate = await fetch(`${url}/http-emotion-0001`, { method: 'PUT', headers, body: JSON.stringify({ record: { ...emotion('http-emotion-0001'), data: { ...emotion().data, body: 'tense' } }, revision: 1 }) });
  assert.equal(routeUpdate.status, 200); assert.equal((await routeUpdate.json() as { record: { revision: number } }).record.revision, 2);
  const routeDelete = await fetch(`${url}/http-emotion-0001`, { method: 'DELETE', headers, body: JSON.stringify({ revision: 2 }) }); assert.equal(routeDelete.status, 200);
  const foreign = await fetch(`${url}/${p.id}`, { method: 'DELETE', headers: { ...headers, Authorization: `Bearer ${tokenB}`, 'X-DeungSati-Owner': 'b' }, body: JSON.stringify({ revision: 2 }) }); assert.equal(foreign.status, 404);
} finally {
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}

await fails(() => repository.delete('a', corrected.id, { revision: 1 }), 409);
assert.deepEqual(await repository.delete('a', corrected.id, { revision: 2 }), { ownerId: 'a', deletedId: corrected.id });
assert.deepEqual(await repository.delete('a', corrected.id, { revision: 2 }), { ownerId: 'a', deletedId: corrected.id }, 'DELETE response retry succeeds');
const tombstone = await db.queryOne('SELECT record_json FROM discovery_records WHERE id = $1', [corrected.id]);
assert.equal(tombstone?.record_json, null, 'deletion erases private answers');
await fails(() => repository.create('a', { record: corrected }), 409);
await fails(() => repository.update('a', corrected.id, { record: corrected, revision: 2 }), 404);
assert.equal((await users.exportUserData('a')).selfDiscovery.length, 2, 'export excludes erased answers');

// Compare-and-swap: concurrent updates cannot both claim the same revision.
const concurrent = await Promise.allSettled([
  repository.update('a', e.id, { record: { ...e, data: { ...e.data, body: 'relaxed' } }, revision: 1 }),
  repository.update('a', e.id, { record: { ...e, data: { ...e.data, body: 'tense' } }, revision: 1 }),
]);
assert.equal(concurrent.filter(result => result.status === 'fulfilled').length, 1);
assert.equal(concurrent.filter(result => result.status === 'rejected' && result.reason.status === 409).length, 1);
assert.deepEqual(await db.query('SELECT * FROM wallets ORDER BY user_id'), ledgerBefore, 'all discovery actions leave XP/shells unchanged');
for (const table of ['loop_traces', 'completed_loops', 'growth_events', 'currency_transactions', 'companions']) {
  assert.equal((await db.queryOne(`SELECT COUNT(*) AS count FROM ${table}`))?.count, 0, `no effects on ${table}`);
}
await users.deleteAccount('a');
assert.equal((await db.queryOne('SELECT COUNT(*) AS count FROM discovery_records WHERE user_id = $1', ['a']))?.count, 0, 'account deletion cascades to live records and tombstones');

// Bound storage without silently truncating the user's history or export.
for (let index = 0; index < MAX_DISCOVERY_RECORDS; index += 1) {
  const item = validateDiscoveryRecord(emotion(`limit-${String(index).padStart(5, '0')}`));
  await db.execute('INSERT INTO discovery_records (id, user_id, record_json, revision, updated_at) VALUES ($1, $2, $3, 1, $4)', [item.id, 'b', JSON.stringify(item), item.createdAt]);
}
await fails(() => repository.create('b', { record: emotion('limit-overflow') }), 409);
assert.equal((await repository.get('b')).records.length, MAX_DISCOVERY_RECORDS);
assert.equal((await users.exportUserData('b')).selfDiscovery.length, MAX_DISCOVERY_RECORDS);
await repository.delete('b', 'limit-00000', { revision: 1 });
const capRace = await Promise.allSettled([repository.create('b', { record: emotion('limit-overflow') }), repository.create('b', { record: emotion('limit-racer-2') })]);
assert.equal(capRace.filter(result => result.status === 'fulfilled').length, 1, 'only one concurrent insertion can take the last free slot');
assert.equal(capRace.filter(result => result.status === 'rejected' && result.reason.status === 409).length, 1);
assert.equal((await repository.get('b')).records.length, MAX_DISCOVERY_RECORDS);
await db.close();
console.log('PASS discovery: validated typed records, owner isolation/CSRF/account switch, idempotent create/update/delete, CAS corrections, erased tombstones, full export, account purge, record cap, no loop/XP/DNA changes');
