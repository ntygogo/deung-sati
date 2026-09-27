import { db } from '../db/database.js';
// Lazy additive schema follows the existing beta trial / conversation pattern.
// No user data is rewritten, and no pre-existing trial is shortened.
let ready: Promise<void> | undefined;
export function ensureBillingSchema(): Promise<void> {
  ready ??= createSchema().catch(error => { ready = undefined; throw error; });
  return ready;
}
async function createSchema() {
  for (const mode of ['test','live'] as const) {
  const orders = mode === 'live' ? 'billing_orders_live' : 'billing_orders';
  const events = mode === 'live' ? 'billing_events_live' : 'billing_events';
  await db.execute(`CREATE TABLE IF NOT EXISTS ${orders} (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    mode VARCHAR(8) NOT NULL CHECK (mode = '${mode}'),
    plan_id VARCHAR(40) NOT NULL,
    amount INTEGER NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL,
    days INTEGER NOT NULL CHECK (days > 0),
    status VARCHAR(24) NOT NULL,
    session_id VARCHAR(255) UNIQUE,
    checkout_url TEXT,
    payment_intent VARCHAR(255) UNIQUE,
    refunded_amount INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL,
    paid_at TIMESTAMPTZ,
    starts_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ
  )`);
  await db.execute(`CREATE INDEX IF NOT EXISTS ${orders}_user ON ${orders}(user_id, created_at)`);
  await db.execute(`CREATE TABLE IF NOT EXISTS ${events} (
    id VARCHAR(255) PRIMARY KEY, processed_at TIMESTAMPTZ NOT NULL
  )`);
  }
  await db.execute(`CREATE TABLE IF NOT EXISTS ai_usage (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    model VARCHAR(120) NOT NULL,
    outcome VARCHAR(24) NOT NULL,
    prompt_tokens INTEGER, cached_tokens INTEGER, output_tokens INTEGER, thought_tokens INTEGER,
    estimated_usd DOUBLE PRECISION,
    rate_json TEXT,
    created_at TIMESTAMPTZ NOT NULL
  )`);
}

