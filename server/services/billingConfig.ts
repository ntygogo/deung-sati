export const BILLING_PLAN = { id: 'chat-30d-v1', amount: 14900, currency: 'thb', days: 30 } as const;

export function inUserList(name: string, userId: string): boolean {
  return (process.env[name] || '').split(',').map(s => s.trim()).filter(Boolean).includes(userId);
}

export function billingMode(): 'test' | 'live' | null {
  return process.env.BILLING_MODE === 'live' ? 'live' : process.env.BILLING_MODE === 'test' ? 'test' : null;
}
export function billingOrdersTable() { return billingMode() === 'live' ? 'billing_orders_live' : 'billing_orders'; }
export function billingEventsTable() { return billingMode() === 'live' ? 'billing_events_live' : 'billing_events'; }
export function billingConfigured(): boolean {
  const mode = billingMode();
  const key = process.env.STRIPE_SECRET_KEY || '';
  return !!mode && new RegExp(`^(sk|rk)_${mode}_[A-Za-z0-9]+$`).test(key)
    && !!process.env.STRIPE_WEBHOOK_SECRET?.startsWith('whsec_')
    && !!process.env.BILLING_APP_ORIGIN;
}
export function canUseBilling(userId: string): boolean {
  return billingMode() === 'live' || (billingMode() === 'test' && inUserList('BILLING_TEST_USER_IDS', userId));
}
export function billingOrigin(): string {
  const url = new URL(process.env.BILLING_APP_ORIGIN || '');
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('Invalid billing origin');
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) throw new Error('HTTPS required');
  return url.origin;
}

