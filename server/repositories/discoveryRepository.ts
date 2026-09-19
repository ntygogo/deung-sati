import type { IDatabaseAdapter } from '../db/types.js';
import { validateDiscoveryId, validateDiscoveryRecord, type DiscoveryCollection, type DiscoveryDocument, type DiscoveryRecord, type SavedDiscoveryRecord } from '../../src/shared/discovery.js';

export const DISCOVERY_SCHEMA = `CREATE TABLE IF NOT EXISTS discovery_records (
  id VARCHAR(160) PRIMARY KEY,
  user_id VARCHAR(80) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  record_json TEXT,
  revision INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ
)`;
export const MAX_DISCOVERY_RECORDS = 1000;
type DiscoveryRow = { id: string; user_id: string; record_json: unknown; revision: number; updated_at: string | Date; deleted_at: string | Date | null };
export class DiscoveryError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}
function envelope(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== keys.length || Object.keys(value).some(key => !keys.includes(key))) throw new DiscoveryError(400, 'Invalid discovery request');
  return value as Record<string, unknown>;
}
function revision(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 1) throw new DiscoveryError(400, 'Invalid discovery revision');
  return value as number;
}
function record(value: unknown): DiscoveryRecord {
  try { return validateDiscoveryRecord(value); }
  catch { throw new DiscoveryError(400, 'Invalid discovery record'); }
}
function identifier(value: unknown): string {
  try { return validateDiscoveryId(value); }
  catch { throw new DiscoveryError(400, 'Invalid discovery identifier'); }
}
function saved(row: DiscoveryRow): SavedDiscoveryRecord {
  const value = typeof row.record_json === 'string' ? JSON.parse(row.record_json) : row.record_json;
  return { ...validateDiscoveryRecord(value), revision: row.revision, updatedAt: new Date(row.updated_at).toISOString() };
}
function same(row: DiscoveryRow, value: DiscoveryRecord): boolean {
  const stored = typeof row.record_json === 'string' ? JSON.parse(row.record_json) : row.record_json;
  return JSON.stringify(validateDiscoveryRecord(stored)) === JSON.stringify(value);
}

