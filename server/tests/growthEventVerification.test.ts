import { SqliteDatabaseAdapter } from '../db/sqliteAdapter.js';
import type { IDatabaseAdapter } from '../db/types.js';
import { runMigrations } from '../db/migrator.js';
import { AuthService } from '../services/authService.js';
import { CompanionRepository } from '../repositories/companionRepository.js';
import { LoopRepository } from '../repositories/loopRepository.js';

async function runGrowthEventVerificationTests() {
  console.log('================================================================');
  console.log('DEUNG SATI GROWTH EVENT, LOOP TRACE & SKILL AXES VERIFICATION');
  console.log('DATABASE ENGINE: SQLite In-Memory Isolation Test');
  console.log('TARGET: 10 Comprehensive Founder Verification Criteria');
  console.log('================================================================\n');

  let totalAssertions = 0;
  const assert = (condition: boolean, msg: string) => {
    totalAssertions++;
    if (!condition) {
      console.error(`❌ FAILED: ${msg}`);
      throw new Error(`Assertion Failed: ${msg}`);
    }
    console.log(`  ✓ ${msg}`);
  };

  // Setup In-Memory Database with all migrations including 007
  const testDb = new SqliteDatabaseAdapter(':memory:');
  const appliedMigrations = await runMigrations(testDb);
  assert(appliedMigrations.includes('007_growth_events_and_skills.sql'), 'Migration 007 applied successfully');

  // Repositories
  const authService = new AuthService(testDb);
  const companionRepo = new CompanionRepository(testDb);
  const loopRepo = new LoopRepository(testDb);

  // Register Test User
  const userRes = await authService.register('Mindful Tester', 'mindful@test.app', 'Password123!');
  const userId = userRes.user.id;

  // Setup Initial Companion Egg via Onboarding (aligned with product flow)
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
  const companion = await companionRepo.createCompanion(userId, 10001, defaultDna, 'น้องสติ', 0);
  assert(Boolean(companion), 'Companion egg created for user');
  const initialTraceCount = await loopRepo.getCompletedLoopCount(userId);
  assert(initialTraceCount === 0, 'Initial trace count is 0');

  // -------------------------------------------------------------
  // CRITERION 1: Loop Trace Schema (8 Distinct Sections)
  // -------------------------------------------------------------
  console.log('\n[CRITERION 1/10] Verifying Loop Trace Schema (8 distinct sections)...');
  const trace1Id = 'trace_user1_test1';
  await loopRepo.createTrace({
    id: trace1Id,
    userId,
    conversationId: 'conv_123',
    trigger: 'ข้อความถูกอ่านแล้วไม่ตอบ 3 ชั่วโมง',
    emotionOrBody: 'ใจสั่น แน่นหน้าอก กลัวถูกปฏิเสธ',
    automaticStory: 'เขาคงไม่อยากคุยกับเราแล้วแน่ๆ',
    desires: 'อยากได้รับความสนใจและความรู้สึกปลอดภัย',
    facts: 'รู้แค่ว่ายังไม่มีข้อความตอบกลับ เหตุผลจริงยังไม่ทราบ',
    oldResponse: 'ส่งข้อความย้ำรัวๆ 5 ข้อความด้วยความหงุดหงิด',
    newChoice: 'วางโทรศัพท์ 30 นาที ไปล้างหน้า ดื่มน้ำ และฟังเสียงระฆังทิเบต',
    insights: 'ความเงียบของผู้อื่นไม่ได้แปลว่าเราหมดความหมาย',
    emotionTags: ['anxiety', 'fear'],
  });

  const trace1 = await loopRepo.getTraceById(trace1Id, userId);
  assert(Boolean(trace1), 'Loop Trace created and retrieved successfully');
  assert(trace1!.trigger === 'ข้อความถูกอ่านแล้วไม่ตอบ 3 ชั่วโมง', 'Section 1 (Trigger) matches');
  assert(trace1!.emotion_or_body === 'ใจสั่น แน่นหน้าอก กลัวถูกปฏิเสธ', 'Section 2 (Emotion/Body) matches');
  assert(trace1!.automatic_story === 'เขาคงไม่อยากคุยกับเราแล้วแน่ๆ', 'Section 3 (Automatic Story) matches');
  assert(trace1!.desires === 'อยากได้รับความสนใจและความรู้สึกปลอดภัย', 'Section 4 (Desires) matches');
  assert(trace1!.facts === 'รู้แค่ว่ายังไม่มีข้อความตอบกลับ เหตุผลจริงยังไม่ทราบ', 'Section 5 (Facts) matches');
  assert(trace1!.old_response === 'ส่งข้อความย้ำรัวๆ 5 ข้อความด้วยความหงุดหงิด', 'Section 6 (Old Response) matches');
  assert(trace1!.new_choice === 'วางโทรศัพท์ 30 นาที ไปล้างหน้า ดื่มน้ำ และฟังเสียงระฆังทิเบต', 'Section 7 (New Choice) matches');
  assert(trace1!.insights === 'ความเงียบของผู้อื่นไม่ได้แปลว่าเราหมดความหมาย', 'Section 8 (Insights) matches');
  assert(Boolean(trace1!.emotion_tags && trace1!.emotion_tags.includes('anxiety')), 'Emotion tags stored');

  // -------------------------------------------------------------
  // CRITERION 2: Editable Trace (Updates text without duplicating Growth Event)
  // -------------------------------------------------------------
  console.log('\n[CRITERION 2/10] Verifying Editable Trace (updates text, preserves growth event isolation)...');
  await new Promise((r) => setTimeout(r, 10)); // tiny sleep to ensure timestamp differs
  const updatedTrace = await loopRepo.updateTrace(trace1Id, userId, {
    newChoice: 'เดินออกไปสูดอากาศบริสุทธิ์ 15 นาที และยอมรับความไม่แน่นอน',
    insights: 'การให้พื้นที่ตัวเองช่วยลดความตระหนก',
  });
  assert(Boolean(updatedTrace), 'Updated trace exists');
  assert(updatedTrace!.new_choice === 'เดินออกไปสูดอากาศบริสุทธิ์ 15 นาที และยอมรับความไม่แน่นอน', 'Trace text updated');
  assert(updatedTrace!.insights === 'การให้พื้นที่ตัวเองช่วยลดความตระหนก', 'Trace insight updated');
  assert(new Date(updatedTrace!.updated_at || 0).getTime() >= new Date(trace1!.updated_at || 0).getTime(), 'updated_at bumped');

  // Verify that NO completed_loops row or transaction exists yet
  const prematureLoops = await testDb.query<any>('SELECT * FROM completed_loops WHERE loop_trace_id = $1', [trace1Id]);
  assert(prematureLoops.length === 0, 'No Growth Event created merely from trace editing');
  const prematureTx = await testDb.query<any>('SELECT * FROM currency_transactions WHERE user_id = $1', [userId]);
  assert(prematureTx.length === 0, 'No rewards granted merely from trace editing');

  // -------------------------------------------------------------
  // CRITERION 3: Immutable Growth Event (Single confirmation per Loop Trace)
  // -------------------------------------------------------------
  console.log('\n[CRITERION 3/10] Verifying Immutable Growth Event creation...');
  const confirmRes = await loopRepo.confirmGrowthEvent(userId, trace1Id, {
    trigger: updatedTrace!.trigger,
    emotionOrBody: updatedTrace!.emotion_or_body,
    automaticStory: updatedTrace!.automatic_story,
    desires: updatedTrace!.desires,
    facts: updatedTrace!.facts,
    oldResponse: updatedTrace!.old_response,
    newChoice: updatedTrace!.new_choice,
    insights: updatedTrace!.insights,
    emotionTags: updatedTrace!.emotion_tags,
    skills: {
      emotional_awareness: 1,
      somatic_awareness: 1,
      cognitive_clarity: 1,
      conscious_action: 0,
    },
  });

  assert(confirmRes.success === true, 'confirmGrowthEvent succeeded');
  assert(confirmRes.progressCount === 1, 'Progress count updated to 1');
  assert(confirmRes.reward.xp === 15, 'Awarded 15 XP');
  assert(confirmRes.reward.shells === 10, 'Awarded 10 Shells');

  const growthEventRows = await testDb.query<any>(
    'SELECT * FROM completed_loops WHERE loop_trace_id = $1',
    [trace1Id]
  );
  assert(growthEventRows.length === 1, 'Exactly one completed_loops / Growth Event row exists');
  assert(growthEventRows[0].emotional_awareness === 1, 'Growth event recorded emotional_awareness = 1');
  assert(growthEventRows[0].somatic_awareness === 1, 'Growth event recorded somatic_awareness = 1');
  assert(growthEventRows[0].cognitive_clarity === 1, 'Growth event recorded cognitive_clarity = 1');
  assert(growthEventRows[0].conscious_action === 0, 'Growth event recorded conscious_action = 0');

  // Verify through growth_events view
  const viewRows = await testDb.query<any>('SELECT * FROM growth_events WHERE loop_trace_id = $1', [trace1Id]);
  assert(viewRows.length === 1, 'growth_events view successfully reads the event');

  // -------------------------------------------------------------
  // CRITERION 4: Idempotency & Replay Safety (Zero duplicate points/rewards)
  // -------------------------------------------------------------
  console.log('\n[CRITERION 4/10] Verifying Idempotency & Replay Safety on re-confirmation...');
  const replayRes = await loopRepo.confirmGrowthEvent(userId, trace1Id, {
    trigger: updatedTrace!.trigger,
    emotionOrBody: updatedTrace!.emotion_or_body,
    automaticStory: updatedTrace!.automatic_story,
    desires: updatedTrace!.desires,
    facts: updatedTrace!.facts,
    oldResponse: updatedTrace!.old_response,
    newChoice: updatedTrace!.new_choice,
    insights: updatedTrace!.insights,
    skills: {
      emotional_awareness: 1,
      somatic_awareness: 1,
      cognitive_clarity: 1,
      conscious_action: 1,
    },
  });

  assert(replayRes.success === true, 'Replay call returns success');
  assert(replayRes.alreadyProcessed === true, 'Marked as alreadyProcessed');
  assert(replayRes.reward.xp === 0, 'Zero additional XP granted on replay');
  assert(replayRes.reward.shells === 0, 'Zero additional Shells granted on replay');

  const afterReplayLoops = await testDb.query<any>(
    'SELECT * FROM completed_loops WHERE loop_trace_id = $1',
    [trace1Id]
  );
  assert(afterReplayLoops.length === 1, 'Still exactly one completed_loops row (No duplicates)');

  const countAfterReplay = await loopRepo.getCompletedLoopCount(userId);
  assert(countAfterReplay === 1, 'Companion growth event count remained strictly 1 (Zero increments on replay)');

  // -------------------------------------------------------------
  // CRITERION 5: Trace Count Rule (+1 per Growth Event regardless of skill count)
  // -------------------------------------------------------------
  console.log('\n[CRITERION 5/10] Verifying Trace Count Rule (+1 per Growth Event regardless of skills)...');
  // Trace 2: User confirms all 4 skills
  const trace2Id = 'trace_user1_test2';
  await loopRepo.createTrace({
    id: trace2Id,
    userId,
    conversationId: 'conv_123',
    trigger: 'เพื่อนร่วมงานติเตียนงานต่อหน้าทีม',
    newChoice: 'สูดหายใจลึกๆ 3 ครั้ง แล้วตอบรับอย่างสร้างสรรค์',
  });
  const res2 = await loopRepo.confirmGrowthEvent(userId, trace2Id, {
    skills: { emotional_awareness: 1, somatic_awareness: 1, cognitive_clarity: 1, conscious_action: 1 },
  });
  assert(res2.progressCount === 2, 'Trace count became 2 after 4 skills checked (+1 only)');

  // Trace 3: User confirms only 1 skill
  const trace3Id = 'trace_user1_test3';
  await loopRepo.createTrace({
    id: trace3Id,
    userId,
    conversationId: 'conv_123',
    trigger: 'ลูกค้ายกเลิกนัดกะทันหัน',
    newChoice: 'จัดตารางเวลาใหม่',
  });
  const res3 = await loopRepo.confirmGrowthEvent(userId, trace3Id, {
    skills: { emotional_awareness: 0, somatic_awareness: 0, cognitive_clarity: 0, conscious_action: 1 },
  });
  assert(res3.progressCount === 3, 'Trace count became 3 after 1 skill checked (+1 only)');

  // -------------------------------------------------------------
  // CRITERION 6: 4 Skill Axes Accumulation in Companion
  // -------------------------------------------------------------
  console.log('\n[CRITERION 6/10] Verifying 4 Skill Axes Accumulation on Companion...');
  const compSkills = await companionRepo.findByUserId(userId);
  // Trace 1: { emotional_awareness: 1, somatic_awareness: 1, cognitive_clarity: 1, conscious_action: 0 }
  // Trace 2: { emotional_awareness: 1, somatic_awareness: 1, cognitive_clarity: 1, conscious_action: 1 }
  // Trace 3: { emotional_awareness: 0, somatic_awareness: 0, cognitive_clarity: 0, conscious_action: 1 }
  // Total expected: EA: 2, SA: 2, CC: 2, CA: 2
  assert((compSkills as any).emotional_awareness_score === 2, 'emotional_awareness_score accumulated to 2');
  assert((compSkills as any).somatic_awareness_score === 2, 'somatic_awareness_score accumulated to 2');
  assert((compSkills as any).cognitive_clarity_score === 2, 'cognitive_clarity_score accumulated to 2');
  assert((compSkills as any).conscious_action_score === 2, 'conscious_action_score accumulated to 2');

  // -------------------------------------------------------------
  // CRITERION 7: Uncheck-only Rule Verification (0 or 1 per skill)
  // -------------------------------------------------------------
  console.log('\n[CRITERION 7/10] Verifying Skill Scoring bounded to 0 or 1...');
  const trace4Id = 'trace_user1_test4';
  await loopRepo.createTrace({ id: trace4Id, userId, conversationId: 'conv_123', trigger: 'test uncheck' });
  const res4 = await loopRepo.confirmGrowthEvent(userId, trace4Id, {
    skills: {
      emotional_awareness: 0, // user unchecked
      somatic_awareness: 1,
      cognitive_clarity: 0,   // user unchecked
      conscious_action: 0,    // undetected/unchecked
    },
  });
  assert(res4.success === true, 'Confirm with partial uncheck succeeded');
  const event4 = await testDb.queryOne<any>('SELECT * FROM completed_loops WHERE loop_trace_id = $1', [trace4Id]);
  assert(event4.emotional_awareness === 0 && event4.somatic_awareness === 1, 'Unchecked skills stored as 0, checked stored as 1');

  // -------------------------------------------------------------
  // CRITERION 8: Reward Ledger & Daily Cap (currency_transactions idempotency)
  // -------------------------------------------------------------
  console.log('\n[CRITERION 8/10] Verifying Reward Ledger & Daily Cap...');
  const txRows = await testDb.query<any>(
    'SELECT * FROM currency_transactions WHERE user_id = $1 ORDER BY created_at ASC',
    [userId]
  );
  assert(txRows.length >= 6, 'Multiple currency transactions recorded');
  const hasGrowthXpKey = txRows.some((t) => t.idempotency_key === `growth_xp:${trace1Id}`);
  const hasGrowthShellsKey = txRows.some((t) => t.idempotency_key === `growth_shells:${trace1Id}`);
  assert(hasGrowthXpKey, 'Deterministic idempotency key growth_xp:<traceId> present');
  assert(hasGrowthShellsKey, 'Deterministic idempotency key growth_shells:<traceId> present');

  // Test 5-loop daily reward cap: we have confirmed 4 events so far. Let's confirm 5th and 6th events today.
  const trace5Id = 'trace_user1_test5';
  await loopRepo.createTrace({ id: trace5Id, userId, conversationId: 'conv_123', trigger: 'test 5' });
  const res5 = await loopRepo.confirmGrowthEvent(userId, trace5Id, { skills: {} });
  assert(res5.reward.xp === 15, '5th event still gets XP reward (within daily cap)');

  const trace6Id = 'trace_user1_test6';
  await loopRepo.createTrace({ id: trace6Id, userId, conversationId: 'conv_123', trigger: 'test 6' });
  const res6 = await loopRepo.confirmGrowthEvent(userId, trace6Id, { skills: {} });
  assert(res6.reward.dailyRewardCapped === true, '6th event hits daily cap');
  assert(res6.reward.xp === 0 && res6.reward.shells === 0, '6th event granted 0 XP / 0 Shells due to daily cap');
  assert(res6.progressCount === 6, 'Companion still gained +1 trace count even when daily reward capped');

  // -------------------------------------------------------------
  // CRITERION 9: Companion Growth & DNA Snapshot (Emotion does NOT alter base DNA)
  // -------------------------------------------------------------
  console.log('\n[CRITERION 9/10] Verifying Companion Growth & DNA Snapshot...');
  const compBeforeMood = await companionRepo.findByUserId(userId);
  const basePrimaryColor = compBeforeMood!.dna?.primary_pink_shade;
  assert(Boolean(basePrimaryColor), `Base primary color exists (${basePrimaryColor})`);

  // Simulate mood interaction with intense emotion
  await companionRepo.updateMoodAndInteraction(userId, 'anger');
  const compAfterMood = await companionRepo.findByUserId(userId);
  assert(compAfterMood!.dna?.primary_pink_shade === basePrimaryColor, 'Primary color is unchanged by mood interaction');

  // Verify DNA snapshot maps to the 4 skill axes using an isolated real User + Companion under Foreign Key constraints
  const c9UserRes = await authService.register('Criterion 9 Tester', 'c9_tester@test.app', 'Password123!');
  const c9UserId = c9UserRes.user.id;
  const c9Dna = {
    primary_pink_shade: 'sakura_bloom',
    secondary_color: '#4ECDC4',
    gill_type: 'feathered_majestic',
    cheek_feeler_type: 'branched_delicate',
    head_light_type: 'star_lantern',
    head_light_tip: 'crystal_point',
    tail_type: 'flowing_silk',
    body_pattern: 'starlight_speckles',
    movement_personality: 'serene_swaying',
    safe_space_theme: 'crystal_cave',
  };
  const c9Companion = await companionRepo.createCompanion(c9UserId, 99999, c9Dna, 'น้องเก้า', 0);
  assert(Boolean(c9Companion), 'Created dedicated real companion under FK constraints for Criterion 9');

  const c9MockLoops = [
    { id: 'loop_c9_1', emotion_tag: 'anger', learning_types_json: ['notice_emotion'], emotional_awareness: 1, somatic_awareness: 0, cognitive_clarity: 0, conscious_action: 0 },
    { id: 'loop_c9_2', emotion_tag: 'sadness', learning_types_json: ['new_choice'], emotional_awareness: 0, somatic_awareness: 1, cognitive_clarity: 1, conscious_action: 1 },
  ];
  const snapshot = await companionRepo.createDnaSnapshot(c9Companion.id, c9UserId, c9MockLoops);
  assert(Boolean(snapshot), 'DNA Snapshot created for dedicated companion');
  assert(snapshot.dna_json.primaryColor === 'sakura_bloom', 'Snapshot preserves base primary color');
  assert(snapshot.dna_json.eyeShape !== undefined, 'Snapshot contains eyeShape trait (from emotional_awareness)');
  assert(snapshot.dna_json.gillStyle !== undefined, 'Snapshot contains gillStyle trait (from somatic_awareness)');
  assert(snapshot.dna_json.tailStyle !== undefined, 'Snapshot contains tailStyle trait (from cognitive_clarity)');
  assert(snapshot.dna_json.lanternShape !== undefined, 'Snapshot contains lanternShape trait (from conscious_action)');

  // -------------------------------------------------------------
  // CRITERION 10: Hatch Threshold & Production Flow Integration
  // -------------------------------------------------------------
  console.log('\n[CRITERION 10/10] Verifying Hatch Threshold & Production Flow Integration...');
  // Currently at 6 traces. Attempt to hatch prematurely should fail (loop count < 20).
  const currentCount = await loopRepo.getCompletedLoopCount(userId);
  assert(currentCount === 6, `Current loop count is ${currentCount} (< 20)`);
  assert(currentCount < 20, 'Premature hatch condition verified (< 20 loops)');

  // 1. Advance state to exactly 19 confirmed growth events
  for (let i = 7; i <= 19; i++) {
    const tId = `trace_user1_test${i}`;
    await loopRepo.createTrace({ id: tId, userId, conversationId: 'conv_123', trigger: `trace ${i}` });
    await loopRepo.confirmGrowthEvent(userId, tId, { skills: {} });
  }

  const countAt19 = await loopRepo.getCompletedLoopCount(userId);
  assert(countAt19 === 19, `Loop count reached exactly 19/20 before milestone`);

  const compAt19 = await companionRepo.findByUserId(userId);
  assert(compAt19!.stage === 0, 'Companion remains at Stage 0 before 20th trace');

  const snapshotBefore20 = await testDb.queryOne<any>('SELECT * FROM companion_dna_snapshots WHERE companion_id = $1', [compAt19!.id]);
  assert(snapshotBefore20 === null, 'Hatch DNA snapshot does not exist before 20th trace');

  // 2. Atomic Rollback Integration Test on Production confirmGrowthEvent
  const failingAdapter: IDatabaseAdapter = {
    getDriver: () => testDb.getDriver(),
    query: (sql, params) => testDb.query(sql, params),
    queryOne: (sql, params) => testDb.queryOne(sql, params),
    execute: (sql, params) => testDb.execute(sql, params),
    close: () => testDb.close(),
    transaction: async <T>(callback: (tx: IDatabaseAdapter) => Promise<T>): Promise<T> => {
      return await testDb.transaction(async (tx) => {
        const originalExecute = tx.execute.bind(tx);
        const interceptedTx: IDatabaseAdapter = {
          ...tx,
          execute: async (sql: string, params: any[] = []) => {
            // Intercept right at companion stage advancement (after completed_loops & wallet mutations have run)
            if (sql.includes('UPDATE companions SET stage = 1')) {
              throw new Error('Injected atomic rollback test failure during milestone hatching');
            }
            return await originalExecute(sql, params);
          },
        };
        return await callback(interceptedTx);
      });
    },
  };
  const failingLoopRepo = new LoopRepository(failingAdapter);

  const walletBeforeFail = await testDb.queryOne<any>('SELECT * FROM wallets WHERE user_id = $1', [userId]);
  const loopsBeforeFail = (await testDb.queryOne<any>('SELECT COUNT(*) as c FROM completed_loops WHERE user_id = $1', [userId])).c;
  const traceFailId = 'trace_user1_fail20';
  await loopRepo.createTrace({ id: traceFailId, userId, conversationId: 'conv_123', trigger: 'trace fail 20' });

  let failureCaught = false;
  try {
    await failingLoopRepo.confirmGrowthEvent(userId, traceFailId, { skills: { conscious_action: 1 } });
  } catch (err: any) {
    failureCaught = err.message === 'Injected atomic rollback test failure during milestone hatching';
  }
  assert(failureCaught, 'Production confirmGrowthEvent threw injected mid-flow error');

  // Exact assertions after failure:
  // a. completed_loops did not increase
  const loopsAfterFail = (await testDb.queryOne<any>('SELECT COUNT(*) as c FROM completed_loops WHERE user_id = $1', [userId])).c;
  assert(Number(loopsAfterFail) === Number(loopsBeforeFail), 'a. completed_loops count did not increase after rollback');
  const failedLoopRecord = await testDb.queryOne<any>('SELECT * FROM completed_loops WHERE loop_trace_id = $1', [traceFailId]);
  assert(failedLoopRecord === null, 'a. failed loop trace was not committed to completed_loops');

  // b. Trace Count did not increase
  const countAfterFail = await loopRepo.getCompletedLoopCount(userId);
  assert(countAfterFail === 19, 'b. Trace Count did not increase (remains at 19)');

  // c. Companion remains Stage 0
  const compAfterFail = await companionRepo.findByUserId(userId);
  assert(compAfterFail!.stage === 0, 'c. Companion remains Stage 0');
  const compDbRaw = await testDb.queryOne<any>('SELECT * FROM companions WHERE id = $1', [compAt19!.id]);
  assert(Boolean(compDbRaw.hatch_milestone_awarded) === false, 'c. hatch_milestone_awarded is still false in database');

  // d. Wallet is unchanged
  const walletAfterFail = await testDb.queryOne<any>('SELECT * FROM wallets WHERE user_id = $1', [userId]);
  assert(walletAfterFail.xp === walletBeforeFail.xp, 'd. Wallet XP is completely unchanged after rollback');
  assert(walletAfterFail.shells === walletBeforeFail.shells, 'd. Wallet Shells is completely unchanged after rollback');

  // e. Hatch Ledger has no entries
  const hatchLedgerAfterFail = await testDb.query<any>("SELECT * FROM currency_transactions WHERE idempotency_key LIKE 'COMPANION_HATCH:%'");
  assert(hatchLedgerAfterFail.length === 0, 'e. Hatch Ledger has 0 entries after rollback');

  // f. DNA Snapshot has no entries
  const snapshotAfterFail = await testDb.queryOne<any>('SELECT * FROM companion_dna_snapshots WHERE companion_id = $1', [compAt19!.id]);
  assert(snapshotAfterFail === null, 'f. DNA Snapshot has 0 entries after rollback');

  // 3. Confirm 20th Loop Trace via the single production orchestration function
  const trace20Id = 'trace_user1_test20';
  await loopRepo.createTrace({ id: trace20Id, userId, conversationId: 'conv_123', trigger: 'trace 20 milestone' });
  const confirm20Result = await loopRepo.confirmGrowthEvent(userId, trace20Id, {
    skills: { conscious_action: 1, cognitive_clarity: 1 }
  });

  // 4. Single-call assertions:
  // - Growth Event increases by exactly 1
  const loopsAfter20 = (await testDb.queryOne<any>('SELECT COUNT(*) as c FROM completed_loops WHERE user_id = $1', [userId])).c;
  assert(Number(loopsAfter20) === Number(loopsBeforeFail) + 1, 'Growth Event count increased by exactly 1');

  // - Trace count changes from 19 to 20
  assert(confirm20Result.progressCount === 20, 'Trace count changed from 19 to 20');

  // - Companion stage changes from 0 to 1
  assert(confirm20Result.newlyHatched === true, 'Hatching triggered in production confirm call');
  assert(confirm20Result.companion.stage === 1, 'Companion stage changed from 0 to 1 (Hatchling)');
  const compAfter20 = await companionRepo.findByUserId(userId);
  assert(compAfter20!.stage === 1, 'Database confirms companion is now Stage 1');

  // - Hatch DNA Snapshot created
  assert(Boolean(confirm20Result.snapshot), 'Hatch DNA snapshot returned in result');
  const snapshotAfter20 = await testDb.queryOne<any>('SELECT * FROM companion_dna_snapshots WHERE companion_id = $1', [compAt19!.id]);
  assert(Boolean(snapshotAfter20), 'Hatch DNA snapshot row exists in database');
  assert(snapshotAfter20.seed !== undefined, 'Snapshot contains deterministic seed');
  assert(snapshotAfter20.dna_json.skillsSummary.consciousAction >= 1, 'Snapshot reflects practiced skills summary');

  // - Wallet increased by +50 XP and +25 Shells for Milestone
  const walletAfter20 = await testDb.queryOne<any>('SELECT * FROM wallets WHERE user_id = $1', [userId]);
  assert(walletAfter20.xp === walletBeforeFail.xp + 50, `Wallet XP increased by +50 (${walletBeforeFail.xp} -> ${walletAfter20.xp})`);
  assert(walletAfter20.shells === walletBeforeFail.shells + 25, `Wallet Shells increased by +25 (${walletBeforeFail.shells} -> ${walletAfter20.shells})`);

  // - Ledger records COMPANION_HATCH:<companionId>:xp and :shells
  const hatchXpTx = await testDb.query<any>('SELECT * FROM currency_transactions WHERE idempotency_key = $1', [`COMPANION_HATCH:${compAt19!.id}:xp`]);
  const hatchShellsTx = await testDb.query<any>('SELECT * FROM currency_transactions WHERE idempotency_key = $1', [`COMPANION_HATCH:${compAt19!.id}:shells`]);
  assert(hatchXpTx.length === 1 && hatchXpTx[0].amount === 50, 'Ledger recorded COMPANION_HATCH:<companionId>:xp with 50 XP');
  assert(hatchShellsTx.length === 1 && hatchShellsTx[0].amount === 25, 'Ledger recorded COMPANION_HATCH:<companionId>:shells with 25 Shells');

  // - Replay safety: zero increment, count remains 20, stage remains 1, zero new transactions
  const replayResult = await loopRepo.confirmGrowthEvent(userId, trace20Id, {
    skills: { conscious_action: 1, cognitive_clarity: 1 }
  });
  assert(replayResult.alreadyProcessed === true, 'Replay returns alreadyProcessed: true');
  assert(replayResult.progressCount === 20, 'Replay trace count remains 20');
  assert(replayResult.companion.stage === 1, 'Replay companion stage remains 1');
  assert(replayResult.reward.xp === 0 && replayResult.reward.shells === 0, 'Replay awards 0 additional XP and 0 Shells');

  const walletAfterReplay = await testDb.queryOne<any>('SELECT * FROM wallets WHERE user_id = $1', [userId]);
  assert(walletAfterReplay.xp === walletAfter20.xp, 'Wallet XP unchanged after replay');
  assert(walletAfterReplay.shells === walletAfter20.shells, 'Wallet Shells unchanged after replay');

  const totalHatchTx = await testDb.query<any>("SELECT * FROM currency_transactions WHERE idempotency_key LIKE 'COMPANION_HATCH:%'");
  assert(totalHatchTx.length === 2, 'Still exactly 2 hatch milestone transaction records (xp + shells, no duplicates)');

  // 5. Additional post-replay assertions:
  // 1. Query user completed_loops count and verify exact 20
  const finalCompletedLoopsCount = (await testDb.queryOne<any>('SELECT COUNT(*) as c FROM completed_loops WHERE user_id = $1', [userId])).c;
  assert(Number(finalCompletedLoopsCount) === 20, `Final completed_loops count is exactly 20 after replay (got ${finalCompletedLoopsCount})`);

  // 2. Query companion_dna_snapshots for main companion and verify exact 1
  const finalSnapshotsCount = (await testDb.queryOne<any>('SELECT COUNT(*) as c FROM companion_dna_snapshots WHERE companion_id = $1', [compAt19!.id])).c;
  assert(Number(finalSnapshotsCount) === 1, `Final companion_dna_snapshots count is exactly 1 after replay (got ${finalSnapshotsCount})`);

  console.log('\n================================================================');
  console.log(`ALL 10 CRITERIA VERIFIED SUCCESSFULLY! (${totalAssertions}/${totalAssertions} assertions passed) ✅`);
  console.log('================================================================\n');
}

runGrowthEventVerificationTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test run failed:', err);
    process.exit(1);
  });
