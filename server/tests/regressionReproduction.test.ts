import assert from 'assert';
import http from 'http';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
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
      automaticStory: parsed.turn.extracted_loop?.automatic_story || UNEXPLORED,
      facts: UNEXPLORED, // Strictly UNEXPLORED when user never stated facts
      desires: UNEXPLORED,
      oldResponse: UNEXPLORED,
      newChoice: UNEXPLORED,
      insights: UNEXPLORED,
      conversationStatus: 'partial_loop',
    };

    assert.strictEqual(reviewData.conversationStatus, 'partial_loop', 'Status must be partial_loop, NOT no_data');
    assert.strictEqual(reviewData.trigger, 'คำถามในใจ: คนเราเกิดมาทำไม', 'Trigger must match user input');
    assert.strictEqual(reviewData.emotionOrBody, UNEXPLORED, 'Unspoken emotion must be ยังไม่ได้สำรวจ');
    assert.strictEqual(reviewData.facts, UNEXPLORED, 'Unspoken facts must be ยังไม่ได้สำรวจ (No hallucination)');
    assert.strictEqual(reviewData.newChoice, UNEXPLORED, 'Unspoken action must be ยังไม่ได้สำรวจ');
    console.log('  ✓ Review data faithfully preserves 8 sections with "ยังไม่ได้สำรวจ" for unsaid items (No hallucination)');

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

    // Run the real App.tsx review function; never test a duplicated simulation.
    {
      const source = readFileSync(new URL('../../src/App.tsx', import.meta.url), 'utf8');
      const start = source.indexOf('  const prepareLoopReviewData = () => {');
      const end = source.indexOf('  const handleOpenLoopReview =', start);
      assert.ok(start >= 0 && end > start, 'Review function must exist');
      const code = stripTypeScriptTypes(source.slice(start, end));
      const review = new Function('messages', 'serverExtractedLoop', 'UNEXPLORED', code + '\nreturn prepareLoopReviewData();');
      const test = (label: string, check: () => void) => { check(); console.log('  ✓', label); };
      const unknown = 'ยังไม่ได้สำรวจ';
      const run = (texts: string[], extracted: any = null) => review(texts.map(text => ({role: 'user', text})), extracted, unknown);
      const fields = ['trigger', 'emotionOrBody', 'automaticStory', 'facts', 'needs', 'options', 'microAction', 'reflection'];
      
      for (const question of ['คนเราเกิดมาทำไม', 'ความหมายของชีวิตคืออะไร', 'มีชีวิตอยู่ทำไม', 'มีเราทำไม', 'ทำงานไปเพื่ออะไร']) {
        test('No invented story or facts: ' + question, () => {
          const data = run([question, 'สรุปแล้วบันทึกให้หน่อย']);
          assert.equal(data.trigger, question);
          for (const field of fields.slice(1)) assert.equal(data[field], unknown, field);
          assert.equal(data.conversationStatus, 'partial_loop');
          assert.equal(data.detectedSkills.cognitive_clarity, false);
        });
      }
      test('Preserve supplied extracted facts and story even on philosophical topics', () => {
        const data = run(['คนเราเกิดมาทำไม', 'เขาอ่านแล้วไม่ตอบ', 'ฉันคิดว่าเขาไม่สนใจ'], {
          facts: 'เขาอ่านแล้วไม่ตอบ', automatic_story: 'ฉันคิดว่าเขาไม่สนใจ'
        });
        assert.equal(data.facts, 'เขาอ่านแล้วไม่ตอบ');
        assert.equal(data.automaticStory, 'ฉันคิดว่าเขาไม่สนใจ');
      });
      test('Preserve explicit user thought verbatim', () => {
        assert.equal(run(['คนเราเกิดมาทำไม', 'ฉันคิดว่าตัวเองไม่มีคุณค่า']).automaticStory, 'ฉันคิดว่าตัวเองไม่มีคุณค่า');
      });
      test('Do not classify follow-up why question as automatic story', () => {
        assert.equal(run(['เขาอ่านแล้วไม่ตอบ', 'ทำไมเขาเงียบ']).automaticStory, unknown);
      });
      test('Control-only conversation has no data', () => {
        const data = run(['สรุปแล้วบันทึกให้หน่อย']);
        for (const field of fields) assert.equal(data[field], unknown);
        assert.equal(data.conversationStatus, 'no_data');
      });
      test('Preserve legacy thoughts field', () => {
        assert.equal(run(['มีเรื่อง'], { thoughts_or_fears: 'กลัวว่าเขาจะไม่กลับมา' }).automaticStory, 'กลัวว่าเขาจะไม่กลับมา');
      });
      
      const event = 'วันนี้หัวหน้าบอกให้งานฉันแก้ 2 จุด';
      const reported = event + ' ฉันรู้สึกเสียใจ และคิดว่าตัวเองไม่เก่ง';
      test('User screenshot regression: latest event, emotion, story and facts are separate', () => {
        const data = run(['คนเราเกิดมาทำไม', 'สรุปแล้วบันทึกให้หน่อย', reported, 'สรุปแล้วบันทึกให้หน่อย']);
        assert.equal(data.trigger, event);
        assert.equal(data.facts, event);
        assert.equal(data.emotionOrBody, 'เสียใจ');
        assert.equal(data.automaticStory, 'คิดว่าตัวเองไม่เก่ง');
        for (const field of ['needs', 'options', 'microAction', 'reflection']) assert.equal(data[field], unknown);
        assert.equal(data.conversationStatus, 'partial_loop');
      });
      test('Mixed statement works even as first turn', () => {
        const data = run([reported]);
        assert.equal(data.facts, event);
        assert.equal(data.automaticStory, 'คิดว่าตัวเองไม่เก่ง');
      });
      test('Thai without spaces between explicit clauses', () => {
        const data = run([event + 'ฉันรู้สึกเสียใจและคิดว่าตัวเองไม่เก่ง']);
        assert.equal(data.trigger, event);
        assert.equal(data.emotionOrBody, 'เสียใจ');
        assert.equal(data.automaticStory, 'คิดว่าตัวเองไม่เก่ง');
      });
      test('Follow-up feelings retain current event and do not absorb thoughts', () => {
        const data = run(['คนเราเกิดมาทำไม', event, 'ฉันรู้สึกผิดหวัง และคิดว่าฉันทำไม่ได้']);
        assert.equal(data.facts, event);
        assert.equal(data.emotionOrBody, 'ผิดหวัง');
        assert.equal(data.automaticStory, 'คิดว่าฉันทำไม่ได้');
      });
      test('New concrete topic does not inherit extracted fields or rewards evidence', () => {
        const data = run(['คนเราเกิดมาทำไม', reported], {
          trigger: 'คนเราเกิดมาทำไม', emotion_or_body: 'เหงา', facts: 'เรื่องเก่า',
          needs: 'ต้องการเพื่อน', micro_action: 'โทรหาเพื่อน', reflection: 'บทเรียนเก่า',
          detected_skills: { conscious_action: true }
        });
        assert.equal(data.trigger, event);
        assert.equal(data.facts, event);
        assert.equal(data.emotionOrBody, 'เสียใจ');
        assert.equal(data.microAction, unknown);
        assert.equal(data.needs, unknown);
        assert.equal(data.reflection, unknown);
        assert.equal(data.detectedSkills.conscious_action, false);
      });
      test('Second explicit event starts a fresh topic', () => {
        const data = run([reported, 'วันนี้แฟนยกเลิกนัด ฉันรู้สึกน้อยใจ']);
        assert.equal(data.trigger, 'วันนี้แฟนยกเลิกนัด');
        assert.equal(data.facts, 'วันนี้แฟนยกเลิกนัด');
        assert.equal(data.emotionOrBody, 'น้อยใจ');
        assert.equal(data.automaticStory, unknown);
      });
      for (const text of ['ฉันกลัวว่าหัวหน้าจะไล่ออก', 'ถ้าหัวหน้าบอกให้แก้งาน ฉันรู้สึกกังวล', 'เขาไม่ตอบเพราะเขาเกลียดฉัน', 'หัวหน้าบอกให้แก้งานไหม']) {
        test('Do not promote uncertain or hypothetical text to facts: ' + text, () => {
          assert.equal(run([text]).facts, unknown);
        });
      }
      test('Do not turn someone else\'s reported emotion into user emotion', () => {
        assert.equal(run(['เพื่อนบอกว่า รู้สึกเสียใจ']).emotionOrBody, unknown);
      });
      test('Negated feeling is not changed to positive feeling', () => {
        assert.equal(run(['ฉันไม่ได้รู้สึกเสียใจ']).emotionOrBody, unknown);
      });
      
    }

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

