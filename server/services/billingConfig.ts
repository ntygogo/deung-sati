export const BILLING_PLAN = { id: 'chat-30d-v1', amount: 14900, currency: 'thb', days: 30 } as const;

export function inUserList(name: string, userId: string): boolean {
  return (process.env[name] || '').split(',').map(s => s.trim()).filter(Boolean).includes(userId);
}

// This release deliberately cannot accept live payments. Merchant approval,
// measured AI costs and a reviewed usage allowance are required before launch.
export function billingConfigured(): boolean {
  return process.env.BILLING_MODE === 'test'
    && !!process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')
    && !!process.env.STRIPE_WEBHOOK_SECRET?.startsWith('whsec_')
    && !!process.env.BILLING_APP_ORIGIN;
}
export function canTestBilling(userId: string): boolean {
  return process.env.BILLING_MODE === 'test' && inUserList('BILLING_TEST_USER_IDS', userId);
}
export function billingOrigin(): string {
  const url = new URL(process.env.BILLING_APP_ORIGIN || '');
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('Invalid billing origin');
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) throw new Error('HTTPS required');
  return url.origin;
}
