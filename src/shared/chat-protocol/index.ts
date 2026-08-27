/**
 * Shared Chat Protocol Module (Client & Server-safe)
 * Contains only safe types, state rules, consent evaluation, and chip labels.
 *
 * NOTE: System Prompts containing master instructions are kept in server-only modules.
 */

export * from './conversationTypes.ts';
export * from './consentRules.ts';
export * from './safetyRules.ts';
export * from './chipLabels.ts';
export * from './stageCriteria.ts';
