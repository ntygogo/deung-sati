export const CHAT_LIMITS = { trial: 30, paid: 50, messageChars: 4000, contextChars: 16000 } as const;
export interface ChatQuotaStatus {
  limit: number;
  used: number;
  remaining: number;
  resetsAt: string;
  timezone: 'Asia/Bangkok';
}
export function quotaWindow(now = Date.now()) {
  const offset = 7 * 60 * 60 * 1000;
  const day = new Date(now + offset).toISOString().slice(0, 10);
  return { day, resetsAt: new Date(Date.parse(day + 'T00:00:00+07:00') + 86400000).toISOString() };
}
