-- Permanent v1 reservations. Deleting a companion must never recycle its look.
CREATE TABLE IF NOT EXISTS companion_design_claims (
  slot_id INTEGER PRIMARY KEY CHECK (slot_id >= 0 AND slot_id < 62208),
  companion_id VARCHAR(64) NOT NULL UNIQUE,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
