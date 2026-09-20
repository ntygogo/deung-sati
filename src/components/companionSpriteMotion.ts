export type SpriteClipName = 'idle' | 'blink' | 'greet' | 'play' | 'sleep';
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
  nextGesture = 8;
  touches = 0;
  active: { clip: SpriteClipName; at: number; reverse?: boolean } | null = null;
  constructor(private readonly random = Math.random) {}

  touch() {
    const waking = this.time - this.lastTouch >= 50;
    this.lastTouch = this.time;
    this.active = { clip: waking ? 'sleep' : this.touches++ % 2 === 0 ? 'greet' : 'play', at: this.time, reverse: waking };
    this.nextGesture = this.time + 8 + this.random() * 10;
    this.nextBlink = this.time + 3 + this.random() * 4;
  }

  step(dt: number, manifest: SpriteManifest, reducedMotion = false): SpritePose {
    this.time += Math.max(0, dt);
    const quiet = this.time - this.lastTouch;
    if (this.active) {
      const { frames, fps } = manifest.clips[this.active.clip];
      if (this.time - this.active.at >= frames / fps) this.active = null;
    }
    if (!this.active) {
      if (quiet >= 50) {
        const frames = manifest.clips.sleep.frames;
        const frame = reducedMotion ? frames - 1 : Math.min(frames - 1, Math.floor((quiet - 50) * manifest.clips.sleep.fps));
        return { clip: 'sleep', frame, mood: 'sleep', action: 'dozing' };
      }
      if (!reducedMotion && quiet < 30 && this.time >= this.nextGesture) {
        this.active = { clip: this.random() > .5 ? 'greet' : 'play', at: this.time };
        this.nextGesture = this.time + 8 + this.random() * 10;
      } else if (!reducedMotion && this.time >= this.nextBlink) {
        this.active = { clip: 'blink', at: this.time };
        this.nextBlink = this.time + 3 + this.random() * 4;
      }
    }
    if (this.active) {
      const { clip, at, reverse } = this.active;
      const info = manifest.clips[clip];
      const position = Math.min(info.frames - 1, Math.floor((this.time - at) * info.fps));
      const frame = reducedMotion ? Math.floor(info.frames / 2) : reverse ? info.frames - 1 - position : position;
      return { clip, frame, mood: quiet < 2.5 ? 'happy' : quiet >= 30 ? 'rest' : 'awake', action: reverse ? 'wake' : clip };
    }
    const idle = manifest.clips.idle;
    return { clip: 'idle', frame: reducedMotion ? 0 : Math.floor(this.time * idle.fps) % idle.frames, mood: quiet >= 30 ? 'rest' : 'awake', action: 'idle' };
  }
}
