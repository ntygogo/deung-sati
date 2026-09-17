import http from 'http';
import { SqliteDatabaseAdapter } from '../db/sqliteAdapter.js';
import { setTestDatabase } from '../db/database.js';
import { runMigrations } from '../db/migrator.js';
import { apiApp } from '../apiRouter.js';
import { CompanionRepository } from '../repositories/companionRepository.js';
import { LoopRepository } from '../repositories/loopRepository.js';

async function runSecurityCrossUserTraceVerification() {
  console.log('================================================================');
  console.log('SECURITY INTEGRATION TEST: CROSS-USER AUTHORIZATION ENFORCEMENT');
  console.log('TARGET: Production API Endpoints (/loops/traces/:traceId)');
  console.log('FLOW: Authentication via Bearer Tokens, Ownership Verification');
  console.log('================================================================\n');

  let totalAssertions = 0;
  const assert = (condition: boolean, msg: string) => {
    totalAssertions++;
    if (!condition) {
      console.error(`❌ FAILED: ${msg}`);
      throw new Error(`Assertion failed: ${msg}`);
    }
    console.log(`  ✓ ${msg}`);
  };

  // 1. Initialize In-Memory Database & set as active DB
  const testDb = new SqliteDatabaseAdapter(':memory:');
  setTestDatabase(testDb);
  const appliedMigrations = await runMigrations(testDb);
  assert(appliedMigrations.includes('007_growth_events_and_skills.sql'), 'Migrations including 007 applied');

  // 2. Launch Local Test HTTP Server on random ephemeral port
  const server = http.createServer(apiApp);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;
  console.log(`-> Test server active on ${baseUrl} ✅\n`);

  try {
    const postJson = async (endpoint: string, body: any, token?: string): Promise<{ status: number; data: any }> => {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      const data: any = await res.json().catch(() => null);
      return { status: res.status, data };
    };

    const putJson = async (endpoint: string, body: any, token?: string): Promise<{ status: number; data: any }> => {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${baseUrl}${endpoint}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(body),
      });
      const data: any = await res.json().catch(() => null);
      return { status: res.status, data };
    };

    const getJson = async (endpoint: string, token?: string): Promise<{ status: number; data: any }> => {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${baseUrl}${endpoint}`, { headers });
      const data: any = await res.json().catch(() => null);
      return { status: res.status, data };
    };

    const companionRepo = new CompanionRepository(testDb);
    const loopRepo = new LoopRepository(testDb);

    // 3. Register User A and User B via Production Auth Endpoint
    console.log('[STEP 1] Registering User A and User B via /auth/register...');
    const regA = await postJson('/auth/register', {
      name: 'User Sati A',
      email: 'userA@sati.security',
      password: 'StrongPassword123!',
    });
    assert(regA.status === 200 && Boolean(regA.data.token), 'User A registered with valid session token');
    const tokenA = regA.data.token;
    const userIdA = regA.data.user.id;

    const regB = await postJson('/auth/register', {
      name: 'User Sati B',
      email: 'userB@sati.security',
      password: 'StrongPassword456!',
    });
    assert(regB.status === 200 && Boolean(regB.data.token), 'User B registered with valid session token');
    const tokenB = regB.data.token;
    const userIdB = regB.data.user.id;

    // Create Initial Companion for both users
    const defaultDna = {
      primary_pink_shade: 'soft_sakura',
      secondary_color: '#8BD3DD',
      gill_type: 'feathery_wave',
      cheek_feeler_type: 'soft_droplet',
      head_light_type: 'lantern',
      head_light_tip: 'warm_glow',
      tail_type: 'flowing_fin',
      body_pattern: 'ripples',
      movement_personality: 'calm_float',
      safe_space_theme: 'moonlit_pond',
    };
    const compA = await companionRepo.createCompanion(userIdA, 11111, defaultDna, 'น้องสติ A', 0);
    const compB = await companionRepo.createCompanion(userIdB, 22222, defaultDna, 'น้องสติ B', 0);
    assert(compA.stage === 0 && compB.stage === 0, 'Both users have initial companions at Stage 0');

    // Record baseline wallet state
    const walletABefore = await testDb.queryOne<any>('SELECT * FROM wallets WHERE user_id = $1', [userIdA]);
    const walletBBefore = await testDb.queryOne<any>('SELECT * FROM wallets WHERE user_id = $1', [userIdB]);
    assert(walletABefore.xp === 0 && walletBBefore.xp === 0, 'Initial wallet balances are 0');

    // 4. User A creates a Loop Trace via Production API
    console.log('\n[STEP 2] User A creates a Loop Trace via POST /loops/traces...');
    const createRes = await postJson(
      '/loops/traces',
      {
        category: 'loop',
        title: 'User A Private Trace',
        summary: 'Feeling overwhelmed by work deadlines',
        thoughtsOrFears: 'I might fail everyone',
        desires: 'To feel calm and capable',
        oldResponse: 'Procrastinating and doom-scrolling',
        newChoice: 'Take 3 deep breaths and write top 3 priorities',
        insights: 'Taking small steps reduces panic',
        emotionTags: ['anxiety', 'fear'],
      },
      tokenA
    );
    assert(createRes.status === 200, 'User A created trace successfully via API');
    const traceAId = createRes.data.trace.id;
    assert(Boolean(traceAId), 'Trace ID returned');

    // Verify trace in database belongs to User A
    const traceDb = await loopRepo.getTraceById(traceAId, userIdA);
    assert(Boolean(traceDb) && traceDb!.user_id === userIdA, 'Database confirms trace belongs to User A');

    // 5. User B attempts to READ User A\'s Loop Trace
    console.log('\n[STEP 3] User B attempts to READ User A trace via GET /loops/traces/:traceId...');
    const getRes = await getJson(`/loops/traces/${traceAId}`, tokenB);
    assert(getRes.status === 403 || getRes.status === 404, `Read request rejected with HTTP ${getRes.status} (403 or 404)`);
    assert(getRes.data.trace === undefined, 'No trace data leaked to User B');

    // 6. User B attempts to EDIT User A\'s Loop Trace
    console.log('\n[STEP 4] User B attempts to EDIT User A trace via PUT /loops/traces/:traceId...');
    const putRes = await putJson(
      `/loops/traces/${traceAId}`,
      {
        newChoice: 'TAMPERED BY USER B',
        insights: 'MALICIOUS INSIGHT',
      },
      tokenB
    );
    assert(putRes.status === 403 || putRes.status === 404, `Edit request rejected with HTTP ${putRes.status} (403 or 404)`);

    // Verify trace content was NOT tampered with
    const traceAfterTamperAttempt = await loopRepo.getTraceById(traceAId, userIdA);
    assert(traceAfterTamperAttempt!.new_choice === 'Take 3 deep breaths and write top 3 priorities', 'Trace new_choice untampered');
    assert(traceAfterTamperAttempt!.insights === 'Taking small steps reduces panic', 'Trace insights untampered');

    // 7. User B attempts to CONFIRM User A\'s Loop Trace
    console.log('\n[STEP 5] User B attempts to CONFIRM User A trace via POST /loops/traces/:traceId/confirm...');
    const confirmRes = await postJson(
      `/loops/traces/${traceAId}/confirm`,
      {
        conversationId: 'conv_malicious_b',
        idempotencyKey: `unauthorized_claim_${traceAId}`,
        trigger: 'User A Private Trace',
        skills: {
          emotional_awareness: 1,
          conscious_action: 1,
        },
      },
      tokenB
    );
    assert(confirmRes.status === 403 || confirmRes.status === 404, `Confirm request rejected with HTTP ${confirmRes.status} (403 or 404)`);

    // 8. Verify Strict Invariants: No Growth Event, No Rewards, No Trace Count Change, No DNA Change
    console.log('\n[STEP 6] Verifying strict state invariants for both User A and User B...');

    // a. completed_loops check
    const allCompletedLoops = await testDb.query<any>('SELECT * FROM completed_loops');
    assert(allCompletedLoops.length === 0, 'No Growth Event exists in completed_loops for either user');

    // b. Trace count check
    const countA = await loopRepo.getCompletedLoopCount(userIdA);
    const countB = await loopRepo.getCompletedLoopCount(userIdB);
    assert(countA === 0, 'User A completed loop count remains 0');
    assert(countB === 0, 'User B completed loop count remains 0');

    // c. Wallet balances check
    const walletAAfter = await testDb.queryOne<any>('SELECT * FROM wallets WHERE user_id = $1', [userIdA]);
    const walletBAfter = await testDb.queryOne<any>('SELECT * FROM wallets WHERE user_id = $1', [userIdB]);
    assert(walletAAfter.xp === 0 && walletAAfter.shells === 0, 'User A wallet XP & Shells remain 0');
    assert(walletBAfter.xp === 0 && walletBAfter.shells === 0, 'User B wallet XP & Shells remain 0');

    // d. Currency transactions check
    const allTx = await testDb.query<any>('SELECT * FROM currency_transactions');
    assert(allTx.length === 0, 'Zero currency transactions created in ledger');

    // e. Companion stage and DNA check
    const compAAfter = await companionRepo.findByUserId(userIdA);
    const compBAfter = await companionRepo.findByUserId(userIdB);
    assert(compAAfter!.stage === 0, 'User A companion remains at Stage 0');
    assert(compBAfter!.stage === 0, 'User B companion remains at Stage 0');
    assert(compAAfter!.dna?.primary_pink_shade === defaultDna.primary_pink_shade, 'User A companion DNA color unchanged');
    assert(compBAfter!.dna?.primary_pink_shade === defaultDna.primary_pink_shade, 'User B companion DNA color unchanged');

    // f. DNA Snapshot check
    const allSnapshots = await testDb.query<any>('SELECT * FROM companion_dna_snapshots');
    assert(allSnapshots.length === 0, 'Zero companion DNA snapshots created');

    console.log('\n================================================================');
    console.log(`SECURITY VERIFICATION SUCCESSFUL! (${totalAssertions}/${totalAssertions} assertions passed) 🛡️`);
    console.log('================================================================\n');
  } finally {
    if (typeof (server as any).closeAllConnections === 'function') {
      (server as any).closeAllConnections();
    }
    await new Promise<void>((res) => server.close(() => res()));
  }
}

runSecurityCrossUserTraceVerification().catch((err) => {
  console.error('Security test failed:', err);
  process.exit(1);
});
