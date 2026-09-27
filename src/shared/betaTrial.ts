import type { ChatQuotaStatus } from './chatQuota.js';
export const BETA_TRIAL_DAYS = 14;
export interface BetaTrialStatus {
  quota?: ChatQuotaStatus;
  state: 'not_started' | 'active' | 'expired';
  startedAt: string | null;
  expiresAt: string | null;
  daysRemaining: number;
  interested: boolean;
  paidUntil?: string | null;
  paymentMode?: 'test';
}

