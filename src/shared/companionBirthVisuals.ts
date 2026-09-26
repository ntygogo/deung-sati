/** V1 is frozen: persisted birth recipes must never be regenerated on interaction. */
export type PracticeScores = { emotionalAwareness: number; somaticAwareness: number; cognitiveClarity: number; consciousAction: number };
export function birthVisuals(scores: PracticeScores, seed: number) {
  const values = Object.values(scores).map(n => Number.isFinite(n) ? Math.max(0, n) : 0);
  const maximum = Math.max(...values);
  const tied = values.flatMap((n, i) => n === maximum ? [i] : []);
  const focus = tied[(seed >>> 0) % tied.length];
  // Categories describe practiced skills, never quality, diagnosis, or rarity.
  return {
    visualVersion: 1,
    practiceFocus: ['emotionalAwareness', 'somaticAwareness', 'cognitiveClarity', 'consciousAction'][focus],
    bodyPattern: ['petal_marks', 'water_ripples', 'starlight_speckles', 'pearl_freckles'][focus],
    movementPersonality: ['dreamy_drift', 'serene_swaying', 'curious_peek', 'playful_bob'][focus],
  };
}
export const MOTION_PROFILES = {
  serene_swaying: { flow: .78, breath: .86, bob: .75, tilt: .65 },
  curious_peek: { flow: 1.02, breath: 1, bob: .9, tilt: 1.8 },
  playful_bob: { flow: 1.22, breath: 1.08, bob: 1.5, tilt: 1.2 },
  dreamy_drift: { flow: .65, breath: .76, bob: 1, tilt: .85 },
} as const;
export function companionMotion(id?: string) {
  return MOTION_PROFILES[id as keyof typeof MOTION_PROFILES] ?? { flow: 1, breath: 1, bob: 1, tilt: 1 };
}
