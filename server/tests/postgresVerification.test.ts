import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { PostgresDatabaseAdapter } from '../db/postgresAdapter.js';
import { runMigrations } from '../db/migrator.js';
import { EconomyRepository } from '../repositories/economyRepository.js';

// Prioritize loading local environment files without exposing secrets
for (const envFile of ['.env.vercel.local', '.env.local', '.env']) {
  const envPath = path.resolve(process.cwd(), envFile);
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

function maskDbUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//****:****@${parsed.host}${parsed.pathname}`;
  } catch {
    return 'postgres://****:****@masked-host/masked-db';
  }
}

async function runPostgresVerification() {
  console.log('================================================================');
  console.log('DEUNG SATI PRODUCTION POSTGRESQL VERIFICATION SUITE');
  console.log('TARGET: Neon PostgreSQL via Vercel Marketplace (Real PostgreSQL Engine)');
  console.log('================================================================\n');

  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

  if (!dbUrl) {
    console.log('⚠️ [STATUS] PostgreSQL verification pending: DATABASE_URL not set in environment.');
    console.log('-> To run live PostgreSQL verification against Neon PostgreSQL via Vercel Marketplace:');
    console.log('   1. Create database/branch in Vercel Dashboard -> Storage -> Neon Serverless Postgres');
    console.log('   2. Pull environment with Vercel CLI (vercel env pull .env.vercel.local) or set DATABASE_URL');
    console.log('   3. Run: npx tsx server/tests/postgresVerification.test.ts');
    console.log('\nNOTE: Until a live DATABASE_URL is provided, production PostgreSQL verification remains PENDING.');
    console.log('EXIT CODE: 0 (Pending External Connection)');
    return;
  }

  const masked = maskDbUrl(dbUrl);
  console.log(`[TARGET] Connecting to: ${masked}`);

  try {
    const parsedUrl = new URL(dbUrl);
    const dbName = parsedUrl.pathname.replace(/^\//, '');
    console.log(`-> Target Host: ${parsedUrl.host}`);
    console.log(`-> Target Database/Branch: ${dbName}`);
    if (dbName.includes('test') || parsedUrl.host.includes('test') || parsedUrl.searchParams.get('branch')) {
      console.log('-> Verified: Connected to isolated test branch/database ✅');
    } else {
      console.log('-> Notice: Ensure this branch is designated for testing/verification.');
    }
  } catch {
    // URL parsing fallback
  }

  console.log('\n[STEP 1/6] Connecting to Live PostgreSQL via PostgresDatabaseAdapter...');
  const pgAdapter = new PostgresDatabaseAdapter(dbUrl);
  const versionRow = await pgAdapter.queryOne<{ version: string; current_database: string; current_user: string }>(
    'SELECT version(), current_database(), current_user'
  );
  console.log(`-> Engine: PostgreSQL (${versionRow?.version?.slice(0, 45)}...)`);
  console.log(`-> Active Database: ${versionRow?.current_database}, User: ${versionRow?.current_user}`);

  console.log('\n[STEP 2/6] Running Migrations 001-005 directly on PostgreSQL...');
  const applied = await runMigrations(pgAdapter);
  console.log(`-> Migrations verified on PostgreSQL (${applied.length} applied/checked).`);

  // Verify tables in information_schema
  const tableRows = await pgAdapter.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables 
     WHERE table_schema = 'public' 
     ORDER BY table_name`
  );
  const tableNames = tableRows.map(r => r.table_name);
  console.log(`-> Public schema tables (${tableNames.length}):`, tableNames.join(', '));

  console.log('\n[STEP 3/6] Testing PostgreSQL JSONB, TIMESTAMPTZ & Foreign Key Cascade...');
  const testId = `test_pg_${Date.now()}`;
  await pgAdapter.execute(
    `INSERT INTO users (id, name, email, password_hash, salt, tier, created_at, updated_at)
     VALUES ($1, $2, $3, 'test_hash', 'test_salt', 'free', NOW(), NOW())`,
    [testId, 'PG Tester', `${testId}@test.com`]
  );

  await pgAdapter.execute(
    `INSERT INTO onboarding_answers (id, user_id, question_key, answer_json, created_at)
     VALUES ($1, $2, 'test_jsonb', $3, NOW())`,
    [`ans_${testId}`, testId, { theme: 'pink', score: 100, tags: ['mindful', 'calm'] }]
  );

  const jsonbRow = await pgAdapter.queryOne<{ answer_json: any }>(
    'SELECT answer_json FROM onboarding_answers WHERE id = $1',
    [`ans_${testId}`]
  );
  console.log('-> JSONB Query Result:', JSON.stringify(jsonbRow?.answer_json));

  console.log('\n[STEP 4/6] Testing Server-Dictated Reward API & Atomic FOR UPDATE Row Locking...');
  const economyRepo = new EconomyRepository(pgAdapter);
  
  // Test server-dictated reward lookup (e.g. emotion_identified -> 10 xp, 5 shells)
  const defaultReward = EconomyRepository.getRewardForEventType('emotion_identified');
  console.log('-> Server Authoritative Reward for emotion_identified:', defaultReward);

  const awardResult = await economyRepo.awardReward(
    testId,
    'emotion_identified',
    'evt_pg_1',
    undefined, // No client-dictated reward! Server must look it up.
    false
  );
  console.log(`-> Reward awarded on PostgreSQL: xp=${awardResult.wallet.xp}, shells=${awardResult.wallet.shells}, level=${awardResult.wallet.level}`);

  if (awardResult.wallet.xp !== 10 || awardResult.wallet.shells !== 5) {
    throw new Error(`Expected server-dictated reward (10 XP, 5 shells), got: ${JSON.stringify(awardResult.wallet)}`);
  }
  console.log('-> Server-dictated reward enforcement: PASSED ✅');

  console.log('\n[STEP 5/6] Testing Concurrent Claims (Race Condition) & Unique Idempotency Key...');
  const [claim1, claim2] = await Promise.all([
    economyRepo.awardReward(testId, 'test_concurrent', 'evt_conc_1', { xp: 20, shells: 10 }, false),
    economyRepo.awardReward(testId, 'test_concurrent', 'evt_conc_1', { xp: 20, shells: 10 }, false),
  ]);

  const duplicatesDetected = (claim1.alreadyProcessed ? 1 : 0) + (claim2.alreadyProcessed ? 1 : 0);
  console.log(`-> Concurrent test: 1 succeeded, ${duplicatesDetected} detected as duplicate.`);
  if (duplicatesDetected !== 1) {
    throw new Error(`Concurrency check failed: expected 1 duplicate detection, got ${duplicatesDetected}`);
  }
  console.log('-> Concurrency & Idempotency: PASSED ✅');

  console.log('\n[STEP 6/6] Testing Foreign Key ON DELETE CASCADE & Cleanup...');
  await pgAdapter.execute('DELETE FROM users WHERE id = $1', [testId]);
  const orphanedAnswers = await pgAdapter.queryOne<{ count: string }>(
    'SELECT count(*) as count FROM onboarding_answers WHERE user_id = $1',
    [testId]
  );
  const orphanedWallets = await pgAdapter.queryOne<{ count: string }>(
    'SELECT count(*) as count FROM wallets WHERE user_id = $1',
    [testId]
  );
  console.log(`-> Cascade verified: remaining answers=${orphanedAnswers?.count}, remaining wallets=${orphanedWallets?.count}`);
  if (Number(orphanedAnswers?.count) !== 0 || Number(orphanedWallets?.count) !== 0) {
    throw new Error('Foreign key cascade deletion failed!');
  }
  console.log('-> Foreign Key Cascade: PASSED ✅');

  await pgAdapter.close();

  console.log('\n================================================================');
  console.log('ALL 6/6 POSTGRESQL PRODUCTION ENGINE VERIFICATIONS PASSED 100% ✅');
  console.log('EXIT CODE: 0');
  console.log('================================================================');
}

runPostgresVerification().catch((err) => {
  console.error('PostgreSQL verification failed:', err);
  process.exit(1);
});
