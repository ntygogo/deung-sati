import express from 'express';
import { conversationsRouter } from './routes/conversations.js';
import type { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import { classifySafety } from './safetyClassifier.js';
import { streamChatResponse } from './aiProvider.js';
import { extractLoop } from './loopExtractor.js';
import { simulateConsequence } from './consequenceSimulator.js';
import { analyzeEmpathyLens } from './empathyLens.js';
import { filterCommunicationMessage } from './communicationFilter.js';
import { sessionStore } from './sessionStore.js';
import type { ChatEngineTurnResponse } from '../src/shared/chat-protocol/index.js';
import { validateLoopForConfirmation } from '../src/shared/chat-protocol/index.js';

export const apiApp = express();

apiApp.use(express.json({ limit: '750kb' }));
apiApp.use(cookieParser());
apiApp.use('/loops/conversations', conversationsRouter);

// 1. Health endpoint
apiApp.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// 2. Safety Triage endpoint
apiApp.post('/safety-check', async (req: Request, res: Response) => {
  try {
    const { messages } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'Messages array is required' });
      return;
    }

    const classification = await classifySafety(messages);
    res.json(classification);
  } catch (err) {
    console.error('Safety check error:', err);
    res.status(500).json({
      mode: 'normal',
      error: 'Failed to classify safety',
    });
  }
});

// 4. Pure Gemini Streaming Chat endpoint (SSE) with Structured Turn Contract
apiApp.post('/chat/stream', async (req: Request, res: Response) => {
  try {
    const { messages, sessionId = 'default-session', sessionState, requestId, exerciseResult, loopGuide, pastLoopContext } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'Messages array is required' });
      return;
    }

    const lastMsg = messages[messages.length - 1];
    const latestUserMsg = lastMsg?.content || '';

    // Safe debugging log (no secrets)
    console.log(
      `[Chat API] reqId=${requestId ?? 'none'}, count=${messages.length}, lastRole=${lastMsg?.role}, preview="${latestUserMsg.slice(0, 50)}"`
    );

    // Record user message in session
    sessionStore.recordUserTurn(sessionId, latestUserMsg);

    // Run safety classification gate (0ms fast path)
    const safety = await classifySafety(messages);

    // Setup Server-Sent Events headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    // Send safety event
    res.write(`event: safety\ndata: ${JSON.stringify(safety)}\n\n`);

    // Stream AI response directly from Gemini Multi-Turn with Shared Protocol Fallback
    await streamChatResponse({
      messages,
      safety,
      sessionState,
      requestId,
      exerciseResult,
      loopGuide,
      pastLoopContext,
      onAssistantToken: (chunkText: string) => {
        if (!res.writableEnded) {
          res.write(`event: assistant_token\ndata: ${JSON.stringify({ text: chunkText, requestId })}\n\n`);
          // Also emit legacy chunk event for backward compatibility
          res.write(`event: chunk\ndata: ${JSON.stringify({ text: chunkText, requestId })}\n\n`);
        }
      },
      onAssistantMeta: (meta: ChatEngineTurnResponse) => {
        if (!res.writableEnded) {
          res.write(
            `event: assistant_meta\ndata: ${JSON.stringify({
              requestId,
              safety_state: meta.safety_state,
              mode: meta.mode,
              capacity: meta.capacity,
              user_intent: meta.user_intent,
              readiness: meta.readiness,
              recommended_exercise: meta.recommended_exercise,
              quick_replies: meta.quick_replies,
            })}\n\n`
          );
        }
      },
      onDone: (
        fullText: string,
        source: 'gemini' | 'error',
        structuredTurn: ChatEngineTurnResponse
      ) => {
        // Record assistant turn in session
        sessionStore.recordAssistantTurn(sessionId, fullText);
        if (!res.writableEnded) {
          res.write(
            `event: done\ndata: ${JSON.stringify({
              requestId,
              fullText,
              source,
              structuredTurn,
              options: structuredTurn.quick_replies,
              recommended_exercise: structuredTurn.recommended_exercise,
              mode: structuredTurn.mode,
              safety_state: structuredTurn.safety_state,
              capacity: structuredTurn.capacity,
              user_intent: structuredTurn.user_intent,
              readiness: structuredTurn.readiness,
            })}\n\n`
          );
          res.end();
        }
      },
      onError: (err: Error) => {
        console.error('Chat stream error:', err);
        if (!res.writableEnded) {
          res.write(
            `event: error\ndata: ${JSON.stringify({
              requestId,
              message: 'เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง',
            })}\n\n`
          );
          res.end();
        }
      },
    });
  } catch (err) {
    console.error('Chat endpoint error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.end();
    }
  }
});

