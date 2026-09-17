import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const db = new DatabaseSync(':memory:');
try {
  db.exec(`
    CREATE TABLE loop_traces (id TEXT PRIMARY KEY, raw_data_json TEXT, created_at TEXT);
    INSERT INTO loop_traces VALUES ('existing', '{"trigger":"preserve"}', '2026-09-01');
    CREATE TABLE companions (id TEXT PRIMARY KEY);
    CREATE TABLE completed_loops (
      id TEXT, user_id TEXT, conversation_id TEXT, idempotency_key TEXT,
      reward_xp INTEGER, reward_shells INTEGER, progress_counted BOOLEAN,
      is_review_only BOOLEAN, created_at TEXT
    );
  `);
  db.exec('BEGIN');
  db.exec(readFileSync(new URL('../db/migrations/007_growth_events_and_skills.sql', import.meta.url), 'utf8'));
  db.exec('COMMIT');
  const row = db.prepare('SELECT * FROM loop_traces WHERE id = ?').get('existing');
  assert.equal(row.raw_data_json, '{"trigger":"preserve"}');
  assert.equal(row.updated_at, '2026-09-01');
  assert(db.prepare('PRAGMA table_info(loop_traces)').all().some(c => c.name === 'thoughts_or_fears'));
  assert(db.prepare('PRAGMA table_info(companions)').all().some(c => c.name === 'hatch_milestone_awarded'));
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM growth_events').get().n, 0);
  console.log('PASS: migration 007 upgrades a populated SQLite schema without losing existing trace data.');
} finally {
  db.close();
}
