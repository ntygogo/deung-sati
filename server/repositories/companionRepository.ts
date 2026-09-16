import crypto from 'crypto';
import { db } from '../db/database.js';
import type { IDatabaseAdapter } from '../db/types.js';

export interface CompanionDnaSnapshotRecord {
  id: string;
  companion_id: string;
  user_id: string;
  seed: string;
  dna_json: any;
  stats_summary_json: any;
  hatched_at: string;
}

export interface CompanionRecord {
  id: string;
  user_id: string;
  seed: number | string;
  name: string;
  stage: number;
  unlocked_max_stage: number;
  mood_state: string;
  last_interacted_at: string;
  created_at: string;
  updated_at: string;
  dna?: GrowthDnaRecord;
  equippedItems?: Record<string, string>;
  snapshot?: CompanionDnaSnapshotRecord;
}

export interface GrowthDnaRecord {
  companion_id: string;
  primary_pink_shade: string;
  secondary_color: string;
  gill_type: string;
  cheek_feeler_type: string;
  head_light_type: string;
  head_light_tip: string;
  tail_type: string;
  body_pattern: string;
  movement_personality: string;
  safe_space_theme: string;
}

export class CompanionRepository {
  private adapter: IDatabaseAdapter;

  constructor(adapter: IDatabaseAdapter = db) {
    this.adapter = adapter;
  }

  async findByUserId(userId: string): Promise<CompanionRecord | null> {
    const companion = await this.adapter.queryOne<CompanionRecord>(
      'SELECT * FROM companions WHERE user_id = $1',
      [userId]
    );
    if (!companion) return null;

    const dna = await this.adapter.queryOne<GrowthDnaRecord>(
      'SELECT * FROM companion_growth_dna WHERE companion_id = $1',
      [companion.id]
    );

    const equippedRows = await this.adapter.query<{ slot: string; item_id: string }>(
      'SELECT slot, item_id FROM companion_equipped_items WHERE companion_id = $1',
      [companion.id]
    );

    const equippedItems: Record<string, string> = {};
    for (const row of equippedRows) {
      equippedItems[row.slot] = row.item_id;
    }

    const snapshot = await this.adapter.queryOne<CompanionDnaSnapshotRecord>(
      'SELECT * FROM companion_dna_snapshots WHERE companion_id = $1',
      [companion.id]
    );

    return {
      ...companion,
      dna: dna || undefined,
      equippedItems,
      snapshot: snapshot || undefined,
    };
  }

