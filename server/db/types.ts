export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

export interface ExecuteResult {
  affectedRows: number;
  insertId?: string | number | bigint;
}

export interface IDatabaseAdapter {
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  queryOne<T = any>(sql: string, params?: any[]): Promise<T | null>;
  execute(sql: string, params?: any[]): Promise<ExecuteResult>;
  transaction<T>(callback: (tx: IDatabaseAdapter) => Promise<T>): Promise<T>;
  close(): Promise<void>;
  getDriver(): 'postgres' | 'sqlite';
}

export interface MigrationRecord {
  version: number;
  name: string;
  applied_at: string;
}
