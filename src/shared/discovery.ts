/** Reflection drafts are independent of confirmed Loop Traces and growth rewards. */
export type DiscoveryLocale = 'th' | 'en';
export type DiscoveryExerciseId = 'check-capacity' | 'boundary' | 'tiny-step' | 'kind-self-talk' | 'grounding' | 'facts-story' | 'savor' | 'name-emotion';
export type AssessmentAnswer = 0 | 1 | 2 | 3 | 'na' | 'unsure' | 'skip' | null;
export type AssessmentId = 'self-boundary' | 'emotional-awareness';
export type AssessmentData = {
  assessmentId: AssessmentId;
  answers: Record<string, AssessmentAnswer>;
  feedback: '' | 'yes' | 'partly' | 'no';
  focus: string;
};
export type EmotionData = {
  context: string;
  story: string;
  emotions: string[];
  customEmotion: string;
  intensity: number | null;
  body: string;
  needs: string[];
  customNeed: string;
  goal: DiscoveryExerciseId | null;
};
export type PracticeData = {
  exerciseId: DiscoveryExerciseId;
  sourceLabel: string;
  fields: Record<string, string>;
  obstacle: string;
  status: 'planned' | 'tried' | 'not-yet';
  outcome: null | 'helpful' | 'same' | 'harder';
  reflection: string;
  nextStep: string;
};
type DiscoveryBase = { id: string; version: 1; locale: DiscoveryLocale; createdAt: string };
export type DiscoveryRecord = DiscoveryBase & (
  { kind: 'assessment'; data: AssessmentData }
  | { kind: 'emotion'; data: EmotionData }
  | { kind: 'practice'; data: PracticeData }
);
export type SavedDiscoveryRecord = DiscoveryRecord & { revision: number; updatedAt: string };
export type DiscoveryCollection = { ownerId: string; records: SavedDiscoveryRecord[] };
export type DiscoveryDocument = { ownerId: string; record: SavedDiscoveryRecord };

export const DISCOVERY_EXERCISE_IDS: readonly DiscoveryExerciseId[] = ['check-capacity', 'boundary', 'tiny-step', 'kind-self-talk', 'grounding', 'facts-story', 'savor', 'name-emotion'];
export const DISCOVERY_EMOTION_IDS = ['happy', 'calm', 'proud', 'grateful', 'sad', 'angry', 'anxious', 'tired', 'lonely', 'confused', 'numb', 'mixed', 'unsure'] as const;
export const DISCOVERY_NEED_IDS = ['rest', 'clarity', 'support', 'space', 'connection', 'fairness', 'autonomy', 'meaning', 'celebrate', 'unsure'] as const;

