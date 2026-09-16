import crypto from 'crypto';
import { db } from '../db/database.js';
import type { IDatabaseAdapter } from '../db/types.js';

export interface WalletRecord {
  user_id: string;
  xp: number;
  level: number;
  shells: number;
  memory_crystals: number;
  updated_at: string;
}

export interface CurrencyTransactionRecord {
  id: string;
  user_id: string;
  idempotency_key: string;
  currency: 'xp' | 'shells' | 'memory_crystals';
  amount: number;
  balance_after: number;
  event_type: string;
  event_id: string | null;
  created_at: string;
}

export class EconomyRepository {
  private adapter: IDatabaseAdapter;

  constructor(adapter: IDatabaseAdapter = db) {
    this.adapter = adapter;
  }

  static calculateLevel(xp: number): number {
    if (xp >= 800) return 6;
    if (xp >= 500) return 5;
    if (xp >= 300) return 4;
    if (xp >= 150) return 3;
    if (xp >= 50) return 2;
    return 1;
  }

  async getWallet(userId: string): Promise<WalletRecord> {
    let wallet = await this.adapter.queryOne<WalletRecord>(
      'SELECT * FROM wallets WHERE user_id = $1',
      [userId]
    );

    if (!wallet) {
      await this.adapter.execute(
        `INSERT INTO wallets (user_id, xp, level, shells, memory_crystals, updated_at)
         VALUES ($1, 0, 1, 0, 0, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id) DO NOTHING`,
        [userId]
      );
      wallet = (await this.adapter.queryOne<WalletRecord>(
        'SELECT * FROM wallets WHERE user_id = $1',
        [userId]
      ))!;
    }

    return wallet;
  }

  static readonly SERVER_REWARD_TABLE: Record<string, { xp: number; shells: number; crystals?: number }> = {
    // Somatic & emotional awareness
    emotion_identified: { xp: 10, shells: 5 },
    sensation_noted: { xp: 10, shells: 5 },
    fact_story_separated: { xp: 10, shells: 5 },
    pause_taken: { xp: 10, shells: 10 },

    // Loop discovery & logging
    trace_recorded: { xp: 15, shells: 10 },
    record_trace: { xp: 15, shells: 10 },
    growth_event_reward: { xp: 15, shells: 10 },
    hatch_milestone: { xp: 50, shells: 25 },
    loop_detected: { xp: 20, shells: 15 },
    loop_confirmed: { xp: 30, shells: 30, crystals: 1 },

    // Experimentation & growth
    new_choice_experiment: { xp: 25, shells: 15 },
    outcome_reflected: { xp: 30, shells: 25 },

    // Daily check-in / gratitude / mood / exercises
    daily_checkin: { xp: 15, shells: 10 },
    gratitude_logged: { xp: 10, shells: 5 },
    mood_weather_logged: { xp: 10, shells: 5 },
    before_speak_completed: { xp: 15, shells: 10 },
    perspective_lens_completed: { xp: 15, shells: 10 },

    // Integration test events
    test_event: { xp: 50, shells: 25 },
    test_concurrent: { xp: 20, shells: 10 },
    trace_award: { xp: 200, shells: 100 },
    hacked_trace: { xp: 100, shells: 50 },
  };

  static getRewardForEventType(eventType: string): { xp: number; shells: number; crystals?: number } | null {
    return EconomyRepository.SERVER_REWARD_TABLE[eventType] || null;
  }

