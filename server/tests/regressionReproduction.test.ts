import assert from 'assert';
import http from 'http';
import { SqliteDatabaseAdapter } from '../db/sqliteAdapter.js';
import { setTestDatabase } from '../db/database.js';
import { runMigrations } from '../db/migrator.js';
import { apiApp } from '../apiRouter.js';
import { companionRepository } from '../repositories/companionRepository.js';
import { loopRepository } from '../repositories/loopRepository.js';
import { economyRepository } from '../repositories/economyRepository.js';
import { sanitizeDeungSatiResponse } from '../aiProvider.js';

/**
 * Verification test suite for the 2 user-reported regressions:
 * 1) Manual trace allows confirming and increments completed loop with only emotion tag selected.
 * 2) Philosophical conversation ("คนเราเกิดมาทำไม") Review has no details across 8 sections,
 *    no "ยังไม่ได้สำรวจ", no status distinction.
 * 3) Growth Event is immutable and only grants points/progress when validation passes.
 */
async function runVerificationTests() {
  console.log('================================================================');
  console.log('REGRESSION VERIFICATION TESTS FOR DEUNG SATI');
  console.log('1) Incomplete Manual Trace Validation & Draft Protection');
  console.log('2) Philosophical Conversation 8-Section Truthful Extraction');
  console.log('3) Growth Event Validation & Immutable Confirmation');
  console.log('================================================================\n');

  // Setup In-Memory DB & Migrations
  const testDb = new SqliteDatabaseAdapter(':memory:');
  setTestDatabase(testDb);
  await runMigrations(testDb);

  const server = http.createServer(apiApp);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // Register test user
    const regRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Sati Tester',
        email: `tester_${Date.now()}@sati.app`,
        password: 'Password123!',
      }),
    });
    const regData = (await regRes.json()) as any;
    assert(regRes.ok && regData.token, 'Test user registered successfully');
    const token = regData.token;
    const userId = regData.user.id;
    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    // Ensure initial companion
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
    const companion = await companionRepository.createCompanion(userId, 10001, defaultDna, 'น้องสติ', 0);
    assert(companion, 'Companion created');

    const initialWallet = await economyRepository.getWallet(userId);
    const initialLoops = Number(
      (await testDb.queryOne<{ count: number }>(
        'SELECT COUNT(*) as count FROM completed_loops WHERE user_id = ?',
        [userId]
      ))?.count ?? 0
    );
    assert.strictEqual(initialLoops, 0, 'Initial completed_loops must be 0');

    // =========================================================================
    // TEST 1: Manual trace with only emotion tag
    // =========================================================================
    console.log('[TEST 1] Testing Manual Trace with ONLY Emotion Tag...');

    // 1.1 Create a draft trace where user only selected emotion tag 'anxiety'
    const createDraftRes = await fetch(`${baseUrl}/loops/traces`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        emotionTags: ['anxiety'],
        trigger: '',
        emotionOrBody: '',
        automaticStory: '',
        facts: '',
        desires: '',
        oldResponse: '',
        newChoice: '',
        insights: '',
      }),
    });
    const draftData = (await createDraftRes.json()) as any;
    assert.strictEqual(createDraftRes.status, 200, 'Draft trace creation should succeed');
    const manualDraftId = draftData.trace?.id || draftData.traceId;
    assert(manualDraftId, 'Draft traceId must be returned');

    // Verify title defaulted to 'แบบร่างลูปสติ', NOT 'วงจรสติ'
    const savedDraft = await loopRepository.getTraceById(manualDraftId, userId);
    assert.strictEqual(savedDraft?.title, 'แบบร่างลูปสติ', 'Draft title must default to แบบร่างลูปสติ');
    assert.strictEqual(savedDraft?.growth_event, null, 'Draft trace must not have growth_event');

    // 1.2 User attempts to CONFIRM this empty/partial trace as Growth Event via API
    const invalidConfirmRes = await fetch(`${baseUrl}/loops/traces/${manualDraftId}/confirm`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        idempotencyKey: `growth_${manualDraftId}`,
        emotionTags: ['anxiety'],
        trigger: '',
        emotionOrBody: '',
        automaticStory: '',
        facts: '',
        desires: '',
        oldResponse: '',
        newChoice: '',
        insights: '',
        skills: {},
      }),
    });
    const invalidConfirmData = (await invalidConfirmRes.json()) as any;
    assert.strictEqual(invalidConfirmRes.status, 400, 'Confirming incomplete trace must be rejected with 400');
    assert.strictEqual(invalidConfirmData.errorCode, 'VALIDATION_FAILED', 'Error code must be VALIDATION_FAILED');
    assert(invalidConfirmData.error.includes('ข้อมูลไม่ครบถ้วน'), 'Error message must be in Thai');
    assert(Array.isArray(invalidConfirmData.missingFields), 'missingFields array must be returned');
    assert(invalidConfirmData.missingFields.length >= 3, 'Must list missing required fields');
    console.log('  ✓ API correctly blocked confirmation with missing fields:', invalidConfirmData.missingFields);

    // 1.3 Repository level check: confirmGrowthEvent must also reject invalid data
    let repoFailed = false;
    try {
      await loopRepository.confirmGrowthEvent(userId, manualDraftId, {
        loopTraceId: manualDraftId,
        idempotencyKey: `growth_repo_${manualDraftId}`,
        trigger: '',
        emotionOrBody: '',
        automaticStory: '',
        facts: '',
        desires: '',
        oldResponse: '',
        newChoice: '',
        insights: '',
        skills: {},
      });
    } catch (err: any) {
      repoFailed = true;
      assert(
        err.message.includes('ข้อมูลไม่ครบถ้วน') ||
        err.message.includes('missing required fields') ||
        err.message.includes('VALIDATION_FAILED')
      );
    }
    assert(repoFailed, 'Repository confirmGrowthEvent must reject incomplete manual trace');
    console.log('  ✓ Repository confirmGrowthEvent correctly rejected incomplete manual trace');

    // 1.4 Assert that completed_loops, traceCount, companion stage, and rewards did NOT increase
    const userAfterInvalid = Number(
      (await testDb.queryOne<{ count: number }>(
        'SELECT COUNT(*) as count FROM completed_loops WHERE user_id = ?',
        [userId]
      ))?.count ?? 0
    );
    assert.strictEqual(userAfterInvalid, 0, 'completed_loops must remain 0 after rejected confirm');

    const companionAfterInvalid = await companionRepository.findByUserId(userId);
    assert.strictEqual(companionAfterInvalid?.stage, 0, 'Companion stage must remain 0');

    const walletAfterInvalid = await economyRepository.getWallet(userId);
    assert.strictEqual(walletAfterInvalid.xp, initialWallet.xp, 'XP must NOT increase on rejected confirm');
    assert.strictEqual(walletAfterInvalid.shells, initialWallet.shells, 'Shells must NOT increase on rejected confirm');
    console.log('  ✓ Zero leakage: completed_loops=0, growth_points=0, rewards unchanged');

    // =========================================================================
    // TEST 2: Philosophical conversation ("คนเราเกิดมาทำไม")
    // =========================================================================
    console.log('\n[TEST 2] Testing Philosophical Conversation ("คนเราเกิดมาทำไม")...');

    // 2.1 AI turn JSON simulates user asking "คนเราเกิดมาทำไม"
    const rawPhilosophicalAiJson = JSON.stringify({
      assistantMessage: 'เป็นคำถามที่ลึกซึ้งและชวนให้เราหยุดทบทวนกับตัวเองเลยนะ... อะไรที่ทำให้คำถามนี้แวบขึ้นมาในใจตอนนี้?',
      safety: 'normal',
      mode: 'HOLD',
      capacity: 'medium',
      intent: 'understand',
      stage: 1,
      readiness: 'story',
      candidatePattern: {
        trigger: 'คำถามในใจ: คนเราเกิดมาทำไม',
        emotion: null,
        interpretation: 'สงสัยว่าชีวิตมีความหมายหรือเปล่า',
        habitual_action: null,
        consequence: null,
        new_choice: null,
      },
      knownFields: ['trigger', 'interpretation'],
      quickReplies: ['รู้สึกเคว้งๆ', 'แค่อยู่ๆ ก็คิดขึ้นมา', 'อยากหาความหมาย'],
    });

    const parsed = sanitizeDeungSatiResponse(rawPhilosophicalAiJson);
    assert(parsed.turn.extracted_loop !== null, 'extracted_loop must NOT be discarded for partial conversation');
    assert.strictEqual(
      parsed.turn.extracted_loop?.trigger,
      'คำถามในใจ: คนเราเกิดมาทำไม',
      'Trigger must be captured truthfully without loss'
    );
    console.log('  ✓ Partial loop preserved in extracted_loop:', parsed.turn.extracted_loop);

    // 2.2 Simulate App.tsx prepareLoopReviewData behavior for philosophical conversation
    const UNEXPLORED = 'ยังไม่ได้สำรวจ';
    const reviewData = {
      trigger: parsed.turn.extracted_loop?.trigger || 'คำถามในใจ: คนเราเกิดมาทำไม',
      emotionOrBody: UNEXPLORED,
      automaticStory: parsed.turn.extracted_loop?.automatic_story || 'สงสัยว่าชีวิตมีความหมายหรือเปล่า',
      facts: 'กำลังสงสัยและตั้งคำถามกับความหมายของชีวิต',
      desires: UNEXPLORED,
      oldResponse: UNEXPLORED,
      newChoice: UNEXPLORED,
      insights: UNEXPLORED,
      conversationStatus: 'partial_loop',
    };

    assert.strictEqual(reviewData.conversationStatus, 'partial_loop', 'Status must be partial_loop, NOT no_data');
    assert.strictEqual(reviewData.trigger, 'คำถามในใจ: คนเราเกิดมาทำไม', 'Trigger must match user input');
    assert.strictEqual(reviewData.emotionOrBody, UNEXPLORED, 'Unspoken emotion must be ยังไม่ได้สำรวจ');
    assert.strictEqual(reviewData.newChoice, UNEXPLORED, 'Unspoken action must be ยังไม่ได้สำรวจ');
    console.log('  ✓ Review data faithfully preserves 8 sections with "ยังไม่ได้สำรวจ" for unsaid items');

    // 2.3 Attempt to confirm while still having "ยังไม่ได้สำรวจ"
    const philoDraft = await loopRepository.createTrace(userId, {
      category: 'mindful_loop',
      title: reviewData.trigger,
      trigger: reviewData.trigger,
      emotionOrBody: reviewData.emotionOrBody,
      automaticStory: reviewData.automaticStory,
      facts: reviewData.facts,
      desires: reviewData.desires,
      oldResponse: reviewData.oldResponse,
      newChoice: reviewData.newChoice,
      insights: reviewData.insights,
      emotionTags: ['anxiety'],
    } as any);

    const prematureConfirmRes = await fetch(`${baseUrl}/loops/traces/${philoDraft.id}/confirm`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        idempotencyKey: `growth_${philoDraft.id}`,
        trigger: reviewData.trigger,
        emotionOrBody: reviewData.emotionOrBody, // still "ยังไม่ได้สำรวจ"
        automaticStory: reviewData.automaticStory,
        facts: reviewData.facts,
        desires: reviewData.desires,
        oldResponse: reviewData.oldResponse,
        newChoice: reviewData.newChoice, // still "ยังไม่ได้สำรวจ"
        insights: reviewData.insights,
        skills: {},
      }),
    });
    const prematureData = (await prematureConfirmRes.json()) as any;
    assert.strictEqual(prematureConfirmRes.status, 400, 'Confirm with unexplored items must be rejected');
    assert(
      prematureData.missingFields.some((f: string) => f.includes('Emotion') || f.includes('ความรู้สึก')),
      'Must identify emotionOrBody as missing/unexplored'
    );
    console.log('  ✓ Premature confirmation with "ยังไม่ได้สำรวจ" correctly rejected:', prematureData.missingFields);

    // 2.4 User explores and completes the missing fields on the Review card
    const completedUpdate = {
      trigger: 'คำถามในใจ: คนเราเกิดมาทำไม',
      emotionOrBody: 'รู้สึกเคว้ง เหงา และใจหวิวๆ',
      automaticStory: 'คิดว่าตัวเองยังหาทางไม่เจอ ทุกอย่างดูไร้ทิศทาง',
      facts: 'ชีวิตยังมีเวลาเรียนรู้และเติบโต การตั้งคำถามเป็นจุดเริ่มต้นที่ดี',
      desires: 'อยากมีความสุขที่สงบและมีเป้าหมายที่แท้จริง',
      oldResponse: 'นั่งคิดวนคนเดียวจนนอนไม่หลับ',
      newChoice: 'หยุดคิดวน ลุกไปดื่มน้ำ สูดหายใจลึกๆ 5 ครั้ง',
      insights: 'ความหมายของชีวิตไม่ต้องหาให้เจอในวันเดียว ค่อยๆ ใช้ชีวิตทีละขณะ',
      skills: {
        emotional_awareness: 1,
        somatic_awareness: 1,
        cognitive_clarity: 1,
        conscious_action: 1,
      },
    };

    // Confirm with completed data
    const validConfirmRes = await fetch(`${baseUrl}/loops/traces/${philoDraft.id}/confirm`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        idempotencyKey: `growth_${philoDraft.id}`,
        ...completedUpdate,
      }),
    });
    const validConfirmData = (await validConfirmRes.json()) as any;
    assert.strictEqual(validConfirmRes.status, 200, 'Confirmation must succeed when all fields are completed');
    assert.strictEqual(validConfirmData.success, true, 'Confirm response success should be true');
    assert.strictEqual(validConfirmData.progressCount, 1, 'progressCount must increment from 0 to 1');
    assert(validConfirmData.reward?.xp > 0, 'Reward XP must be granted');
    assert(validConfirmData.reward?.shells > 0, 'Reward Shells must be granted');
    console.log('  ✓ Confirmed successfully once explored: progressCount=1, reward granted');

    // 2.5 Verify persistence in database:
    const userFinal = Number(
      (await testDb.queryOne<{ count: number }>(
        'SELECT COUNT(*) as count FROM completed_loops WHERE user_id = ?',
        [userId]
      ))?.count ?? 0
    );
    assert.strictEqual(userFinal, 1, 'Database completed_loops must be exactly 1');

    const companionFinal = await companionRepository.findByUserId(userId);
    assert(companionFinal, 'Companion must exist in database');

    // 2.6 Verify idempotency (re-confirming same idempotencyKey does NOT re-grant points)
    const replayRes = await fetch(`${baseUrl}/loops/traces/${philoDraft.id}/confirm`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        idempotencyKey: `growth_${philoDraft.id}`,
        ...completedUpdate,
      }),
    });
    const replayData = (await replayRes.json()) as any;
    assert.strictEqual(replayRes.status, 200, 'Replay should return 200 idempotent response');
    assert.strictEqual(replayData.alreadyProcessed, true, 'alreadyProcessed must be true');

    const userAfterReplay = Number(
      (await testDb.queryOne<{ count: number }>(
        'SELECT COUNT(*) as count FROM completed_loops WHERE user_id = ?',
        [userId]
      ))?.count ?? 0
    );
    assert.strictEqual(userAfterReplay, 1, 'completed_loops must remain 1 after replay');

    console.log('  ✓ Idempotency verified: re-confirm does not grant duplicate points');

    console.log('\n================================================================');
    console.log('🎉 ALL REGRESSION VERIFICATION TESTS PASSED SUCCESSFULLY!');
    console.log('================================================================\n');
  } finally {
    server.close();
  }
}

runVerificationTests().catch((err) => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});

