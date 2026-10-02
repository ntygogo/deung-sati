import crypto from 'node:crypto';
import { db } from '../db/database.js';
import type { IDatabaseAdapter } from '../db/types.js';
import { defaultRoomWeather, roomUnlocks, type RoomEvent, type RoomState, type RoomWeather } from '../../src/shared/roomProgress.js';
const schema = `CREATE TABLE IF NOT EXISTS companion_rooms (
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
`;
const ready = new WeakMap<IDatabaseAdapter, Promise<void>>();
export class RoomRepository {
  static async ensureReady(adapter: IDatabaseAdapter = db) {
    if (!ready.has(adapter)) {
      const setup = adapter.transaction(async tx => {
        if (tx.getDriver() === 'postgres') await tx.query("SELECT pg_advisory_xact_lock(82640210)");
        for (const statement of schema.split(';').filter(s=>s.trim())) await tx.execute(statement);
      }).catch(e => { ready.delete(adapter); throw e; });
      ready.set(adapter, setup);
    }
    await ready.get(adapter);
  }
  constructor(private adapter: IDatabaseAdapter = db) {}
  async state(userId: string): Promise<RoomState> {
    await RoomRepository.ensureReady(this.adapter);
    const row = await this.adapter.queryOne<any>('SELECT * FROM companion_rooms WHERE user_id = $1', [userId]);
    const dna = await this.adapter.queryOne<any>('SELECT d.safe_space_theme FROM companion_growth_dna d JOIN companions c ON c.id = d.companion_id WHERE c.user_id = $1', [userId]);
    const events = await this.adapter.query<any>('SELECT id, kind, payload_json FROM companion_room_events WHERE user_id = $1 AND seen_at IS NULL ORDER BY created_at, id LIMIT 50', [userId]);
    return { bond: row?.bond || 0, weather: row?.weather || defaultRoomWeather(dna?.safe_space_theme), events: events.map(e => ({id: e.id, kind: e.kind, payload: typeof e.payload_json === 'string' ? JSON.parse(e.payload_json) : e.payload_json})) };
  }
  async weather(userId: string, weather: RoomWeather) {
    await RoomRepository.ensureReady(this.adapter);
    await this.adapter.execute('INSERT INTO companion_rooms (user_id, weather) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET weather = excluded.weather', [userId, weather]);
    return this.state(userId);
  }
  async acknowledge(userId: string, id: string) {
    await RoomRepository.ensureReady(this.adapter);
    await this.adapter.execute('UPDATE companion_room_events SET seen_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2 AND seen_at IS NULL', [id, userId]);
  }
  async interact(userId: string, requestId: string) {
    await RoomRepository.ensureReady(this.adapter);
    await this.adapter.transaction(async tx => {
      await tx.queryOne('SELECT id FROM users WHERE id = $1 FOR UPDATE', [userId]);
      const pet = await tx.queryOne<any>('SELECT stage FROM companions WHERE user_id = $1 FOR UPDATE', [userId]);
      if (!pet) throw new Error('COMPANION_REQUIRED');
      const inserted = await tx.execute('INSERT INTO companion_room_interactions (user_id, request_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, requestId]);
      if (!inserted.affectedRows) return;
      await tx.execute('INSERT INTO companion_rooms (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [userId]);
      const room = await tx.queryOne<any>('SELECT * FROM companion_rooms WHERE user_id = $1 FOR UPDATE', [userId]);
      // A quiet cooldown rewards shared time rather than rapid repeated taps.
      if (room.last_bond_at && Date.now() - new Date(room.last_bond_at).getTime() < 60_000) return;
      const before = Number(room.bond), bond = before + 1;
      await tx.execute('UPDATE companion_rooms SET bond = $1, last_bond_at = $2 WHERE user_id = $3', [bond, new Date().toISOString(), userId]);
      await RoomRepository.enqueue(tx, userId, { id: `bond_${crypto.randomUUID()}`, kind: 'bond', payload: { bond, unlocks: pet.stage > 0 ? roomUnlocks(before, bond) : [] } });
    });
    return this.state(userId);
  }
  static async enqueue(tx: IDatabaseAdapter, userId: string, event: RoomEvent) {
    await tx.execute('INSERT INTO companion_room_events (id, user_id, kind, payload_json) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING', [event.id, userId, event.kind, JSON.stringify(event.payload)]);
  }
}
