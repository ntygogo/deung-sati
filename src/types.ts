export type TabType = 'today' | 'chat' | 'loops' | 'exercises' | 'services';

export type SafetyMode = 'normal' | 'explore' | 'protect';

export * from './shared/chat-protocol/index.ts';

export interface FactStoryData {
  fact: string;
  story: string;
}

export interface ChoiceData {
  title: string;
  options: string[];
  note?: string;
}

export interface LoopField {
  value: string | null;
  sourceType: 'user_explicit' | 'ai_reflection';
}

export interface LoopMapData {
  id?: string;
  title?: string;
  event: LoopField;
  feeling: LoopField;
  interpretation: LoopField;
  needFear?: LoopField;
  habitualResponse: LoopField;
  habitualResult: LoopField;
  newChoice: LoopField;
  userConfirmed?: boolean;
  createdAt?: string;
}

export interface CrisisContact {
  org: string;
  phone: string;
  desc: string;
  availability: string;
}

export interface ScenarioDefinition {
  id: string;
  title: string;
  badge: string;
  mode: SafetyMode;
  initialUserMessage: string;
  messages: any[];
}

export type MoodWeather = 'sunny' | 'partly_cloudy' | 'rainy' | 'stormy';

export interface GratitudeEntry {
  id: string;
  date: string; // YYYY-MM-DD
  moodWeather: MoodWeather;
  text: string;
  tag?: string;
  createdAt: string;
}

export type MembershipTier = 'free' | 'monthly' | 'yearly' | 'lifetime';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  isPlus: boolean;
  tier: MembershipTier;
  plusExpiresAt?: string;
  createdAt: string;
  lastLoginAt?: string;
  avatarUrl?: string;
}
