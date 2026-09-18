import crypto from 'crypto';
import { ConversationRepository } from './conversationRepository.js';
import { db } from '../db/database.js';
import type { IDatabaseAdapter } from '../db/types.js';
import { companionRepository } from './companionRepository.js';
import { validateLoopForConfirmation } from '../../src/shared/chat-protocol/index.js';

export interface LoopTraceRecord {
  id: string;
  user_id: string;
  source_session_id?: string;
  trace_category: string;
  title: string;
  summary: string;
  raw_data_json: any;
  xp_awarded: boolean;
  trigger?: string;
  emotion_or_body?: string;
  automatic_story?: string;
  desires?: string | null;
  facts?: string;
  old_response?: string | null;
  new_choice?: string | null;
  insights?: string | null;
  emotion_tags?: string[];
  thoughts_or_fears?: string | null;
  emotion_tags_json?: string[] | null;
  practiced_skills_json?: string[] | null;
  created_at: string;
  updated_at?: string;
  growth_event?: CompletedLoopRecord | null;
}

export interface LoopPatternRecord {
  id: string;
  user_id: string;
  name: string;
  status: 'suggested' | 'confirmed' | 'rejected' | 'active_practice' | 'archived';
  trigger_pattern: string;
  recurring_thoughts: string;
  habitual_response: string;
  typical_consequences: string;
  new_choice_experiment: string | null;
  helpful_strategies_json: any;
  detection_speed_trend: string | null;
  created_at: string;
  updated_at: string;
  evidenceTraces?: LoopTraceRecord[];
}

export interface CompletedLoopRecord {
  id: string;
  user_id: string;
  conversation_id: string;
  loop_trace_id?: string | null;
  idempotency_key: string;
  trigger: string;
  emotion_or_body: string;
  automatic_story: string;
  facts: string;
  old_response: string;
  new_choice: string;
  desires?: string | null;
  insights?: string | null;
  emotion_tag: string;
  emotion_tags_json?: string[] | null;
  learning_types_json: string[];
  emotional_awareness?: number;
  somatic_awareness?: number;
  cognitive_clarity?: number;
  conscious_action?: number;
  snapshot_data_json?: any;
  is_review_only: boolean;
  progress_counted: boolean;
  reward_xp: number;
  reward_shells: number;
  created_at: string;
}

export interface LoopDraftRecord {
  id: string;
  user_id: string;
  conversation_id: string;
  trigger: string | null;
  emotion_or_body: string | null;
  automatic_story: string | null;
  facts: string | null;
  old_response: string | null;
  new_choice: string | null;
  updated_at: string;
}

export class LoopRepository {
  private adapter: IDatabaseAdapter;

  constructor(adapter: IDatabaseAdapter = db) {
    this.adapter = adapter;
  }

