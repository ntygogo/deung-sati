import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SqliteDatabaseAdapter } from '../db/sqliteAdapter.js';
import { runMigrations } from '../db/migrator.js';
import { setTestDatabase } from '../db/database.js';
import { apiApp } from '../apiRouter.js';
import { loopRepository } from '../repositories/loopRepository.js';
import { companionRepository } from '../repositories/companionRepository.js';
import { economyRepository } from '../repositories/economyRepository.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runPhase3LogicAntiFarmingSuite() {
  console.log('================================================================');
  console.log('DEUNG SATI PHASE 3 LOGIC & ANTI-FARMING VERIFICATION SUITE');
  console.log('TEST DATABASE: SQLite In-Memory (Completely isolated, zero Neon touch)');
  console.log('SECURITY: Server-Authoritative Anti-Farming, 6-Part Loop, Growth DNA');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  const assert = (condition: boolean, msg: string) => {
    totalTests++;
    if (!condition) {
      console.error(`❌ FAILED: ${msg}`);
      throw new Error(`Assertion failed: ${msg}`);
    }
    passedTests++;
    console.log(`  ✓ ${msg}`);
  };

  // 1. Initialize Isolated In-Memory Database
  console.log('[STEP 1] Setting up isolated SQLite In-Memory Database & Running Migrations...');
  const testDb = new SqliteDatabaseAdapter(':memory:');
  setTestDatabase(testDb);
  const appliedMigrations = await runMigrations(testDb);
  assert(appliedMigrations.length >= 6, `Applied ${appliedMigrations.length} migrations including 006_completed_loops_and_dna_snapshot`);
  console.log('-> Migrations ready ✅\n');

  // 2. Start Test HTTP Server on random port
  console.log('[STEP 2] Launching Local HTTP Server for API verification...');
  const server = http.createServer(apiApp);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;
  console.log(`-> Local test server running on ${baseUrl} ✅\n`);

  try {
    // Helper to make authenticated requests
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

    const getJson = async (endpoint: string, token?: string): Promise<{ status: number; data: any }> => {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${baseUrl}${endpoint}`, { headers });
      const data: any = await res.json().catch(() => null);
      return { status: res.status, data };
    };

    // Register User A and User B
    console.log('[TEST 1] Registering Test Users & Creating Initial Companion Eggs...');
    const regA = await postJson('/auth/register', {
      name: 'User Sati A',
      email: 'userA@sati.local',
      password: 'MindfulPassword123!',
    });
    assert(regA.status === 200 && regA.data.token, 'User A registered successfully');
    const tokenA = regA.data.token;
    const userIdA = regA.data.user.id;

    const regB = await postJson('/auth/register', {
      name: 'User Sati B',
      email: 'userB@sati.local',
      password: 'MindfulPassword456!',
    });
    assert(regB.status === 200 && regB.data.token, 'User B registered successfully');
    const tokenB = regB.data.token;
    const userIdB = regB.data.user.id;

    // Create Initial Companions
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
    const initEggA = await companionRepository.createCompanion(userIdA, 10001, defaultDna, 'น้องสติ A', 0);
    const initEggB = await companionRepository.createCompanion(userIdB, 10002, defaultDna, 'น้องสติ B', 0);
    assert(initEggA.stage === 0, 'User A has companion at Stage 0 (Egg)');
    assert(initEggB.stage === 0, 'User B has companion at Stage 0 (Egg)');
    console.log('-> Result: PASSED ✅\n');

    // -------------------------------------------------------------
    // TEST 2: Incomplete Loop Validation (400 Bad Request)
    // -------------------------------------------------------------
    console.log('[TEST 2] Verifying Incomplete 6-Part Loop Rejections (400 Bad Request)...');
    const missingTrigger = await postJson('/loops/complete', {
      conversationId: 'conv_fail_1',
      idempotencyKey: 'idemp_fail_1',
      trigger: '',
      emotionOrBody: 'ใจเต้นเร็ว แน่นหน้าอก',
      automaticStory: 'เขาคงไม่ชอบเราแน่ๆ',
      facts: 'เขาแค่อ่านแล้วยังไม่ได้ตอบ',
      oldResponse: 'ส่งข้อความซ้ำๆ ไปถาม',
      newChoice: 'วางโทรศัพท์ลงแล้วกำหนดลมหายใจ 3 ครั้ง',
    }, tokenA);
    assert(missingTrigger.status === 400, 'Missing trigger rejected with 400');
    assert(missingTrigger.data.error.includes('trigger'), 'Error specifies missing trigger');

    const missingFacts = await postJson('/loops/complete', {
      conversationId: 'conv_fail_2',
      idempotencyKey: 'idemp_fail_2',
      trigger: 'เพื่อนร่วมงานไม่ทักทายตอนเช้า',
      emotionOrBody: 'น้อยใจ วาบในอก',
      automaticStory: 'เขาโกรธเราเรื่องงานเมื่อวาน',
      facts: '',
      oldResponse: 'เงียบแล้วหลบหน้า',
      newChoice: 'ยิ้มให้ปกติและรอจังหวะคุย',
    }, tokenA);
    assert(missingFacts.status === 400, 'Missing facts rejected with 400');

    const missingIdempotency = await postJson('/loops/complete', {
      conversationId: 'conv_fail_3',
      trigger: 'เพื่อนร่วมงานไม่ทักทายตอนเช้า',
      emotionOrBody: 'น้อยใจ วาบในอก',
      automaticStory: 'เขาโกรธเราเรื่องงานเมื่อวาน',
      facts: 'เขาเดินผ่านตอนถือของเต็มมือ',
      oldResponse: 'เงียบแล้วหลบหน้า',
      newChoice: 'ยิ้มให้ปกติและรอจังหวะคุย',
    }, tokenA);
    assert(missingIdempotency.status === 400, 'Missing idempotencyKey rejected with 400');
    console.log('-> Result: PASSED ✅\n');

    // -------------------------------------------------------------
    // TEST 3: Cross-Field Duplicate / Copy-Paste Rejection
    // -------------------------------------------------------------
    console.log('[TEST 3] Verifying Cross-Field Copy-Paste / Farming Rejection...');
    const copyPasted = await postJson('/loops/complete', {
      conversationId: 'conv_copypaste',
      idempotencyKey: 'idemp_copypaste',
      trigger: 'ข้อความเดียวกันทั้งหมด',
      emotionOrBody: 'ข้อความเดียวกันทั้งหมด',
      automaticStory: 'ข้อความเดียวกันทั้งหมด',
      facts: 'ข้อความเดียวกันทั้งหมด',
      oldResponse: 'ข้อความเดียวกันทั้งหมด',
      newChoice: 'ข้อความเดียวกันทั้งหมด',
    }, tokenA);
    assert(copyPasted.status === 400, 'Identical text across fields rejected with 400');
    assert(copyPasted.data.error.includes('ไม่กรอกข้อความซ้ำกันทุกช่อง'), 'Error message warns against identical fields');
    console.log('-> Result: PASSED ✅\n');

    // -------------------------------------------------------------
    // TEST 4: Valid 6-Part Completed Loop & Server-Authoritative Ledger
    // -------------------------------------------------------------
    console.log('[TEST 4] Registering Valid 6-Part Completed Loop & Checking Server Ledger...');
    const loop1Res = await postJson('/loops/complete', {
      conversationId: 'conv_loop_1',
      idempotencyKey: 'idemp_loop_1',
      trigger: 'ได้รับอีเมลติติงผลงานจากลูกค้า',
      emotionOrBody: 'ใจสั่น ท้องผูก ตัวชา',
      automaticStory: 'เราไม่เก่งพอ งานนี้จะต้องพังแน่ๆ',
      facts: 'ลูกค้าติติงเรื่องฟอนต์ 1 จุด แต่ส่วนเนื้อหาชมว่าดี',
      oldResponse: 'พิมพ์ชี้แจงแก้ตัวทันทีด้วยอารมณ์',
      newChoice: 'หยุดหายใจลึกๆ 5 วินาที แล้วตอบรับเพื่อแก้ไขเฉพาะฟอนต์',
      emotionTag: 'anxiety',
      learningTypes: ['notice_emotion', 'separate_fact_story', 'new_choice'],
    }, tokenA);

    assert(loop1Res.status === 200 && loop1Res.data.success, 'Valid loop confirmed successfully');
    assert(loop1Res.data.progressCount === 1, 'Progress count incremented to 1/20');
    assert(loop1Res.data.reward.xp === 20, 'Server awarded exactly +20 XP');
    assert(loop1Res.data.reward.shells === 10, 'Server awarded exactly +10 Shells');
    assert(loop1Res.data.eggFeedback.quote.includes('สีเหล่านี้คือสิ่งที่เราเคยผ่าน'), 'Returned mindful emotion quote');

    // Verify in database directly
    const countInDb = await loopRepository.getCompletedLoopCount(userIdA);
    assert(countInDb === 1, 'Database completed_loops count is exactly 1');
    const walletA = await economyRepository.getWallet(userIdA);
    assert(walletA.xp === 20, 'User wallet XP is 20 in database ledger');
    assert(walletA.shells === 10, 'User wallet Shells is 10 in database ledger');
    console.log('-> Result: PASSED ✅\n');

    // -------------------------------------------------------------
    // TEST 5: Idempotency Key Caching (No Duplicate Points/Count)
    // -------------------------------------------------------------
    console.log('[TEST 5] Testing Idempotency Key Handling (Rapid Click Protection)...');
    const duplicateIdemp = await postJson('/loops/complete', {
      conversationId: 'conv_loop_1',
      idempotencyKey: 'idemp_loop_1', // same key
      trigger: 'ได้รับอีเมลติติงผลงานจากลูกค้า',
      emotionOrBody: 'ใจสั่น ท้องผูก ตัวชา',
      automaticStory: 'เราไม่เก่งพอ งานนี้จะต้องพังแน่ๆ',
      facts: 'ลูกค้าติติงเรื่องฟอนต์ 1 จุด แต่ส่วนเนื้อหาชมว่าดี',
      oldResponse: 'พิมพ์ชี้แจงแก้ตัวทันทีด้วยอารมณ์',
      newChoice: 'หยุดหายใจลึกๆ 5 วินาที แล้วตอบรับเพื่อแก้ไขเฉพาะฟอนต์',
      emotionTag: 'anxiety',
      learningTypes: ['notice_emotion'],
    }, tokenA);

    assert(duplicateIdemp.status === 200, 'Duplicate idempotency returns 200');
    assert(duplicateIdemp.data.alreadyProcessed === true, 'Flagged as alreadyProcessed');
    assert(duplicateIdemp.data.progressCount === 1, 'Progress count remains 1 (no duplicate increment)');

    const walletAfterIdemp = await economyRepository.getWallet(userIdA);
    assert(walletAfterIdemp.xp === 20, 'Wallet XP remained 20 (no duplicate reward)');
    console.log('-> Result: PASSED ✅\n');

    // -------------------------------------------------------------
    // TEST 6: Duplicate Per Conversation Deduplication
    // -------------------------------------------------------------
    console.log('[TEST 6] Testing Duplicate Per Conversation Deduplication...');
    const duplicateConv = await postJson('/loops/complete', {
      conversationId: 'conv_loop_1', // same conversation, different idempotency key
      idempotencyKey: 'idemp_loop_new_key',
      trigger: 'เรื่องเดิมในบทสนทนาเดิม',
      emotionOrBody: 'รู้สึกเหมือนเดิม',
      automaticStory: 'คิดเหมือนเดิมเลย',
      facts: 'ข้อเท็จจริงเหมือนเดิม',
      oldResponse: 'ตอบสนองแบบเดิม',
      newChoice: 'เลือกใหม่แบบเดิม',
      emotionTag: 'anxiety',
      learningTypes: ['notice_emotion'],
    }, tokenA);

    assert(duplicateConv.data.alreadyProcessed === true, 'Conversation duplicate flagged alreadyProcessed');
    const countAfterConv = await loopRepository.getCompletedLoopCount(userIdA);
    assert(countAfterConv === 1, 'Progress count remains 1');
    console.log('-> Result: PASSED ✅\n');

    // -------------------------------------------------------------
    // TEST 7: Client Manipulation Resistance (Points / Progress Discarded)
    // -------------------------------------------------------------
    console.log('[TEST 7] Testing Client Anti-Farming (Discards Client XP, Shells, & Progress)...');
    const hackedRes = await postJson('/loops/complete', {
      conversationId: 'conv_loop_2_hack',
      idempotencyKey: 'idemp_loop_2',
      trigger: 'หัวหน้าเรียกคุยเรื่องโปรเจกต์ด่วน',
      emotionOrBody: 'ตึงที่ขมับ หายใจสั้น',
      automaticStory: 'เราต้องโดนปลดออกจากงานแน่',
      facts: 'หัวหน้าแค่อยากขออัปเดตสถานะก่อนประชุมผู้บริหาร',
      oldResponse: 'กระวนกระวาย คิดวนซ้ำไปมาทั้งบ่าย',
      newChoice: 'เตรียมสไลด์สรุป 3 ข้อ แล้วเดินเข้าไปคุยด้วยความมั่นใจ',
      emotionTag: 'fear',
      learningTypes: ['pause_before_reacting', 'new_choice'],
      // Client attempts to spoof points and complete 20 loops:
      xp: 999999,
      shells: 999999,
      progressCount: 20,
      hatchProgress: 20,
      completed: true,
    }, tokenA);

    assert(hackedRes.status === 200, 'Legitimate fields processed');
    assert(hackedRes.data.reward.xp === 20, 'Server awarded 20 XP, ignored client 999999');
    assert(hackedRes.data.reward.shells === 10, 'Server awarded 10 Shells, ignored client 999999');
    assert(hackedRes.data.progressCount === 2, 'Progress count is 2 (not 20)');

    // Test Petting anti-farming: only updates mood, 0 farmable points or progress
    const petRes = await postJson('/companion/interact', { moodState: 'happy' }, tokenA);
    assert(petRes.status === 200, 'Petting succeeded');
    assert(petRes.data.reward === null, 'Petting awards 0 farmable points / null reward');
    const countAfterPet = await loopRepository.getCompletedLoopCount(userIdA);
    assert(countAfterPet === 2, 'Petting did not increment loop count');
    console.log('-> Result: PASSED ✅\n');

    // -------------------------------------------------------------
    // TEST 8: Crisis Conversation Zero-Reward Gate
    // -------------------------------------------------------------
    console.log('[TEST 8] Testing Crisis Conversation Zero-Reward Gate...');
    const crisisRes = await postJson('/loops/complete', {
      conversationId: 'conv_crisis_session_1',
      idempotencyKey: 'idemp_crisis_1',
      trigger: 'รู้สึกหมดหวังและทรมานจากปัญหาครอบครัว',
      emotionOrBody: 'ร้องไห้ แน่นหน้าอก หายใจไม่ออก',
      automaticStory: 'ไม่มีใครเข้าใจเรา ทุกอย่างมืดมนไปหมด',
      facts: 'ยังมีสายด่วน 1323 และมีผู้เชี่ยวชาญที่พร้อมรับฟัง',
      oldResponse: 'เก็บตัวเงียบและทำร้ายตัวเอง',
      newChoice: 'โทรปรึกษาสายด่วนสุขภาพจิต 1323',
      emotionTag: 'sadness',
      learningTypes: ['notice_emotion', 'self_compassion'],
      isCrisis: true, // Marked as crisis session
    }, tokenA);

    assert(crisisRes.status === 200, 'Crisis loop saved for therapeutic record');
    assert(crisisRes.data.reward.xp === 0, 'Crisis loop awarded 0 XP');
    assert(crisisRes.data.reward.shells === 0, 'Crisis loop awarded 0 Shells');
    console.log('-> Result: PASSED ✅\n');

    // -------------------------------------------------------------
    // TEST 9: Near-Duplicate Loop Detection & Review Workflow
    // -------------------------------------------------------------
    console.log('[TEST 9] Testing Near-Duplicate Loop Detection & Review...');
    // Similar to loop 1: "ได้รับอีเมลติติงผลงานจากลูกค้า" + "เราไม่เก่งพอ งานนี้จะต้องพังแน่ๆ"
    const nearDupRes = await postJson('/loops/complete', {
      conversationId: 'conv_near_dup_1',
      idempotencyKey: 'idemp_near_dup_1',
      trigger: 'ได้รับอีเมลติติงผลงานจากลูกค้า', // identical trigger
      emotionOrBody: 'ใจเต้นเร็วมาก มือสั่น',
      automaticStory: 'เราไม่เก่งพอ งานนี้จะต้องพังแน่ๆ', // identical automatic story
      facts: 'ลูกค้าต้องการแก้แบบตัวอักษร',
      oldResponse: 'พิมพ์ตอบโต้ด้วยความโกรธ',
      newChoice: 'พักสายตาแล้วค่อยตอบ',
    }, tokenA);

    assert(nearDupRes.data.isDuplicateCandidate === true, 'Flagged as isDuplicateCandidate');
    assert(nearDupRes.data.message.includes('ตรวจพบลูปที่คล้ายกับที่คุณเคยบันทึกไว้'), 'Prompt for review presented');

    // Now confirm as intentional Review (`isReview: true`)
    const reviewConfirmed = await postJson('/loops/complete', {
      conversationId: 'conv_near_dup_1',
      idempotencyKey: 'idemp_near_dup_1_review',
      trigger: 'ได้รับอีเมลติติงผลงานจากลูกค้า',
      emotionOrBody: 'ใจเต้นเร็วมาก มือสั่น',
      automaticStory: 'เราไม่เก่งพอ งานนี้จะต้องพังแน่ๆ',
      facts: 'ลูกค้าต้องการแก้แบบตัวอักษร',
      oldResponse: 'พิมพ์ตอบโต้ด้วยความโกรธ',
      newChoice: 'พักสายตาแล้วค่อยตอบ',
      isReview: true,
    }, tokenA);

    assert(reviewConfirmed.status === 200, 'Review loop confirmed');
    assert(reviewConfirmed.data.reward.xp === 0, 'Review awarded 0 XP (anti-farming)');
    assert(reviewConfirmed.data.reward.shells === 0, 'Review awarded 0 Shells');
    console.log('-> Result: PASSED ✅\n');

    // -------------------------------------------------------------
    // TEST 10: Daily Reward Cap (Max 5 Rewarded Loops / Day)
    // -------------------------------------------------------------
    console.log('[TEST 10] Testing Daily Reward Cap (Max 5 Rewarded Loops / Day)...');
    // Currently User A has rewarded loops: loop 1, loop 2 (2 rewarded so far)
    // Add loop 3, 4, 5 (rewarded)
    for (let i = 3; i <= 5; i++) {
      const loopRes = await postJson('/loops/complete', {
        conversationId: `conv_daily_test_${i}`,
        idempotencyKey: `idemp_daily_${i}`,
        trigger: `เหตุการณ์ที่ทำให้ไม่สบายใจข้อที่ ${i} ในวันนี้`,
        emotionOrBody: `ความรู้สึกตึงเครียดระดับที่ ${i}`,
        automaticStory: `ความคิดอัตโนมัติเกี่ยวกับเหตุการณ์ที่ ${i}`,
        facts: `ข้อเท็จจริงตามหลักฐานจริงของเรื่องที่ ${i}`,
        oldResponse: `การตอบสนองแบบเดิมๆ ที่ ${i}`,
        newChoice: `ทางเลือกใหม่อย่างมีสติที่ ${i}`,
        emotionTag: 'anxiety',
        learningTypes: ['notice_emotion'],
      }, tokenA);
      assert(loopRes.data.reward.xp === 20, `Loop ${i} rewarded +20 XP`);
      assert(loopRes.data.reward.dailyRewardCapped === false, `Loop ${i} within daily limit`);
    }

    // Now submit 6th loop of the day -> should increment progress, but 0 reward
    const loop6Res = await postJson('/loops/complete', {
      conversationId: 'conv_daily_test_6',
      idempotencyKey: 'idemp_daily_6',
      trigger: 'เหตุการณ์ที่ทำให้ไม่สบายใจข้อที่ 6 ในวันนี้',
      emotionOrBody: 'ความรู้สึกตึงเครียดระดับที่ 6',
      automaticStory: 'ความคิดอัตโนมัติเกี่ยวกับเหตุการณ์ที่ 6',
      facts: 'ข้อเท็จจริงตามหลักฐานจริงของเรื่องที่ 6',
      oldResponse: 'การตอบสนองแบบเดิมๆ ที่ 6',
      newChoice: 'ทางเลือกใหม่อย่างมีสติที่ 6',
      emotionTag: 'anger',
      learningTypes: ['pause_before_reacting'],
    }, tokenA);

    assert(loop6Res.status === 200, '6th loop processed');
    assert(loop6Res.data.reward.dailyRewardCapped === true, 'dailyRewardCapped flagged true');
    assert(loop6Res.data.reward.xp === 0, '6th loop awarded 0 XP');
    assert(loop6Res.data.reward.shells === 0, '6th loop awarded 0 Shells');
    console.log('-> Result: PASSED ✅\n');

    // -------------------------------------------------------------
    // TEST 11: Draft Loop Isolation
    // -------------------------------------------------------------
    console.log('[TEST 11] Testing Draft Loop Isolation (No progress, no reward, recoverable)...');
    const draftRes = await postJson('/loops/draft', {
      conversationId: 'conv_draft_test',
      trigger: 'สังเกตเห็นว่าตัวเองกังวลเรื่องการพรีเซนต์',
      emotionOrBody: 'มือเย็นและหายใจตื้น',
    }, tokenA);
    assert(draftRes.status === 200 && draftRes.data.success, 'Draft saved');

    // Draft should NOT increase completed loops count
    const countAfterDraft = await loopRepository.getCompletedLoopCount(userIdA);
    // User A has: loop 1, 2, crisis, 3, 4, 5, 6 = 7 completed loops
    assert(countAfterDraft === 7, 'Draft did not increment completed loop count');

    // Fetch draft
    const fetchedDraft = await getJson('/loops/draft/conv_draft_test', tokenA);
    assert(fetchedDraft.status === 200 && fetchedDraft.data.draft, 'Draft retrieved successfully');
    assert(fetchedDraft.data.draft.trigger === 'สังเกตเห็นว่าตัวเองกังวลเรื่องการพรีเซนต์', 'Draft content matches');
    console.log('-> Result: PASSED ✅\n');

    // -------------------------------------------------------------
    // TEST 12: Pre-hatch Barrier (< 20 Loops Cannot Hatch)
    // -------------------------------------------------------------
    console.log('[TEST 12] Verifying Pre-hatch Barrier (< 20 Loops Cannot Hatch)...');
    const prematureHatch = await postJson('/companion/hatch', {}, tokenA);
    assert(prematureHatch.status === 400, 'Hatch rejected with 400 when loops < 20');
    assert(prematureHatch.data.error.includes('Need 20 completed loops'), 'Error indicates 20 completed loops needed');
    console.log('-> Result: PASSED ✅\n');

    // -------------------------------------------------------------
    // TEST 13: Complete 20 Loops & Deterministic Permanent DNA Snapshot
    // -------------------------------------------------------------
    console.log('[TEST 13] Completing 20 Loops & Verifying Deterministic Hatch Snapshot...');
    // Complete loops up to 20 for User A
    const currentA = await loopRepository.getCompletedLoopCount(userIdA);
    for (let i = currentA + 1; i <= 20; i++) {
      const loop = await loopRepository.createCompletedLoop(userIdA, {
        conversationId: `conv_hatch_loop_${i}`,
        idempotencyKey: `idemp_hatch_loop_${i}`,
        trigger: `เหตุการณ์ฝึกสติที่ ${i}`,
        emotionOrBody: `อาการทางกายที่ ${i}`,
        automaticStory: `เรื่องเล่าอัตโนมัติที่ ${i}`,
        facts: `ความจริงที่เกิดขึ้นที่ ${i}`,
        oldResponse: `ปฏิกิริยาเดิมที่ ${i}`,
        newChoice: `การเลือกใหม่ที่ ${i}`,
        emotionTag: i % 2 === 0 ? 'anxiety' : 'peace',
        learningTypes: ['notice_emotion', 'new_choice'],
        isReviewOnly: false,
        progressCounted: true,
        rewardXp: 0, // Daily cap is active, no rewards
        rewardShells: 0,
      });
      assert(Boolean(loop.id), `Loop ${i} created`);
    }

    const finalCountA = await loopRepository.getCompletedLoopCount(userIdA);
    assert(finalCountA === 20, 'User A has reached exactly 20 completed loops (20/20)');

    // Hatch Companion
    const hatchResA = await postJson('/companion/hatch', {}, tokenA);
    assert(hatchResA.status === 200 && hatchResA.data.success, 'Companion successfully hatched to Stage 1!');
    assert(hatchResA.data.companion.stage === 1, 'Companion stage is now 1 (Baby Axolotl)');
    assert(Boolean(hatchResA.data.snapshot), 'Permanent DNA snapshot created');
    const snapshotA = hatchResA.data.snapshot;
    assert(Boolean(snapshotA.seed), 'Snapshot seed hash exists');
    const dnaA = typeof snapshotA.dna_json === 'string' ? JSON.parse(snapshotA.dna_json) : snapshotA.dna_json;
    assert(dnaA.totalCompletedLoops === 20, 'Snapshot records all 20 loop history');

    // Test Idempotency & Immutability of Snapshot across page refreshes
    const snapshotFetch1 = await getJson('/companion/snapshot', tokenA);
    const snapshotFetch2 = await getJson('/companion/snapshot', tokenA);
    assert(snapshotFetch1.data.snapshot.seed === snapshotA.seed, 'Snapshot seed hash identical after fetch');
    assert(snapshotFetch2.data.snapshot.seed === snapshotA.seed, 'Snapshot seed hash permanently immutable');
    console.log('-> Result: PASSED ✅\n');

    // -------------------------------------------------------------
    // TEST 14: User Procedural Diversity (Different Users get Unique Snapshots)
    // -------------------------------------------------------------
    console.log('[TEST 14] Verifying User Procedural Diversity (User A vs User B Snapshots)...');
    // Complete 20 loops for User B
    for (let i = 1; i <= 20; i++) {
      await loopRepository.createCompletedLoop(userIdB, {
        conversationId: `conv_userB_loop_${i}`,
        idempotencyKey: `idemp_userB_loop_${i}`,
        trigger: `User B mindful trigger ${i}`,
        emotionOrBody: `User B physical response ${i}`,
        automaticStory: `User B automatic thinking ${i}`,
        facts: `User B objective reality ${i}`,
        oldResponse: `User B old habitual reflex ${i}`,
        newChoice: `User B conscious mindful selection ${i}`,
        emotionTag: i % 3 === 0 ? 'anger' : 'compassion',
        learningTypes: ['self_compassion', 'understand_relationships'],
        isReviewOnly: false,
        progressCounted: true,
        rewardXp: 0,
        rewardShells: 0,
      });
    }
    const hatchResB = await postJson('/companion/hatch', {}, tokenB);
    assert(hatchResB.status === 200 && hatchResB.data.success, 'User B hatched successfully');
    const snapshotB = hatchResB.data.snapshot;
    assert(snapshotB.seed !== snapshotA.seed, 'User A and User B have distinct procedural DNA snapshot hashes');
    console.log(`-> User A Hash Seed: ${snapshotA.seed}`);
    console.log(`-> User B Hash Seed: ${snapshotB.seed}`);
    console.log('-> Result: PASSED ✅\n');

    // -------------------------------------------------------------
    // TEST 15: Mobile Viewport Scroll & CSS Audit (Static Code Inspection)
    // -------------------------------------------------------------
    console.log('[TEST 15] Verifying Mobile Viewport Scroll & Safe-Area Rules in Source Files...');

    // CompanionRoom.tsx inspection
    const companionRoomPath = path.resolve(__dirname, '../../src/components/CompanionRoom.tsx');
    const companionRoomCode = fs.readFileSync(companionRoomPath, 'utf-8');
    assert(companionRoomCode.includes('100dvh'), 'CompanionRoom uses 100dvh for mobile viewport');
    assert(companionRoomCode.includes("overflowY: 'auto'") || companionRoomCode.includes('overflow-y: auto'), 'CompanionRoom has overflowY: auto');
    assert(companionRoomCode.includes('calc(100dvh - 24px)'), 'Modals have max-height calc(100dvh - 24px)');
    assert(companionRoomCode.includes('safe-area-inset-bottom'), 'CompanionRoom respects safe-area-inset-bottom');

    // App.tsx inspection
    const appPath = path.resolve(__dirname, '../../src/App.tsx');
    const appCode = fs.readFileSync(appPath, 'utf-8');
    assert(!appCode.includes('🥚 บันทึกเป็น Loop Trace'), 'Removed per-message "🥚 บันทึกเป็น Loop Trace" button');
    assert(appCode.includes('LoopReviewCard'), 'App.tsx integrates LoopReviewCard');
    assert(appCode.includes('calc(100dvh - 24px)'), 'App.tsx modals have calc(100dvh - 24px) mobile clamp');

    // ConversationalOnboarding.tsx inspection
    const onboardingPath = path.resolve(__dirname, '../../src/components/ConversationalOnboarding.tsx');
    const onboardingCode = fs.readFileSync(onboardingPath, 'utf-8');
    assert(onboardingCode.includes('100dvh'), 'ConversationalOnboarding uses 100dvh mobile viewport');
    assert(onboardingCode.includes("overflowY: 'auto'"), 'ConversationalOnboarding has overflowY: auto');

    console.log('-> Result: PASSED ✅\n');

    // Summary
    console.log('================================================================');
    console.log(`ALL PHASE 3 LOGIC & ANTI-FARMING TESTS PASSED! (${passedTests}/${totalTests} assertions)`);
    console.log('PostgreSQL Status: PostgreSQL live verification pending — Neon test branch not configured');
    console.log('Primary Neon Database was NOT touched, ZERO production deploy performed.');
    console.log('================================================================\n');
  } finally {
    if (typeof (server as any).closeAllConnections === 'function') {
      (server as any).closeAllConnections();
    }
    await new Promise<void>((res) => server.close(() => res()));
  }
}

runPhase3LogicAntiFarmingSuite().catch((err) => {
  console.error('Test suite failed with error:', err);
  process.exit(1);
});
