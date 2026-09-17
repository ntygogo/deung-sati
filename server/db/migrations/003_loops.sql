-- Migration 003: Loop Traces, Patterns and Evidence Links
CREATE TABLE IF NOT EXISTS loop_traces (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_session_id VARCHAR(64),
  trace_category VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  summary TEXT NOT NULL,
  raw_data_json JSONB NOT NULL,
  xp_awarded BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_traces_user_created ON loop_traces(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS loop_patterns (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'suggested',
  trigger_pattern TEXT NOT NULL,
  recurring_thoughts TEXT NOT NULL,
  habitual_response TEXT NOT NULL,
  typical_consequences TEXT NOT NULL,
  new_choice_experiment TEXT,
  helpful_strategies_json JSONB,
  detection_speed_trend VARCHAR(32),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS loop_pattern_evidence (
  id VARCHAR(64) PRIMARY KEY,
  loop_pattern_id VARCHAR(64) NOT NULL REFERENCES loop_patterns(id) ON DELETE CASCADE,
  loop_trace_id VARCHAR(64) NOT NULL REFERENCES loop_traces(id) ON DELETE CASCADE,
  relevance_note TEXT
);