  async createTrace(
    arg1: string | any,
    arg2?: any
  ): Promise<LoopTraceRecord> {
    let userId: string;
    let data: any;

    if (typeof arg1 === 'object' && arg1 !== null) {
      data = arg1;
      userId = data.userId;
    } else {
      userId = arg1;
      data = arg2 || {};
    }

    let traceId = data.id || data.traceId;
    const sessionId = data.sessionId || data.conversationId || null;
    await new ConversationRepository(this.adapter).assertCanCreateTrace(userId, sessionId);

    // Check if an existing draft exists for this ID or this conversation to prevent duplicate drafts on retries
    let existingTrace: LoopTraceRecord | null = null;
    if (traceId) {
      existingTrace = await this.adapter.queryOne<LoopTraceRecord>(
        'SELECT * FROM loop_traces WHERE id = $1 AND user_id = $2',
        [traceId, userId]
      );
    } else if (sessionId) {
      existingTrace = await this.adapter.queryOne<LoopTraceRecord>(
        'SELECT * FROM loop_traces WHERE source_session_id = $1 AND user_id = $2 ORDER BY created_at DESC LIMIT 1',
        [sessionId, userId]
      );
    }

    if (existingTrace) {
      await this.updateTrace(existingTrace.id, userId, {
        title: (data.title || data.trigger || existingTrace.title || 'วงจรสติ').trim(),
        summary: (data.summary || data.emotionOrBody || existingTrace.summary || 'บันทึกการเรียนรู้').trim(),
        thoughtsOrFears: data.thoughtsOrFears || data.automaticStory || existingTrace.thoughts_or_fears,
        desires: data.desires !== undefined ? data.desires : existingTrace.desires,
        oldResponse: data.oldResponse !== undefined ? data.oldResponse : existingTrace.old_response,
        newChoice: data.newChoice !== undefined ? data.newChoice : existingTrace.new_choice,
        insights: data.insights !== undefined ? data.insights : existingTrace.insights,
        emotionTags: data.emotionTags || existingTrace.emotion_tags_json,
        practicedSkills: data.practicedSkills || existingTrace.practiced_skills_json,
      });
      return (await this.getTraceById(existingTrace.id, userId))!;
    }

    if (!traceId) {
      traceId = `trc_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    }
    const category = data.category || 'mindful_loop';
    const title = (data.title || data.trigger || 'แบบร่างลูปสติ').trim();
    const summary = (data.summary || data.emotionOrBody || data.automaticStory || 'แบบร่างการเรียนรู้').trim();
    const rawData: any = typeof data.rawTurnData === 'object' && data.rawTurnData !== null
      ? { ...data.rawTurnData }
      : {};
    if (data.trigger !== undefined) rawData.trigger = data.trigger;
    if (data.emotionOrBody !== undefined) rawData.emotionOrBody = data.emotionOrBody;
    if (data.automaticStory !== undefined) rawData.automaticStory = data.automaticStory;
    if (data.facts !== undefined) rawData.facts = data.facts;
    if (data.desires !== undefined) rawData.desires = data.desires;
    if (data.oldResponse !== undefined) rawData.oldResponse = data.oldResponse;
    if (data.newChoice !== undefined) rawData.newChoice = data.newChoice;
    if (data.insights !== undefined) rawData.insights = data.insights;
    if (data.emotionTags !== undefined) rawData.emotionTags = data.emotionTags;
    const thoughtsOrFears = data.thoughtsOrFears || data.automaticStory || null;
    const desires = data.desires || null;
    const oldResponse = data.oldResponse || null;
    const newChoice = data.newChoice || null;
    const insights = data.insights || null;
    const emotionTags = data.emotionTags || (data.emotionTag ? [data.emotionTag] : null);
    const practicedSkills = data.practicedSkills || null;

    await this.adapter.execute(
      `INSERT INTO loop_traces (
         id, user_id, source_session_id, trace_category, title, summary, raw_data_json, xp_awarded,
         thoughts_or_fears, desires, old_response, new_choice, insights, emotion_tags_json, practiced_skills_json,
         created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE, $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        traceId,
        userId,
        sessionId,
        category,
        title,
        summary,
        rawData,
        thoughtsOrFears,
        desires,
        oldResponse,
        newChoice,
        insights,
        emotionTags == null ? null : JSON.stringify(emotionTags),
        practicedSkills == null ? null : JSON.stringify(practicedSkills),
      ]
    );

    return (await this.getTraceById(traceId, userId))!;
  }

  async getTraceById(traceId: string, userId: string): Promise<LoopTraceRecord | null> {
    const trace = await this.adapter.queryOne<LoopTraceRecord>(
      'SELECT * FROM loop_traces WHERE id = $1 AND user_id = $2',
      [traceId, userId]
    );
    if (!trace) return null;

    const growthEvent = await this.adapter.queryOne<CompletedLoopRecord>(
      'SELECT * FROM completed_loops WHERE loop_trace_id = $1',
      [traceId]
    );

    let rawData: any = {};
    if (typeof trace.raw_data_json === 'string') {
      try {
        const parsed = JSON.parse(trace.raw_data_json);
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
          rawData = parsed;
        }
      } catch {}
    } else if (typeof trace.raw_data_json === 'object' && trace.raw_data_json !== null && !Array.isArray(trace.raw_data_json)) {
      rawData = trace.raw_data_json;
    }

    const trigger = typeof rawData.trigger === 'string' ? rawData.trigger : '';
    const emotionOrBody = typeof rawData.emotionOrBody === 'string'
      ? rawData.emotionOrBody
      : (typeof rawData.emotion_or_body === 'string' ? rawData.emotion_or_body : '');

