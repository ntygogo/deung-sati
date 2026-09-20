import assert from 'node:assert/strict';
import test from 'node:test';
import { CompanionSpriteMotion, REST_AFTER, SLEEP_AFTER, type SpriteManifest } from './companionSpriteMotion';

const manifest: SpriteManifest = {
  tileSize: 384,
  columns: 4,
  clips: {
    idle: { src: '/idle.webp', frames: 12, fps: 12 },
    blink: { src: '/blink.webp', frames: 6, fps: 12 },
    greet: { src: '/greet.webp', frames: 18, fps: 12 },
    play: { src: '/play.webp', frames: 18, fps: 12 },
    sleep: { src: '/sleep.webp', frames: 12, fps: 12 },
    wave: { src: '/wave.webp', frames: 24, fps: 12 },
    curious: { src: '/curious.webp', frames: 24, fps: 12 },
    nuzzle: { src: '/nuzzle.webp', frames: 24, fps: 12 },
    stretch: { src: '/stretch.webp', frames: 24, fps: 12 },
    look: { src: '/look.webp', frames: 36, fps: 12 },
    shift: { src: '/shift.webp', frames: 36, fps: 12 },
    tail: { src: '/tail.webp', frames: 36, fps: 12 },
  },
};

const quietClock = () => {
  const clock = new CompanionSpriteMotion(() => .5);
  clock.nextBlink = Number.POSITIVE_INFINITY;
  clock.nextGesture = Number.POSITIVE_INFINITY;
  clock.nextDetail = Number.POSITIVE_INFINITY;
  return clock;
};

test('idle advances at manifest FPS, wraps, and ignores negative deltas', () => {
  const clock = quietClock();
  assert.equal(clock.step(0, manifest).frame, 0);
  assert.equal(clock.step(.5, manifest).frame, 6);
  assert.equal(clock.step(.5, manifest).frame, 0);
  const time = clock.time;
  assert.equal(clock.step(-10, manifest).frame, 0);
  assert.equal(clock.time, time);
});

test('touch produces a finite wave followed by finite play', () => {
  const clock = quietClock();
  clock.touch();
  assert.deepEqual(clock.step(0, manifest), { clip: 'wave', frame: 0, mood: 'happy', action: 'wave' });
  assert.equal(clock.step(1.99, manifest).frame, 23);
  assert.equal(clock.step(.02, manifest).clip, 'idle');
  clock.touch();
  assert.equal(clock.step(0, manifest).clip, 'play');
  assert.equal(clock.step(1.51, manifest).clip, 'idle');
});

test('repeated taps visit all five gestures and repeat the cycle without consuming idle actions', () => {
  const clock = quietClock();
  const expected = ['wave', 'play', 'curious', 'stretch', 'greet', 'wave', 'play', 'curious', 'stretch', 'greet'];
  for (const name of expected) {
    clock.touch();
    const pose = clock.step(0, manifest);
    assert.equal(pose.clip, name);
    assert.equal(pose.frame, 0);
    assert.equal(clock.step(manifest.clips[pose.clip].frames / manifest.clips[pose.clip].fps + .01, manifest).clip, 'idle');
  }
  assert.equal(clock.touches, expected.length);
});

test('petting produces a distinct finite nuzzle and preserves the next tap gesture', () => {
  const clock = quietClock();
  clock.touch('pet');
  assert.deepEqual(clock.step(0, manifest), { clip: 'nuzzle', frame: 0, mood: 'happy', action: 'nuzzle' });
  assert.equal(clock.step(1.99, manifest).frame, 23);
  assert.equal(clock.step(.02, manifest).clip, 'idle');
  assert.equal(clock.touches, 0);
  clock.touch();
  assert.equal(clock.step(0, manifest).clip, 'wave');
  clock.touch('pet');
  assert.equal(clock.step(0, manifest).clip, 'nuzzle');
  clock.touch();
  assert.equal(clock.step(0, manifest).clip, 'play');
});

test('a blink completes rather than replaying continuously', () => {
  const clock = quietClock();
  clock.nextBlink = 3;
  assert.equal(clock.step(3, manifest).clip, 'blink');
  assert.equal(clock.step(.49, manifest).frame, 5);
  assert.equal(clock.step(.02, manifest).clip, 'idle');
  assert.ok(clock.nextBlink > clock.time);
});

