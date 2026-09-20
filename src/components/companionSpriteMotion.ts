export const SPRITE_CLIPS = ['idle', 'blink', 'greet', 'play', 'sleep', 'wave', 'curious', 'nuzzle', 'stretch', 'look', 'shift', 'tail', 'sitDown', 'seated', 'lieDown', 'sleeping', 'rise', 'spin'] as const;
export type SpriteClipName = typeof SPRITE_CLIPS[number];
export type CompanionCommand = 'sit' | 'sleep' | 'spin';
const TAP_GESTURES: SpriteClipName[] = ['wave', 'play', 'spin', 'curious', 'stretch', 'greet'];
const IDLE_GESTURES: SpriteClipName[] = ['curious', 'stretch', 'greet', 'wave', 'play', 'spin'];
const IDLE_DETAILS: SpriteClipName[] = ['look', 'shift', 'tail'];
const TRANSITIONS = new Set<SpriteClipName>(['sitDown', 'lieDown', 'rise']);
export const REST_AFTER = 90;
export const SLEEP_AFTER = 180;
export type SpriteManifest = {
  tileSize: number;
  columns: number;
  clips: Record<SpriteClipName, { src: string; frames: number; fps: number }>;
};
export type SpritePose = { clip: SpriteClipName; frame: number; mood: 'awake' | 'happy' | 'rest' | 'sleep'; action: string };
type Action = { clip: SpriteClipName; reverse?: boolean; fromFrame?: number };

