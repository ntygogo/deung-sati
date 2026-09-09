import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { IDatabaseAdapter } from './types.js';
import { db } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations(adapter: IDatabaseAdapter = db): Promise<string[]> {
  const migrationsDir = path.resolve(__dirname, 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`Migrations directory not found at: ${migrationsDir}`);
  }

  // Ensure schema_migrations table exists
  await adapter.execute(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const appliedRows = await adapter.query<{ version: number }>('SELECT version FROM schema_migrations ORDER BY version ASC');
  const appliedVersions = new Set(appliedRows.map((r) => r.version));

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const newlyApplied: string[] = [];

  for (const file of files) {
    const match = file.match(/^(\d+)_/);
    if (!match) continue;
    const version = parseInt(match[1], 10);

    if (!appliedVersions.has(version)) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      console.log(`[MIGRATOR] Applying migration ${file}...`);

      await adapter.transaction(async (tx) => {
        // Strip single line comments and split on semicolons
        const cleanedSql = sql.replace(/--.*$/gm, '');
        const statements = cleanedSql
          .split(';')
          .map((s) => s.trim())
          .filter((s) => s.length > 0);

        for (const statement of statements) {
          await tx.execute(statement);
        }

        await tx.execute(
          `INSERT INTO schema_migrations (version, name, applied_at) VALUES ($1, $2, CURRENT_TIMESTAMP)`,
          [version, file]
        );
      });

      newlyApplied.push(file);
      console.log(`[MIGRATOR] Migration ${file} applied successfully.`);
    }
  }

  return newlyApplied;
}
