import { db } from '../db/database.js';
let ready: Promise<void> | undefined;
export function ensureNotebookSchema() {
  ready ??= (async()=>{
    await db.execute(`CREATE TABLE IF NOT EXISTS notebook_entries (
      id VARCHAR(80) PRIMARY KEY, user_id VARCHAR(80) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind VARCHAR(20) NOT NULL, text TEXT NOT NULL, created_at TEXT NOT NULL
    )`);
    await db.execute(`CREATE TABLE IF NOT EXISTS line_notebook_sources (
      entry_id VARCHAR(80) PRIMARY KEY REFERENCES notebook_entries(id) ON DELETE CASCADE,
      fields_json TEXT NOT NULL, confirmed_at TEXT NOT NULL
    )`);
  })().catch(e=>{ready=undefined;throw e;});
  return ready;
}
