/**
 * Structured AI Output Contract for Deung Sati V1 (Authoritative SSOT)
 */

import type { SafetyState, CbtConversationStage } from './conversationTypes';
import type { UserCognitiveCapacity } from './capacityRules';
import type { ConversationMode } from './modeRules';
import type { UserConversationIntent } from './conversationIntents';
import type { KnownFieldDimension } from './knownFields';
import type { SuggestedIntervention } from './interventionRules';
import type { ReadinessLevel, RecommendedExercise, CandidateLoop, EvidenceCandidate } from './conversationTypes';

export type CheckinConsentState =
  | 'idle'
  | 'offered'
  | 'accepted'
  | 'ambiguous'
  | 'declined';

export interface CandidatePattern {
  trigger?: string;
  emotion?: string;
  interpretation?: string;
  habitual_action?: string;
  consequence?: string;
  new_choice?: string;
}

/**
 * Unified Deung Sati AI Response Contract (V1 SSOT)
 */
export interface DeungSatiAIResponse {
  safety: SafetyState;
  capacity: UserCognitiveCapacity;
  mode: ConversationMode;
  intent: UserConversationIntent;
  stage?: CbtConversationStage;
  readiness: ReadinessLevel;
  knownFields: KnownFieldDimension[];
  checkinConsent: CheckinConsentState;
  candidatePattern: CandidatePattern | null;
  suggestedIntervention: SuggestedIntervention;
  assistantMessage: string;
  quickReplies: string[];
  recommendedExercise?: RecommendedExercise | null;
  evidenceCandidate?: EvidenceCandidate | null;
}

/**
 * Backward compatibility interface for existing components & API endpoints
 */
export interface ChatEngineTurnResponse {
  assistant_message: string;
  safety_state: SafetyState;
  mode: ConversationMode;
  capacity: UserCognitiveCapacity;
  user_intent: UserConversationIntent;
  stage?: CbtConversationStage;
  intensity?: number;
  readiness: ReadinessLevel;
  recommended_exercise?: RecommendedExercise | null;
  quick_replies?: string[];
  candidate_loop?: CandidateLoop | null;
  evidence_candidate?: EvidenceCandidate | null;
  known_fields?: KnownFieldDimension[];
  checkin_consent?: CheckinConsentState;
  suggested_intervention?: SuggestedIntervention;
}
