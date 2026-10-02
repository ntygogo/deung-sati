CREATE TABLE IF NOT EXISTS companion_rooms (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  bond INTEGER NOT NULL DEFAULT 0,
  weather TEXT,
  last_bond_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS companion_room_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  payload_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  seen_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_room_events_pending ON companion_room_events(user_id, seen_at, created_at);
CREATE TABLE IF NOT EXISTS companion_room_interactions (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_id TEXT NOT NULL,
  PRIMARY KEY (user_id, request_id)
);
