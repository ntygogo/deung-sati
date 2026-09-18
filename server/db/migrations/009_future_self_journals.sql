CREATE TABLE IF NOT EXISTS future_self_journals (
  user_id VARCHAR(80) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  journal_json TEXT NOT NULL DEFAULT '{"focus":null,"entries":[]}',
  revision INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