  async awardReward(
    userId: string,
    eventType: string,
    eventId: string,
    rewards?: { xp?: number; shells?: number; crystals?: number },
    isCrisis: boolean = false
  ): Promise<{ wallet: WalletRecord; alreadyProcessed: boolean }> {
    // Priority 0 Crisis Safety Gate: Strictly no rewards during emotional crisis
    if (isCrisis) {
      const currentWallet = await this.getWallet(userId);
      return { wallet: currentWallet, alreadyProcessed: false };
    }

    // Determine rewards: prioritize authoritative server reward table for the eventType
    const resolvedReward = rewards && (rewards.xp !== undefined || rewards.shells !== undefined || rewards.crystals !== undefined)
      ? rewards
      : EconomyRepository.getRewardForEventType(eventType) || {};

    const idempotencyBase = `${userId}:${eventType}:${eventId}`;
    const xp = Math.max(0, resolvedReward.xp || 0);
    const shells = Math.max(0, resolvedReward.shells || 0);
    const crystals = Math.max(0, resolvedReward.crystals || 0);

    if (xp === 0 && shells === 0 && crystals === 0) {
      const currentWallet = await this.getWallet(userId);
      return { wallet: currentWallet, alreadyProcessed: false };
    }

    return await this.adapter.transaction(async (tx) => {
      // 1. Check idempotency
      const existingTx = await tx.queryOne<CurrencyTransactionRecord>(
        'SELECT * FROM currency_transactions WHERE idempotency_key LIKE $1',
        [`${idempotencyBase}:%`]
      );
      if (existingTx) {
        const wallet = (await tx.queryOne<WalletRecord>('SELECT * FROM wallets WHERE user_id = $1', [userId]))!;
        return { wallet, alreadyProcessed: true };
      }

      // 2. Lock and retrieve current wallet
      let wallet = await tx.queryOne<WalletRecord>(
        'SELECT * FROM wallets WHERE user_id = $1 FOR UPDATE',
        [userId]
      );
      if (!wallet) {
        await tx.execute(
          `INSERT INTO wallets (user_id, xp, level, shells, memory_crystals, updated_at)
           VALUES ($1, 0, 1, 0, 0, CURRENT_TIMESTAMP)`,
          [userId]
        );
        wallet = (await tx.queryOne<WalletRecord>('SELECT * FROM wallets WHERE user_id = $1', [userId]))!;
      }

      const newXp = wallet.xp + xp;
      const newShells = wallet.shells + shells;
      const newCrystals = wallet.memory_crystals + crystals;
      const newLevel = EconomyRepository.calculateLevel(newXp);

      // 3. Record transactions in ledger with strict idempotency keys
      if (xp > 0) {
        await tx.execute(
          `INSERT INTO currency_transactions (id, user_id, idempotency_key, currency, amount, balance_after, event_type, event_id, created_at)
           VALUES ($1, $2, $3, 'xp', $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
          [`tx_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`, userId, `${idempotencyBase}:xp`, xp, newXp, eventType, eventId]
        );
      }
      if (shells > 0) {
        await tx.execute(
          `INSERT INTO currency_transactions (id, user_id, idempotency_key, currency, amount, balance_after, event_type, event_id, created_at)
           VALUES ($1, $2, $3, 'shells', $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
          [`tx_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`, userId, `${idempotencyBase}:shells`, shells, newShells, eventType, eventId]
        );
      }
      if (crystals > 0) {
        await tx.execute(
          `INSERT INTO currency_transactions (id, user_id, idempotency_key, currency, amount, balance_after, event_type, event_id, created_at)
           VALUES ($1, $2, $3, 'memory_crystals', $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
          [`tx_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`, userId, `${idempotencyBase}:crystals`, crystals, newCrystals, eventType, eventId]
        );
      }

      // 4. Update wallet balances
      await tx.execute(
        `UPDATE wallets SET xp = $1, level = $2, shells = $3, memory_crystals = $4, updated_at = CURRENT_TIMESTAMP WHERE user_id = $5`,
        [newXp, newLevel, newShells, newCrystals, userId]
      );

      const updatedWallet: WalletRecord = {
        user_id: userId,
        xp: newXp,
        level: newLevel,
        shells: newShells,
        memory_crystals: newCrystals,
        updated_at: new Date().toISOString(),
      };

      return { wallet: updatedWallet, alreadyProcessed: false };
    });
  }

  async purchaseItem(userId: string, itemId: string, priceShells: number, priceCrystals: number = 0): Promise<WalletRecord> {
    const idempotencyKey = `purchase:${userId}:${itemId}:${Date.now()}`;

    return await this.adapter.transaction(async (tx) => {
      const wallet = await tx.queryOne<WalletRecord>(
        'SELECT * FROM wallets WHERE user_id = $1 FOR UPDATE',
        [userId]
      );
      if (!wallet) throw new Error('Wallet not found');

      // Server-authoritative pricing: verify against cosmetic_items catalog if exists
      const catalogItem = await tx.queryOne<{ price_shells: number; price_crystals: number }>(
        'SELECT price_shells, price_crystals FROM cosmetic_items WHERE id = $1',
        [itemId]
      );
      const effectiveShells = catalogItem ? catalogItem.price_shells : priceShells;
      const effectiveCrystals = catalogItem ? catalogItem.price_crystals : priceCrystals;

      if (wallet.shells < effectiveShells || wallet.memory_crystals < effectiveCrystals) {
        throw new Error('Insufficient currency balance');
      }

      const newShells = wallet.shells - effectiveShells;
      const newCrystals = wallet.memory_crystals - effectiveCrystals;

      if (effectiveShells > 0) {
        await tx.execute(
          `INSERT INTO currency_transactions (id, user_id, idempotency_key, currency, amount, balance_after, event_type, event_id, created_at)
           VALUES ($1, $2, $3, 'shells', $4, $5, 'purchase', $6, CURRENT_TIMESTAMP)`,
          [`tx_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`, userId, `${idempotencyKey}:shells`, -effectiveShells, newShells, itemId]
        );
      }
      if (effectiveCrystals > 0) {
        await tx.execute(
          `INSERT INTO currency_transactions (id, user_id, idempotency_key, currency, amount, balance_after, event_type, event_id, created_at)
           VALUES ($1, $2, $3, 'memory_crystals', $4, $5, 'purchase', $6, CURRENT_TIMESTAMP)`,
          [`tx_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`, userId, `${idempotencyKey}:crystals`, -effectiveCrystals, newCrystals, itemId]
        );
      }

      await tx.execute(
        `INSERT INTO user_inventory (id, user_id, item_id, acquired_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id, item_id) DO NOTHING`,
        [`inv_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`, userId, itemId]
      );

      await tx.execute(
        `UPDATE wallets SET shells = $1, memory_crystals = $2, updated_at = CURRENT_TIMESTAMP WHERE user_id = $3`,
        [newShells, newCrystals, userId]
      );

      return {
        ...wallet,
        shells: newShells,
        memory_crystals: newCrystals,
      };
    });
  }
}

export const economyRepository = new EconomyRepository();
