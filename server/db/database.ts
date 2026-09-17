import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import type { IDatabaseAdapter } from './types.js';
import { PostgresDatabaseAdapter } from './postgresAdapter.js';
import { SqliteDatabaseAdapter } from './sqliteAdapter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let globalAdapter: IDatabaseAdapter | null = null;

// Automatically load local env files without exposing secrets
for (const envFile of ['.env.vercel.local', '.env.local', '.env']) {
  const envPath = path.resolve(process.cwd(), envFile);
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

export function getDatabase(): IDatabaseAdapter {
  if (globalAdapter) return globalAdapter;

  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  const forceSqlite = process.env.DB_DRIVER === 'sqlite' || (!dbUrl && process.env.NODE_ENV !== 'production');

  if (dbUrl && !forceSqlite) {
    globalAdapter = new PostgresDatabaseAdapter(dbUrl);
  } else {
    const isTest = process.env.NODE_ENV === 'test';
    const dbPath = isTest ? ':memory:' : path.resolve(__dirname, '../../server/data/dev.db');
    globalAdapter = new SqliteDatabaseAdapter(dbPath);
  }

  return globalAdapter;
}

export function setTestDatabase(adapter: IDatabaseAdapter): void {
  globalAdapter = adapter;
}

export const db: IDatabaseAdapter = new Proxy({} as IDatabaseAdapter, {
  get(_target, prop) {
    const actual = getDatabase();
    const value = (actual as any)[prop];
    return typeof value === 'function' ? value.bind(actual) : value;
  },
});
