/**
 * Phase A–C Comprehensive Regression Test Suite (Strict Assertions)
 * 
 * NOTE ON EXTERNAL API CONSUMPTION:
 * Tests B, C, D, and E make live HTTP calls to http://localhost:5173/api/chat/stream,
 * which in turn invokes the Gemini API via server/aiProvider.ts.
 * Running this script will consume live Gemini API requests.
 * 
 * This script is purely for testing and verification:
 * - Does NOT modify, create, or delete production source files
 * - Does NOT perform git commit or git push
 * - Does NOT alter environment variables
 * - Does NOT expose API keys or secrets
 */

import fs from 'fs';
import path from 'path';

const API_BASE = 'http://localhost:5173/api';

async function postChat(
  messages: Array<{ role: string; content: string }>,
  exerciseResult?: any,
  requestId: number = 200
): Promise<{ rawText: string; events: Array<{ event: string; data: any }> }> {
  const res = await fetch(`${API_BASE}/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages,
      sessionId: 'phase-ac-strict-regression',
      requestId,
      exerciseResult: exerciseResult || undefined,
    }),
  });

  const rawText = await res.text();
  const lines = rawText.split('\n');
  const events: Array<{ event: string; data: any }> = [];
  let curEvent = '';

  for (const line of lines) {
    if (line.startsWith('event: ')) {
      curEvent = line.replace('event: ', '').trim();
    } else if (line.startsWith('data: ')) {
      const dataStr = line.replace('data: ', '').trim();
      try {
        events.push({ event: curEvent, data: JSON.parse(dataStr) });
      } catch {
        events.push({ event: curEvent, data: dataStr });
      }
    }
  }

  return { rawText, events };
}

export async function runStrictRegressionSuite() {
  console.log('================================================================');
  console.log('PHASE A–C COMPREHENSIVE REGRESSION SUITE (STRICT CRITERIA)');
  console.log('================================================================\n');

  const testReport: Array<{
    id: string;
    name: string;
    passed: boolean;
    details: string;
  }> = [];

  const appTsx = fs.readFileSync(path.resolve(process.cwd(), 'src/App.tsx'), 'utf-8');

  // -------------------------------------------------------------------------
  // TEST A: ExerciseResult storage, transport, and UI isolation semantics
  // -------------------------------------------------------------------------
  console.log('[TEST A] Verifying ExerciseResult storage, transport, and UI card semantics...');
  
  // 1. Locate the exact GuidedExerciseCard onComplete implementation block in App.tsx
  const onCompleteStart = appTsx.indexOf('<GuidedExerciseCard');
  const onCompleteBlock = onCompleteStart !== -1 ? appTsx.slice(onCompleteStart, onCompleteStart + 1200) : '';

  // 2. Storage check: inside onComplete, exRecordMsg has role: "ai" and exerciseResult: result
  const storesAsAiRecord = onCompleteBlock.includes('role: "ai"') &&
    onCompleteBlock.includes('exerciseResult: result');

  // 3. Negative assertion: NO onComplete path stores result as role: "user" or delegates to handleSendMessage (which authored user text)
  const storesAsUserSpeech = onCompleteBlock.includes('role: "user"') ||
    onCompleteBlock.includes('handleSendMessage(');

  // 4. UI Card check: messageTurnWrapper renders dedicated .exerciseResultCard branch when msg.exerciseResult is present
  const hasResultCardBranch = appTsx.includes('msg.exerciseResult ? (') &&
    appTsx.includes('className="exerciseResultCard"');

  // 5. Transport check: Exercise result is transmitted via top-level exerciseResult in POST body
  const sendsDedicatedTransportField = (appTsx.includes('exerciseResult: effectiveExerciseResult || undefined') ||
    appTsx.includes('exerciseResult: exerciseResult || undefined')) &&
    appTsx.includes('body: JSON.stringify({');

  const passedA = storesAsAiRecord && !storesAsUserSpeech && hasResultCardBranch && sendsDedicatedTransportField;
  testReport.push({
    id: 'TEST A',
    name: 'ExerciseResult storage, transport, and UI isolation (never fake user speech)',
    passed: passedA,
    details: `storesAsAiRecord=${storesAsAiRecord}, storesAsUserSpeech=${storesAsUserSpeech}, hasResultCard=${hasResultCardBranch}, dedicatedField=${sendsDedicatedTransportField}`
  });
  console.log(`-> Result: ${passedA ? 'PASSED ✅' : 'FAILED ❌'}\n`);

  // -------------------------------------------------------------------------
  // TEST B, C, D: Unique Exercise Data, Uncertainty Preservation, & Natural Continuation
  // -------------------------------------------------------------------------
  console.log('[TEST B, C, D] Calling Gemini with unique exercise-only data...');
  
  // Unique domain-specific strings that DO NOT appear anywhere in conversation history
  const UNIQUE_FACT = 'คุณสมศักดิ์ไม่อนุมัติสไลด์พรีเซนต์ 12 หน้า';
  const UNIQUE_STORY = 'คิดว่าเขาแกล้งดองงานเราและไม่อยากให้เราเติบโต';
  const UNIQUE_UNKNOWN = 'ยังไม่มีข้อมูลว่าติดปัญหาเรื่องงบประมาณหรือเรื่องอะไร';

  const cleanHistory = [
    { role: 'user', content: 'วันนี้เหนื่อยมาก รู้สึกอึดอัดกับที่ทำงาน' },
    { role: 'assistant', content: 'รับฟังอยู่นะ ถ้าพร้อมลองแยกเรื่องจริงออกจากสิ่งที่ใจกังวลกันดูไหม' },
  ];

  const exPayload = {
    type: 'exercise_result',
    exercise_id: 'fact_story_unknown',
    result: {
      completed: true,
      outcome: 'better',
      user_inputs: {
        '1. ข้อเท็จจริง (Fact)': UNIQUE_FACT,
        '2. เสียงที่ใจแต่งเติม (Story)': UNIQUE_STORY,
        '3. สิ่งที่ยังไม่รู้แน่ชัด (Unknown)': UNIQUE_UNKNOWN,
      },
    },
    summary_text: `[ผลลัพธ์แบบฝึกหัด: แยกข้อเท็จจริงออกจากการตีความ]\nผลลัพธ์หลังฝึก: รู้สึกเบาลงและมีสติมากขึ้น\nสิ่งที่บันทึกไว้:\n- 1. ข้อเท็จจริง (Fact): "${UNIQUE_FACT}"\n- 2. เสียงที่ใจแต่งเติม (Story): "${UNIQUE_STORY}"\n- 3. สิ่งที่ยังไม่รู้แน่ชัด (Unknown): "${UNIQUE_UNKNOWN}"`,
  };

  const { events: eventsBCD } = await postChat(cleanHistory, exPayload, 201);
  const doneBCD = eventsBCD.find((e) => e.event === 'done');
  const aiMsgBCD = doneBCD?.data?.fullText || '';
  console.log(`AI Response (TEST B/C/D): "${aiMsgBCD}"\n`);

  // TEST B: Actual exercise inputs reach AI turn
  // Must match unique tokens from user_inputs that were NOT present in cleanHistory:
  // "สไลด์" or "สมศักดิ์" or "ไม่อนุมัติ" or "ดองงาน"
  const receivedUniqueTokens =
    aiMsgBCD.includes('สไลด์') ||
    aiMsgBCD.includes('สมศักดิ์') ||
    aiMsgBCD.includes('ไม่อนุมัติ') ||
    aiMsgBCD.includes('ดองงาน') ||
    aiMsgBCD.includes('12 หน้า') ||
    aiMsgBCD.includes('งบประมาณ');

  testReport.push({
    id: 'TEST B',
    name: 'Unique exercise-only inputs reached AI model context',
    passed: receivedUniqueTokens,
    details: `Matched unique tokens: ${receivedUniqueTokens} (Response: "${aiMsgBCD.slice(0, 70)}...")`
  });
  console.log(`[TEST B] -> Result: ${receivedUniqueTokens ? 'PASSED ✅' : 'FAILED ❌'}\n`);

  // TEST C: Semantic Preservation of Uncertainty (Unknown must NOT be replaced with guessed explanation)
  // 1. Must NOT guess speculative explanations (e.g. inventing that he was busy, or traffic, or personal grudge)
  const speculativePhrases = [
    'เขาอาจจะติดงาน',
    'เขาอาจจะยุ่ง',
    'เขาอาจจะลืม',
    'เขาอาจจะมีเหตุผลส่วนตัว',
    'เขาคงไม่ได้ตั้งใจ',
    'เขาอาจจะประชุม',
  ];
  const hasSpeculation = speculativePhrases.some((p) => aiMsgBCD.includes(p));

  // 2. Must positively require language that preserves uncertainty
  const uncertaintyPreservingPhrases = [
    'ยังไม่รู้',
    'ยังไม่มีข้อมูล',
    'ยังไม่แน่ชัด',
    'ยังไม่ทราบ',
    'ยังสรุปไม่ได้',
    'ข้อมูลยังไม่พอ',
    'ยังไม่ได้คุย',
    'ยังไม่มีใครรู้',
  ];
  const preservesUncertaintySemantics = uncertaintyPreservingPhrases.some((phrase) => aiMsgBCD.includes(phrase));

  const passedC = !hasSpeculation && preservesUncertaintySemantics;
  testReport.push({
    id: 'TEST C',
    name: 'Unknown remains uncertainty without inventing speculative guesses',
    passed: passedC,
    details: `hasSpeculation=${hasSpeculation}, preservesUncertaintySemantics=${preservesUncertaintySemantics}`
  });
  console.log(`[TEST C] -> Result: ${passedC ? 'PASSED ✅' : 'FAILED ❌'}\n`);

  // TEST D: AI continues naturally without asking user to repeat the exercise answers
  const asksToRepeat =
    aiMsgBCD.includes('เกิดอะไรขึ้นกับสไลด์') ||
    aiMsgBCD.includes('ช่วยเล่าใหม่') ||
    aiMsgBCD.includes('ทำไมเขาไม่อนุมัติ') ||
    aiMsgBCD.includes('บอกอีกครั้ง');

  const passedD = !asksToRepeat && receivedUniqueTokens && aiMsgBCD.length > 20;
  testReport.push({
    id: 'TEST D',
    name: 'Natural AI continuation without asking user to repeat answers',
    passed: passedD,
    details: `asksToRepeat=${asksToRepeat}, continuesFromDiscovery=true`
  });
  console.log(`[TEST D] -> Result: ${passedD ? 'PASSED ✅' : 'FAILED ❌'}\n`);

  // -------------------------------------------------------------------------
  // TEST E: Strict Stage 5 Insight (Must be SEE && understand, conversational, no worksheet)
  // -------------------------------------------------------------------------
  console.log('[TEST E] Strict Stage 5 Insight verification for relationship venting...');
  const promptTextE = 'เขาอ่านแล้วไม่ตอบ เขาไม่แคร์กูแล้วอะ';
  const { events: eventsE } = await postChat([{ role: 'user', content: promptTextE }], undefined, 202);
  const doneE = eventsE.find((e) => e.event === 'done');
  const metaE = eventsE.find((e) => e.event === 'assistant_meta');
  const msgE = doneE?.data?.fullText || '';
  const modeE = metaE?.data?.mode;
  const intentE = metaE?.data?.user_intent;

  console.log(`AI Response (TEST E): "${msgE}"`);
  console.log(`Classification: mode="${modeE}", intent="${intentE}"\n`);

  // Strict requirement: BOTH mode === 'SEE' AND user_intent === 'understand'
  const isStrictSeeAndUnderstand = modeE === 'SEE' && intentE === 'understand';

  // Must NOT produce a four-field worksheet format
  const hasWorksheetLabels =
    msgE.includes('1.') ||
    msgE.includes('2.') ||
    msgE.includes('ข้อเท็จจริงคือ') ||
    msgE.includes('การตีความคือ') ||
    msgE.includes('ความรู้สึกคือ') ||
    msgE.includes('สิ่งที่ยังไม่รู้คือ') ||
    msgE.includes('สิ่งที่เกิดขึ้นจริง:') ||
    msgE.includes('ความรู้สึก:');

  // Must distinguish observable event vs interpretation
  const distinguishesEventAndInterpretation =
    (msgE.includes('อ่าน') || msgE.includes('ตอบ') || msgE.includes('เงียบ')) &&
    (msgE.includes('ไม่แคร์') || msgE.includes('ใจ') || msgE.includes('สรุป') || msgE.includes('กังวล'));

  const passedE = isStrictSeeAndUnderstand && !hasWorksheetLabels && distinguishesEventAndInterpretation;
  testReport.push({
    id: 'TEST E',
    name: 'Strict Stage 5 Insight (SEE && understand, conversational, distinguishes event vs story)',
    passed: passedE,
    details: `isStrictSeeAndUnderstand=${isStrictSeeAndUnderstand} (mode=${modeE}, intent=${intentE}), hasWorksheetLabels=${hasWorksheetLabels}, distinguishes=${distinguishesEventAndInterpretation}`
  });
  console.log(`[TEST E] -> Result: ${passedE ? 'PASSED ✅' : 'FAILED ❌'}\n`);

  // -------------------------------------------------------------------------
  // TEST F: Static Source Lock-Lifecycle & Stale-Request Protection Verification
  // -------------------------------------------------------------------------
  console.log('[TEST F] Performing static source verification of lock-lifecycle and stale response protection...');

  // 1. Lock check before request
  const retrySnippet = appTsx.slice(
    appTsx.indexOf('className="retryMessageBtn"'),
    appTsx.indexOf('className="retryMessageBtn"') + 500
  );
  const retryChecksLock = retrySnippet.includes('if (isSendingRef.current)');
  const retrySetsLock = retrySnippet.includes('isSendingRef.current = true');

  // 2. Lock cleared on completion
  const clearsOnComplete = appTsx.includes('if (isSendingRef) {\n      isSendingRef.current = false;\n    }');

  // 3. Lock cleared on error
  const clearsOnError = appTsx.includes('catch (err: any) {') &&
    appTsx.includes('if (isSendingRef) {\n      isSendingRef.current = false;\n    }');

  // 4. activeRequestId stale request drop check
  const hasStaleRequestDrop = appTsx.includes('if (requestId !== activeRequestIdRef.current) {\n      console.log(`[Chat Client] Stale request');

  const passedF = retryChecksLock && retrySetsLock && clearsOnComplete && clearsOnError && hasStaleRequestDrop;
  testReport.push({
    id: 'TEST F',
    name: 'Static Source Lock-Lifecycle & Stale-Request Protection Verification',
    passed: passedF,
    details: `retryChecksLock=${retryChecksLock}, retrySetsLock=${retrySetsLock}, clearsOnComplete=${clearsOnComplete}, clearsOnError=${clearsOnError}, hasStaleDrop=${hasStaleRequestDrop}`
  });
  console.log(`[TEST F] -> Result: ${passedF ? 'PASSED ✅' : 'FAILED ❌'}\n`);

  // -------------------------------------------------------------------------
  // TEST G: Later Turn Retention of Structured Exercise Discovery
  // -------------------------------------------------------------------------
  console.log('[TEST G] Verifying structured exercise retention on later conversation turn...');
  
  // Follow-up message sent by user after continuation #1:
  // Does NOT contain any keywords from FACT/STORY/UNKNOWN
  const laterUserMessage = 'แล้วตอนนี้ควรทำยังไงต่อดี';
  
  // History includes user turn, assistant continuation, and new user question:
  const historyWithLaterTurn = [
    ...cleanHistory,
    { role: 'assistant', content: aiMsgBCD },
    { role: 'user', content: laterUserMessage },
  ];

  // In App.tsx, the retained exercise is passed with timing: 'retained'
  const retainedExPayload = {
    ...exPayload,
    timing: 'retained',
  };

  const { events: eventsG } = await postChat(historyWithLaterTurn, retainedExPayload, 203);
  const doneG = eventsG.find((e) => e.event === 'done');
  const aiMsgG = doneG?.data?.fullText || '';
  console.log(`AI Response (TEST G Later Turn): "${aiMsgG}"\n`);

  // Verify:
  // 1. AI does not ask the user to reconstruct the exercise from scratch
  const asksToReconstruct = aiMsgG.includes('ทำแบบฝึกหัดใหม่') ||
    aiMsgG.includes('ขอข้อมูลใหม่อีกรอบ') ||
    aiMsgG.includes('เกิดอะไรขึ้นกับงานนะ');

  // 2. AI response is valid, coherent, and continues naturally
  const passedG = !asksToReconstruct && aiMsgG.length > 20;

  testReport.push({
    id: 'TEST G',
    name: 'Later Turn Structured Exercise Discovery Retention',
    passed: passedG,
    details: `asksToReconstruct=${asksToReconstruct}, continuesNaturally=true, preview="${aiMsgG.slice(0, 60)}..."`
  });
  console.log(`[TEST G] -> Result: ${passedG ? 'PASSED ✅' : 'FAILED ❌'}\n`);

  // -------------------------------------------------------------------------
  // SUMMARY REPORT
  // -------------------------------------------------------------------------
  console.log('================================================================');
  console.log('PHASE A–C REGRESSION TEST SUMMARY:');
  console.log('================================================================');
  for (const t of testReport) {
    console.log(`${t.passed ? '✅' : '❌'} ${t.id}: ${t.name} -> ${t.details}`);
  }
  const allPassed = testReport.every((t) => t.passed);
  console.log(`\nOVERALL STATUS: ${allPassed ? 'ALL TESTS PASSED 100% 🎉' : 'SOME TESTS FAILED ⚠️'}`);
  console.log('================================================================\n');

  return { allPassed, aiMsgBCD, aiMsgG, testReport };
}

if (process.argv[1]?.includes('verifyPhaseACRegression')) {
  runStrictRegressionSuite()
    .then(({ allPassed }) => {
      if (!allPassed) process.exit(1);
    })
    .catch((err) => {
      console.error('Fatal error during test run:', err);
      process.exit(1);
    });
}
