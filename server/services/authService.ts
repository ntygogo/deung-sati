import crypto from 'crypto';
import { db } from '../db/database.js';
import type { IDatabaseAdapter } from '../db/types.js';

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  salt: string;
  tier: string;
  failed_attempts: number;
  locked_until: string | null;
  legacy_migrated_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface SessionRecord {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  created_at: string;
}

export class AuthService {
  private adapter: IDatabaseAdapter;

  constructor(adapter: IDatabaseAdapter = db) {
    this.adapter = adapter;
  }

  /**
   * Async scrypt password hashing (never blocks Node.js event loop)
   */
  static async hashPassword(password: string, salt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      crypto.scrypt(password, salt, 64, (err, derivedKey) => {
        if (err) reject(err);
        else resolve(derivedKey.toString('hex'));
      });
    });
  }

  static generateSalt(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  static generateSessionToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Cryptographic hash of session token for storage (never store raw tokens)
   */
  static hashSessionToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  async register(
    name: string,
    email: string,
    password: string,
    tier: string = 'free'
  ): Promise<{ user: UserRecord; token: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const existing = await this.adapter.queryOne<UserRecord>(
      'SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL',
      [cleanEmail]
    );
    if (existing) {
      throw new Error('Email already registered');
    }

    const userId = `usr_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const salt = AuthService.generateSalt();
    const passwordHash = await AuthService.hashPassword(password, salt);

    await this.adapter.execute(
      `INSERT INTO users (id, name, email, password_hash, salt, tier, failed_attempts, locked_until, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 0, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [userId, name.trim(), cleanEmail, passwordHash, salt, tier]
    );

    // Initialize default wallet
    await this.adapter.execute(
      `INSERT INTO wallets (user_id, xp, level, shells, memory_crystals, updated_at)
       VALUES ($1, 0, 1, 0, 0, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId]
    );

    const user = (await this.adapter.queryOne<UserRecord>('SELECT * FROM users WHERE id = $1', [userId]))!;
    const token = await this.createSession(userId);

    return { user, token };
  }

  async login(email: string, password: string): Promise<{ user: UserRecord; token: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const user = await this.adapter.queryOne<UserRecord>(
      'SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL',
      [cleanEmail]
    );
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Rate limiting & temporary lockout check
    if (user.locked_until) {
      const lockExpiry = new Date(user.locked_until).getTime();
      if (Date.now() < lockExpiry) {
        const remainingMinutes = Math.ceil((lockExpiry - Date.now()) / 60000);
        throw new Error(`Account is temporarily locked. Please try again in ${remainingMinutes} minute(s).`);
      }
    }

    const computedHash = await AuthService.hashPassword(password, user.salt);
    if (computedHash !== user.password_hash) {
      // Increment failed attempts and lock if threshold exceeded
      const newAttempts = (user.failed_attempts || 0) + 1;
      if (newAttempts >= 5) {
        const lockUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        await this.adapter.execute(
          'UPDATE users SET failed_attempts = $1, locked_until = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
          [newAttempts, lockUntil, user.id]
        );
        throw new Error('Account locked due to 5 consecutive failed attempts. Please try again in 15 minutes.');
      } else {
        await this.adapter.execute(
          'UPDATE users SET failed_attempts = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [newAttempts, user.id]
        );
        throw new Error('Invalid email or password');
      }
    }

    // Reset failed attempts on successful login
    if (user.failed_attempts > 0 || user.locked_until) {
      await this.adapter.execute(
        'UPDATE users SET failed_attempts = 0, locked_until = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [user.id]
      );
    }

    const token = await this.createSession(user.id);
    return { user, token };
  }

  async createSession(userId: string): Promise<string> {
    const sessionId = `ses_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const rawToken = AuthService.generateSessionToken();
    const tokenHash = AuthService.hashSessionToken(rawToken);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // Store only token_hash in database, NEVER the raw token
    await this.adapter.execute(
      `INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [sessionId, userId, tokenHash, expiresAt]
    );

    return rawToken;
  }

  async validateSession(rawToken: string): Promise<{ user: UserRecord; session: SessionRecord } | null> {
    if (!rawToken) return null;

    const tokenHash = AuthService.hashSessionToken(rawToken);
    const session = await this.adapter.queryOne<SessionRecord>(
      'SELECT * FROM sessions WHERE token_hash = $1 AND expires_at > CURRENT_TIMESTAMP',
      [tokenHash]
    );
    if (!session) return null;

    const user = await this.adapter.queryOne<UserRecord>(
      'SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL',
      [session.user_id]
    );
    if (!user) return null;

    return { user, session };
  }

  async logout(rawToken: string): Promise<void> {
    const tokenHash = AuthService.hashSessionToken(rawToken);
    await this.adapter.execute('DELETE FROM sessions WHERE token_hash = $1', [tokenHash]);
  }
}

export const authService = new AuthService();