function object(value: unknown, keys?: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) throw new Error('Invalid discovery object');
  const result = value as Record<string, unknown>;
  if (keys && (Object.keys(result).length !== keys.length || Object.keys(result).some(key => !keys.includes(key)))) throw new Error('Invalid discovery fields');
  return result;
}
function text(value: unknown, max: number): string {
  if (typeof value !== 'string' || value.length > max) throw new Error('Invalid discovery text');
  return value;
}
function choice<T extends string>(value: unknown, choices: readonly T[]): T {
  if (typeof value !== 'string' || !choices.includes(value as T)) throw new Error('Invalid discovery choice');
  return value as T;
}
function choices(value: unknown, permitted: readonly string[]): string[] {
  if (!Array.isArray(value) || value.length > Math.min(8, permitted.length) || new Set(value).size !== value.length) throw new Error('Invalid discovery selections');
  return value.map(entry => choice(entry, permitted));
}
export function validateDiscoveryId(value: unknown): string {
  const id = text(value, 160);
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{7,159}$/.test(id)) throw new Error('Invalid discovery identifier');
  return id;
}
export function validateDiscoveryRecord(value: unknown): DiscoveryRecord {
  const record = object(value, ['id', 'kind', 'version', 'locale', 'createdAt', 'data']);
  if (record.version !== 1) throw new Error('Unsupported discovery version');
  const createdAt = text(record.createdAt, 40);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(createdAt) || !Number.isFinite(Date.parse(createdAt)) || new Date(createdAt).toISOString() !== createdAt) throw new Error('Invalid discovery date');
  const base: DiscoveryBase = { id: validateDiscoveryId(record.id), version: 1, locale: choice(record.locale, ['th', 'en']), createdAt };
  if (record.kind === 'assessment') {
    const data = object(record.data, ['assessmentId', 'answers', 'feedback', 'focus']);
    const assessmentId = choice(data.assessmentId, ['self-boundary', 'emotional-awareness']);
    const answerData = object(data.answers);
    const prefix = assessmentId === 'self-boundary' ? 'SB' : 'EA';
    const keys = Array.from({ length: 12 }, (_, index) => `${prefix}${String(index + 1).padStart(2, '0')}`);
    if (Object.keys(answerData).some(key => !keys.includes(key))) throw new Error('Unknown assessment item');
    const answers: Record<string, AssessmentAnswer> = {};
    for (const key of keys) {
      const answer = Object.hasOwn(answerData, key) ? answerData[key] : null;
      if (![0, 1, 2, 3, 'na', 'unsure', 'skip', null].includes(answer as AssessmentAnswer)) throw new Error('Invalid assessment answer');
      answers[key] = answer as AssessmentAnswer;
    }
    // Store answers only; display scores must be calculated from the versioned catalog.
    const focusIds = assessmentId === 'self-boundary' ? ['', 'notice', 'choose', 'follow', 'adapt'] : ['', 'notice', 'name', 'context', 'response'];
    return { ...base, kind: 'assessment', data: { assessmentId, answers, feedback: choice(data.feedback, ['', 'yes', 'partly', 'no']), focus: choice(data.focus, focusIds) } };
  }
  if (record.kind === 'emotion') {
    const data = object(record.data, ['context', 'story', 'emotions', 'customEmotion', 'intensity', 'body', 'needs', 'customNeed', 'goal']);
    if (data.intensity !== null && (!Number.isInteger(data.intensity) || (data.intensity as number) < 0 || (data.intensity as number) > 10)) throw new Error('Invalid emotion intensity');
    const emotion: EmotionData = {
      context: text(data.context, 2000), story: text(data.story, 2000), emotions: choices(data.emotions, DISCOVERY_EMOTION_IDS), customEmotion: text(data.customEmotion, 200),
      intensity: data.intensity as number | null, body: text(data.body, 1000), needs: choices(data.needs, DISCOVERY_NEED_IDS), customNeed: text(data.customNeed, 200),
      goal: data.goal === null ? null : choice(data.goal, DISCOVERY_EXERCISE_IDS),
    };
    if (![emotion.context, emotion.story, emotion.customEmotion, emotion.body, emotion.customNeed].some(value => value.trim()) && !emotion.emotions.length && !emotion.needs.length && emotion.intensity === null && emotion.goal === null) throw new Error('Empty emotion record');
    return { ...base, kind: 'emotion', data: emotion };
  }
  if (record.kind === 'practice') {
    const data = object(record.data, ['exerciseId', 'sourceLabel', 'fields', 'obstacle', 'status', 'outcome', 'reflection', 'nextStep']);
    const fieldData = object(data.fields);
    if (Object.keys(fieldData).length > 12) throw new Error('Too many practice fields');
    const fields: Record<string, string> = {};
    for (const key of Object.keys(fieldData).sort()) {
      if (!/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/.test(key) || ['constructor', 'prototype', '__proto__'].includes(key)) throw new Error('Invalid practice field');
      fields[key] = text(fieldData[key], 1000);
    }
    const status = choice(data.status, ['planned', 'tried', 'not-yet']);
    const outcome = data.outcome === null ? null : choice(data.outcome, ['helpful', 'same', 'harder']);
    if ((status === 'tried') !== (outcome !== null)) throw new Error('Practice outcome must match status');
    return { ...base, kind: 'practice', data: {
      exerciseId: choice(data.exerciseId, DISCOVERY_EXERCISE_IDS), sourceLabel: text(data.sourceLabel, 200), fields, obstacle: text(data.obstacle, 1000), status, outcome,
      reflection: text(data.reflection, 2000), nextStep: text(data.nextStep, 1000),
    } };
  }
  throw new Error('Invalid discovery kind');
}