// 5. Structured Loop Extraction endpoint
apiApp.post('/extract-loop', async (req: Request, res: Response) => {
  try {
    const { messages } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'Messages array is required' });
      return;
    }
    const result = await extractLoop(messages);
    res.json(result);
  } catch (err) {
    console.error('Extract loop error:', err);
    res.status(500).json({ error: 'Failed to extract loop' });
  }
});

// 6. Consequence Simulator endpoint
apiApp.post('/simulate-consequence', async (req: Request, res: Response) => {
  try {
    const { actionDescription } = req.body;
    if (!actionDescription) {
      res.status(400).json({ error: 'actionDescription is required' });
      return;
    }
    const result = await simulateConsequence(actionDescription);
    res.json(result);
  } catch (err) {
    console.error('Simulate consequence error:', err);
    res.status(500).json({ error: 'Failed to simulate consequence' });
  }
});

// 7. Perspective / Empathy Lens endpoint (4-Quadrant)
apiApp.post('/analyze-empathy', async (req: Request, res: Response) => {
  try {
    const { rawConflictText } = req.body;
    if (!rawConflictText) {
      res.status(400).json({ error: 'rawConflictText is required' });
      return;
    }
    const result = await analyzeEmpathyLens(rawConflictText);
    res.json(result);
  } catch (err) {
    console.error('Analyze empathy error:', err);
    res.status(500).json({ error: 'Failed to analyze empathy' });
  }
});

// 8. Communication Filter / Before Speak endpoint (NVC 4-Style)
apiApp.post('/filter-communication', async (req: Request, res: Response) => {
  try {
    const rawMessage = req.body.rawMessage || req.body.message;
    if (!rawMessage) {
      res.status(400).json({ error: 'rawMessage is required' });
      return;
    }
    const result = await filterCommunicationMessage(rawMessage);
    res.json(result);
  } catch (err) {
    console.error('Filter communication error:', err);
    res.status(500).json({ error: 'Failed to filter communication' });
  }
});

// ==========================================
// 9. PHASE 2: AUTHENTICATION & SESSIONS
// ==========================================
import { authService } from './services/authService.js';
import { requireAuth, setSessionCookie, clearSessionCookie, type AuthenticatedRequest } from './middleware/auth.js';
import { userRepository } from './repositories/userRepository.js';
import { companionRepository, EMOTION_COLOR_MAP } from './repositories/companionRepository.js';
import { loopRepository } from './repositories/loopRepository.js';
import { economyRepository, EconomyRepository } from './repositories/economyRepository.js';
import { missionRepository } from './repositories/missionRepository.js';
import { legacyMigrationService } from './services/legacyMigrationService.js';

apiApp.post('/auth/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password, tier } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ error: 'Name, email, and password are required' });
      return;
    }
    const result = await authService.register(name, email, password, tier || 'free');
    setSessionCookie(res, result.token);
    res.json({
      success: true,
      token: result.token,
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        tier: result.user.tier,
      },
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Registration failed' });
  }
});

apiApp.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }
    const result = await authService.login(email, password);
    setSessionCookie(res, result.token);
    res.json({
      success: true,
      token: result.token,
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        tier: result.user.tier,
      },
    });
  } catch (err: any) {
    res.status(401).json({ error: err.message || 'Invalid credentials' });
  }
});

apiApp.post('/auth/logout', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const token = (req.cookies?.deung_sati_session || req.headers.authorization?.slice(7) || req.headers['x-session-token']) as string;
    if (token) {
      await authService.logout(token);
    }
    clearSessionCookie(res);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiApp.get('/auth/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    tier: user.tier,
    legacyMigratedAt: user.legacy_migrated_at,
    createdAt: user.created_at,
  });
});

