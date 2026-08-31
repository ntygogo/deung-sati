/**
 * Unified Chat Protocol & State Schema
 * Shared across Client, Express Server, and Vercel Serverless runtimes.
 */

export type Screen =
  | 'home'
  | 'pause'
  | 'chat'
  | 'beforeSpeak'
  | 'perspective'
  | 'journey'
  | 'profile';

export type EvidenceType =
  | 'รู้ตัวหลังเกิด'
  | 'รู้ตัวระหว่างเกิด'
  | 'รู้ก่อนทำ'
  | 'หยุดก่อน'
  | 'เลือกใหม่'
  | 'กลับมาซ่อม';

export type SafetyState = 'normal' | 'concern' | 'crisis';

export type ChatMode = 'HOLD' | 'SEE' | 'CHANGE';

export type UserCapacity = 'low' | 'medium' | 'high';

export type ReadinessLevel =
  | 'story'
  | 'glimpse'
  | 'ambivalence'
  | 'direction'
  | 'experiment'
  | 'practice';

export type ExerciseId =
  | 'emergency_pause'
  | 'grounding_5_senses'
  | 'contact_grounding'
  | 'name_the_feeling'
  | 'body_signal'
  | 'fact_story_unknown'
  | 'loop_snapshot'
  | 'observer_view'
  | 'perspective_lens'
  | 'before_speak'
  | 'future_self_choice'
  | 'if_then_plan'
  | 'repair_after_loop';

export interface RecommendedExercise {
  id: ExerciseId;
  reason: string;
  ask_consent: boolean;
}

export interface CandidateLoop {
  id?: string;
  trigger?: string;
  emotion?: string;
  interpretation?: string;
  habitual_action?: string;
  consequence?: string;
  new_choice?: string;
}

export interface EvidenceCandidate {
  type: string;
  description: string;
  timestamp: string;
}

export interface ExerciseResultPayload {
  type: 'exercise_result';
  exercise_id: ExerciseId;
  result: Record<string, any>;
  summary_text?: string;
}

import type { UserConversationIntent } from './conversationIntents.ts';
import type { ChatEngineTurnResponse } from './structuredOutputSchema.ts';

export type UserIntent = UserConversationIntent;
export type { ChatEngineTurnResponse };

export type CbtConversationStage = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type ConversationIntent =
  | 'crisis'
  | 'pausing'
  | 'venting'
  | 'exploring'
  | 'deciding'
  | 'practicing'
  | 'summarizing'
  | 'unclear';

export type EmotionalCheckinStep =
  | 'idle'
  | 'offered'
  | 'awaiting_consent'
  | 'step1_body'
  | 'step2_texture'
  | 'step3_trigger'
  | 'step4_naming'
  | 'step5_fact_feeling'
  | 'step6_exercise'
  | 'completed'
  | 'declined';

export interface EmotionalCheckinData {
  step: EmotionalCheckinStep;
  bodyPart?: string;
  texture?: string;
  triggerEvent?: string;
  emotionName?: string;
  fact?: string;
  feelingOrStory?: string;
  selectedExercise?: string;
}

export interface ExerciseCardData {
  title: string;
  description: string;
  steps: string[];
  duration: string;
}

export interface SessionStatePayload {
  cbtStage?: CbtConversationStage;
  conversationIntent?: ConversationIntent;
  checkinState?: EmotionalCheckinData;
  activeMode?: ChatMode;
  activeExerciseId?: ExerciseId | null;
  activeLoopId?: string | null;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  options?: string[];
  checkinData?: EmotionalCheckinData;
  exerciseCard?: ExerciseCardData;
  structuredTurn?: ChatEngineTurnResponse;
  exerciseResult?: ExerciseResultPayload;
  cbtStage?: CbtConversationStage;
  conversationIntent?: ConversationIntent;
  specialType?: 'fact_story' | 'choice';
  factStory?: {
    fact: string;
    story: string;
  };
  choiceData?: {
    title: string;
    options: string[];
  };
  isStreaming?: boolean;
  hasError?: boolean;
  createdAt?: number;
}

export interface LoopMapElement {
  value: string;
  sourceType: 'user_explicit' | 'ai_reflection';
}

export interface LoopMapData {
  id?: string;
  title?: string;
  event?: LoopMapElement;
  feeling?: LoopMapElement;
  interpretation?: LoopMapElement;
  needFear?: LoopMapElement;
  habitualResponse?: LoopMapElement;
  habitualResult?: LoopMapElement;
  newChoice?: LoopMapElement;
  userConfirmed?: boolean;
}

export interface SafetyClassificationResult {
  mode: 'normal' | 'explore' | 'protect';
  risk_type: string[];
  reason: string;
  confidence: number;
}