test('spontaneous gestures use bounded randomized delays and action choices', () => {
  const low = new CompanionSpriteMotion(() => 0);
  low.nextBlink = Number.POSITIVE_INFINITY;
  assert.equal(low.step(18, manifest).clip, 'curious');
  assert.equal(low.nextGesture, 38);
  const high = new CompanionSpriteMotion(() => 1);
  high.nextBlink = Number.POSITIVE_INFINITY;
  assert.equal(high.step(18, manifest).clip, 'play');
  assert.equal(high.nextGesture, 49.5);
});

test('spontaneous gestures do not repeat consecutively, even with a constant random source', () => {
  for (const value of [0, .25, .5, .75, 1]) {
    const clock = new CompanionSpriteMotion(() => value);
    clock.nextBlink = Number.POSITIVE_INFINITY;
    const first = clock.step(18, manifest);
    const second = clock.step(clock.nextGesture - clock.time, manifest);
    assert.notEqual(second.clip, first.clip, `random=${value}`);
    assert.notEqual(second.clip, 'idle');
    assert.notEqual(second.clip, 'blink');
    assert.equal(clock.touches, 0);
  }
});

test('spontaneous gestures also exclude the immediately preceding user gesture', () => {
  const clock = new CompanionSpriteMotion(() => .75);
  clock.touch();
  assert.equal(clock.step(0, manifest).clip, 'wave');
  clock.nextBlink = Number.POSITIVE_INFINITY;
  const next = clock.step(clock.nextGesture - clock.time, manifest);
  assert.notEqual(next.clip, 'wave');
  assert.notEqual(next.clip, 'idle');
});

test('quiet time suppresses large gestures after the longer awake period', () => {
  const clock = quietClock();
  clock.nextGesture = REST_AFTER;
  assert.deepEqual(clock.step(REST_AFTER, manifest), { clip: 'idle', frame: 0, mood: 'rest', action: 'idle' });
  assert.equal(clock.step(10, manifest).clip, 'idle');
  assert.equal(clock.active, null);
});

test('a gesture already playing can finish across the rest boundary', () => {
  const clock = quietClock();
  clock.nextGesture = REST_AFTER - 1;
  assert.equal(clock.step(REST_AFTER - 1, manifest).clip, 'greet');
  const resting = clock.step(1.1, manifest);
  assert.equal(resting.clip, 'greet');
  assert.equal(resting.mood, 'rest');
  assert.equal(clock.step(.5, manifest).clip, 'idle');
});

test('sleep begins after three quiet minutes, then holds the final pose', () => {
  const clock = quietClock();
  assert.equal(clock.step(SLEEP_AFTER - .5, manifest).mood, 'rest');
  assert.deepEqual(clock.step(.5, manifest), { clip: 'sleep', frame: 0, mood: 'sleep', action: 'dozing' });
  assert.equal(clock.step(.5, manifest).frame, 6);
  assert.equal(clock.step(.5, manifest).frame, 11);
  assert.equal(clock.step(120, manifest).frame, 11);
});

test('touch wakes a sleeping companion by reversing the sleep clip once', () => {
  const clock = quietClock();
  clock.step(SLEEP_AFTER + 1, manifest);
  clock.touch();
  assert.deepEqual(clock.step(0, manifest), { clip: 'sleep', frame: 11, mood: 'happy', action: 'wake' });
  assert.equal(clock.step(.5, manifest).frame, 5);
  assert.equal(clock.step(.5, manifest).clip, 'idle');
  assert.equal(clock.lastTouch, SLEEP_AFTER + 1);
});

test('waking by tap or pet does not consume the next tap gesture', () => {
  for (const interaction of ['tap', 'pet'] as const) {
    const clock = quietClock();
    clock.touch();
    assert.equal(clock.step(0, manifest).clip, 'wave');
    clock.step(SLEEP_AFTER + 1, manifest);
    clock.touch(interaction);
    assert.equal(clock.step(0, manifest).action, 'wake');
    assert.equal(clock.touches, 1);
    assert.equal(clock.step(1, manifest).clip, 'idle');
    clock.touch();
    assert.equal(clock.step(0, manifest).clip, 'play');
  }
});