    return {
      ...trace,
      trigger,
      emotion_or_body: emotionOrBody,
      automatic_story: trace.thoughts_or_fears || rawData.automaticStory || rawData.automatic_story || '',
      desires: trace.desires || rawData.desires || rawData.needs || '',
      facts: rawData.facts || '',
      old_response: trace.old_response || rawData.oldResponse || rawData.options || '',
      new_choice: trace.new_choice || rawData.newChoice || rawData.microAction || '',
      insights: trace.insights || rawData.insights || rawData.reflection || '',
      emotion_tags: trace.emotion_tags_json || rawData.emotionTags || [],
      growth_event: growthEvent || null,
    };
  }

  async updateTrace(
    arg1: string,
    arg2: string | any,
    arg3?: any
  ): Promise<LoopTraceRecord | null> {
    let traceId: string;
    let userId: string;
    let data: any;

    if (typeof arg2 === 'object' && arg2 !== null) {
      traceId = arg1;
      userId = arg2.userId || '';
      data = arg2;
    } else {
      if (arg1.startsWith('usr_')) {
        userId = arg1;
        traceId = arg2;
      } else {
        traceId = arg1;
        userId = arg2;
      }
      data = arg3 || {};
    }

    const trace = await this.adapter.queryOne<LoopTraceRecord>(
      'SELECT * FROM loop_traces WHERE id = $1 AND user_id = $2',
      [traceId, userId]
    );
    if (!trace) return null;

    const updates: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    const updateParams: any[] = [];

    const titleVal = data.title !== undefined ? data.title : data.trigger;
    if (titleVal !== undefined) {
      updateParams.push(String(titleVal).trim());
      updates.push(`title = $${updateParams.length}`);
    }
    const summaryVal = data.summary !== undefined ? data.summary : data.emotionOrBody;
    if (summaryVal !== undefined) {
      updateParams.push(String(summaryVal).trim());
      updates.push(`summary = $${updateParams.length}`);
    }
    const thoughtsVal = data.thoughtsOrFears !== undefined ? data.thoughtsOrFears : data.automaticStory;
    if (thoughtsVal !== undefined) {
      updateParams.push(String(thoughtsVal).trim());
      updates.push(`thoughts_or_fears = $${updateParams.length}`);
    }
    if (data.desires !== undefined) {
      updateParams.push(String(data.desires).trim());
      updates.push(`desires = $${updateParams.length}`);
    }
    if (data.oldResponse !== undefined) {
      updateParams.push(String(data.oldResponse).trim());
      updates.push(`old_response = $${updateParams.length}`);
    }
    if (data.newChoice !== undefined) {
      updateParams.push(String(data.newChoice).trim());
      updates.push(`new_choice = $${updateParams.length}`);
    }
    if (data.insights !== undefined) {
      updateParams.push(String(data.insights).trim());
      updates.push(`insights = $${updateParams.length}`);
    }
    if (data.emotionTags !== undefined) {
      updateParams.push(data.emotionTags == null ? null : JSON.stringify(data.emotionTags));
      updates.push(`emotion_tags_json = $${updateParams.length}`);
    }
    if (data.practicedSkills !== undefined) {
      updateParams.push(data.practicedSkills == null ? null : JSON.stringify(data.practicedSkills));
      updates.push(`practiced_skills_json = $${updateParams.length}`);
    }

    if (
      data.trigger !== undefined ||
      data.emotionOrBody !== undefined ||
      data.automaticStory !== undefined ||
      data.facts !== undefined ||
      data.desires !== undefined ||
      data.oldResponse !== undefined ||
      data.newChoice !== undefined ||
      data.insights !== undefined ||
      data.emotionTags !== undefined ||
      data.rawTurnData !== undefined
    ) {
      let currentRaw: any = {};
      if (typeof trace.raw_data_json === 'string') {
        try {
          const parsed = JSON.parse(trace.raw_data_json);
          if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
            currentRaw = parsed;
          }
        } catch {}
      } else if (typeof trace.raw_data_json === 'object' && trace.raw_data_json !== null && !Array.isArray(trace.raw_data_json)) {
        currentRaw = { ...trace.raw_data_json };
      }
      if (data.trigger !== undefined) currentRaw.trigger = data.trigger;
      if (data.emotionOrBody !== undefined) currentRaw.emotionOrBody = data.emotionOrBody;
      if (data.automaticStory !== undefined) currentRaw.automaticStory = data.automaticStory;
      if (data.facts !== undefined) currentRaw.facts = data.facts;
      if (data.desires !== undefined) currentRaw.desires = data.desires;
      if (data.oldResponse !== undefined) currentRaw.oldResponse = data.oldResponse;
      if (data.newChoice !== undefined) currentRaw.newChoice = data.newChoice;
      if (data.insights !== undefined) currentRaw.insights = data.insights;
      if (data.emotionTags !== undefined) currentRaw.emotionTags = data.emotionTags;
      if (data.rawTurnData && typeof data.rawTurnData === 'object' && !Array.isArray(data.rawTurnData)) {
        Object.assign(currentRaw, data.rawTurnData);
      }
      updateParams.push(currentRaw);
      updates.push(`raw_data_json = $${updateParams.length}`);
    }

    const whereIdIdx = updateParams.length + 1;
    const whereUserIdx = updateParams.length + 2;
    const allParams = [...updateParams, traceId, userId];

    await this.adapter.execute(
      `UPDATE loop_traces SET ${updates.join(', ')} WHERE id = $${whereIdIdx} AND user_id = $${whereUserIdx}`,
      allParams
    );

    return await this.getTraceById(traceId, userId);
  }

  async confirmGrowthEvent(
    userId: string,
    arg2: string | any,
    arg3?: any
  ): Promise<{
    success: boolean;
    alreadyProcessed?: boolean;
    growthEvent: CompletedLoopRecord;
    progressCount: number;
    reward: { xp: number; shells: number; wallet?: any; dailyRewardCapped?: boolean };
    newlyHatched?: boolean;
    hatchMilestoneReward?: { xp: number; shells: number };
    companion?: any;
    snapshot?: any;
  }> {
    let traceId: string;
    let data: any;
    if (typeof arg2 === 'string') {
      traceId = arg2;
      data = arg3 || {};
      data.loopTraceId = traceId;
    } else {
      data = arg2 || {};
      traceId = data.loopTraceId;
    }

    await new ConversationRepository(this.adapter).assertCanCreateTrace(userId, data.conversationId);

    if (!data.idempotencyKey) {
      data.idempotencyKey = `growth_${traceId}`;
    }

    return await this.adapter.transaction(async (tx) => {
      // 1. Check ownership of Loop Trace
      const trace = await tx.queryOne<LoopTraceRecord>(
        'SELECT * FROM loop_traces WHERE id = $1 AND user_id = $2',
        [data.loopTraceId, userId]
      );
      if (!trace) {
        throw new Error('Loop trace not found or unauthorized');
      }

      let rawData: any = {};
      if (typeof trace.raw_data_json === 'string') {
        try {
          const parsed = JSON.parse(trace.raw_data_json);
          if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
            rawData = parsed;
          }
        } catch {}
      } else if (typeof trace.raw_data_json === 'object' && trace.raw_data_json !== null && !Array.isArray(trace.raw_data_json)) {
        rawData = trace.raw_data_json;
      }

      // Auto-fill any missing fields from trace record
      if (!data.trigger) data.trigger = rawData.trigger || trace.title || 'Loop Trace';
      if (!data.emotionOrBody) data.emotionOrBody = rawData.emotionOrBody || rawData.emotion_or_body || trace.summary || '';
      if (!data.automaticStory) data.automaticStory = trace.thoughts_or_fears || rawData.automaticStory || '';
      if (!data.facts) data.facts = (trace as any).facts || rawData.facts || '';
      if (!data.desires) data.desires = trace.desires || rawData.desires || '';
      if (!data.oldResponse) data.oldResponse = trace.old_response || rawData.oldResponse || '';
      if (!data.newChoice) data.newChoice = trace.new_choice || rawData.newChoice || '';
      if (!data.insights) data.insights = trace.insights || rawData.insights || '';
      if (!data.emotionTags) data.emotionTags = trace.emotion_tags_json || [];
      if (!data.conversationId) data.conversationId = trace.source_session_id || 'conv_default';

      // 2. Check existing Growth Event (Idempotent return)
      const existing = await tx.queryOne<CompletedLoopRecord>(
        'SELECT * FROM completed_loops WHERE loop_trace_id = $1 OR idempotency_key = $2',
        [data.loopTraceId, data.idempotencyKey]
      );
      if (existing) {
        const countRow = await tx.queryOne<{ count: number | string }>(
          'SELECT COUNT(*) as count FROM completed_loops WHERE user_id = $1 AND progress_counted = TRUE',
          [userId]
        );
        const comp = await tx.queryOne<any>('SELECT * FROM companions WHERE user_id = $1', [userId]);
        const snap = comp ? await tx.queryOne<any>('SELECT * FROM companion_dna_snapshots WHERE companion_id = $1', [comp.id]) : null;
        return {
          success: true,
          alreadyProcessed: true,
          growthEvent: existing,
          progressCount: Number(countRow?.count || 0),
          reward: { xp: 0, shells: 0 },
          companion: comp,
          snapshot: snap,
        };
      }

      // Validate that trace meets confirmation criteria:
      // trigger + emotion/body + facts + automatic_story + (new_choice / microAction OR insights / reflection)
      // and facts != automatic_story
      const validation = validateLoopForConfirmation({
        trigger: data.trigger,
        emotionOrBody: data.emotionOrBody,
        automaticStory: data.automaticStory,
        facts: data.facts,
        newChoice: data.newChoice,
        insights: data.insights,
        desires: data.desires,
        oldResponse: data.oldResponse,
      });

      if (!validation.isValid) {
        throw new Error(`ข้อมูลไม่ครบถ้วนสำหรับการยืนยัน Growth Event: ขาด ${validation.missingFields.join(', ')}`);
      }

      // 3. Normalized skills (each 0 or 1 only)
      const ea = data.skills?.emotional_awareness ? 1 : 0;
      const sa = data.skills?.somatic_awareness ? 1 : 0;
      const cc = data.skills?.cognitive_clarity ? 1 : 0;
      const ca = data.skills?.conscious_action ? 1 : 0;

      const isReviewOnly = Boolean(data.isReview);
      const isCrisis = Boolean(data.isCrisis);
      const progressCounted = !isReviewOnly;

      // Rewards: +15 EXP, +10 Shells per spec with 5-loop daily cap
      let rewardXp = 0;
      let rewardShells = 0;
      let dailyRewardCapped = false;
      if (!isCrisis && !isReviewOnly) {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayTxCount = await tx.queryOne<{ count: number | string }>(
          `SELECT COUNT(DISTINCT event_id) as count FROM currency_transactions
           WHERE user_id = $1 AND event_type = 'growth_event_reward' AND currency = 'xp' AND created_at >= $2`,
          [userId, todayStart.toISOString()]
        );
        const dailyRewardsEarned = Number(todayTxCount?.count || 0);
        if (dailyRewardsEarned >= 5) {
          dailyRewardCapped = true;
          rewardXp = 0;
          rewardShells = 0;
        } else {
          rewardXp = 15;
          rewardShells = 10;
        }
      }

      await new ConversationRepository(this.adapter).assertCanCreateTrace(userId, data.conversationId);
    const loopId = `cloop_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
      const snapshotData = {
        trigger: data.trigger,
        emotionOrBody: data.emotionOrBody || '',
        automaticStory: data.automaticStory || '',
        facts: data.facts || '',
        oldResponse: data.oldResponse || '',
        newChoice: data.newChoice || '',
        desires: data.desires || '',
        insights: data.insights || '',
        emotionTags: data.emotionTags || [],
        confirmedSkills: {
          emotional_awareness: ea,
          somatic_awareness: sa,
          cognitive_clarity: cc,
          conscious_action: ca,
        },
        confirmedAt: new Date().toISOString(),
      };

      // 4. Create Growth Event in completed_loops
      await tx.execute(
        `INSERT INTO completed_loops (
           id, user_id, conversation_id, loop_trace_id, idempotency_key, trigger, emotion_or_body,
           automatic_story, facts, old_response, new_choice, emotion_tag, learning_types_json,
           is_review_only, progress_counted, reward_xp, reward_shells, emotional_awareness,
           somatic_awareness, cognitive_clarity, conscious_action, snapshot_data_json,
           desires, insights, emotion_tags_json, created_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, CURRENT_TIMESTAMP)`,
        [
          loopId,
          userId,
          data.conversationId,
          data.loopTraceId,
          data.idempotencyKey,
          data.trigger.trim(),
          (data.emotionOrBody || '').trim(),
          (data.automaticStory || '').trim(),
          (data.facts || '').trim(),
          (data.oldResponse || '').trim(),
          (data.newChoice || '').trim(),
          (data.emotionTags?.[0] || 'calm'),
          JSON.stringify([]),
          isReviewOnly,
          progressCounted,
          rewardXp,
          rewardShells,
          ea,
          sa,
          cc,
          ca,
          snapshotData,
          (data.desires || '').trim(),
          (data.insights || '').trim(),
          JSON.stringify(data.emotionTags || []),
        ]
      );

      // Update underlying loop_traces record so xp_awarded = TRUE and confirmed
      if (data.loopTraceId) {
        await tx.execute(
          'UPDATE loop_traces SET xp_awarded = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2',
          [data.loopTraceId, userId]
        );
      }

      // 5. Update wallet & record in currency_transactions ledger with unique idempotency_key
      let walletRecord = null;
      if (rewardXp > 0 || rewardShells > 0) {
        let wallet = await tx.queryOne<any>('SELECT * FROM wallets WHERE user_id = $1', [userId]);
        if (!wallet) {
          await tx.execute(
            `INSERT INTO wallets (user_id, xp, level, shells, memory_crystals, updated_at)
             VALUES ($1, 0, 1, 0, 0, CURRENT_TIMESTAMP)
             ON CONFLICT (user_id) DO NOTHING`,
            [userId]
          );
          wallet = await tx.queryOne<any>('SELECT * FROM wallets WHERE user_id = $1', [userId]);
        }

        const newXp = (wallet?.xp || 0) + rewardXp;
        const newShells = (wallet?.shells || 0) + rewardShells;

        await tx.execute(
          'UPDATE wallets SET xp = $1, shells = $2, updated_at = CURRENT_TIMESTAMP WHERE user_id = $3',
          [newXp, newShells, userId]
        );

        if (rewardXp > 0) {
          await tx.execute(
            `INSERT INTO currency_transactions (id, user_id, idempotency_key, currency, amount, balance_after, event_type, event_id, created_at)
             VALUES ($1, $2, $3, 'xp', $4, $5, 'growth_event_reward', $6, CURRENT_TIMESTAMP)`,
            [`ctx_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`, userId, `growth_xp:${data.loopTraceId}`, rewardXp, newXp, loopId]
          );
        }
        if (rewardShells > 0) {
          await tx.execute(
            `INSERT INTO currency_transactions (id, user_id, idempotency_key, currency, amount, balance_after, event_type, event_id, created_at)
             VALUES ($1, $2, $3, 'shells', $4, $5, 'growth_event_reward', $6, CURRENT_TIMESTAMP)`,
            [`ctx_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`, userId, `growth_shells:${data.loopTraceId}`, rewardShells, newShells, loopId]
          );
        }

        walletRecord = { xp: newXp, level: wallet?.level || 1, shells: newShells, memory_crystals: wallet?.memory_crystals || 0 };
      }

      // 6. Accumulate skill points on Companion
      await tx.execute(
        `UPDATE companions SET
           emotional_awareness_score = COALESCE(emotional_awareness_score, 0) + $1,
           somatic_awareness_score = COALESCE(somatic_awareness_score, 0) + $2,
           cognitive_clarity_score = COALESCE(cognitive_clarity_score, 0) + $3,
           conscious_action_score = COALESCE(conscious_action_score, 0) + $4,
           updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $5`,
        [ea, sa, cc, ca, userId]
      );

      // 7. Calculate current progressCount
      const countRow = await tx.queryOne<{ count: number | string }>(
        'SELECT COUNT(*) as count FROM completed_loops WHERE user_id = $1 AND progress_counted = TRUE',
        [userId]
      );
      const progressCount = Number(countRow?.count || 0);

      // 8. Check 20-trace hatching & milestone reward
      let newlyHatched = false;
      let hatchMilestoneReward = undefined;
      let companion = await tx.queryOne<any>('SELECT * FROM companions WHERE user_id = $1', [userId]);
      let snapshot = companion ? await tx.queryOne<any>('SELECT * FROM companion_dna_snapshots WHERE companion_id = $1', [companion.id]) : null;

      if (progressCount >= 20 && companion && companion.stage === 0 && !companion.hatch_milestone_awarded) {
        newlyHatched = true;
        const milestoneXp = 50;
        const milestoneShells = 25;
        hatchMilestoneReward = { xp: milestoneXp, shells: milestoneShells };

        // Mark hatch milestone awarded
        await tx.execute(
          'UPDATE companions SET stage = 1, unlocked_max_stage = 1, hatch_milestone_awarded = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
          [companion.id]
        );

        // Wallet update for milestone
        const currentWallet = await tx.queryOne<any>('SELECT * FROM wallets WHERE user_id = $1', [userId]);
        const mXp = (currentWallet?.xp || 0) + milestoneXp;
        const mShells = (currentWallet?.shells || 0) + milestoneShells;
        await tx.execute(
          'UPDATE wallets SET xp = $1, shells = $2, updated_at = CURRENT_TIMESTAMP WHERE user_id = $3',
          [mXp, mShells, userId]
        );

        // Record milestone ledger
        await tx.execute(
          `INSERT INTO currency_transactions (id, user_id, idempotency_key, currency, amount, balance_after, event_type, event_id, created_at)
           VALUES ($1, $2, $3, 'xp', $4, $5, 'hatch_milestone', $6, CURRENT_TIMESTAMP)`,
          [`ctx_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`, userId, `COMPANION_HATCH:${companion.id}:xp`, milestoneXp, mXp, companion.id]
        );
        await tx.execute(
          `INSERT INTO currency_transactions (id, user_id, idempotency_key, currency, amount, balance_after, event_type, event_id, created_at)
           VALUES ($1, $2, $3, 'shells', $4, $5, 'hatch_milestone', $6, CURRENT_TIMESTAMP)`,
          [`ctx_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`, userId, `COMPANION_HATCH:${companion.id}:shells`, milestoneShells, mShells, companion.id]
        );

        // Create DNA snapshot inside tx
        const allCompletedLoops = await tx.query<any>(
          'SELECT * FROM completed_loops WHERE user_id = $1 AND progress_counted = TRUE ORDER BY created_at ASC',
          [userId]
        );
        snapshot = await companionRepository.createDnaSnapshot(companion.id, userId, allCompletedLoops, tx);

        walletRecord = { xp: mXp, level: currentWallet?.level || 1, shells: mShells, memory_crystals: currentWallet?.memory_crystals || 0 };
        companion = await tx.queryOne<any>('SELECT * FROM companions WHERE user_id = $1', [userId]);
      }

      const growthEvent = (await tx.queryOne<CompletedLoopRecord>(
        'SELECT * FROM completed_loops WHERE id = $1',
        [loopId]
      ))!;

      return {
        success: true,
        growthEvent,
        progressCount,
        reward: {
          xp: rewardXp,
          shells: rewardShells,
          dailyRewardCapped,
          wallet: walletRecord,
        },
        newlyHatched,
        hatchMilestoneReward,
        companion,
        snapshot,
      };
    });
  }

  async getTraces(userId: string, limit: number = 50): Promise<LoopTraceRecord[]> {
    const rows = await this.adapter.query<LoopTraceRecord>(
      'SELECT * FROM loop_traces WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
      [userId, limit]
    );
    const completedRows = await this.adapter.query<CompletedLoopRecord>(
      'SELECT * FROM completed_loops WHERE user_id = $1',
      [userId]
    );
    const growthEventByTraceId = new Map<string, CompletedLoopRecord>();
    for (const cl of completedRows) {
      if (cl.loop_trace_id) {
        growthEventByTraceId.set(cl.loop_trace_id, cl);
      }
    }

    return rows.map((trace) => {
      let rawData: any = {};
      if (typeof trace.raw_data_json === 'string') {
        try {
          const parsed = JSON.parse(trace.raw_data_json);
          if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
            rawData = parsed;
          }
        } catch {}
      } else if (typeof trace.raw_data_json === 'object' && trace.raw_data_json !== null && !Array.isArray(trace.raw_data_json)) {
        rawData = trace.raw_data_json;
      }
      const trigger = typeof rawData.trigger === 'string' ? rawData.trigger : '';
      const emotionOrBody = typeof rawData.emotionOrBody === 'string'
        ? rawData.emotionOrBody
        : (typeof rawData.emotion_or_body === 'string' ? rawData.emotion_or_body : '');

      const ge = growthEventByTraceId.get(trace.id) || null;
      return {
        ...trace,
        trigger,
        emotion_or_body: emotionOrBody,
        automatic_story: trace.thoughts_or_fears || rawData.automaticStory || rawData.automatic_story || '',
        desires: trace.desires || rawData.desires || rawData.needs || '',
        facts: rawData.facts || '',
        old_response: trace.old_response || rawData.oldResponse || rawData.options || '',
        new_choice: trace.new_choice || rawData.newChoice || rawData.microAction || '',
        insights: trace.insights || rawData.insights || rawData.reflection || '',
        emotion_tags: trace.emotion_tags_json || rawData.emotionTags || [],
        growth_event: ge,
        xp_awarded: Boolean(trace.xp_awarded || ge),
      };
    });
  }

  async getTraceCount(userId: string): Promise<number> {
    const row = await this.adapter.queryOne<{ count: number | string }>(
      'SELECT COUNT(*) as count FROM loop_traces WHERE user_id = $1',
      [userId]
    );
    return Number(row?.count || 0);
  }

  async markTraceXpAwarded(traceId: string, userId: string): Promise<void> {
    await this.adapter.execute(
      'UPDATE loop_traces SET xp_awarded = TRUE WHERE id = $1 AND user_id = $2',
      [traceId, userId]
    );
  }

  async createOrConfirmPattern(
    userId: string,
    pattern: {
      id?: string;
      name: string;
      status: 'suggested' | 'confirmed' | 'rejected' | 'active_practice' | 'archived';
      triggerPattern: string;
      recurringThoughts: string;
      habitualResponse: string;
      typicalConsequences: string;
      newChoiceExperiment?: string;
      helpfulStrategies?: string[];
      evidenceTraceIds?: string[];
    }
  ): Promise<LoopPatternRecord> {
    const patternId = pattern.id || `loop_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;

    return await this.adapter.transaction(async (tx) => {
      await tx.execute(
        `INSERT INTO loop_patterns (
           id, user_id, name, status, trigger_pattern, recurring_thoughts,
           habitual_response, typical_consequences, new_choice_experiment, helpful_strategies_json, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (id) DO UPDATE SET
           name = $3, status = $4, trigger_pattern = $5, recurring_thoughts = $6,
           habitual_response = $7, typical_consequences = $8, new_choice_experiment = $9,
           helpful_strategies_json = $10, updated_at = CURRENT_TIMESTAMP`,
        [
          patternId,
          userId,
          pattern.name,
          pattern.status,
          pattern.triggerPattern,
          pattern.recurringThoughts,
          pattern.habitualResponse,
          pattern.typicalConsequences,
          pattern.newChoiceExperiment || null,
          JSON.stringify(pattern.helpfulStrategies || []),
        ]
      );

      if (pattern.evidenceTraceIds && pattern.evidenceTraceIds.length > 0) {
        for (const traceId of pattern.evidenceTraceIds) {
          await tx.execute(
            `INSERT INTO loop_pattern_evidence (id, loop_pattern_id, loop_trace_id)
             VALUES ($1, $2, $3)
             ON CONFLICT DO NOTHING`,
            [`lpe_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`, patternId, traceId]
          );
        }
      }

      return (await tx.queryOne<LoopPatternRecord>('SELECT * FROM loop_patterns WHERE id = $1', [patternId]))!;
    });
  }

  async getPatterns(userId: string): Promise<LoopPatternRecord[]> {
    return await this.adapter.query<LoopPatternRecord>(
      'SELECT * FROM loop_patterns WHERE user_id = $1 ORDER BY updated_at DESC',
      [userId]
    );
  }

  async createCompletedLoop(
    userId: string,
    data: {
      conversationId: string;
      idempotencyKey: string;
      trigger: string;
      emotionOrBody: string;
      automaticStory: string;
      facts: string;
      oldResponse: string;
      newChoice: string;
      emotionTag: string;
      learningTypes: string[];
      isReviewOnly?: boolean;
      progressCounted?: boolean;
      rewardXp?: number;
      rewardShells?: number;
    }
  ): Promise<CompletedLoopRecord> {
    const loopId = `cloop_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const isReview = Boolean(data.isReviewOnly);
    const progressCounted = data.progressCounted !== undefined ? Boolean(data.progressCounted) : !isReview;
    const rewardXp = data.rewardXp || 0;
    const rewardShells = data.rewardShells || 0;

    await this.adapter.execute(
      `INSERT INTO completed_loops (
         id, user_id, conversation_id, idempotency_key, trigger, emotion_or_body,
         automatic_story, facts, old_response, new_choice, emotion_tag,
         learning_types_json, is_review_only, progress_counted, reward_xp, reward_shells, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, CURRENT_TIMESTAMP)`,
      [
        loopId,
        userId,
        data.conversationId,
        data.idempotencyKey,
        data.trigger.trim(),
        data.emotionOrBody.trim(),
        data.automaticStory.trim(),
        data.facts.trim(),
        data.oldResponse.trim(),
        data.newChoice.trim(),
        data.emotionTag || 'calm',
        JSON.stringify(data.learningTypes || []),
        isReview,
        progressCounted,
        rewardXp,
        rewardShells,
      ]
    );

    return (await this.adapter.queryOne<CompletedLoopRecord>(
      'SELECT * FROM completed_loops WHERE id = $1',
      [loopId]
    ))!;
  }

  async getCompletedLoops(userId: string, limit: number = 50, progressOnly: boolean = false): Promise<CompletedLoopRecord[]> {
    if (progressOnly) {
      return await this.adapter.query<CompletedLoopRecord>(
        'SELECT * FROM completed_loops WHERE user_id = $1 AND progress_counted = TRUE ORDER BY created_at DESC LIMIT $2',
        [userId, limit]
      );
    }
    return await this.adapter.query<CompletedLoopRecord>(
      'SELECT * FROM completed_loops WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
      [userId, limit]
    );
  }

  async getCompletedLoopCount(userId: string): Promise<number> {
    const row = await this.adapter.queryOne<{ count: number | string }>(
      'SELECT COUNT(*) as count FROM completed_loops WHERE user_id = $1 AND progress_counted = TRUE',
      [userId]
    );
    return Number(row?.count || 0);
  }

  async findLoopByIdempotency(idempotencyKey: string): Promise<CompletedLoopRecord | null> {
    return await this.adapter.queryOne<CompletedLoopRecord>(
      'SELECT * FROM completed_loops WHERE idempotency_key = $1',
      [idempotencyKey]
    );
  }

  async findCompletedLoopByConversation(userId: string, conversationId: string): Promise<CompletedLoopRecord | null> {
    return await this.adapter.queryOne<CompletedLoopRecord>(
      'SELECT * FROM completed_loops WHERE user_id = $1 AND conversation_id = $2 AND progress_counted = TRUE',
      [userId, conversationId]
    );
  }

  async findSimilarLoop(userId: string, trigger: string, automaticStory: string): Promise<CompletedLoopRecord | null> {
    const cleanTrigger = trigger.trim().toLowerCase();
    const cleanStory = automaticStory.trim().toLowerCase();

    const rows = await this.adapter.query<CompletedLoopRecord>(
      `SELECT * FROM completed_loops WHERE user_id = $1 AND progress_counted = TRUE ORDER BY created_at DESC LIMIT 20`,
      [userId]
    );
    for (const r of rows) {
      if (
        r.trigger.trim().toLowerCase() === cleanTrigger &&
        r.automatic_story.trim().toLowerCase() === cleanStory
      ) {
        return r;
      }
    }
    return null;
  }

  async getTodayRewardedLoopCount(userId: string): Promise<number> {
    const rows = await this.adapter.query<CompletedLoopRecord>(
      `SELECT * FROM completed_loops WHERE user_id = $1 AND reward_xp > 0 ORDER BY created_at DESC LIMIT 30`,
      [userId]
    );
    const today = new Date().toISOString().slice(0, 10);
    return rows.filter((r) => String(r.created_at).slice(0, 10) === today).length;
  }

  async saveDraft(
    userId: string,
    conversationId: string,
    draft: {
      trigger?: string;
      emotionOrBody?: string;
      automaticStory?: string;
      facts?: string;
      oldResponse?: string;
      newChoice?: string;
    }
  ): Promise<LoopDraftRecord> {
    const draftId = `ldraft_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    await this.adapter.execute(
      `INSERT INTO loop_drafts (id, user_id, conversation_id, trigger, emotion_or_body, automatic_story, facts, old_response, new_choice, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, conversation_id) DO UPDATE SET
         trigger = $4, emotion_or_body = $5, automatic_story = $6, facts = $7, old_response = $8, new_choice = $9, updated_at = CURRENT_TIMESTAMP`,
      [
        draftId,
        userId,
        conversationId,
        draft.trigger || null,
        draft.emotionOrBody || null,
        draft.automaticStory || null,
        draft.facts || null,
        draft.oldResponse || null,
        draft.newChoice || null,
      ]
    );
    return (await this.adapter.queryOne<LoopDraftRecord>(
      'SELECT * FROM loop_drafts WHERE user_id = $1 AND conversation_id = $2',
      [userId, conversationId]
    ))!;
  }

  async getDraft(userId: string, conversationId: string): Promise<LoopDraftRecord | null> {
    return await this.adapter.queryOne<LoopDraftRecord>(
      'SELECT * FROM loop_drafts WHERE user_id = $1 AND conversation_id = $2',
      [userId, conversationId]
    );
  }

  async deleteDraft(userId: string, conversationId: string): Promise<void> {
    await this.adapter.execute(
      'DELETE FROM loop_drafts WHERE user_id = $1 AND conversation_id = $2',
      [userId, conversationId]
    );
  }
}

export const loopRepository = new LoopRepository();
