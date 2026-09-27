import { randomUUID } from 'node:crypto';
import { db } from '../db/database.js';
import { ensureBillingSchema } from './billingSchema.js';

export interface UsageMetadata { promptTokenCount?: number; cachedContentTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number }
export interface ModelRate { input: number; output: number; cachedInput?: number }
// Standard text paid-tier rates verified 2026-09-27; actual billing/free-tier
// credits, taxes and tool charges must be reconciled with the provider invoice.
const defaultRates: Record<string, ModelRate> = {
  'gemini-3.5-flash': {input:1.50,output:9.00,cachedInput:0.15},
  'gemini-3.5-flash-lite': {input:0.30,output:2.50,cachedInput:0.03},
};
const valid = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
export function estimateUsage(usage: UsageMetadata | undefined, rate?: ModelRate): number | null {
  if (!usage || !rate || !valid(usage.promptTokenCount) || !valid(usage.candidatesTokenCount)
    || !valid(rate.input) || !valid(rate.output)) return null;
  const cached = usage.cachedContentTokenCount ?? 0;
  const thoughts = usage.thoughtsTokenCount ?? 0;
  if (!valid(cached) || !valid(thoughts) || cached > usage.promptTokenCount || (cached > 0 && !valid(rate.cachedInput))) return null;
  return ((usage.promptTokenCount - cached) * rate.input + cached * (rate.cachedInput || 0)
    + (usage.candidatesTokenCount + thoughts) * rate.output) / 1e6;
}
// Store counts only. Never store prompts, assistant responses, health details,
// API keys or provider payloads in billing analytics.
export async function recordAiUsage(userId: string | undefined, model: string, usage?: UsageMetadata, outcome = 'response') {
  if (!userId) return;
  try {
    await ensureBillingSchema();
    let rate: ModelRate | undefined;
    try { rate = JSON.parse(process.env.AI_MODEL_RATES_USD || '{}')[model] ?? defaultRates[model]; } catch { /* Missing rates remain unknown, never zero. */ }
    const cost = estimateUsage(usage, rate);
    await db.execute(`INSERT INTO ai_usage
      (id,user_id,model,outcome,prompt_tokens,cached_tokens,output_tokens,thought_tokens,estimated_usd,rate_json,created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [randomUUID(), userId, model, outcome, usage?.promptTokenCount ?? null, usage?.cachedContentTokenCount ?? null,
      usage?.candidatesTokenCount ?? null, usage?.thoughtsTokenCount ?? null, cost,
      cost === null ? null : JSON.stringify({...rate, source:'https://ai.google.dev/gemini-api/docs/pricing', verifiedAt:'2026-09-27', overridden:!!process.env.AI_MODEL_RATES_USD}), new Date().toISOString()]);
  } catch { console.error('[AI usage] Recording failed; cost report may be incomplete'); }
}
