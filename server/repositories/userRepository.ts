import crypto from 'crypto';
import { db } from '../db/database.js';
import type { IDatabaseAdapter } from '../db/types.js';
import type { UserRecord } from '../services/authService.js';
import { DiscoveryRepository } from './discoveryRepository.js';

export interface ConsentRecord {
  id: string;
  user_id: string;
  purpose: string;
  granted: boolean;
  granted_at: string;
  revoked_at: string | null;
}

export class UserRepository {
  private adapter: IDatabaseAdapter;

  constructor(adapter: IDatabaseAdapter = db) {
    this.adapter = adapter;
  }

  async findById(userId: string): Promise<UserRecord | null> {
    return await this.adapter.queryOne<UserRecord>(
      'SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL',
      [userId]
    );
  }

  async updateProfile(userId: string, name: string): Promise<UserRecord | null> {
    await this.adapter.execute(
      'UPDATE users SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND deleted_at IS NULL',
      [name.trim(), userId]
    );
    return await this.findById(userId);
  }

  async recordConsent(userId: string, purpose: string, granted: boolean): Promise<ConsentRecord> {
    const id = `cns_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    await this.adapter.execute(
      `INSERT INTO consent_records (id, user_id, purpose, granted, granted_at, revoked_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5)`,
      [id, userId, purpose, granted, granted ? null : new Date().toISOString()]
    );
    return (await this.adapter.queryOne<ConsentRecord>('SELECT * FROM consent_records WHERE id = $1', [id]))!;
  }

  async saveOnboardingAnswer(userId: string, questionKey: string, answerJson: any): Promise<void> {
    const id = `ans_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    await this.adapter.execute(
      `INSERT INTO onboarding_answers (id, user_id, question_key, answer_json, created_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [id, userId, questionKey, answerJson]
    );
  }

  async exportUserData(userId: string): Promise<Record<string, any>> {
    const user = await this.findById(userId);
    if (!user) throw new Error('User not found');

    const consents = await this.adapter.query('SELECT purpose, granted, granted_at FROM consent_records WHERE user_id = $1', [userId]);
    const answers = await this.adapter.query('SELECT question_key, answer_json, created_at FROM onboarding_answers WHERE user_id = $1', [userId]);
    const companion = await this.adapter.queryOne('SELECT * FROM companions WHERE user_id = $1', [userId]);
    const dna = companion ? await this.adapter.queryOne('SELECT * FROM companion_growth_dna WHERE companion_id = $1', [companion.id]) : null;
    const traces = await this.adapter.query('SELECT * FROM loop_traces WHERE user_id = $1 ORDER BY created_at ASC', [userId]);
    const loops = await this.adapter.query('SELECT * FROM loop_patterns WHERE user_id = $1', [userId]);
    const wallet = await this.adapter.queryOne('SELECT xp, level, shells, memory_crystals FROM wallets WHERE user_id = $1', [userId]);
    const transactions = await this.adapter.query('SELECT id, currency, amount, balance_after, event_type, created_at FROM currency_transactions WHERE user_id = $1', [userId]);
    const discovery = await new DiscoveryRepository(this.adapter).get(userId);

    return {
      profile: { id: user.id, name: user.name, email: user.email, tier: user.tier, createdAt: user.created_at },
      consents,
      onboardingAnswers: answers,
      companion: companion ? { ...companion, growthDna: dna } : null,
      loopTraces: traces,
      loopPatterns: loops,
      wallet,
      currencyLedger: transactions,
      selfDiscovery: discovery.records,
      exportedAt: new Date().toISOString(),
    };
  }

  async deleteAccount(userId: string): Promise<void> {
    await this.adapter.transaction(async (tx) => {
      // Cascade delete user and all associated child entities
      await tx.execute('DELETE FROM users WHERE id = $1', [userId]);
      await tx.execute(
        `INSERT INTO audit_logs (id, user_id, action, metadata_json, created_at)
         VALUES ($1, NULL, 'ACCOUNT_PURGED', $2, CURRENT_TIMESTAMP)`,
        [`aud_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`, { purgedUserIdHash: crypto.createHash('sha256').update(userId).digest('hex') }]
      );
    });
  }
}

export const userRepository = new UserRepository();
