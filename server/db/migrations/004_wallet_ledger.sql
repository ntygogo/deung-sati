-- Migration 004: Wallet, Currency Transaction Ledger and Anti-Abuse
CREATE TABLE IF NOT EXISTS wallets (
  user_id VARCHAR(64) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  shells INTEGER NOT NULL DEFAULT 0,
  memory_crystals INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS currency_transactions (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  idempotency_key VARCHAR(128) UNIQUE NOT NULL,
  currency VARCHAR(32) NOT NULL, -- xp, shells, memory_crystals
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  event_type VARCHAR(64) NOT NULL,
  event_id VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_tx_user_created ON currency_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tx_idempotency ON currency_transactions(idempotency_key);

CREATE TABLE IF NOT EXISTS anti_abuse_signals (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR(64) NOT NULL,
  fingerprint VARCHAR(128) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(64) NOT NULL,
  metadata_json JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
