import { createHash, timingSafeEqual } from 'node:crypto';
import { db } from '../db/database.js';

function pilotCodes() {
  return [process.env.LINE_PILOT_CODE, process.env.LINE_PILOT_FRIEND_CODE]
    .filter((code): code is string => !!code && code.length >= 24);
}
function sameCode(input: string, code: string) {
  const expected = Buffer.from(code), received = Buffer.from(input.trim());
  return received.length === expected.length && timingSafeEqual(received, expected);
}
export function isLinePilotCode(input: string) {
  return pilotCodes().some(code => sameCode(input,code));
}
// Optional invitations, each bound to one recipient. Never stores the invitation itself.
// Runs only after LINE signature verification, and never records rejected messages.
export async function allowLinePilot(userId: string, input: string, now = Date.now()) {
  const codes = pilotCodes();
  const expires = Date.parse(process.env.LINE_PILOT_EXPIRES_AT || '');
  if (!codes.length || !Number.isFinite(expires) || now >= expires) return false;
  await db.execute(`CREATE TABLE IF NOT EXISTS line_pilot_access (
    invite_hash VARCHAR(64) PRIMARY KEY, user_id VARCHAR(64) NOT NULL
  )`);
  // First recognize existing recipients; an existing tester cannot consume a friend's invite.
  for (const code of codes) {
    const hash = createHash('sha256').update(code).digest('hex');
    const existing = await db.queryOne<{user_id: string}>(
      'SELECT user_id FROM line_pilot_access WHERE invite_hash=$1', [hash]);
    if (existing?.user_id === userId) return true;
  }
  const code = codes.find(code => sameCode(input,code));
  if (!code) return false;
  const hash = createHash('sha256').update(code).digest('hex');
  const existing = await db.queryOne<{user_id: string}>(
    'SELECT user_id FROM line_pilot_access WHERE invite_hash=$1', [hash]);
  if (existing) return existing.user_id === userId;
  await db.execute(`INSERT INTO line_pilot_access (invite_hash,user_id) VALUES ($1,$2)
    ON CONFLICT (invite_hash) DO NOTHING`, [hash,userId]);
  const claimed = await db.queryOne<{user_id: string}>(
    'SELECT user_id FROM line_pilot_access WHERE invite_hash=$1', [hash]);
  return claimed?.user_id === userId;
}
