import crypto from 'crypto';
import { db } from '../db/database.js';
import type { IDatabaseAdapter } from '../db/types.js';

export interface LoopTraceRecord {
  id: string;
  user_id: string;
  source_session_id?: string;
  trace_category: string;
  title: string;
  summary: string;
  raw_data_json: any;
  xp_awarded: boolean;
  created_at: string;
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
  idempotency_key: string;
  trigger: string;
  emotion_or_body: string;
  automatic_story: string;
  facts: string;
  old_response: string;
  new_choice: string;
  emotion_tag: string;
  learning_types_json: string[];
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
    userId: string,
    data: {
      category: string;
      title: string;
      summary: string;
      rawTurnData: any;
      sessionId?: string;
    }
  ): Promise<LoopTraceRecord> {
    const traceId = `trc_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;

    await this.adapter.execute(
      `INSERT INTO loop_traces (id, user_id, source_session_id, trace_category, title, summary, raw_data_json, xp_awarded, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE, CURRENT_TIMESTAMP)`,
      [
        traceId,
        userId,
        data.sessionId || null,
        data.category,
        data.title.trim(),
        data.summary.trim(),
        data.rawTurnData,
      ]
    );

    return (await this.adapter.queryOne<LoopTraceRecord>('SELECT * FROM loop_traces WHERE id = $1', [traceId]))!;
  }

  async getTraces(userId: string, limit: number = 50): Promise<LoopTraceRecord[]> {
    return await this.adapter.query<LoopTraceRecord>(
      'SELECT * FROM loop_traces WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
      [userId, limit]
    );
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
          pattern.helpfulStrategies || [],
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
        data.learningTypes || [],
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
