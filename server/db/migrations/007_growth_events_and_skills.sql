-- Migration 007: Growth Events, Editable Loop Traces, and Companion Skills
-- Reuses completed_loops as the Immutable Growth Event table and currency_transactions as the Reward Ledger

-- 1. Editable Loop Traces: add updated_at and structured section fields
ALTER TABLE loop_traces ADD COLUMN updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE loop_traces ADD COLUMN thoughts_or_fears TEXT;
ALTER TABLE loop_traces ADD COLUMN desires TEXT;
ALTER TABLE loop_traces ADD COLUMN old_response TEXT;
ALTER TABLE loop_traces ADD COLUMN new_choice TEXT;
ALTER TABLE loop_traces ADD COLUMN insights TEXT;
ALTER TABLE loop_traces ADD COLUMN emotion_tags_json JSONB;
ALTER TABLE loop_traces ADD COLUMN practiced_skills_json JSONB;

-- 2. Evolve completed_loops to serve as Immutable Growth Events
ALTER TABLE completed_loops ADD COLUMN loop_trace_id VARCHAR(64);
CREATE UNIQUE INDEX IF NOT EXISTS idx_completed_loops_loop_trace_id ON completed_loops(loop_trace_id);

ALTER TABLE completed_loops ADD COLUMN emotional_awareness INTEGER DEFAULT 0;
ALTER TABLE completed_loops ADD COLUMN somatic_awareness INTEGER DEFAULT 0;
ALTER TABLE completed_loops ADD COLUMN cognitive_clarity INTEGER DEFAULT 0;
ALTER TABLE completed_loops ADD COLUMN conscious_action INTEGER DEFAULT 0;
ALTER TABLE completed_loops ADD COLUMN snapshot_data_json JSONB;
ALTER TABLE completed_loops ADD COLUMN desires TEXT;
ALTER TABLE completed_loops ADD COLUMN insights TEXT;
ALTER TABLE completed_loops ADD COLUMN emotion_tags_json JSONB;

-- 3. Companion Skill Accumulation & Hatch Milestone Idempotency
ALTER TABLE companions ADD COLUMN emotional_awareness_score INTEGER DEFAULT 0;
ALTER TABLE companions ADD COLUMN somatic_awareness_score INTEGER DEFAULT 0;
ALTER TABLE companions ADD COLUMN cognitive_clarity_score INTEGER DEFAULT 0;
ALTER TABLE companions ADD COLUMN conscious_action_score INTEGER DEFAULT 0;
ALTER TABLE companions ADD COLUMN hatch_milestone_awarded BOOLEAN DEFAULT FALSE;

-- 4. Growth Events View for seamless schema compatibility
CREATE VIEW IF NOT EXISTS growth_events AS
SELECT
  id,
  user_id,
  conversation_id,
  loop_trace_id,
  idempotency_key,
  emotional_awareness,
  somatic_awareness,
  cognitive_clarity,
  conscious_action,
  snapshot_data_json,
  reward_xp,
  reward_shells,
  progress_counted,
  is_review_only,
  created_at
FROM completed_loops;
