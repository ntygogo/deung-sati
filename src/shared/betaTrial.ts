export const BETA_TRIAL_DAYS = 14;
export interface BetaTrialStatus {
  state: 'not_started' | 'active' | 'expired';
  startedAt: string | null;
  expiresAt: string | null;
  daysRemaining: number;
  interested: boolean;
}
