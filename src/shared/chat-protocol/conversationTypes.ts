/**
 * Conversation Types & State Schema
 * Shared across Client, Server, and Serverless runtime environments.
 */

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
  cbtStage: CbtConversationStage;
  conversationIntent: ConversationIntent;
  checkinState: EmotionalCheckinData;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  options?: string[];
  checkinData?: EmotionalCheckinData;
  exerciseCard?: ExerciseCardData;
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
