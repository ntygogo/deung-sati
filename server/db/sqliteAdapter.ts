import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import type { IDatabaseAdapter, ExecuteResult } from './types.js';

export class SqliteDatabaseAdapter implements IDatabaseAdapter {
  private db: DatabaseSync;
  private transactionTail: Promise<void> = Promise.resolve();

  constructor(dbPath: string = ':memory:') {
    if (dbPath !== ':memory:') {
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
    this.db = new DatabaseSync(dbPath);
    // Enable WAL mode and foreign keys for SQLite
    try {
      this.db.exec('PRAGMA foreign_keys = ON;');
      if (dbPath !== ':memory:') {
        this.db.exec('PRAGMA journal_mode = WAL;');
      }
    } catch {
      // Ignored if in-memory
    }
  }

  getDriver(): 'sqlite' {
    return 'sqlite';
  }

  /**
   * Normalizes PostgreSQL $1, $2 query parameters to SQLite ? syntax
   * and normalizes Postgres-specific syntax (such as TIMESTAMPTZ, NOW())
   */
  private normalizeSql(sql: string): string {
    return sql
      .replace(/\$(\d+)/g, '?')
      .replace(/TIMESTAMPTZ/gi, 'TEXT')
      .replace(/JSONB/gi, 'TEXT')
      .replace(/BIGINT/gi, 'INTEGER')
      .replace(/DEFAULT\s+NOW\(\)/gi, 'DEFAULT CURRENT_TIMESTAMP')
      .replace(/NOW\(\)/gi, "datetime('now')")
      .replace(/FOR UPDATE/gi, ''); // SQLite locks whole db during transactions
  }

  /**
   * Normalizes parameters (e.g. object -> JSON string, boolean -> integer)
   */
  private normalizeParams(params: any[]): any[] {
    return params.map((p) => {
      if (p === null || p === undefined) return null;
      if (typeof p === 'boolean') return p ? 1 : 0;
      if (typeof p === 'object' && !(p instanceof Date)) {
        return JSON.stringify(p);
      }
      if (p instanceof Date) {
        return p.toISOString();
      }
      return p;
    });
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const normalizedSql = this.normalizeSql(sql);
    const normalizedParams = this.normalizeParams(params);
    const stmt = this.db.prepare(normalizedSql);
    const rows = stmt.all(...normalizedParams) as any[];
    return rows.map((r) => this.parseRow(r)) as T[];
  }

  async queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  async execute(sql: string, params: any[] = []): Promise<ExecuteResult> {
    const normalizedSql = this.normalizeSql(sql);
    if (params.length === 0) {
      this.db.exec(normalizedSql);
      return { affectedRows: 0 };
    }
    const normalizedParams = this.normalizeParams(params);
    const stmt = this.db.prepare(normalizedSql);
    const result = stmt.run(...normalizedParams);
    return {
      affectedRows: Number(result.changes),
      insertId: result.lastInsertRowid,
    };
  }

  async transaction<T>(callback: (tx: IDatabaseAdapter) => Promise<T>): Promise<T> {
    const previous=this.transactionTail;
    let release!:()=>void;
    this.transactionTail=new Promise<void>(resolve=>{release=resolve;});
    await previous;
    try {
      this.db.exec('BEGIN IMMEDIATE;');
    } catch(error){release();throw error;}
    try {
      const txAdapter: IDatabaseAdapter = {
        getDriver: () => 'sqlite',
        query: (s: string, p: any[] = []) => this.query(s, p),
        queryOne: (s: string, p: any[] = []) => this.queryOne(s, p),
        execute: (s: string, p: any[] = []) => this.execute(s, p),
        transaction: () => {
          throw new Error('Nested transactions not supported');
        },
        close: async () => {},
      };

      const result = await callback(txAdapter);
      this.db.exec('COMMIT;');
      return result;
    } catch (err) {
      try {
        this.db.exec('ROLLBACK;');
      } catch {
        // Rollback might fail if already aborted
      }
      throw err;
    } finally {
      release();
    }
  }

  private parseRow(row: any): any {
    if (!row) return row;
    const parsed: any = {};
    for (const [k, v] of Object.entries(row)) {
      if (typeof v === 'string' && (k.endsWith('_json') || k.endsWith('_data') || k === 'traits')) {
        try {
          parsed[k] = JSON.parse(v);
          continue;
        } catch {
          // Keep raw string if not JSON
        }
      }
      parsed[k] = v;
    }
    return parsed;
  }

  async close(): Promise<void> {
    this.db.close();
  }
}
