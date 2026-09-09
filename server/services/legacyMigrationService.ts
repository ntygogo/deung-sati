import crypto from 'crypto';
import { db } from '../db/database.js';
import type { IDatabaseAdapter } from '../db/types.js';

export interface LegacyEvidenceItem {
  id?: string;
  event: string;
  feeling?: string;
  interpretation?: string;
  need?: string;
  action?: string;
  outcome?: string;
  timestamp?: string;
}

export interface LegacyTraitItem {
  traitId: string;
  selectedOption: string;
}

export interface LegacyMigrationPayload {
  previewOnly?: boolean;
  evidence?: LegacyEvidenceItem[];
  futureSelfTraits?: LegacyTraitItem[];
}

export interface MigrationSummary {
  success: boolean;
  previewOnly: boolean;
  tracesToMigrate: number;
  tracesImported: number;
  duplicatesSkipped: number;
  traitsRecorded: number;
  migratedAt: string | null;
}

export class LegacyMigrationService {
  private adapter: IDatabaseAdapter;

  constructor(adapter: IDatabaseAdapter = db) {
    this.adapter = adapter;
  }

  validatePayload(payload: any): { valid: boolean; error?: string } {
    if (!payload || typeof payload !== 'object') {
      return { valid: false, error: 'Payload must be an object' };
    }

    if (payload.evidence !== undefined && !Array.isArray(payload.evidence)) {
      return { valid: false, error: 'evidence must be an array' };
    }

    if (payload.futureSelfTraits !== undefined && !Array.isArray(payload.futureSelfTraits)) {
      return { valid: false, error: 'futureSelfTraits must be an array' };
    }

    // Check payload size estimate (max 500KB)
    const str = JSON.stringify(payload);
    if (str.length > 500 * 1024) {
      return { valid: false, error: 'Payload exceeds maximum limit of 500KB' };
    }

    return { valid: true };
  }

  async migrateLegacyData(userId: string, payload: LegacyMigrationPayload): Promise<MigrationSummary> {
    const isPreview = Boolean(payload.previewOnly);
    const evidenceList = payload.evidence || [];
    const traitsList = payload.futureSelfTraits || [];

    // Load existing traces for duplicate detection
    const existingTraces = await this.adapter.query<{ summary: string; raw_data_json: any }>(
      'SELECT summary, raw_data_json FROM loop_traces WHERE user_id = $1',
      [userId]
    );

    const existingKeys = new Set<string>();
    for (const t of existingTraces) {
      if (t.raw_data_json?.legacyHash) {
        existingKeys.add(t.raw_data_json.legacyHash);
      } else if (t.summary) {
        existingKeys.add(t.summary.trim());
      }
    }

    let tracesToMigrate = 0;
    let duplicatesSkipped = 0;
    const itemsToInsert: Array<{ title: string; summary: string; category: string; rawData: any }> = [];

    for (const item of evidenceList) {
      if (!item || !item.event) continue;
      const cleanEvent = item.event.trim();
      const legacyHash = crypto
        .createHash('sha256')
        .update(`${userId}:${cleanEvent}:${item.timestamp || ''}`)
        .digest('hex');

      if (existingKeys.has(legacyHash) || existingKeys.has(cleanEvent)) {
        duplicatesSkipped++;
        continue;
      }

      tracesToMigrate++;
      itemsToInsert.push({
        title: cleanEvent.slice(0, 60),
        summary: cleanEvent,
        category: 'legacy_evidence',
        rawData: {
          legacyId: item.id,
          legacyHash,
          feeling: item.feeling || null,
          interpretation: item.interpretation || null,
          need: item.need || null,
          action: item.action || null,
          outcome: item.outcome || null,
          originalTimestamp: item.timestamp || null,
        },
      });
    }

    if (isPreview) {
      return {
        success: true,
        previewOnly: true,
        tracesToMigrate,
        tracesImported: 0,
        duplicatesSkipped,
        traitsRecorded: traitsList.length,
        migratedAt: null,
      };
    }

    // Execute actual migration in database transaction
    await this.adapter.transaction(async (tx) => {
      for (const item of itemsToInsert) {
        const traceId = `trc_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
        await tx.execute(
          `INSERT INTO loop_traces (id, user_id, source_session_id, trace_category, title, summary, raw_data_json, xp_awarded, created_at)
           VALUES ($1, $2, 'legacy_import', $3, $4, $5, $6, TRUE, CURRENT_TIMESTAMP)`,
          [traceId, userId, item.category, item.title, item.summary, item.rawData]
        );
      }

      // Record traits in onboarding_answers if traits exist
      if (traitsList.length > 0) {
        const ansId = `ans_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
        await tx.execute(
          `INSERT INTO onboarding_answers (id, user_id, question_key, answer_json, created_at)
           VALUES ($1, $2, 'legacy_future_self_traits', $3, CURRENT_TIMESTAMP)`,
          [ansId, userId, traitsList]
        );
      }

      // Mark user as migrated
      await tx.execute(
        'UPDATE users SET legacy_migrated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [userId]
      );
    });

    return {
      success: true,
      previewOnly: false,
      tracesToMigrate,
      tracesImported: itemsToInsert.length,
      duplicatesSkipped,
      traitsRecorded: traitsList.length,
      migratedAt: new Date().toISOString(),
    };
  }
}

export const legacyMigrationService = new LegacyMigrationService();
