import type { IDatabaseAdapter } from '../db/types.js';

// Additive, idempotent schema bootstrap: same DDL as migration 008. Runs only on
// authenticated archive requests; never alters traces or reward ledgers.
export const CONVERSATION_SCHEMA = `CREATE TABLE IF NOT EXISTS chat_conversations (
  id VARCHAR(160) PRIMARY KEY,
  user_id VARCHAR(80) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_trace_id VARCHAR(160),
  draft_trace_id VARCHAR(160),
  messages_json TEXT NOT NULL DEFAULT '[]',
  revision INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ
)`;
export class ConversationError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}
const fail = (status: number, message: string): never => { throw new ConversationError(status, message); };
export class ConversationRepository {
  private adapter: IDatabaseAdapter;
  private ready?: Promise<void>;
  constructor(adapter: IDatabaseAdapter) { this.adapter = adapter; }
  async ensureSchema() {
    this.ready ??= this.adapter.execute(CONVERSATION_SCHEMA).then(() => undefined).catch(e => { this.ready = undefined; throw e; });
    await this.ready;
  }
  private decode(row: any) {
    if (!row || row.deleted_at) return null;
    return { id: row.id, parentTraceId: row.parent_trace_id || undefined, draftTraceId: row.draft_trace_id || undefined,
      revision: row.revision, updatedAt: row.updated_at,
      messages: typeof row.messages_json === 'string' ? JSON.parse(row.messages_json) : row.messages_json };
  }
  async list(userId: string, traceId?: string) {
    await this.ensureSchema();
    if (traceId) {
      const trace: any = await this.adapter.queryOne('SELECT source_session_id FROM loop_traces WHERE id = $1 AND user_id = $2', [traceId, userId]);
      if (!trace) fail(404, 'Trace not found');
      return this.adapter.query('SELECT id, parent_trace_id, draft_trace_id, updated_at FROM chat_conversations WHERE user_id = $1 AND deleted_at IS NULL AND (id = $2 OR parent_trace_id = $3 OR draft_trace_id = $4) ORDER BY updated_at ASC', [userId, trace.source_session_id || '', traceId, traceId]);
    }
    return this.adapter.query('SELECT id, parent_trace_id, draft_trace_id, updated_at FROM chat_conversations WHERE user_id = $1 AND deleted_at IS NULL ORDER BY updated_at DESC LIMIT 100', [userId]);
  }
  async get(userId: string, id: string) {
    await this.ensureSchema();
    return this.decode(await this.adapter.queryOne('SELECT * FROM chat_conversations WHERE id = $1 AND user_id = $2', [id, userId]));
  }
  async save(userId: string, id: string, data: any) {
    if (!/^[a-zA-Z0-9_-]{1,160}$/.test(id)) fail(400, 'Invalid conversation ID');
    const messages = data.messages;
    if (!Array.isArray(messages) || messages.length > 1000 || JSON.stringify(messages).length > 500000) fail(400, 'Conversation too large');
    const ids = new Set<string>();
    for (const m of messages) {
      if (!m || typeof m.id !== 'string' || !m.id || ids.has(m.id) || !['ai', 'user'].includes(m.role) || typeof m.text !== 'string' || m.text.length > 30000 || m.isStreaming) fail(400, 'Invalid or duplicate message');
      ids.add(m.id);
    }
    if (!Number.isSafeInteger(data.revision) || data.revision < 0) fail(400, 'Invalid revision');
    await this.ensureSchema();
    for (const traceId of [data.parentTraceId, data.draftTraceId].filter(Boolean)) {
      if (typeof traceId !== 'string' || !await this.adapter.queryOne('SELECT id FROM loop_traces WHERE id = $1 AND user_id = $2', [traceId, userId])) fail(404, 'Trace not found');
    }
    const content = JSON.stringify(messages);
    const parent = data.parentTraceId || null;
    const draft = data.draftTraceId || null;
    await this.adapter.execute(`INSERT INTO chat_conversations (id, user_id, parent_trace_id, draft_trace_id, messages_json, revision) VALUES ($1, $2, $3, $4, $5, 0) ON CONFLICT (id) DO NOTHING`, [id, userId, parent, draft, '[]']);
    const row: any = await this.adapter.queryOne('SELECT * FROM chat_conversations WHERE id = $1 AND user_id = $2', [id, userId]);
    if (!row) fail(404, 'Conversation not found');
    if (row.deleted_at) fail(410, 'Conversation deleted');
    if (row.parent_trace_id !== parent || row.draft_trace_id !== draft) fail(409, 'Conversation link cannot change');
    const existing = typeof row.messages_json === 'string' ? row.messages_json : JSON.stringify(row.messages_json);
    if (existing === content) return this.decode(row); // Retry after a lost response.
    if (row.revision !== data.revision) fail(409, 'Conversation changed on another device; reopen before continuing');
    // The original transcript attached to a confirmed trace remains a snapshot.
    const confirmed: any = await this.adapter.queryOne('SELECT id FROM loop_traces WHERE source_session_id = $1 AND user_id = $2 AND xp_awarded = $3', [id, userId, true]);
    if (confirmed) fail(409, 'Open a continuation to keep talking about this saved loop');
    const result = await this.adapter.execute(`UPDATE chat_conversations SET messages_json = $1, revision = revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3 AND revision = $4 AND deleted_at IS NULL`, [content, id, userId, data.revision]);
    if (result.affectedRows !== 1) fail(409, 'Conversation changed; reopen before continuing');
    return this.get(userId, id);
  }
  async assertCanCreateTrace(userId: string, id?: string) {
    if (!id) return;
    await this.ensureSchema();
    const row: any = await this.adapter.queryOne('SELECT user_id, parent_trace_id, deleted_at FROM chat_conversations WHERE id = $1', [id]);
    if (!row) return; // Manual and legacy traces have no transcript.
    if (row.user_id !== userId) fail(404, 'Conversation not found');
    if (row.deleted_at) fail(410, 'Conversation deleted');
    if (row.parent_trace_id) fail(409, 'A continuation does not create a new loop or reward');
  }
  async remove(userId: string, id: string) {
    await this.ensureSchema();
    // Tombstone prevents an old tab or an offline retry from recreating deleted text.
    await this.adapter.execute(`UPDATE chat_conversations SET messages_json = $1, deleted_at = CURRENT_TIMESTAMP, revision = revision + 1 WHERE id = $2 AND user_id = $3`, ['[]', id, userId]);
  }
}