  async createCompanion(
    userId: string,
    seed: number,
    dna: Omit<GrowthDnaRecord, 'companion_id'>,
    name: string = 'น้องดึงสติ',
    initialStage: number = 0
  ): Promise<CompanionRecord> {
    const companionId = `cmp_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;

    return await this.adapter.transaction(async (tx) => {
      await tx.execute(
        `INSERT INTO companions (id, user_id, seed, name, stage, unlocked_max_stage, mood_state, last_interacted_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'calm', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [companionId, userId, seed, name, initialStage, Math.max(initialStage, 0)]
      );

      await tx.execute(
        `INSERT INTO companion_growth_dna (
           companion_id, primary_pink_shade, secondary_color, gill_type, cheek_feeler_type,
           head_light_type, head_light_tip, tail_type, body_pattern, movement_personality, safe_space_theme
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          companionId,
          dna.primary_pink_shade,
          dna.secondary_color,
          dna.gill_type,
          dna.cheek_feeler_type,
          dna.head_light_type,
          dna.head_light_tip,
          dna.tail_type,
          dna.body_pattern,
          dna.movement_personality,
          dna.safe_space_theme,
        ]
      );

      const created = (await tx.queryOne<CompanionRecord>('SELECT * FROM companions WHERE id = $1', [companionId]))!;
      return { ...created, dna: { companion_id: companionId, ...dna }, equippedItems: {} };
    });
  }

  async setCosmeticStage(userId: string, targetStage: number): Promise<CompanionRecord | null> {
    const companion = await this.findByUserId(userId);
    if (!companion) return null;

    if (targetStage > companion.unlocked_max_stage) {
      throw new Error(`Cannot switch to locked stage ${targetStage}`);
    }

    await this.adapter.execute(
      'UPDATE companions SET stage = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3',
      [targetStage, companion.id, userId]
    );

    return await this.findByUserId(userId);
  }

  async unlockNextStage(userId: string, newStage: number): Promise<CompanionRecord | null> {
    const companion = await this.findByUserId(userId);
    if (!companion) return null;

    const nextUnlocked = Math.max(companion.unlocked_max_stage, newStage);

    await this.adapter.execute(
      'UPDATE companions SET stage = $1, unlocked_max_stage = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 AND user_id = $4',
      [newStage, nextUnlocked, companion.id, userId]
    );

    return await this.findByUserId(userId);
  }

  async updateMoodAndInteraction(userId: string, moodState?: string): Promise<CompanionRecord | null> {
    const companion = await this.findByUserId(userId);
    if (!companion) return null;

    const mood = moodState || companion.mood_state;
    await this.adapter.execute(
      'UPDATE companions SET mood_state = $1, last_interacted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3',
      [mood, companion.id, userId]
    );

    return await this.findByUserId(userId);
  }

  async equipItem(userId: string, slot: string, itemId: string): Promise<Record<string, string>> {
    const companion = await this.findByUserId(userId);
    if (!companion) throw new Error('Companion not found');

    await this.adapter.execute(
      `INSERT INTO companion_equipped_items (companion_id, slot, item_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (companion_id, slot) DO UPDATE SET item_id = $3`,
      [companion.id, slot, itemId]
    );

    const updated = await this.findByUserId(userId);
    return updated?.equippedItems || {};
  }

  async unequipItem(userId: string, slot: string): Promise<Record<string, string>> {
    const companion = await this.findByUserId(userId);
    if (!companion) throw new Error('Companion not found');

    await this.adapter.execute(
      'DELETE FROM companion_equipped_items WHERE companion_id = $1 AND slot = $2',
      [companion.id, slot]
    );

    const updated = await this.findByUserId(userId);
    return updated?.equippedItems || {};
  }

  async updateGrowthDnaFromLoop(
    companionId: string,
    _emotionTag: string,
    learningTypes: string[]
  ): Promise<GrowthDnaRecord | null> {
    // Emotion only affects temporary mood atmosphere; never alters permanent DNA colors
    const updates: string[] = [];
    const params: any[] = [companionId];

    if (learningTypes.includes('notice_emotion') || learningTypes.includes('emotional_awareness')) {
      params.push('starlight_speckles');
      updates.push(`body_pattern = $${params.length}`);
    }
    if (learningTypes.includes('set_boundaries') || learningTypes.includes('somatic_awareness')) {
      params.push('feathered_majestic');
      updates.push(`gill_type = $${params.length}`);
    }
    if (learningTypes.includes('understand_relationships') || learningTypes.includes('cognitive_clarity')) {
      params.push('branched_delicate');
      updates.push(`cheek_feeler_type = $${params.length}`);
    }
    if (learningTypes.includes('new_choice') || learningTypes.includes('conscious_action')) {
      params.push('star_lantern');
      updates.push(`head_light_type = $${params.length}`);
    }
    if (learningTypes.includes('pause_before_reacting')) {
      params.push('serene_swaying');
      updates.push(`movement_personality = $${params.length}`);
    }

    if (updates.length > 0) {
      await this.adapter.execute(
        `UPDATE companion_growth_dna SET ${updates.join(', ')} WHERE companion_id = $1`,
        params
      );
    }

    return await this.adapter.queryOne<GrowthDnaRecord>(
      'SELECT * FROM companion_growth_dna WHERE companion_id = $1',
      [companionId]
    );
  }

  async createDnaSnapshot(
    companionId: string,
    userId: string,
    completedLoops: Array<{
      id: string;
      emotion_tag: string;
      learning_types_json: any;
      emotional_awareness?: number;
      somatic_awareness?: number;
      cognitive_clarity?: number;
      conscious_action?: number;
    }>,
    txAdapter?: IDatabaseAdapter
  ): Promise<CompanionDnaSnapshotRecord> {
    const adapter = txAdapter || this.adapter;
    const existing = await adapter.queryOne<CompanionDnaSnapshotRecord>(
      'SELECT * FROM companion_dna_snapshots WHERE companion_id = $1',
      [companionId]
    );
    if (existing) return existing;

    const loopIds = completedLoops.map((l) => l.id).sort().join(':');
    const hash = crypto.createHash('sha256').update(`${userId}:${loopIds}`).digest('hex');
    const seedInt = parseInt(hash.slice(0, 8), 16);

    // Sum the 4 skill scores across all completed loops
    let totalEA = 0;
    let totalSA = 0;
    let totalCC = 0;
    let totalCA = 0;

    const emotionCounts: Record<string, number> = {};
    const learningCounts: Record<string, number> = {};
    for (const loop of completedLoops) {
      emotionCounts[loop.emotion_tag] = (emotionCounts[loop.emotion_tag] || 0) + 1;
      totalEA += loop.emotional_awareness || 0;
      totalSA += loop.somatic_awareness || 0;
      totalCC += loop.cognitive_clarity || 0;
      totalCA += loop.conscious_action || 0;

      const lTypes = Array.isArray(loop.learning_types_json) ? loop.learning_types_json : [];
      for (const lt of lTypes) {
        learningCounts[lt] = (learningCounts[lt] || 0) + 1;
      }
    }

    // Existing companion record for deterministic base colors
    const dnaRow = await adapter.queryOne<GrowthDnaRecord>(
      'SELECT * FROM companion_growth_dna WHERE companion_id = $1',
      [companionId]
    );
    const primaryColor = dnaRow?.primary_pink_shade || 'soft_sakura';
    const secondaryColor = dnaRow?.secondary_color || '#8BD3DD';

    // Skill-based mapping:
    // 1. Emotional Awareness -> Eye shape & peaceful expression
    const eyeShapes = ['sparkle_curious', 'gentle_crescent', 'playful_round', 'starry_wonder'];
    const eyeIndex = Math.abs(totalEA + seedInt) % eyeShapes.length;

    // 2. Somatic Awareness -> Gill style
    const gillStyles = ['triple_feather', 'crystalline_leaf', 'starlight_streamers', 'fluffy_cloud'];
    const gillIndex = Math.abs(totalSA + (seedInt >>> 2)) % gillStyles.length;

    // 3. Cognitive Clarity -> Tail & cheek feeler structure
    const tailStyles = ['swaying_fin', 'ribbon_flow', 'sparkle_fan'];
    const tailIndex = Math.abs(totalCC + (seedInt >>> 4)) % tailStyles.length;
    const cheekStyles = ['rosy_soft', 'star_dust', 'aurora_blush', 'coral_glow'];
    const cheekIndex = Math.abs(totalCC + (seedInt >>> 6)) % cheekStyles.length;

    // 4. Conscious Action -> Lantern tip shape & radiant aura
    const lanternShapes = ['star_beacon', 'crystal_lotus', 'pearl_glow', 'cosmic_orb'];
    const lanternIndex = Math.abs(totalCA + (seedInt >>> 8)) % lanternShapes.length;
    const auraStyles = ['dreamy_glow', 'stardust_ring', 'gentle_mist', 'warm_radiance'];
    const auraIndex = Math.abs(totalCA + (seedInt >>> 10)) % auraStyles.length;

    const snapshotId = `snap_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const dnaJson = {
      primaryColor,
      secondaryColor,
      eyeShape: eyeShapes[eyeIndex],
      cheekStyle: cheekStyles[cheekIndex],
      gillStyle: gillStyles[gillIndex],
      lanternShape: lanternShapes[lanternIndex],
      auraStyle: auraStyles[auraIndex],
      tailStyle: tailStyles[tailIndex],
      skillsSummary: {
        emotionalAwareness: totalEA,
        somaticAwareness: totalSA,
        cognitiveClarity: totalCC,
        consciousAction: totalCA,
      },
      emotionDistribution: emotionCounts,
      totalCompletedLoops: completedLoops.length,
    };

    const statsSummaryJson = {
      hatchedAt: new Date().toISOString(),
      skillsSummary: dnaJson.skillsSummary,
      totalLoops: completedLoops.length,
      quote: 'สีและรูปลักษณ์ของน้อง เติบโตจากทักษะการรู้ตัวที่เราได้ฝึกฝนร่วมกัน',
    };

    await adapter.execute(
      `INSERT INTO companion_dna_snapshots (id, companion_id, user_id, seed, dna_json, stats_summary_json, hatched_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
      [snapshotId, companionId, userId, hash.slice(0, 32), dnaJson, statsSummaryJson]
    );

    return (await adapter.queryOne<CompanionDnaSnapshotRecord>(
      'SELECT * FROM companion_dna_snapshots WHERE id = $1',
      [snapshotId]
    ))!;
  }

  async getDnaSnapshot(companionId: string, txAdapter?: IDatabaseAdapter): Promise<CompanionDnaSnapshotRecord | null> {
    const adapter = txAdapter || this.adapter;
    return await adapter.queryOne<CompanionDnaSnapshotRecord>(
      'SELECT * FROM companion_dna_snapshots WHERE companion_id = $1',
      [companionId]
    );
  }
}

export const EMOTION_COLOR_MAP: Record<string, { name: string; hex: string; desc: string }> = {
  anger: { name: 'Coral Red', hex: '#FF6B6B', desc: 'ความกล้าเผชิญหน้าและพลังขับเคลื่อน' },
  sadness: { name: 'Ocean Blue', hex: '#4D96FF', desc: 'ความอ่อนโยนและการเยียวยาจิตใจ' },
  fear: { name: 'Deep Violet', hex: '#6C5CE7', desc: 'ความระมัดระวังและสัญชาตญาณเอาตัวรอด' },
  anxiety: { name: 'Electric Lavender', hex: '#A29BFE', desc: 'ความตื่นตัวและพลังความคิด' },
  loneliness: { name: 'Indigo', hex: '#3B3B98', desc: 'ความสงบนิ่งและการเชื่อมโยงสู่ภายใน' },
  shame: { name: 'Dusty Mauve', hex: '#D1A3B8', desc: 'ความเปราะบางและการเปิดรับตนเอง' },
  calm: { name: 'Aqua', hex: '#00CEC9', desc: 'ความปลอดโปร่งและพื้นที่พักพิง' },
  joy: { name: 'Peach Gold', hex: '#FDCB6E', desc: 'ความรื่นรมย์และประกายชีวิต' },
  hope: { name: 'Warm Amber', hex: '#E17055', desc: 'ความกล้าลองสิ่งใหม่และความหวัง' },
};

export const companionRepository = new CompanionRepository();
