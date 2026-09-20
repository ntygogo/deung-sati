export const SPRITE_CLIPS = ['idle', 'blink', 'greet', 'play', 'sleep', 'wave', 'curious', 'nuzzle', 'stretch', 'look', 'shift', 'tail'] as const;
export type SpriteClipName = typeof SPRITE_CLIPS[number];
const TAP_GESTURES: SpriteClipName[] = ['wave', 'play', 'curious', 'stretch', 'greet'];
const IDLE_GESTURES: SpriteClipName[] = ['curious', 'stretch', 'greet', 'wave', 'play'];
const IDLE_DETAILS: SpriteClipName[] = ['look', 'shift', 'tail'];
export const REST_AFTER = 90;
export const SLEEP_AFTER = 180;
export type SpriteManifest = {
  tileSize: number;
  columns: number;
  clips: Record<SpriteClipName, { src: string; frames: number; fps: number }>;
};
export type SpritePose = { clip: SpriteClipName; frame: number; mood: 'awake' | 'happy' | 'rest' | 'sleep'; action: string };

// An active-time clock, so pausing/backgrounding never skips the pet's actions.
// Every action finishes; no showcase video or fixed choreography is looped.
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
  active: { clip: SpriteClipName; at: number; reverse?: boolean } | null = null;
  constructor(private readonly random = Math.random) {}

  touch(interaction: 'tap' | 'pet' = 'tap') {
    const waking = this.time - this.lastTouch >= SLEEP_AFTER;
    this.lastTouch = this.time;
    const clip = waking ? 'sleep' : interaction === 'pet' ? 'nuzzle' : TAP_GESTURES[this.touches++ % TAP_GESTURES.length];
    this.active = { clip, at: this.time, reverse: waking };
    if (!waking) this.lastGesture = clip;
    this.nextGesture = this.time + 18 + this.random() * 12;
    this.nextDetail = this.time + 5 + this.random() * 3;
    this.nextBlink = this.time + 3 + this.random() * 4;
  }

  step(dt: number, manifest: SpriteManifest, reducedMotion = false): SpritePose {
    this.time += Math.max(0, dt);
    const quiet = this.time - this.lastTouch;
    if (this.active) {
      const { frames, fps } = manifest.clips[this.active.clip];
      if (this.time - this.active.at >= frames / fps) {
        this.nextAmbientAt = this.active.at + frames / fps + .7;
        this.active = null;
      }
    }
    if (!this.active) {
      if (quiet >= SLEEP_AFTER) {
        const frames = manifest.clips.sleep.frames;
        const frame = reducedMotion ? frames - 1 : Math.min(frames - 1, Math.floor((quiet - SLEEP_AFTER) * manifest.clips.sleep.fps));
        return { clip: 'sleep', frame, mood: 'sleep', action: 'dozing' };
      }
      if (!reducedMotion && quiet < REST_AFTER && this.time >= this.nextAmbientAt && this.time >= this.nextGesture) {
        const options = IDLE_GESTURES.filter(clip => clip !== this.lastGesture);
        const clip = options[Math.min(options.length - 1, Math.floor(this.random() * options.length))];
        this.active = { clip, at: this.time };
        this.lastGesture = clip;
        this.nextGesture = this.time + manifest.clips[clip].frames / manifest.clips[clip].fps + 18 + this.random() * 12;
      } else if (!reducedMotion && this.time >= this.nextAmbientAt && this.time >= this.nextBlink) {
        this.active = { clip: 'blink', at: this.time };
        this.nextBlink = this.time + 3 + this.random() * 4;
      } else if (!reducedMotion && this.time >= this.nextAmbientAt && this.time >= this.nextDetail) {
        const options = IDLE_DETAILS.filter(clip => clip !== this.lastDetail);
        const clip = options[Math.min(options.length - 1, Math.floor(this.random() * options.length))];
        this.active = { clip, at: this.time };
        this.lastDetail = clip;
        const duration = manifest.clips[clip].frames / manifest.clips[clip].fps;
        this.nextDetail = this.time + duration + (quiet >= REST_AFTER ? 5 + this.random() * 5 : 1.5 + this.random() * 3);
      }
    }
    if (this.active) {
      const { clip, at, reverse } = this.active;
      const info = manifest.clips[clip];
      const position = Math.min(info.frames - 1, Math.floor((this.time - at) * info.fps));
      const frame = reducedMotion ? Math.floor(info.frames / 2) : reverse ? info.frames - 1 - position : position;
      return { clip, frame, mood: quiet < 2.5 ? 'happy' : quiet >= REST_AFTER ? 'rest' : 'awake', action: reverse ? 'wake' : clip };
    }
    const idle = manifest.clips.idle;
    return { clip: 'idle', frame: reducedMotion ? 0 : Math.floor(this.time * idle.fps) % idle.frames, mood: quiet >= REST_AFTER ? 'rest' : 'awake', action: 'idle' };
  }
}
