/**
 * Unified Chat Protocol Module (Single Source of Truth)
 * Shared across Client (React), Express Server (Dev), and Vercel Serverless (Production).
 * Uses explicit .js extensions for Node ESM & Vercel serverless compatibility.
 */

export * from './conversationTypes.js';
export * from './conversationIntents.js';
export * from './capacityRules.js';
export * from './modeRules.js';
export * from './knownFields.js';
export * from './relationshipMirrorRules.js';
export * from './interventionRules.js';
export * from './toneRules.js';
export * from './consentRules.js';
export * from './safetyRules.js';
export * from './chipLabels.js';
export * from './stageCriteria.js';
export * from './exerciseRegistry.js';
export * from './structuredOutputSchema.js';
export * from './masterPrompt.js';
export * from './exerciseCatalog.js';
