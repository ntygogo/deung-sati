import type { IDatabaseAdapter } from '../db/types.js';
import { emptyFutureJournal, sameFutureValue, validateFutureJournal, type FutureDocument } from '../../src/shared/futureSelf.js';
export const FUTURE_SELF_SCHEMA = `CREATE TABLE IF NOT EXISTS future_self_journals (
  user_id VARCHAR(80) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  journal_json TEXT NOT NULL DEFAULT '{"focus":null,"entries":[]}',
  revision INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
)`;
export class FutureSelfError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}
export class FutureSelfRepository {
  private adapter: IDatabaseAdapter;
  private ready?: Promise<void>;
  constructor(adapter: IDatabaseAdapter) { this.adapter = adapter; }
  private async ensureSchema() {
    this.ready ??= this.adapter.execute(FUTURE_SELF_SCHEMA).then(() => undefined).catch(e => { this.ready = undefined; throw e; });
    await this.ready;
  }
  async get(ownerId: string): Promise<FutureDocument> {
    await this.ensureSchema();
    const row: any = await this.adapter.queryOne('SELECT journal_json, revision FROM future_self_journals WHERE user_id = $1', [ownerId]);
    return { ownerId, revision: row?.revision ?? 0, journal: row ? validateFutureJournal(typeof row.journal_json === 'string' ? JSON.parse(row.journal_json) : row.journal_json) : emptyFutureJournal() };
  }
  async save(ownerId: string, value: any): Promise<FutureDocument> {
    if (!value || !Number.isSafeInteger(value.revision) || value.revision < 0) throw new FutureSelfError(400, 'Invalid revision');
    let journal;
    try { journal = validateFutureJournal(value.journal); } catch { throw new FutureSelfError(400, 'Invalid Future Self journal'); }
    await this.ensureSchema();
    const current = await this.get(ownerId);
    if (sameFutureValue(current.journal, journal)) return current; // Includes a retry after a lost response.
    if (current.revision !== value.revision) throw new FutureSelfError(409, 'Future Self changed on another device');
    const incoming = new Map(journal.entries.map(entry => [entry.id, entry]));
    if (current.journal.entries.some(entry => !sameFutureValue(entry, incoming.get(entry.id)))) throw new FutureSelfError(409, 'Existing reflections must be preserved');
    await this.adapter.execute('INSERT INTO future_self_journals (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING', [ownerId]);
    const updated = await this.adapter.execute('UPDATE future_self_journals SET journal_json = $1, revision = revision + 1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 AND revision = $3', [JSON.stringify(journal), ownerId, value.revision]);
    if (updated.affectedRows !== 1) throw new FutureSelfError(409, 'Future Self changed on another device');
    return { ownerId, journal, revision: value.revision + 1 };
  }
}