// ==========================================
// 10. USER PRIVACY, CONSENT & DATA RETENTION
// ==========================================
apiApp.get('/user/export-data', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await userRepository.exportUserData(req.userId!);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiApp.delete('/user/account', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await userRepository.deleteAccount(req.userId!);
    res.json({ success: true, message: 'Account and associated data permanently purged' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiApp.post('/user/consent', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { purpose, granted } = req.body;
    if (!purpose || typeof granted !== 'boolean') {
      res.status(400).json({ error: 'purpose and granted are required' });
      return;
    }
    const record = await userRepository.recordConsent(req.userId!, purpose, granted);
    res.json(record);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 11. COMPANION & GROWTH DNA
// ==========================================
apiApp.get('/companion/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companion = await companionRepository.findByUserId(req.userId!);
    res.json({ companion });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiApp.post('/companion/create', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { seed, dna, name } = req.body;
    if (!seed || !dna) {
      res.status(400).json({ error: 'seed and dna are required' });
      return;
    }
    const companion = await companionRepository.createCompanion(req.userId!, Number(seed), dna, name);
    res.json({ companion });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiApp.post('/companion/stage', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { stage } = req.body;
    const companion = await companionRepository.setCosmeticStage(req.userId!, Number(stage));
    res.json({ companion });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiApp.post('/companion/equip', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { slot, itemId } = req.body;
    if (!slot || !itemId) {
      res.status(400).json({ error: 'slot and itemId are required' });
      return;
    }
    const equipped = await companionRepository.equipItem(req.userId!, slot, itemId);
    res.json({ equipped });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiApp.post('/companion/unequip', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { slot } = req.body;
    if (!slot) {
      res.status(400).json({ error: 'slot is required' });
      return;
    }
    const equipped = await companionRepository.unequipItem(req.userId!, slot);
    res.json({ equipped });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiApp.post('/companion/interact', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { moodState } = req.body;
    // Anti-farming rule: Petting/touch interaction only updates mood. Zero farmable points or loop progress granted.
    const companion = await companionRepository.updateMoodAndInteraction(req.userId!, moodState);
    res.json({ companion, reward: null });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiApp.post('/companion/hatch', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const completedLoopCount = await loopRepository.getCompletedLoopCount(req.userId!);
    if (completedLoopCount < 20) {
      res.status(400).json({
        error: `Cannot hatch yet. You have ${completedLoopCount}/20 completed loops. Need 20 completed loops to hatch!`,
        currentLoops: completedLoopCount,
        requiredLoops: 20,
      });
      return;
    }

    const companion = await companionRepository.findByUserId(req.userId!);
    if (!companion) {
      res.status(404).json({ error: 'Companion not found' });
      return;
    }

    // Pull all 20 progress-counted completed loops
    const completedLoops = await loopRepository.getCompletedLoops(req.userId!, 50, true);

    // Create permanent deterministic DNA snapshot from user's completed loops
    const snapshot = await companionRepository.createDnaSnapshot(companion.id, req.userId!, completedLoops);

    // Unlock Stage 1
    const updatedCompanion = await companionRepository.unlockNextStage(req.userId!, 1);

    // Authoritative Milestone Reward from server (+50 XP, +25 Shells)
    const reward = await economyRepository.awardReward(
      req.userId!,
      'hatch_milestone',
      `COMPANION_HATCH:${companion.id}`
    );

    res.json({ success: true, companion: updatedCompanion, snapshot, reward });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiApp.get('/companion/snapshot', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companion = await companionRepository.findByUserId(req.userId!);
    if (!companion) {
      res.status(404).json({ error: 'Companion not found' });
      return;
    }
    const snapshot = await companionRepository.getDnaSnapshot(companion.id);
    res.json({ snapshot });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 12. COMPLETED LOOPS (6-PART VALIDATION & ANTI-FARMING)
// ==========================================
apiApp.post('/loops/complete', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      conversationId,
      idempotencyKey,
      trigger,
      emotionOrBody,
      automaticStory,
      facts,
      oldResponse,
      newChoice,
      emotionTag,
      learningTypes,
      isReview,
      isCrisis,
    } = req.body;

    // Security Hardening: Client cannot dictate points, progress, or completed status.
    // Discard any client-supplied xp, shells, hatchProgress, or completed.

    // 1. Validate required identifiers
    if (!conversationId || typeof conversationId !== 'string') {
      res.status(400).json({ error: 'conversationId is required' });
      return;
    }
    if (!idempotencyKey || typeof idempotencyKey !== 'string') {
      res.status(400).json({ error: 'idempotencyKey is required' });
      return;
    }

    // 2. Validate all 6 core loop fields
    const fields = [
      { name: 'trigger (สิ่งที่เกิดขึ้น)', val: trigger, min: 3 },
      { name: 'emotionOrBody (ความรู้สึกหรือสัญญาณร่างกาย)', val: emotionOrBody, min: 2 },
      { name: 'automaticStory (ความคิดแวบแรก)', val: automaticStory, min: 3 },
      { name: 'facts (ข้อเท็จจริง)', val: facts, min: 3 },
      { name: 'oldResponse (สิ่งที่เคยตอบสนอง)', val: oldResponse, min: 3 },
      { name: 'newChoice (ทางเลือกใหม่)', val: newChoice, min: 3 },
    ];

    for (const f of fields) {
      if (!f.val || typeof f.val !== 'string' || f.val.trim().length < f.min) {
        res.status(400).json({
          error: `กรุณากรอก ${f.name} ให้ครบถ้วน (อย่างน้อย ${f.min} ตัวอักษร)`,
        });
        return;
      }
    }

    // 3. Cross-field uniqueness check (anti-farming: cannot just copy-paste same text into all 6 fields)
    const trimmedValues = fields.map((f) => f.val.trim().toLowerCase());
    const uniqueValues = new Set(trimmedValues);
    if (uniqueValues.size <= 2) {
      res.status(400).json({
        error: 'ข้อมูลในแต่ละช่องต้องแยกตามความเป็นจริง ไม่กรอกข้อความซ้ำกันทุกช่อง',
      });
      return;
    }

    // 4. Check Idempotency: rapid clicking / re-submit with same idempotencyKey
    const existingByIdemp = await loopRepository.findLoopByIdempotency(idempotencyKey);
    if (existingByIdemp) {
      const currentCount = await loopRepository.getCompletedLoopCount(req.userId!);
      res.json({
        success: true,
        alreadyProcessed: true,
        loop: existingByIdemp,
        progressCount: currentCount,
        message: 'ลูปนี้ได้รับการยืนยันแล้ว',
      });
      return;
    }

    // 5. Check duplicate per conversation: one conversation only awards 1 progress
    const existingForConv = await loopRepository.findCompletedLoopByConversation(req.userId!, conversationId);
    if (existingForConv && !isReview) {
      const currentCount = await loopRepository.getCompletedLoopCount(req.userId!);
      res.json({
        success: true,
        alreadyProcessed: true,
        loop: existingForConv,
        progressCount: currentCount,
        message: 'บทสนทนานี้ได้รับการบันทึกเป็น Completed Loop แล้ว',
      });
      return;
    }

    // 6. Near-duplicate detection against past loops
    const similarLoop = await loopRepository.findSimilarLoop(req.userId!, trigger, automaticStory);
    if (similarLoop && !isReview) {
      res.status(200).json({
        isDuplicateCandidate: true,
        message: 'ตรวจพบลูปที่คล้ายกับที่คุณเคยบันทึกไว้ นี่เป็นเหตุการณ์ใหม่หรือการทบทวนเดิม?',
        existingLoopId: similarLoop.id,
      });
      return;
    }

    // 7. Crisis Safety Check: Crisis sessions NEVER grant points/XP or gamified rewards
    const isCrisisSession = Boolean(isCrisis);

    // 8. Daily Reward Cap: max 5 rewarded loops per calendar day
    const todayRewardCount = await loopRepository.getTodayRewardedLoopCount(req.userId!);
    const isRewardCapped = todayRewardCount >= 5;

    const isReviewOnly = Boolean(isReview);
    // Reviewing an existing loop does NOT increment progress towards hatching
    const progressCounted = !isReviewOnly;

    // Server-authoritative rewards
    let rewardXp = 0;
    let rewardShells = 0;
    if (!isCrisisSession && !isReviewOnly && !isRewardCapped) {
      rewardXp = 20;
      rewardShells = 10;
    }

    // 9. Store Completed Loop
    const loop = await loopRepository.createCompletedLoop(req.userId!, {
      conversationId,
      idempotencyKey,
      trigger,
      emotionOrBody,
      automaticStory,
      facts,
      oldResponse,
      newChoice,
      emotionTag: emotionTag || 'calm',
      learningTypes: Array.isArray(learningTypes) ? learningTypes : [],
      isReviewOnly,
      progressCounted,
      rewardXp,
      rewardShells,
    });

    // Delete any draft for this conversation
    await loopRepository.deleteDraft(req.userId!, conversationId);

    // 10. Award economy rewards if applicable
    let walletResult = null;
    if (rewardXp > 0 || rewardShells > 0) {
      walletResult = await economyRepository.awardReward(
        req.userId!,
        'loop_confirmed',
        loop.id,
        { xp: rewardXp, shells: rewardShells, crystals: 0 }
      );
    }

    // 11. Update Growth DNA dynamically
    const companion = await companionRepository.findByUserId(req.userId!);
    let updatedDna = null;
    if (companion && progressCounted) {
      updatedDna = await companionRepository.updateGrowthDnaFromLoop(
        companion.id,
        loop.emotion_tag,
        loop.learning_types_json
      );
    }

    // 12. Current completed loop count & hatch readiness
    const progressCount = await loopRepository.getCompletedLoopCount(req.userId!);
    const newlyHatchable = progressCount >= 20 && companion?.stage === 0;

    const emotionInfo = EMOTION_COLOR_MAP[loop.emotion_tag.toLowerCase()] || {
      name: 'ความรู้ตัว',
      hex: '#FFB7C5',
    };

    res.json({
      success: true,
      loop,
      progressCount,
      newlyHatchable,
      reward: {
        xp: rewardXp,
        shells: rewardShells,
        dailyRewardCapped: isRewardCapped,
        wallet: walletResult?.wallet,
      },
      updatedDna,
      eggFeedback: {
        emotionColor: emotionInfo.hex,
        message: `น้องได้รับสีของ${emotionInfo.name}`,
        quote: 'สีเหล่านี้คือสิ่งที่เราเคยผ่าน ไม่ใช่สิ่งที่นิยามว่าเราเป็นใคร',
      },
    });
  } catch (err: any) {
    console.error('Complete loop error:', err);
    res.status(500).json({ error: err.message || 'Failed to complete loop' });
  }
});

apiApp.post('/loops/draft', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { conversationId, trigger, emotionOrBody, automaticStory, facts, oldResponse, newChoice } = req.body;
    if (!conversationId) {
      res.status(400).json({ error: 'conversationId is required' });
      return;
    }
    const draft = await loopRepository.saveDraft(req.userId!, conversationId, {
      trigger,
      emotionOrBody,
      automaticStory,
      facts,
      oldResponse,
      newChoice,
    });
    res.json({ success: true, draft });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiApp.get('/loops/draft/:conversationId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const convId = Array.isArray(req.params.conversationId)
      ? req.params.conversationId[0]
      : String(req.params.conversationId);
    const draft = await loopRepository.getDraft(req.userId!, convId);
    res.json({ draft });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiApp.get('/loops/completed', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const loops = await loopRepository.getCompletedLoops(req.userId!);
    const totalCount = await loopRepository.getCompletedLoopCount(req.userId!);
    res.json({ loops, totalCount });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiApp.get('/loops/traces', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const traces = await loopRepository.getTraces(req.userId!);
    const totalCount = await loopRepository.getCompletedLoopCount(req.userId!);
    res.json({ traces, totalCount });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiApp.get('/loops/traces/:traceId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const traceId = Array.isArray(req.params.traceId) ? req.params.traceId[0] : String(req.params.traceId);
    const trace = await loopRepository.getTraceById(traceId, req.userId!);
    if (!trace) {
      res.status(404).json({ error: 'Trace not found or unauthorized' });
      return;
    }
    res.json({ trace });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

const handleUpdateTrace = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const traceId = Array.isArray(req.params.traceId) ? req.params.traceId[0] : String(req.params.traceId);
    const updated = await loopRepository.updateTrace(req.userId!, traceId, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Trace not found or unauthorized' });
      return;
    }
    res.json({ success: true, trace: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

apiApp.put('/loops/traces/:traceId', requireAuth, handleUpdateTrace);
apiApp.patch('/loops/traces/:traceId', requireAuth, handleUpdateTrace);

apiApp.post('/loops/traces/:traceId/confirm', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const traceId = Array.isArray(req.params.traceId) ? req.params.traceId[0] : String(req.params.traceId);
    const {
      conversationId = 'default_conv',
      idempotencyKey,
      trigger,
      emotionOrBody,
      automaticStory,
      facts,
      oldResponse,
      newChoice,
      desires,
      insights,
      emotionTags,
      skills = {},
      isReview = false,
      isCrisis = false,
    } = req.body;

    if (!idempotencyKey) {
      res.status(400).json({ error: 'idempotencyKey is required' });
      return;
    }

    const existingTrace = await loopRepository.getTraceById(traceId, req.userId!);
    if (!existingTrace) {
      res.status(404).json({ error: 'Loop trace not found or unauthorized' });
      return;
    }

    const isAlreadyConfirmed = existingTrace.growth_event != null;

    const resolvedTrigger = trigger || existingTrace.trigger || '';
    const resolvedEmotion = emotionOrBody || existingTrace.emotion_or_body || '';
    const resolvedStory = automaticStory || existingTrace.automatic_story || existingTrace.thoughts_or_fears || '';
    const resolvedFacts = facts || existingTrace.facts || (existingTrace.raw_data_json as any)?.facts || '';
    const resolvedChoice = newChoice || existingTrace.new_choice || '';
    const resolvedInsights = insights || existingTrace.insights || '';

    const validation = validateLoopForConfirmation({
      trigger: resolvedTrigger,
      emotionOrBody: resolvedEmotion,
      automaticStory: resolvedStory,
      facts: resolvedFacts,
      newChoice: resolvedChoice,
      insights: resolvedInsights,
    });

    if (!isAlreadyConfirmed && !validation.isValid) {
      res.status(400).json({
        error: `ข้อมูลไม่ครบถ้วนสำหรับการยืนยัน Growth Event (ยังขาด: ${validation.missingFields.join(', ')}) กรุณาระบุข้อมูลให้ครบถ้วน หรือบันทึกเป็นแบบร่างไว้ก่อน`,
        errorCode: 'VALIDATION_FAILED',
        missingFields: validation.missingFields,
      });
      return;
    }

    const result = await loopRepository.confirmGrowthEvent(req.userId!, {
      loopTraceId: traceId,
      conversationId,
      idempotencyKey,
      trigger,
      emotionOrBody,
      automaticStory,
      facts,
      oldResponse,
      newChoice,
      desires,
      insights,
      emotionTags: Array.isArray(emotionTags) ? emotionTags : [],
      skills: {
        emotional_awareness: skills.emotional_awareness ? 1 : 0,
        somatic_awareness: skills.somatic_awareness ? 1 : 0,
        cognitive_clarity: skills.cognitive_clarity ? 1 : 0,
        conscious_action: skills.conscious_action ? 1 : 0,
      },
      isReview: Boolean(isReview),
      isCrisis: Boolean(isCrisis),
    });

    res.json(result);
  } catch (err: any) {
    if (err.message && (err.message.includes('unauthorized') || err.message.includes('not found'))) {
      res.status(404).json({ error: err.message });
      return;
    }
    console.error('Confirm growth event error:', err);
    res.status(500).json({ error: err.message || 'Failed to confirm growth event' });
  }
});

apiApp.post('/loops/traces', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      category,
      title,
      summary,
      rawTurnData,
      sessionId,
      conversationId,
      thoughtsOrFears,
      desires,
      oldResponse,
      newChoice,
      insights,
      emotionTags,
      practicedSkills,
      id,
      traceId,
      trigger,
      emotionOrBody,
      automaticStory,
      facts,
      skills,
    } = req.body;

    const derivedCategory = category || 'mindful_loop';
    const derivedTitle = (title || trigger || 'แบบร่างลูปสติ').trim();
    const derivedSummary = (summary || emotionOrBody || automaticStory || 'แบบร่างการเรียนรู้').trim();
    const activeSessionId = sessionId || conversationId || null;

    const initialRaw: any = typeof rawTurnData === 'object' && rawTurnData !== null ? { ...rawTurnData } : {};
    if (trigger !== undefined) initialRaw.trigger = trigger;
    if (emotionOrBody !== undefined) initialRaw.emotionOrBody = emotionOrBody;
    if (automaticStory !== undefined) initialRaw.automaticStory = automaticStory;
    if (facts !== undefined) initialRaw.facts = facts;
    if (desires !== undefined) initialRaw.desires = desires;
    if (oldResponse !== undefined) initialRaw.oldResponse = oldResponse;
    if (newChoice !== undefined) initialRaw.newChoice = newChoice;
    if (insights !== undefined) initialRaw.insights = insights;
    if (emotionTags !== undefined) initialRaw.emotionTags = emotionTags;

    const trace = await loopRepository.createTrace(req.userId!, {
      id: id || traceId,
      category: derivedCategory,
      title: derivedTitle,
      summary: derivedSummary,
      rawTurnData: initialRaw,
      sessionId: activeSessionId,
      conversationId: activeSessionId,
      trigger: typeof trigger === 'string' ? trigger : (title && title !== 'แบบร่างลูปสติ' ? title : ''),
      emotionOrBody: typeof emotionOrBody === 'string' ? emotionOrBody : (summary && summary !== 'แบบร่างการเรียนรู้' ? summary : ''),
      automaticStory: automaticStory || thoughtsOrFears,
      thoughtsOrFears: thoughtsOrFears || automaticStory,
      desires,
      facts,
      oldResponse,
      newChoice,
      insights,
      emotionTags: Array.isArray(emotionTags) ? emotionTags : [],
      practicedSkills: practicedSkills || (skills ? Object.keys(skills).filter((k) => skills[k]) : []),
    } as any);

    const totalCount = await loopRepository.getCompletedLoopCount(req.userId!);
    res.json({ trace, totalCount });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiApp.get('/loops/patterns', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const patterns = await loopRepository.getPatterns(req.userId!);
    res.json({ patterns });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiApp.post('/loops/patterns', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const pattern = await loopRepository.createOrConfirmPattern(req.userId!, req.body);
    res.json({ pattern });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 13. ECONOMY, WALLET & MISSIONS
// ==========================================
apiApp.get('/wallet/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const wallet = await economyRepository.getWallet(req.userId!);
    res.json({ wallet });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiApp.post('/wallet/reward', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { eventType, eventId, isCrisis } = req.body;
    if (!eventType || !eventId) {
      res.status(400).json({ error: 'eventType and eventId are required' });
      return;
    }

    // Security Hardening: Client CANNOT dictate point values.
    // Server strictly determines rewards based on verified event types.
    const serverReward = EconomyRepository.getRewardForEventType(eventType);
    if (!serverReward) {
      res.status(400).json({ error: `Invalid or unrecognized eventType: ${eventType}` });
      return;
    }

    const result = await economyRepository.awardReward(
      req.userId!,
      eventType,
      eventId,
      serverReward,
      Boolean(isCrisis)
    );
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiApp.post('/wallet/purchase', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { itemId, priceShells, priceCrystals } = req.body;
    if (!itemId) {
      res.status(400).json({ error: 'itemId is required' });
      return;
    }
    const wallet = await economyRepository.purchaseItem(
      req.userId!,
      itemId,
      Number(priceShells || 0),
      Number(priceCrystals || 0)
    );
    res.json({ success: true, wallet });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiApp.get('/missions/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const missions = await missionRepository.getUserMissions(req.userId!);
    res.json({ missions });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 14. SAFE LEGACY MIGRATION (from localStorage)
// ==========================================
apiApp.post('/user/migrate-legacy-local', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validation = legacyMigrationService.validatePayload(req.body);
    if (!validation.valid) {
      res.status(400).json({ error: validation.error });
      return;
    }

    const summary = await legacyMigrationService.migrateLegacyData(req.userId!, req.body);
    res.json(summary);
  } catch (err: any) {
    console.error('Legacy migration error:', err);
    res.status(500).json({ error: err.message || 'Legacy data migration failed' });
  }
});

