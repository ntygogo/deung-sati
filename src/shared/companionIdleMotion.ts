/** Presentation-only idle choreography. Never reads or changes a pet's saved DNA. */
export const IDLE_DURATIONS = { scratch: 5.4, curious: 5.8, glass: 10, swim: 11.6 } as const;
export type CompanionIdleKind = keyof typeof IDLE_DURATIONS;
export const IDLE_KINDS = Object.keys(IDLE_DURATIONS) as CompanionIdleKind[];
export type IdleMoment = { kind: CompanionIdleKind; age: number; side: number; weight: number };

export function ease(value: number, start: number, end: number) {
  const x = Math.max(0, Math.min(1, (value - start) / (end - start)));
  return x * x * (3 - 2 * x);
}
export function idleEnvelope(age: number, duration: number, enter = 0.9, exit = 1) {
  return ease(age, 0, enter) * (1 - ease(age, duration - exit, duration));
}

/** A shuffled bag shows every gesture, with a quiet 8–15 seconds between them. */
export class CompanionIdleDirector {
  private bag: CompanionIdleKind[] = [];
  private previous?: CompanionIdleKind;
  private active?: { kind: CompanionIdleKind; started: number; side: number; cancelledAt?: number };
  private pending?: CompanionIdleKind;
  private nextAt = 3.2;
  private wasAllowed = true;
  constructor(private random = Math.random) {}

  private choose() {
    if (!this.bag.length) {
      this.bag = [...IDLE_KINDS];
      for (let i = this.bag.length - 1; i > 0; i--) {
        const j = Math.floor(this.random() * (i + 1));
        [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
      }
      if (this.bag[this.bag.length - 1] === this.previous) {
        [this.bag[0], this.bag[this.bag.length - 1]] = [this.bag[this.bag.length - 1], this.bag[0]];
      }
    }
    return this.bag.pop()!;
  }

  step(now: number, allowed: boolean, requested?: CompanionIdleKind): IdleMoment | null {
    if (requested) this.pending = requested;
    if (this.wasAllowed && !allowed) this.nextAt = now + 8 + this.random() * 7;
    if (!this.wasAllowed && allowed) this.nextAt = now + 8 + this.random() * 7;
    this.wasAllowed = allowed;
    if (this.active) {
      if ((!allowed || this.pending) && this.active.cancelledAt === undefined) this.active.cancelledAt = now;
      const age = (this.active.cancelledAt ?? now) - this.active.started;
      const weight = this.active.cancelledAt === undefined ? 1 : 1 - ease(now - this.active.cancelledAt, 0, 0.55);
      if (age < IDLE_DURATIONS[this.active.kind] && weight > 0) return { ...this.active, age, weight };
      this.active = undefined;
      this.nextAt = now + 8 + this.random() * 7;
    }
    if (!allowed || (!this.pending && now < this.nextAt)) return null;
    const kind = this.pending ?? this.choose();
    this.pending = undefined;
    this.previous = kind;
    this.active = { kind, started: now, side: this.random() < 0.5 ? -1 : 1 };
    return { kind, age: 0, side: this.active.side, weight: 1 };
  }
}