test('reduced motion freezes frames, suppresses automatic actions, and supports touch', () => {
  const clock = new CompanionSpriteMotion(() => .5);
  assert.equal(clock.step(8, manifest, true).clip, 'idle');
  assert.equal(clock.step(8, manifest, true).frame, 0);
  clock.touch();
  assert.equal(clock.step(0, manifest, true).frame, 12);
  assert.equal(clock.step(.5, manifest, true).frame, 12);
  assert.equal(clock.step(1.6, manifest, true).clip, 'idle');
  assert.equal(clock.step(SLEEP_AFTER, manifest, true).frame, 11);
});

test('pausing an active-time clock does not skip frames or finish an action', () => {
  const clock = quietClock();
  clock.touch();
  const before = clock.step(.25, manifest);
  // UI does not call step while paused or hidden: no wall-clock timestamp is read.
  assert.deepEqual(clock.step(0, manifest), before);
  assert.equal(clock.step(.25, manifest).frame, 6);
});

test('every emitted sprite frame is a valid manifest frame across repeated interactions', () => {
  const clock = new CompanionSpriteMotion(() => .37);
  for (let tick = 0; tick < 240 * 24; tick++) {
    if ([24, 48, 60 * 24, 61 * 24, 121 * 24, 190 * 24].includes(tick)) clock.touch();
    if ([80 * 24, 140 * 24].includes(tick)) clock.touch('pet');
    const pose = clock.step(1 / 24, manifest);
    assert.ok(Number.isInteger(pose.frame), JSON.stringify(pose));
    assert.ok(pose.frame >= 0 && pose.frame < manifest.clips[pose.clip].frames, JSON.stringify(pose));
  }
});

test('small idle details finish, leave a pause and avoid consecutive repeats', () => {
  for (const random of [0, .5, 1]) {
    const varied = new CompanionSpriteMotion(() => random);
    varied.nextBlink = Number.POSITIVE_INFINITY;
    varied.nextGesture = Number.POSITIVE_INFINITY;
    const first = varied.step(4, manifest);
    assert.ok(['look', 'shift', 'tail'].includes(first.clip));
    assert.equal(varied.step(3, manifest).clip, 'idle');
    assert.equal(varied.step(.7, manifest).clip, 'idle');
    const second = varied.step(varied.nextDetail - varied.time, manifest);
    assert.ok(['look', 'shift', 'tail'].includes(second.clip));
    assert.notEqual(first.clip, second.clip);
  }
});

test('rest keeps occasional small details while suppressing large gestures', () => {
  const clock = quietClock();
  clock.nextDetail = REST_AFTER;
  clock.nextGesture = REST_AFTER;
  const pose = clock.step(REST_AFTER, manifest);
  assert.equal(pose.clip, 'shift');
  assert.equal(pose.mood, 'rest');
  assert.ok(clock.nextDetail >= clock.time + 8);
});

test('touch immediately interrupts a small detail without consuming the tap cycle', () => {
  const clock = quietClock();
  clock.nextDetail = 4;
  assert.equal(clock.step(4, manifest).clip, 'shift');
  clock.touch('pet');
  assert.equal(clock.step(0, manifest).clip, 'nuzzle');
  clock.touch();
  assert.equal(clock.step(0, manifest).clip, 'wave');
});

test('unattended first minute stays awake and contains varied small details with real gaps', () => {
  const clock = new CompanionSpriteMotion(() => .5);
  const details = new Set<string>();
  let idleFrames = 0;
  for (let tick = 0; tick < 60 * 24; tick++) {
    const pose = clock.step(1 / 24, manifest);
    assert.notEqual(pose.mood, 'sleep');
    if (['look', 'shift', 'tail'].includes(pose.clip)) details.add(pose.clip);
    if (pose.clip === 'idle') idleFrames++;
  }
  assert.ok(details.size >= 2);
  assert.ok(idleFrames > 24 * 10, 'natural gaps between movements');
});
