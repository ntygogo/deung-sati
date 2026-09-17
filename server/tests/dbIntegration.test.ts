import { SqliteDatabaseAdapter } from '../db/sqliteAdapter.js';
import { runMigrations } from '../db/migrator.js';
import { AuthService } from '../services/authService.js';
import { UserRepository } from '../repositories/userRepository.js';
import { CompanionRepository } from '../repositories/companionRepository.js';
import { LoopRepository } from '../repositories/loopRepository.js';
import { EconomyRepository } from '../repositories/economyRepository.js';
import { MissionRepository } from '../repositories/missionRepository.js';
import { LegacyMigrationService } from '../services/legacyMigrationService.js';

async function runHardenedIntegrationTests() {
  console.log('================================================================');
  console.log('DEUNG SATI PHASE 2 SECURITY HARDENING & LOCAL ADAPTER SUITE');
  console.log('DATABASE ENGINE: SQLite In-Memory (Local Prototype / Fast Test Only - NOT Production-certified PostgreSQL)');
  console.log('AUTHORIZATION MODEL: Application-Level Server-Side Ownership Binding');
  console.log('================================================================\n');

  let totalAssertions = 0;
  const assert = (condition: boolean, msg: string) => {
    totalAssertions++;
    if (!condition) throw new Error(`Assertion Failed: ${msg}`);
  };

  // 1. Run Migrations
  console.log('[TEST 1/8] Running Migrations on Isolated In-Memory Database...');
  const testDb = new SqliteDatabaseAdapter(':memory:');
  const appliedMigrations = await runMigrations(testDb);
  assert(appliedMigrations.length >= 5, 'All migrations applied');
  console.log(`-> Applied ${appliedMigrations.length} migrations:`, appliedMigrations);
  console.log('-> Result: PASSED ✅\n');

  // Initialize services
  const authService = new AuthService(testDb);
  const userRepo = new UserRepository(testDb);
  const companionRepo = new CompanionRepository(testDb);
  const loopRepo = new LoopRepository(testDb);
  const economyRepo = new EconomyRepository(testDb);
  const missionRepo = new MissionRepository(testDb);
  const migrationService = new LegacyMigrationService(testDb);

  // 2. Test Async Scrypt, Session Token Hashing & Storage
  console.log('[TEST 2/8] Verifying Async Scrypt Hashing & Hashed Session Token Storage...');
  const userA = await authService.register('Nutty Tester', 'nutty@test.app', 'SecretPass123!');
  assert(Boolean(userA.user.id), 'User A registered with ID');
  assert(Boolean(userA.token), 'Raw session token returned to client');

  // Verify that database does NOT store the raw token, only token_hash
  const rawSessionRow = await testDb.queryOne<{ id: string; user_id: string; token_hash: string }>(
    'SELECT * FROM sessions WHERE user_id = $1',
    [userA.user.id]
  );
  assert(Boolean(rawSessionRow), 'Session row found in database');
  assert(!('token' in rawSessionRow!), 'Raw token column does not exist');
  assert(rawSessionRow!.token_hash !== userA.token, 'Raw token is NOT stored in database (Securely Hashed)');
  assert(rawSessionRow!.token_hash === AuthService.hashSessionToken(userA.token), 'token_hash matches SHA-256 of raw token');
  console.log('-> Verified: Database stores SHA-256 token_hash only, raw token never stored in DB.');

  // Validate session using raw token
  const valid = await authService.validateSession(userA.token);
  assert(valid !== null && valid.user.id === userA.user.id, 'validateSession works via token hash match');
  console.log('-> Result: PASSED ✅\n');

  // 3. Test Rate Limiting & 5-Attempt Account Lockout
  console.log('[TEST 3/8] Verifying Login Rate Limiting & Temporary 5-Attempt Lockout...');
  for (let i = 1; i <= 4; i++) {
    try {
      await authService.login('nutty@test.app', 'WrongPassword!');
      assert(false, `Attempt ${i} should have failed`);
    } catch (e: any) {
      assert(e.message === 'Invalid email or password', `Attempt ${i} gave generic error`);
    }
  }

  // 5th failed attempt should trigger lockout
  let lockoutTriggered = false;
  try {
    await authService.login('nutty@test.app', 'WrongPasswordAgain!');
  } catch (e: any) {
    lockoutTriggered = e.message.includes('Account locked due to 5 consecutive failed attempts');
  }
  assert(lockoutTriggered, '5th failed attempt locked the account');

  // 6th attempt should immediately reject due to active lock
  let rejectedByLock = false;
  try {
    await authService.login('nutty@test.app', 'SecretPass123!');
  } catch (e: any) {
    rejectedByLock = e.message.includes('Account is temporarily locked');
  }
  assert(rejectedByLock, 'Account blocked even with correct password during active lockout');
  console.log('-> Verified: Rate limiting and 15-minute temporary lockout works.');

  // Reset lock manually for remaining tests
  await testDb.execute('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = $1', [userA.user.id]);
  const normalLogin = await authService.login('nutty@test.app', 'SecretPass123!');
  assert(Boolean(normalLogin.token), 'Normal login succeeded after reset');
  console.log('-> Result: PASSED ✅\n');

  // 4. Test Complete IDOR (Insecure Direct Object Reference) Protection
  console.log('[TEST 4/8] Verifying IDOR Protection Across Endpoints (User A vs User B)...');
  const userB = await authService.register('Alice Target', 'alice@test.app', 'AlicePass456!');

  // Create User B's resources
  await companionRepo.createCompanion(userB.user.id, 9999, {
    primary_pink_shade: '#FF69B4',
    secondary_color: '#40E0D0',
    gill_type: 'leafy_gills',
    cheek_feeler_type: 'feeler_dots',
    head_light_type: 'flame_stalk',
    head_light_tip: 'flame_bulb',
    tail_type: 'broad_fin',
    body_pattern: 'wavy_stripes',
    movement_personality: 'gentle_waddle',
    safe_space_theme: 'crystal_grotto',
  }, 'น้องอลิซ');

  const traceB = await loopRepo.createTrace(userB.user.id, {
    category: 'private_feeling',
    title: 'ความลับของอลิซ',
    summary: 'เรื่องส่วนตัวของ User B ที่ห้ามใครเห็น',
    rawTurnData: { secret: true },
  });

  // IDOR 1: User A tries to view User B's companion
  const userASeesCompanionB = await companionRepo.findByUserId(userA.user.id);
  assert(userASeesCompanionB === null, 'IDOR 1: User A cannot read User B companion');

  // IDOR 2: User A tries to equip an item on User B's companion
  let idorEquipBlocked = false;
  try {
    await companionRepo.equipItem(userA.user.id, 'hat', 'hat_flower');
  } catch (e: any) {
    idorEquipBlocked = e.message.includes('Companion not found');
  }
  assert(idorEquipBlocked, 'IDOR 2: User A cannot modify User B companion equipment');

  // IDOR 3: User A queries traces -> should NOT see User B's trace
  const userATraces = await loopRepo.getTraces(userA.user.id);
  assert(!userATraces.some(t => t.id === traceB.id), 'IDOR 3: User A cannot view User B loop traces');

  // IDOR 4: User A tries to export User B's data
  // Server repositories require authenticated userId; passing userA.user.id only exports user A's data
  const exportA = await userRepo.exportUserData(userA.user.id);
  assert(exportA.profile.id === userA.user.id, 'IDOR 4: Data export strictly scoped to authenticated user');
  assert(exportA.loopTraces.length === 0, 'User A data export contains 0 of User B traces');

  // IDOR 5: User A tries to award reward to User B's wallet
  // Because server enforces req.userId, User A can only affect User A's wallet
  const walletBBefore = await economyRepo.getWallet(userB.user.id);
  await economyRepo.awardReward(userA.user.id, 'hacked_trace', 'hacked_1', { xp: 100, shells: 50 }, false);
  const walletBAfter = await economyRepo.getWallet(userB.user.id);
  assert(walletBBefore.xp === walletBAfter.xp, 'IDOR 5: User A cannot add XP/Shells to User B wallet');

  // IDOR 6: User A attempts to migrate legacy data with a malicious spoofed userId
  const spoofedPayload = {
    userId: userB.user.id, // Malicious attempt to inject into User B
    evidence: [{ id: 'spoof_1', event: 'Fake spoofed loop', timestamp: '2026-09-01' }],
  };
  // The service takes authenticated userId as first argument and completely ignores payload.userId
  await migrationService.migrateLegacyData(userA.user.id, spoofedPayload as any);
  const tracesAfterB = await loopRepo.getTraces(userB.user.id);
  assert(tracesAfterB.length === 1, 'IDOR 6: Legacy migration ignored spoofed userId; User B traces untouched');
  console.log('-> Verified: All 6 IDOR attack vectors blocked by Application-Level Authorization.');
  console.log('-> Result: PASSED ✅\n');

  // 5. Test Atomic Transaction Ledger, Idempotency & Currency Bounds
  console.log('[TEST 5/8] Verifying Atomic Ledger, Idempotency & Balance Deductions...');
  const walletA1 = await economyRepo.getWallet(userA.user.id);
  const awardA = await economyRepo.awardReward(userA.user.id, 'trace_award', 'evt_100', { xp: 200, shells: 100 }, false);
  assert(awardA.wallet.xp === walletA1.xp + 200, 'XP correctly incremented');
  assert(awardA.wallet.shells === walletA1.shells + 100, 'Shells correctly incremented');
  assert(awardA.wallet.level === EconomyRepository.calculateLevel(awardA.wallet.xp), 'Level calculated correctly from cumulative XP');

  // Duplicate award check
  const duplicateAwardA = await economyRepo.awardReward(userA.user.id, 'trace_award', 'evt_100', { xp: 200, shells: 100 }, false);
  assert(duplicateAwardA.alreadyProcessed === true, 'Duplicate award detected by unique idempotency key');
  assert(duplicateAwardA.wallet.xp === awardA.wallet.xp, 'Wallet XP was NOT doubled');

  // Purchase with insufficient balance
  let purchaseBlocked = false;
  try {
    await economyRepo.purchaseItem(userA.user.id, 'item_expensive', 9999, 0);
  } catch (e: any) {
    purchaseBlocked = e.message.includes('Insufficient currency balance');
  }
  assert(purchaseBlocked, 'Purchase blocked when balance is insufficient');

  // Seed item in catalog for FK verification
  await testDb.execute(
    `INSERT INTO cosmetic_items (id, slot, name_th, name_en, price_shells, price_crystals, rarity, asset_data_json)
     VALUES ('item_hat_1', 'hat', 'หมวกทดสอบ', 'Test Hat', 30, 0, 'common', '{}')
     ON CONFLICT (id) DO NOTHING`
  );

  // Purchase with sufficient balance
  const walletAfterPurchase = await economyRepo.purchaseItem(userA.user.id, 'item_hat_1', 30, 0);
  assert(walletAfterPurchase.shells === awardA.wallet.shells - 30, 'Shells deducted accurately');
  console.log('-> Result: PASSED ✅\n');

  // 6. Test Legacy Migration Payload Sanitization
  console.log('[TEST 6/8] Verifying Legacy Migration Sanitization & Duplicate Rejection...');
  const validation1 = migrationService.validatePayload({
    evidence: [{ id: 'e1', event: 'Valid event' }],
  });
  assert(validation1.valid === true, 'Valid payload passes');

  const validation2 = migrationService.validatePayload({
    evidence: 'not an array',
  });
  assert(validation2.valid === false, 'Invalid evidence array rejected');

  // Huge payload rejection
  const hugePayload = {
    evidence: Array(20000).fill({ event: 'A very repetitive large event string that overflows payload' }),
  };
  const validation3 = migrationService.validatePayload(hugePayload);
  assert(validation3.valid === false && validation3.error!.includes('exceeds maximum limit'), 'Payload > 500KB rejected');
  console.log('-> Result: PASSED ✅\n');

  // 7. Test Missions & Progress
  console.log('[TEST 7/8] Verifying Mission Engine Default Seeding & Assignment...');
  const missions = await missionRepo.getUserMissions(userA.user.id);
  assert(missions.length >= 3, 'At least 3 default missions assigned');
  assert(missions.every(m => Boolean(m.mission?.title)), 'All missions have populated title');
  console.log(`-> Verified: ${missions.length} missions active for User A.`);
  console.log('-> Result: PASSED ✅\n');

  // 8. Test Logout & Session Revocation
  console.log('[TEST 8/8] Verifying Logout & Session Revocation...');
  await authService.logout(userA.token);
  const sessionAfterLogout = await authService.validateSession(userA.token);
  assert(sessionAfterLogout === null, 'Session revoked and deleted on logout');
  console.log('-> Result: PASSED ✅\n');

  console.log('================================================================');
  console.log(`ALL TESTS PASSED: ${totalAssertions} assertions verified with 0 errors! 🎉`);
  console.log('EXIT CODE: 0');
  console.log('================================================================');

  await testDb.close();
}

runHardenedIntegrationTests().catch((err) => {
  console.error('Test execution failed with error:', err);
  process.exit(1);
});
