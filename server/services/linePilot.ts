import { createHash, timingSafeEqual } from 'node:crypto';
import { db } from '../db/database.js';

// Optional, single-recipient pilot invitation. Never stores the invitation itself.
// Runs only after LINE signature verification, and never records rejected messages.
export async function allowLinePilot(userId: string, input: string, now = Date.now()) {
  const code = process.env.LINE_PILOT_CODE || '';
  const expires = Date.parse(process.env.LINE_PILOT_EXPIRES_AT || '');
  if (code.length < 24 || !Number.isFinite(expires) || now >= expires) return false;
  await db.execute(`CREATE TABLE IF NOT EXISTS line_pilot_access (
    invite_hash VARCHAR(64) PRIMARY KEY, user_id VARCHAR(64) NOT NULL
  )`);
  const hash = createHash('sha256').update(code).digest('hex');
  const existing = await db.queryOne<{user_id: string}>(
    'SELECT user_id FROM line_pilot_access WHERE invite_hash=$1', [hash]);
  if (existing) return existing.user_id === userId;
  const expected = Buffer.from(code);
  const received = Buffer.from(input.trim());
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return false;
  await db.execute(`INSERT INTO line_pilot_access (invite_hash,user_id) VALUES ($1,$2)
    ON CONFLICT (invite_hash) DO NOTHING`, [hash,userId]);
  const claimed = await db.queryOne<{user_id: string}>(
    'SELECT user_id FROM line_pilot_access WHERE invite_hash=$1', [hash]);
  return claimed?.user_id === userId;
}
