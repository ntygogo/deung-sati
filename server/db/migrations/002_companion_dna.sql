-- Migration 002: Companion, Growth DNA and Wardrobe Slots
CREATE TABLE IF NOT EXISTS companions (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seed BIGINT NOT NULL,
  name VARCHAR(64) NOT NULL DEFAULT 'น้องดึงสติ',
  stage INTEGER NOT NULL DEFAULT 1,
  unlocked_max_stage INTEGER NOT NULL DEFAULT 1,
  mood_state VARCHAR(32) NOT NULL DEFAULT 'calm',
  last_interacted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS companion_growth_dna (
  companion_id VARCHAR(64) PRIMARY KEY REFERENCES companions(id) ON DELETE CASCADE,
  primary_pink_shade VARCHAR(32) NOT NULL,
  secondary_color VARCHAR(32) NOT NULL,
  gill_type VARCHAR(64) NOT NULL,
  cheek_feeler_type VARCHAR(64) NOT NULL,
  head_light_type VARCHAR(64) NOT NULL,
  head_light_tip VARCHAR(64) NOT NULL,
  tail_type VARCHAR(64) NOT NULL,
  body_pattern VARCHAR(64) NOT NULL,
  movement_personality VARCHAR(64) NOT NULL,
  safe_space_theme VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS companion_equipped_items (
  companion_id VARCHAR(64) NOT NULL REFERENCES companions(id) ON DELETE CASCADE,
  slot VARCHAR(32) NOT NULL,
  item_id VARCHAR(64) NOT NULL,
  PRIMARY KEY (companion_id, slot)
);

CREATE TABLE IF NOT EXISTS saved_outfits (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(64) NOT NULL,
  outfit_json JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