/** No methods in this repository touch loops, rewards, wallets, or companion DNA. */
export class DiscoveryRepository {
  private adapter: IDatabaseAdapter;
  private ready?: Promise<void>;
  constructor(adapter: IDatabaseAdapter) { this.adapter = adapter; }
  private async ensureSchema(): Promise<void> {
    this.ready ??= (async () => {
      await this.adapter.execute(DISCOVERY_SCHEMA);
      await this.adapter.execute('CREATE INDEX IF NOT EXISTS discovery_records_owner ON discovery_records (user_id, deleted_at, updated_at)');
    })().catch(error => { this.ready = undefined; throw error; });
    await this.ready;
  }
  private async row(id: string, adapter = this.adapter): Promise<DiscoveryRow | null> {
    return adapter.queryOne<DiscoveryRow>('SELECT * FROM discovery_records WHERE id = $1', [id]);
  }
  async get(ownerId: string): Promise<DiscoveryCollection> {
    await this.ensureSchema();
    const rows = await this.adapter.query<DiscoveryRow>('SELECT * FROM discovery_records WHERE user_id = $1 AND deleted_at IS NULL ORDER BY updated_at DESC, id ASC', [ownerId]);
    return { ownerId, records: rows.map(saved) };
  }
  async create(ownerId: string, value: unknown): Promise<DiscoveryDocument> {
    const incoming = record(envelope(value, ['record']).record);
    await this.ensureSchema();
    // Postgres locks this owner's account across inserts. SQLite performs the cap
    // check inside its atomic INSERT, avoiding nested transactions on its one connection.
    const insert = async (tx: IDatabaseAdapter): Promise<DiscoveryDocument> => {
      const owner = await tx.queryOne('SELECT id FROM users WHERE id = $1 FOR UPDATE', [ownerId]);
      if (!owner) throw new DiscoveryError(404, 'Account not found');
      const current = await this.row(incoming.id, tx);
      if (current) return this.existingCreate(ownerId, incoming, current);
      const total = await tx.queryOne<{ count: number | string }>('SELECT COUNT(*) AS count FROM discovery_records WHERE user_id = $1 AND deleted_at IS NULL', [ownerId]);
      if (Number(total?.count) >= MAX_DISCOVERY_RECORDS) throw new DiscoveryError(409, 'Discovery record limit reached');
      const now = new Date().toISOString();
      const inserted = await tx.execute('INSERT INTO discovery_records (id, user_id, record_json, revision, updated_at) SELECT $1, $2, $3, 1, $4 WHERE (SELECT COUNT(*) FROM discovery_records WHERE user_id = $5 AND deleted_at IS NULL) < $6 ON CONFLICT (id) DO NOTHING', [incoming.id, ownerId, JSON.stringify(incoming), now, ownerId, MAX_DISCOVERY_RECORDS]);
      if (inserted.affectedRows !== 1) {
        const raced = await this.row(incoming.id, tx);
        if (!raced) throw new DiscoveryError(409, 'Discovery record limit reached');
        return this.existingCreate(ownerId, incoming, raced);
      }
      return { ownerId, record: { ...incoming, revision: 1, updatedAt: now } };
    };
    return this.adapter.getDriver() === 'sqlite' ? insert(this.adapter) : this.adapter.transaction(insert);
  }
  private existingCreate(ownerId: string, incoming: DiscoveryRecord, current: DiscoveryRow): DiscoveryDocument {
    if (current.user_id !== ownerId) throw new DiscoveryError(404, 'Discovery record not found');
    // Tombstones prevent delayed/offline POST retries from recreating deleted answers.
    if (current.deleted_at !== null) throw new DiscoveryError(409, 'Discovery record was deleted');
    if (!same(current, incoming)) throw new DiscoveryError(409, 'Discovery record already exists');
    return { ownerId, record: saved(current) };
  }
  async update(ownerId: string, idValue: unknown, value: unknown): Promise<DiscoveryDocument> {
    const id = identifier(idValue);
    const data = envelope(value, ['record', 'revision']);
    const incoming = record(data.record);
    const expected = revision(data.revision);
    if (incoming.id !== id) throw new DiscoveryError(400, 'Discovery identifier mismatch');
    await this.ensureSchema();
    const current = await this.row(id);
    if (!current || current.user_id !== ownerId || current.deleted_at !== null) throw new DiscoveryError(404, 'Discovery record not found');
    const previous = saved(current);
    if (previous.kind !== incoming.kind || previous.version !== incoming.version || previous.locale !== incoming.locale || previous.createdAt !== incoming.createdAt) throw new DiscoveryError(400, 'Discovery record identity cannot change');
    if (previous.kind === 'assessment' && incoming.kind === 'assessment' && previous.data.assessmentId !== incoming.data.assessmentId) throw new DiscoveryError(400, 'Assessment identity cannot change');
    // One-revision retry covers a lost response without authorizing a stale edit.
    if ((current.revision === expected || current.revision === expected + 1) && same(current, incoming)) return { ownerId, record: previous };
    if (current.revision !== expected) throw new DiscoveryError(409, 'Discovery changed on another device');
    const now = new Date().toISOString();
    const result = await this.adapter.execute('UPDATE discovery_records SET record_json = $1, revision = revision + 1, updated_at = $2 WHERE id = $3 AND user_id = $4 AND revision = $5 AND deleted_at IS NULL', [JSON.stringify(incoming), now, id, ownerId, expected]);
    if (result.affectedRows !== 1) throw new DiscoveryError(409, 'Discovery changed on another device');
    return { ownerId, record: { ...incoming, revision: expected + 1, updatedAt: now } };
  }
  async delete(ownerId: string, idValue: unknown, value: unknown): Promise<{ ownerId: string; deletedId: string }> {
    const id = identifier(idValue);
    const expected = revision(envelope(value, ['revision']).revision);
    await this.ensureSchema();
    const current = await this.row(id);
    if (!current || current.user_id !== ownerId) throw new DiscoveryError(404, 'Discovery record not found');
    if (current.deleted_at !== null && current.revision === expected + 1) return { ownerId, deletedId: id };
    if (current.deleted_at !== null || current.revision !== expected) throw new DiscoveryError(409, 'Discovery changed on another device');
    const now = new Date().toISOString();
    // Erase private answers immediately. Keep only the ID, owner, revision and
    // deletion timestamps until account deletion to reject replayed creates.
    const result = await this.adapter.execute('UPDATE discovery_records SET record_json = NULL, revision = revision + 1, updated_at = $1, deleted_at = $2 WHERE id = $3 AND user_id = $4 AND revision = $5 AND deleted_at IS NULL', [now, now, id, ownerId, expected]);
    if (result.affectedRows !== 1) throw new DiscoveryError(409, 'Discovery changed on another device');
    return { ownerId, deletedId: id };
  }
}
