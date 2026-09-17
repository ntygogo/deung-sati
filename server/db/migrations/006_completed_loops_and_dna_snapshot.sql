-- Migration 006: Completed Loops, Permanent DNA Snapshot and Loop Drafts
CREATE TABLE IF NOT EXISTS completed_loops (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id VARCHAR(64) NOT NULL,
  idempotency_key VARCHAR(128) UNIQUE NOT NULL,
  trigger TEXT NOT NULL,
  emotion_or_body TEXT NOT NULL,
  automatic_story TEXT NOT NULL,
  facts TEXT NOT NULL,
  old_response TEXT NOT NULL,
  new_choice TEXT NOT NULL,
  emotion_tag VARCHAR(64) NOT NULL,
  learning_types_json JSONB NOT NULL,
  is_review_only BOOLEAN DEFAULT FALSE,
  progress_counted BOOLEAN DEFAULT TRUE,
  reward_xp INTEGER DEFAULT 0,
  reward_shells INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_completed_loops_user ON completed_loops(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_completed_loops_idemp ON completed_loops(idempotency_key);

CREATE TABLE IF NOT EXISTS companion_dna_snapshots (
  id VARCHAR(64) PRIMARY KEY,
  companion_id VARCHAR(64) UNIQUE NOT NULL REFERENCES companions(id) ON DELETE CASCADE,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seed VARCHAR(128) NOT NULL,
  dna_json JSONB NOT NULL,
  stats_summary_json JSONB NOT NULL,
  hatched_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS loop_drafts (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id VARCHAR(64) NOT NULL,
  trigger TEXT,
  emotion_or_body TEXT,
  automatic_story TEXT,
  facts TEXT,
  old_response TEXT,
  new_choice TEXT,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_user_conv_draft UNIQUE (user_id, conversation_id)
);
