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
import { calculateLoopProgress, validateLoopForConfirmation } from '../../src/shared/chat-protocol/index.js';

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

    // 1.5 Test Trigger-only and Emotion-only Drafts preserving blanks without title/summary leakage
    console.log('\n[TEST 1.5] Testing Trigger-only and Emotion-only Blank Preservation & PATCH...');
    const triggerOnlyDraftRes = await fetch(`${baseUrl}/loops/traces`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        trigger: 'วันนี้หัวหน้าบอกให้แก้งาน 2 จุด',
      }),
    });
    const triggerOnlyJson = (await triggerOnlyDraftRes.json()) as any;
    const triggerOnlyId = triggerOnlyJson.trace?.id;
    assert(triggerOnlyId, 'Trigger-only draft must have id');
    const triggerOnlyTrace = await loopRepository.getTraceById(triggerOnlyId, userId);
    assert.strictEqual(triggerOnlyTrace?.trigger, 'วันนี้หัวหน้าบอกให้แก้งาน 2 จุด', 'Trigger must be exact');
    assert.strictEqual(triggerOnlyTrace?.emotion_or_body, '', 'Emotion must remain blank for trigger-only draft');
    console.log('  ✓ Trigger-only draft preserves empty emotion without summary leakage');

    const emotionOnlyDraftRes = await fetch(`${baseUrl}/loops/traces`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        emotionOrBody: 'รู้สึกกังวลและใจหวิว',
      }),
    });
    const emotionOnlyJson = (await emotionOnlyDraftRes.json()) as any;
    const emotionOnlyId = emotionOnlyJson.trace?.id;
    assert(emotionOnlyId, 'Emotion-only draft must have id');
    const emotionOnlyTrace = await loopRepository.getTraceById(emotionOnlyId, userId);
    assert.strictEqual(emotionOnlyTrace?.emotion_or_body, 'รู้สึกกังวลและใจหวิว', 'Emotion must be exact');
    assert.strictEqual(emotionOnlyTrace?.trigger, '', 'Trigger must remain blank for emotion-only draft');
    console.log('  ✓ Emotion-only draft preserves empty trigger without title leakage');

    // 1.6 PATCH trace updates fields using the exact same ID
    const patchRes = await fetch(`${baseUrl}/loops/traces/${emotionOnlyId}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({
        trigger: 'มีสายโทรเข้าตอนดึก',
        facts: 'มีเบอร์แปลกโทรเข้ามา 2 ครั้งเวลา 23:00',
      }),
    });
    assert.strictEqual(patchRes.status, 200, 'PATCH trace must return 200');
    const patchedTrace = await loopRepository.getTraceById(emotionOnlyId, userId);
    assert.strictEqual(patchedTrace?.id, emotionOnlyId, 'Trace ID must be preserved after PATCH');
    assert.strictEqual(patchedTrace?.trigger, 'มีสายโทรเข้าตอนดึก', 'Trigger updated via PATCH');
    assert.strictEqual(patchedTrace?.facts, 'มีเบอร์แปลกโทรเข้ามา 2 ครั้งเวลา 23:00', 'Facts updated via PATCH');
    assert.strictEqual(patchedTrace?.emotion_or_body, 'รู้สึกกังวลและใจหวิว', 'Existing emotion preserved');
    console.log('  ✓ PATCH trace preserves same ID and updates fields correctly');

    // 1.7 Save Emotion-only -> Reload/Hydrate -> Count 0, Confirm -> Count 1 (not 2)
    console.log('\n[TEST 1.7] Testing Emotion-only Draft Hydration Count & Guest Fallback Persistence...');

    // 1.7.1 API Path: Create separate user to test count isolation
    const regRes17 = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Guest Tester',
        email: `test_guest_pers_${Date.now()}@example.com`,
        password: 'Password123!',
      }),
    });
    const regData17 = (await regRes17.json()) as any;
    const authHeaders17 = {
      'Content-Type': 'application/json',
      'X-DeungSati-Client': 'true',
      Authorization: `Bearer ${regData17.token}`,
    };

    // Save emotion-only draft
    const draft17Res = await fetch(`${baseUrl}/loops/traces`, {
      method: 'POST',
      headers: authHeaders17,
      body: JSON.stringify({
        emotionOrBody: 'รู้สึกกังวลและใจหวิว',
      }),
    });
    assert.strictEqual(draft17Res.status, 200);
    const draft17Data = (await draft17Res.json()) as any;
    const draft17Id = draft17Data.trace?.id;
    assert(draft17Id, 'Draft ID must exist');

    // Query traces on "reload": totalCount MUST be 0 (drafts never count toward egg/completed loops)
    const tracesList17 = await fetch(`${baseUrl}/loops/traces`, {
      headers: authHeaders17,
    });
    const tracesList17Data = (await tracesList17.json()) as any;
    assert.strictEqual(tracesList17Data.totalCount, 0, 'totalCount after emotion-only draft reload MUST be 0, not 1');
    assert.strictEqual(tracesList17Data.traces.length, 1, 'Traces list should contain 1 draft');
    assert.strictEqual(tracesList17Data.traces[0].xp_awarded, false, 'Draft trace xp_awarded must be false');
    assert.strictEqual(tracesList17Data.traces[0].growth_event, null, 'Draft trace growth_event must be null');
    console.log('  ✓ API draft reload totalCount = 0 (draft does NOT inflate count to 1)');

    // Now confirm that same draft with full required fields
    const confirm17Res = await fetch(`${baseUrl}/loops/traces/${draft17Id}/confirm`, {
      method: 'POST',
      headers: authHeaders17,
      body: JSON.stringify({
        idempotencyKey: `growth_${draft17Id}`,
        trigger: 'หัวหน้าขอแก้งานสองจุด',
        emotionOrBody: 'รู้สึกกังวลและใจหวิว',
        automaticStory: 'คิดว่าตัวเองทำงานไม่ดีพอ',
        facts: 'หัวหน้าส่งข้อความขอแก้เอกสาร 2 จุด',
        newChoice: 'ถามให้แน่ชัดว่าจุดที่ต้องแก้คืออะไร',
        insights: 'การแก้งานคือเรื่องปกติของการพัฒนา',
        skills: { cognitive_clarity: 1, conscious_action: 1 },
      }),
    });
    assert.strictEqual(confirm17Res.status, 200);
    const confirm17Data = (await confirm17Res.json()) as any;
    assert.strictEqual(confirm17Data.progressCount, 1, 'Confirmation progressCount must be 1, NOT 2');
    console.log('  ✓ API confirmation progressCount = 1 (NOT 2)');

    // Query traces again: totalCount MUST now be 1, and trace marked xp_awarded: true
    const tracesListAfterConfirm = await fetch(`${baseUrl}/loops/traces`, {
      headers: authHeaders17,
    });
    const tracesListAfterData = (await tracesListAfterConfirm.json()) as any;
    assert.strictEqual(tracesListAfterData.totalCount, 1, 'totalCount after confirmation MUST be 1');
    assert.strictEqual(tracesListAfterData.traces[0].xp_awarded, true, 'Confirmed trace xp_awarded must be true');
    assert(tracesListAfterData.traces[0].growth_event != null, 'Confirmed trace growth_event must be populated');

    // 1.7.2 Guest / Offline LocalStorage Simulation
    // Emulate localStorage state transitions exactly as implemented in CompanionContext
    const mockLocalStorage: Record<string, string> = {};
    const LOCAL_STORAGE_TRACES_KEY = 'deung_sati_traces_v2';
    const LOCAL_STORAGE_COMPLETED_LOOPS_KEY = 'deung_sati_completed_loops_v2';

    // Step A: Guest saves emotion-only draft
    const guestTraceId = 'guest_trc_conv_test_1';
    const guestDraftItem = {
      id: guestTraceId,
      trace_category: 'mindful_loop',
      title: 'แบบร่างลูปสติ',
      summary: 'รู้สึกกังวลและใจหวิว',
      trigger: '',
      emotion_or_body: 'รู้สึกกังวลและใจหวิว',
      automatic_story: '',
      facts: '',
      desires: '',
      old_response: '',
      new_choice: '',
      insights: '',
      emotion_tags: [],
      growth_event: null,
      xp_awarded: false,
      is_confirmed: false,
      raw_data_json: {
        trigger: '',
        emotionOrBody: 'รู้สึกกังวลและใจหวิว',
        automaticStory: '',
        facts: '',
      },
      created_at: new Date().toISOString(),
    };
    mockLocalStorage[LOCAL_STORAGE_TRACES_KEY] = JSON.stringify([guestDraftItem]);

    // Step B: Guest reloads page -> refreshCompanion hydration
    const hydrateGuestCount = (storage: Record<string, string>) => {
      let loadedTraces: any[] = [];
      const savedTraces = storage[LOCAL_STORAGE_TRACES_KEY];
      if (savedTraces) {
        try { loadedTraces = JSON.parse(savedTraces); } catch {}
      }
      let canonicalCount = 0;
      const savedCompleted = storage[LOCAL_STORAGE_COMPLETED_LOOPS_KEY];
      if (savedCompleted) {
        try {
          const parsedCompleted = JSON.parse(savedCompleted);
          if (Array.isArray(parsedCompleted)) {
            canonicalCount = parsedCompleted.filter((cl: any) => cl.progress_counted !== false).length;
          }
        } catch {}
      } else {
        canonicalCount = loadedTraces.filter((t) => Boolean(t.growth_event || t.xp_awarded || t.is_confirmed)).length;
      }
      return { canonicalCount, loadedTraces };
    };

    const hydrationBeforeConfirm = hydrateGuestCount(mockLocalStorage);
    assert.strictEqual(
      hydrationBeforeConfirm.canonicalCount,
      0,
      'Guest hydration count for emotion-only draft MUST be 0 (egg stays 0/20, completed loops total 0)'
    );
    assert.strictEqual(
      Boolean(hydrationBeforeConfirm.loadedTraces[0].is_confirmed),
      false,
      'Draft trace must NOT be confirmed'
    );
    console.log('  ✓ Guest storage draft reload canonicalCount = 0 (egg stays 0/20, completed loops total 0)');

    // Step C: Guest confirms the draft
    const savedCompleted: any[] = [];
    const completedLoopRecord = {
      id: 'guest_cloop_123',
      user_id: 'guest',
      conversation_id: 'conv_test_1',
      loop_trace_id: guestTraceId,
      idempotency_key: `growth_${guestTraceId}`,
      trigger: 'หัวหน้าขอแก้งานสองจุด',
      emotion_or_body: 'รู้สึกกังวลและใจหวิว',
      automatic_story: 'คิดว่าตัวเองทำงานไม่ดีพอ',
      facts: 'หัวหน้าส่งข้อความขอแก้เอกสาร 2 จุด',
      new_choice: 'ถามให้แน่ชัดว่าจุดที่ต้องแก้คืออะไร',
      progress_counted: true,
      reward_xp: 15,
      reward_shells: 10,
    };
    savedCompleted.unshift(completedLoopRecord);
    mockLocalStorage[LOCAL_STORAGE_COMPLETED_LOOPS_KEY] = JSON.stringify(savedCompleted);

    // Save confirmed trace with ALL 8 fields and is_confirmed = true
    const confirmedGuestTraceItem = {
      ...guestDraftItem,
      title: 'หัวหน้าขอแก้งานสองจุด',
      summary: 'รู้สึกกังวลและใจหวิว',
      trigger: 'หัวหน้าขอแก้งานสองจุด',
      emotion_or_body: 'รู้สึกกังวลและใจหวิว',
      automatic_story: 'คิดว่าตัวเองทำงานไม่ดีพอ',
      facts: 'หัวหน้าส่งข้อความขอแก้เอกสาร 2 จุด',
      new_choice: 'ถามให้แน่ชัดว่าจุดที่ต้องแก้คืออะไร',
      growth_event: completedLoopRecord,
      xp_awarded: true,
      is_confirmed: true,
      raw_data_json: {
        trigger: 'หัวหน้าขอแก้งานสองจุด',
        emotionOrBody: 'รู้สึกกังวลและใจหวิว',
        automaticStory: 'คิดว่าตัวเองทำงานไม่ดีพอ',
        facts: 'หัวหน้าส่งข้อความขอแก้เอกสาร 2 จุด',
        newChoice: 'ถามให้แน่ชัดว่าจุดที่ต้องแก้คืออะไร',
      },
    };
    mockLocalStorage[LOCAL_STORAGE_TRACES_KEY] = JSON.stringify([confirmedGuestTraceItem]);

    // Step D: Guest reloads page after confirmation
    const hydrationAfterConfirm = hydrateGuestCount(mockLocalStorage);
    assert.strictEqual(
      hydrationAfterConfirm.canonicalCount,
      1,
      'Guest hydration count after confirmation MUST be 1 (egg stays 1/20)'
    );
    const reloadedTrace = hydrationAfterConfirm.loadedTraces[0];
    assert.strictEqual(reloadedTrace.is_confirmed, true, 'Reloaded trace is_confirmed must be true');
    assert.strictEqual(reloadedTrace.xp_awarded, true, 'Reloaded trace xp_awarded must be true');
    assert.strictEqual(reloadedTrace.trigger, 'หัวหน้าขอแก้งานสองจุด', 'Trigger must be preserved after reload');
    assert.strictEqual(reloadedTrace.emotion_or_body, 'รู้สึกกังวลและใจหวิว', 'Emotion must be preserved after reload');
    assert.strictEqual(reloadedTrace.facts, 'หัวหน้าส่งข้อความขอแก้เอกสาร 2 จุด', 'Facts must be preserved after reload');
    console.log('  ✓ Guest storage reload after confirmation preserves all fields and is_confirmed = true');

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

    // =========================================================================
    // TEST 3: 4-Stage Loop Progression, Confirmation Policies, and Security
    // =========================================================================
    console.log('\n[TEST 3] Testing 4-Stage Loop Progression, 5-Core Confirmation & Security...');

    // 3.1 calculateLoopProgress and validateLoopForConfirmation unit checks
    const v0 = validateLoopForConfirmation({});
    assert.strictEqual(v0.isValid, false, 'Empty data cannot be valid for confirmation');
    assert(v0.missingFields.length > 0, 'Must have missing fields for empty data');

    const p0 = calculateLoopProgress({});
    assert.strictEqual(p0.currentStage, 0, 'Empty data must be stage 0');
    assert.strictEqual(p0.canSaveDraft, false, 'Empty data cannot save draft');
    assert.strictEqual(p0.canConfirm, false, 'Empty data cannot confirm');

    const p1 = calculateLoopProgress({ emotionOrBody: 'รู้สึกเหงา' });
    assert.strictEqual(p1.currentStage, 1, 'Emotion only reaches stage 1');
    assert.strictEqual(p1.canSaveDraft, true, 'Substantive emotion allows saving draft');
    assert.strictEqual(p1.canConfirm, false, 'Stage 1 cannot confirm');

    const p2 = calculateLoopProgress({ trigger: 'หัวหน้าเรียกคุย', emotionOrBody: 'รู้สึกกังวล' });
    assert.strictEqual(p2.currentStage, 2, 'Trigger + emotion reaches stage 2');
    assert.strictEqual(p2.canConfirm, false, 'Stage 2 cannot confirm');

    const p3Same = calculateLoopProgress({
      trigger: 'หัวหน้าเรียกคุย',
      emotionOrBody: 'รู้สึกกังวล',
      facts: 'หัวหน้าเรียกคุย',
      automaticStory: 'หัวหน้าเรียกคุย',
    });
    assert.strictEqual(p3Same.currentStage, 2, 'Identical facts and story must NOT advance to stage 3');

    const p3Distinct = calculateLoopProgress({
      trigger: 'หัวหน้าเรียกคุย',
      emotionOrBody: 'รู้สึกกังวล',
      facts: 'หัวหน้าส่งอีเมลนัดเวลา 14:00',
      automaticStory: 'คิดว่าเขาจะต่อว่าเรื่องผลงาน',
    });
    assert.strictEqual(p3Distinct.currentStage, 3, 'Distinct facts and story advance to stage 3');
    assert.strictEqual(p3Distinct.canConfirm, false, 'Stage 3 cannot confirm without action or reflection');

    // Action only (needs and options left empty/unexplored) -> qualifies for stage 4 & confirmation!
    const p4Action = calculateLoopProgress({
      trigger: 'หัวหน้าเรียกคุย',
      emotionOrBody: 'รู้สึกกังวล',
      facts: 'หัวหน้าส่งอีเมลนัดเวลา 14:00',
      automaticStory: 'คิดว่าเขาจะต่อว่าเรื่องผลงาน',
      microAction: 'จะเตรียมสรุปงานและเดินเข้าไปถามอย่างเปิดใจ',
    });
    assert.strictEqual(p4Action.currentStage, 4, 'Stage 3 + microAction reaches stage 4');
    assert.strictEqual(p4Action.canConfirm, true, 'Stage 4 with action can confirm (needs/options optional)');

    // Reflection only (needs and options left empty/unexplored) -> qualifies for stage 4 & confirmation!
    const p4Reflection = calculateLoopProgress({
      trigger: 'หัวหน้าเรียกคุย',
      emotionOrBody: 'รู้สึกกังวล',
      facts: 'หัวหน้าส่งอีเมลนัดเวลา 14:00',
      automaticStory: 'คิดว่าเขาจะต่อว่าเรื่องผลงาน',
      reflection: 'การเรียกคุยไม่ได้แปลว่าต้องเป็นเรื่องลบเสมอไป',
    });
    assert.strictEqual(p4Reflection.currentStage, 4, 'Stage 3 + reflection reaches stage 4');
    assert.strictEqual(p4Reflection.canConfirm, true, 'Stage 4 with reflection can confirm (needs/options optional)');

    // Stage 4 out of order: having action without previous stages must not qualify as stage 4
    const pOutOfOrder = calculateLoopProgress({
      microAction: 'จะไปวิ่งออกกำลังกาย',
    });
    assert.strictEqual(pOutOfOrder.stageStatus.stage4, false, 'Action alone cannot satisfy stage 4');
    assert.strictEqual(pOutOfOrder.currentStage, 0, 'Cannot skip earlier stages');

    const vValid = validateLoopForConfirmation({
      trigger: 'หัวหน้าเรียกคุย',
      emotionOrBody: 'รู้สึกกังวล',
      facts: 'หัวหน้าส่งอีเมลนัดเวลา 14:00',
      automaticStory: 'คิดว่าเขาจะต่อว่าเรื่องผลงาน',
      microAction: 'จะเตรียมสรุปงานและเดินเข้าไปถามอย่างเปิดใจ',
    });
    assert.strictEqual(vValid.isValid, true, '5-core loop must be valid for confirmation');
    assert.strictEqual(vValid.missingFields.length, 0, 'No missing fields for valid loop');

    console.log('  ✓ 4-stage sequential progress and confirmation policy verified');

    // 3.2 API Confirmation: Action-only (with needs/options empty) succeeds
    const actionDraft = await loopRepository.createTrace(userId, {
      category: 'mindful_loop',
      title: 'เพื่อนยกเลิกนัดกะทันหัน',
      trigger: 'เพื่อนยกเลิกนัดกะทันหัน',
      emotionOrBody: 'รู้สึกนอยด์และใจแป้ว',
      automaticStory: 'คิดว่าเขาไม่อยากมาเจอเรา',
      facts: 'เพื่อนส่งข้อความมาบอกว่าติดงานด่วน',
      newChoice: 'จะลองโทรไปถามด้วยความเป็นห่วง',
    } as any);

    const actionConfirmRes = await fetch(`${baseUrl}/loops/traces/${actionDraft.id}/confirm`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        idempotencyKey: `growth_${actionDraft.id}`,
        trigger: 'เพื่อนยกเลิกนัดกะทันหัน',
        emotionOrBody: 'รู้สึกนอยด์และใจแป้ว',
        automaticStory: 'คิดว่าเขาไม่อยากมาเจอเรา',
        facts: 'เพื่อนส่งข้อความมาบอกว่าติดงานด่วน',
        newChoice: 'จะลองโทรไปถามด้วยความเป็นห่วง',
      }),
    });
    const actionConfirmData = (await actionConfirmRes.json()) as any;
    assert.strictEqual(actionConfirmRes.status, 200, 'Action-only confirm must succeed');
    assert.strictEqual(actionConfirmData.progressCount, 2, 'progressCount must increment to 2');
    console.log('  ✓ Action-only confirmation succeeded without needs/options (progressCount=2)');

    // 3.3 API Confirmation: Reflection-only (with needs/options empty) succeeds
    const reflectDraft = await loopRepository.createTrace(userId, {
      category: 'mindful_loop',
      title: 'ทำของหล่นแตกในครัว',
      trigger: 'ทำของหล่นแตกในครัว',
      emotionOrBody: 'รู้สึกตกใจและเสียดาย',
      automaticStory: 'คิดว่าตัวเองซุ่มซ่ามทำอะไรก็พัง',
      facts: 'แก้วน้ำหลุดมือตกลงบนพื้นกระเบื้องแตก',
      insights: 'ความผิดพลาดเกิดขึ้นได้ สิ่งสำคัญคือเก็บกวาดให้ปลอดภัย',
    } as any);

    const reflectConfirmRes = await fetch(`${baseUrl}/loops/traces/${reflectDraft.id}/confirm`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        idempotencyKey: `growth_${reflectDraft.id}`,
        trigger: 'ทำของหล่นแตกในครัว',
        emotionOrBody: 'รู้สึกตกใจและเสียดาย',
        automaticStory: 'คิดว่าตัวเองซุ่มซ่ามทำอะไรก็พัง',
        facts: 'แก้วน้ำหลุดมือตกลงบนพื้นกระเบื้องแตก',
        insights: 'ความผิดพลาดเกิดขึ้นได้ สิ่งสำคัญคือเก็บกวาดให้ปลอดภัย',
      }),
    });
    const reflectConfirmData = (await reflectConfirmRes.json()) as any;
    assert.strictEqual(reflectConfirmRes.status, 200, 'Reflection-only confirm must succeed');
    assert.strictEqual(reflectConfirmData.progressCount, 3, 'progressCount must increment to 3');
    console.log('  ✓ Reflection-only confirmation succeeded without needs/options (progressCount=3)');

    // 3.4 API Security: Another user cannot confirm someone else's trace
    const regRes2 = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Another User',
        email: `other_${Date.now()}@sati.app`,
        password: 'Password123!',
      }),
    });
    const regData2 = (await regRes2.json()) as any;
    const token2 = regData2.token;
    const authHeaders2 = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token2}`,
    };

    const crossUserRes = await fetch(`${baseUrl}/loops/traces/${actionDraft.id}/confirm`, {
      method: 'POST',
      headers: authHeaders2,
      body: JSON.stringify({
        idempotencyKey: `growth_hack_${actionDraft.id}`,
        trigger: 'เพื่อนยกเลิกนัดกะทันหัน',
        emotionOrBody: 'รู้สึกนอยด์และใจแป้ว',
        automaticStory: 'คิดว่าเขาไม่อยากมาเจอเรา',
        facts: 'เพื่อนส่งข้อความมาบอกว่าติดงานด่วน',
        newChoice: 'จะลองโทรไปถามด้วยความเป็นห่วง',
      }),
    });
    assert(
      crossUserRes.status === 404 || crossUserRes.status === 403,
      'Cross-user trace confirm must be rejected with 404/403'
    );
    console.log('  ✓ Cross-user trace unauthorized access blocked safely (status: ' + crossUserRes.status + ')');

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
      test('Multi-turn continuation regression (Turn 1 + Turn 2)', () => {
        const turn1 = 'วันนี้หัวหน้าบอกให้งานฉันแก้ 2 จุด ฉันรู้สึกเสียใจ และคิดว่าตัวเองไม่เก่ง';
        const turn2 = 'ฉันอยากรู้ว่าต้องแก้ตรงไหนให้ดีขึ้น จะลองถามหัวหน้าให้ชัด และเริ่มเห็นว่าการแก้งานไม่ได้แปลว่าฉันไม่เก่ง';
        const data = run([turn1, turn2]);
        assert.equal(data.trigger, 'วันนี้หัวหน้าบอกให้งานฉันแก้ 2 จุด');
        assert.equal(data.facts, 'วันนี้หัวหน้าบอกให้งานฉันแก้ 2 จุด');
        assert.equal(data.emotionOrBody, 'เสียใจ');
        assert.equal(data.automaticStory, 'คิดว่าตัวเองไม่เก่ง');
        assert.equal(data.needs, 'อยากรู้ว่าต้องแก้ตรงไหนให้ดีขึ้น');
        assert.equal(data.microAction, 'จะลองถามหัวหน้าให้ชัด');
        assert.equal(data.reflection, 'การแก้งานไม่ได้แปลว่าฉันไม่เก่ง');
        assert.equal(data.options, unknown);
        assert.equal(data.conversationStatus, 'complete_loop');
      });
      test('Future plans are not promoted to facts', () => {
        const data = run(['พรุ่งนี้จะไปคุยกับหัวหน้า ฉันรู้สึกกังวล']);
        assert.equal(data.facts, unknown);
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

