-- Migration 005: Cosmetic Items Catalog, Inventory, Missions and User Missions
CREATE TABLE IF NOT EXISTS cosmetic_items (
  id VARCHAR(64) PRIMARY KEY,
  slot VARCHAR(32) NOT NULL,
  name_th VARCHAR(120) NOT NULL,
  name_en VARCHAR(120) NOT NULL,
  price_shells INTEGER NOT NULL DEFAULT 0,
  price_crystals INTEGER NOT NULL DEFAULT 0,
  rarity VARCHAR(32) NOT NULL DEFAULT 'common',
  unlock_condition TEXT,
  asset_data_json JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS user_inventory (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id VARCHAR(64) NOT NULL REFERENCES cosmetic_items(id) ON DELETE CASCADE,
  acquired_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_user_item UNIQUE (user_id, item_id)
);

CREATE TABLE IF NOT EXISTS missions (
  id VARCHAR(64) PRIMARY KEY,
  category VARCHAR(32) NOT NULL, -- notice, separate, pause, choose, reflect, recover
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  reward_xp INTEGER NOT NULL DEFAULT 10,
  reward_shells INTEGER NOT NULL DEFAULT 5,
  requirement_type VARCHAR(64) NOT NULL
);

CREATE TABLE IF NOT EXISTS user_missions (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mission_id VARCHAR(64) NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  status VARCHAR(32) NOT NULL DEFAULT 'active', -- active, completed, claimed, dismissed
  progress INTEGER NOT NULL DEFAULT 0,
  target INTEGER NOT NULL DEFAULT 1,
  assigned_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMPTZ
);
