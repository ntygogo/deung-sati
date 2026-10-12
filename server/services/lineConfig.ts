// LINE is a separate chat product. These switches do not alter web entitlements.
export const LINE_PLAN = { amount: 9900, currency: 'thb', days: 30, dailyMessages: 50 } as const;
export const LINE_FREE = { rounds: 5, messagesPerRound: 10, idleMs: 30 * 60_000 } as const;
export const LINE_FRIEND_URL = 'https://lin.ee/TKjFZTm';
export const LINE_WEB_URL = 'https://deung-sati.vercel.app';
export function lineEnabled() {
  return process.env.LINE_ENABLED === 'true' && !!process.env.LINE_CHANNEL_SECRET && !!process.env.LINE_CHANNEL_ACCESS_TOKEN;
}
export function lineUserAllowed(id: string) {
  const ids = (process.env.LINE_TEST_USER_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
  // Pilot by default; public rollout requires a separate explicit switch.
  return process.env.LINE_PUBLIC_ENABLED === 'true' || ids.includes(id);
}
export const thaiDay = (now: number) => new Date(now + 7 * 3600_000).toISOString().slice(0, 10);
