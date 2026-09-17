import pg from 'pg';
import type { IDatabaseAdapter, ExecuteResult } from './types.js';

export class PostgresDatabaseAdapter implements IDatabaseAdapter {
  private pool: pg.Pool;

  constructor(connectionString: string) {
    const isSslRequired = connectionString.includes('sslmode=require') || !connectionString.includes('localhost');
    this.pool = new pg.Pool({
      connectionString,
      ssl: isSslRequired ? { rejectUnauthorized: false } : undefined,
      max: 10,
      idleTimeoutMillis: 30000,
    });
  }

  getDriver(): 'postgres' {
    return 'postgres';
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const res = await this.pool.query(sql, params);
    return res.rows as T[];
  }

  async queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  async execute(sql: string, params: any[] = []): Promise<ExecuteResult> {
    const res = await this.pool.query(sql, params);
    return {
      affectedRows: res.rowCount || 0,
      insertId: (res.rows?.[0] as any)?.id,
    };
  }

  async transaction<T>(callback: (tx: IDatabaseAdapter) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const txAdapter: IDatabaseAdapter = {
        getDriver: () => 'postgres',
        query: async <R = any>(s: string, p: any[] = []) => {
          const r = await client.query(s, p);
          return r.rows as R[];
        },
        queryOne: async <R = any>(s: string, p: any[] = []) => {
          const r = await client.query(s, p);
          return r.rows.length > 0 ? (r.rows[0] as R) : null;
        },
        execute: async (s: string, p: any[] = []) => {
          const r = await client.query(s, p);
          return {
            affectedRows: r.rowCount || 0,
            insertId: (r.rows?.[0] as any)?.id,
          };
        },
        transaction: () => {
          throw new Error('Nested transactions not supported');
        },
        close: async () => {},
      };

      const result = await callback(txAdapter);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
