import type { IDatabaseAdapter } from '../db/types.js';
import { validateNotebookEntry } from '../../src/shared/notebook.js';
export const NOTEBOOK_SCHEMA = `CREATE TABLE IF NOT EXISTS gratitude_notebook_entries (
 user_id VARCHAR(80) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 entry_id VARCHAR(80) NOT NULL,
 entry_json TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY (user_id, entry_id)
)`;
export class NotebookRepository {
  private ready?: Promise<void>;
  constructor(private adapter: IDatabaseAdapter) {}
  private async ensureSchema() {
    this.ready ??= this.adapter.execute(NOTEBOOK_SCHEMA).then(() => undefined).catch(error => { this.ready = undefined; throw error; });
    await this.ready;
  }
  async list(owner: string) {
    await this.ensureSchema();
    const rows = await this.adapter.query<{ entry_json: string }>('SELECT entry_json FROM gratitude_notebook_entries WHERE user_id = $1 ORDER BY created_at DESC, entry_id DESC', [owner]);
    return rows.map(row => validateNotebookEntry(JSON.parse(row.entry_json)));
  }
  async add(owner: string, input: unknown) {
    const entry = validateNotebookEntry(input);
    await this.ensureSchema();
    // Immutable rows avoid lost updates between devices; retries use the same ID.
    await this.adapter.execute('INSERT INTO gratitude_notebook_entries (user_id, entry_id, entry_json) VALUES ($1, $2, $3) ON CONFLICT (user_id, entry_id) DO NOTHING', [owner, entry.id, JSON.stringify(entry)]);
    const row = await this.adapter.queryOne<{ entry_json: string }>('SELECT entry_json FROM gratitude_notebook_entries WHERE user_id = $1 AND entry_id = $2', [owner, entry.id]);
    return validateNotebookEntry(JSON.parse(row!.entry_json));
  }
}