// Active time stops when paused or hidden. Rest transitions reverse from the
// displayed frame, so touching a resting pet never teleports it upright.
export class CompanionSpriteMotion {
  time = 0;
  lastTouch = 0;
  nextBlink = 3;
  nextGesture = 18;
  nextDetail = 4;
  nextAmbientAt = 0;
  touches = 0;
  lastGesture: SpriteClipName | null = null;
  lastDetail: SpriteClipName | null = null;
  active: (Action & { at: number }) | null = null;
  posture: 'standing' | 'seated' | 'lying' = 'standing';
  private restIntent: 'sit' | 'sleep' | null = null;
  private pending: Action[] = [];
  private restSince = 0;
  private pose: SpritePose = { clip: 'idle', frame: 0, mood: 'awake', action: 'idle' };
  constructor(private readonly random = Math.random) {}
  private start(action: Action) { this.active = { ...action, at: this.time }; }
  private remember(pose: SpritePose) { this.pose = pose; return pose; }
  private resetTimers() {
    this.lastTouch = this.time;
    this.nextGesture = this.time + 18 + this.random() * 12;
    this.nextDetail = this.time + 5 + this.random() * 3;
    this.nextBlink = this.time + 3 + this.random() * 4;
  }
  private wake(next: SpriteClipName): boolean {
    if (this.active?.reverse || this.active?.clip === 'rise') {
      this.pending = this.active.clip === 'lieDown'
        ? [{ clip: 'sitDown', reverse: true }, { clip: next }] : [{ clip: next }];
      return true;
    }
    if (this.active?.clip === 'lieDown') {
      this.start({ clip: 'lieDown', reverse: true, fromFrame: this.pose.frame });
      this.pending = [{ clip: 'sitDown', reverse: true }, { clip: next }];
    } else if (this.active?.clip === 'sitDown') {
      this.start({ clip: 'sitDown', reverse: true, fromFrame: this.pose.frame });
      this.pending = [{ clip: next }];
    } else if (this.posture === 'lying') {
      this.start({ clip: 'rise' });
      this.pending = [{ clip: next }];
    } else if (this.posture === 'seated') {
      this.start({ clip: 'sitDown', reverse: true });
      this.pending = [{ clip: next }];
    } else return false;
    return true;
  }
  touch(interaction: 'tap' | 'pet' = 'tap') {
    this.restIntent = null;
    this.resetTimers();
    if (this.wake('stretch')) return;
    const clip = interaction === 'pet' ? 'nuzzle' : TAP_GESTURES[this.touches++ % TAP_GESTURES.length];
    this.pending = [];
    this.start({ clip });
    this.lastGesture = clip;
  }
  request(command: CompanionCommand) {
    this.resetTimers();
    if (command === 'spin') {
      this.restIntent = null;
      this.lastGesture = 'spin';
      if (!this.wake('spin')) { this.pending = []; this.start({ clip: 'spin' }); }
      return;
    }
    this.restIntent = command;
    if (command === 'sit' && this.active?.clip === 'lieDown' && !this.active.reverse) {
      this.start({ clip: 'lieDown', reverse: true, fromFrame: this.pose.frame });
      this.pending = [];
    } else if (command === 'sit' && this.posture === 'lying' && !this.active) {
      this.start({ clip: 'lieDown', reverse: true });
    } else if (this.active && !TRANSITIONS.has(this.active.clip)) {
      this.active = null;
      this.pending = [];
    }
  }
  step(dt: number, manifest: SpriteManifest, reducedMotion = false): SpritePose {
    this.time += Math.max(0, dt);
    const quiet = this.time - this.lastTouch;
    if (this.active) {
      const { frames, fps } = manifest.clips[this.active.clip];
      const startFrame = this.active.fromFrame ?? (this.active.reverse ? frames - 1 : 0);
      const duration = (this.active.reverse ? startFrame + 1 : frames - startFrame) / fps;
      if (this.time - this.active.at >= duration - 1e-9) {
        const finished = this.active;
        if (finished.clip === 'sitDown') this.posture = finished.reverse ? 'standing' : 'seated';
        if (finished.clip === 'lieDown') this.posture = finished.reverse ? 'seated' : 'lying';
        if (finished.clip === 'rise') this.posture = 'standing';
        if (TRANSITIONS.has(finished.clip)) this.restSince = this.time;
        this.nextAmbientAt = finished.at + duration + .7;
        this.active = null;
        const next = this.pending.shift();
        if (next) this.start(next);
      }
    }
    if (!this.active) {
      const wantSleep = this.restIntent === 'sleep' || quiet >= SLEEP_AFTER;
      const wantSit = wantSleep || this.restIntent === 'sit' || quiet >= REST_AFTER;
      if (this.posture === 'standing' && wantSit) this.start({ clip: 'sitDown' });
      else if (this.posture === 'seated' && wantSleep) this.start({ clip: 'lieDown' });
      else if (this.posture !== 'standing') {
        const clip = this.posture === 'lying' ? 'sleeping' : 'seated';
        const info = manifest.clips[clip];
        return this.remember({ clip, frame: reducedMotion ? 0 : Math.floor((this.time - this.restSince) * info.fps) % info.frames,
          mood: clip === 'sleeping' ? 'sleep' : 'rest', action: clip === 'sleeping' ? 'dozing' : 'seated' });
      } else if (!reducedMotion && this.time >= this.nextAmbientAt) {
        if (this.time >= this.nextGesture) {
          const options = IDLE_GESTURES.filter(clip => clip !== this.lastGesture);
          const clip = options[Math.min(options.length - 1, Math.floor(this.random() * options.length))];
          this.start({ clip });
          this.lastGesture = clip;
          this.nextGesture = this.time + manifest.clips[clip].frames / manifest.clips[clip].fps + 18 + this.random() * 12;
        } else if (this.time >= this.nextBlink) {
          this.start({ clip: 'blink' });
          this.nextBlink = this.time + 3 + this.random() * 4;
        } else if (this.time >= this.nextDetail) {
          const options = IDLE_DETAILS.filter(clip => clip !== this.lastDetail);
          const clip = options[Math.min(options.length - 1, Math.floor(this.random() * options.length))];
          this.start({ clip });
          this.lastDetail = clip;
          this.nextDetail = this.time + manifest.clips[clip].frames / manifest.clips[clip].fps + 1.5 + this.random() * 3;
        }
      }
    }
    if (this.active) {
      const { clip, at, reverse } = this.active;
      const info = manifest.clips[clip];
      const startFrame = this.active.fromFrame ?? (reverse ? info.frames - 1 : 0);
      const offset = Math.floor((this.time - at) * info.fps);
      const frame = reducedMotion ? TRANSITIONS.has(clip) ? reverse ? 0 : info.frames - 1 : Math.floor(info.frames / 2)
        : Math.max(0, Math.min(info.frames - 1, startFrame + (reverse ? -offset : offset)));
      const waking = reverse || clip === 'rise';
      return this.remember({ clip, frame, mood: waking ? 'happy' : TRANSITIONS.has(clip) ? 'rest' : quiet < 2.5 ? 'happy' : 'awake', action: waking ? 'wake' : clip });
    }
    const idle = manifest.clips.idle;
    return this.remember({ clip: 'idle', frame: reducedMotion ? 0 : Math.floor(this.time * idle.fps) % idle.frames, mood: 'awake', action: 'idle' });
  }
}
