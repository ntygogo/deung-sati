import { db } from '../db/database.js';
let ready: Promise<void> | undefined;
export function ensureLineSchema() {
  ready ??= create().catch(e => { ready = undefined; throw e; });
  return ready;
}
async function create() {
  await db.execute(`CREATE TABLE IF NOT EXISTS line_chat_users (
    id VARCHAR(64) PRIMARY KEY, consent_at TIMESTAMPTZ,
    history_json TEXT NOT NULL DEFAULT '[]', loop_json TEXT,
    month_key VARCHAR(7) NOT NULL DEFAULT '', rounds INTEGER NOT NULL DEFAULT 0,
    round_messages INTEGER NOT NULL DEFAULT 0, last_chat TIMESTAMPTZ,
    day_key VARCHAR(10) NOT NULL DEFAULT '', daily_messages INTEGER NOT NULL DEFAULT 0,
    attempts INTEGER NOT NULL DEFAULT 0, last_attempt TIMESTAMPTZ,
    busy_event VARCHAR(100), busy_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL
  )`);
  await db.execute(`CREATE TABLE IF NOT EXISTS line_chat_events (
    id VARCHAR(100) PRIMARY KEY, user_id VARCHAR(64) NOT NULL REFERENCES line_chat_users(id),
    status VARCHAR(20) NOT NULL, response_json TEXT, created_at TIMESTAMPTZ NOT NULL
  )`);
  await db.execute(`CREATE INDEX IF NOT EXISTS line_chat_events_user ON line_chat_events(user_id)`);
  // Test and live records cannot confer access across modes or to the web app.
  await db.execute(`CREATE TABLE IF NOT EXISTS line_chat_orders (
    id VARCHAR(64) PRIMARY KEY, user_id VARCHAR(64) NOT NULL REFERENCES line_chat_users(id),
    mode VARCHAR(8) NOT NULL CHECK (mode IN ('test','live')),
    amount INTEGER NOT NULL, currency VARCHAR(3) NOT NULL, days INTEGER NOT NULL,
    status VARCHAR(24) NOT NULL, session_id VARCHAR(255) UNIQUE, checkout_url TEXT,
    payment_intent VARCHAR(255) UNIQUE, refunded_amount INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL, paid_at TIMESTAMPTZ, starts_at TIMESTAMPTZ, expires_at TIMESTAMPTZ
  )`);
  await db.execute(`CREATE INDEX IF NOT EXISTS line_chat_orders_user ON line_chat_orders(user_id,mode)`);
  await db.execute(`CREATE TABLE IF NOT EXISTS line_ai_usage (
    id VARCHAR(64) PRIMARY KEY, user_id VARCHAR(64) NOT NULL REFERENCES line_chat_users(id),
    model VARCHAR(120) NOT NULL, outcome VARCHAR(24) NOT NULL,
    prompt_tokens INTEGER, output_tokens INTEGER, thought_tokens INTEGER, created_at TIMESTAMPTZ NOT NULL
  )`);
}
