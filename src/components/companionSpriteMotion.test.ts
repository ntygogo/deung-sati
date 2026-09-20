import assert from 'node:assert/strict';
import test from 'node:test';
import { CompanionSpriteMotion, type SpriteManifest } from './companionSpriteMotion';

const manifest: SpriteManifest = {
  tileSize: 384,
  columns: 4,
  clips: {
    idle: { src: '/idle.webp', frames: 12, fps: 12 },
    blink: { src: '/blink.webp', frames: 6, fps: 12 },
    greet: { src: '/greet.webp', frames: 18, fps: 12 },
    play: { src: '/play.webp', frames: 18, fps: 12 },
    sleep: { src: '/sleep.webp', frames: 12, fps: 12 },
  },
};

const quietClock = () => {
  const clock = new CompanionSpriteMotion(() => .5);
  clock.nextBlink = Number.POSITIVE_INFINITY;
  clock.nextGesture = Number.POSITIVE_INFINITY;
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

test('touch produces a finite greeting and alternates with finite play', () => {
  const clock = quietClock();
  clock.touch();
  assert.deepEqual(clock.step(0, manifest), { clip: 'greet', frame: 0, mood: 'happy', action: 'greet' });
  assert.equal(clock.step(1.49, manifest).frame, 17);
  assert.equal(clock.step(.02, manifest).clip, 'idle');
  clock.touch();
  assert.equal(clock.step(0, manifest).clip, 'play');
  assert.equal(clock.step(1.51, manifest).clip, 'idle');
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
  assert.equal(low.step(8, manifest).clip, 'play');
  assert.equal(low.nextGesture, 16);
  const high = new CompanionSpriteMotion(() => 1);
  high.nextBlink = Number.POSITIVE_INFINITY;
  assert.equal(high.step(8, manifest).clip, 'greet');
  assert.equal(high.nextGesture, 26);
});

test('quiet time suppresses new spontaneous gestures from 30 seconds', () => {
  const clock = quietClock();
  clock.nextGesture = 30;
  assert.deepEqual(clock.step(30, manifest), { clip: 'idle', frame: 0, mood: 'rest', action: 'idle' });
  assert.equal(clock.step(10, manifest).clip, 'idle');
  assert.equal(clock.active, null);
});

test('a gesture already playing can finish across the rest boundary', () => {
  const clock = quietClock();
  clock.nextGesture = 29;
  assert.equal(clock.step(29, manifest).clip, 'play');
  const resting = clock.step(1.1, manifest);
  assert.equal(resting.clip, 'play');
  assert.equal(resting.mood, 'rest');
  assert.equal(clock.step(.5, manifest).clip, 'idle');
});

test('sleep begins after 50 quiet seconds, then holds the final pose', () => {
  const clock = quietClock();
  assert.equal(clock.step(49.5, manifest).mood, 'rest');
  assert.deepEqual(clock.step(.5, manifest), { clip: 'sleep', frame: 0, mood: 'sleep', action: 'dozing' });
  assert.equal(clock.step(.5, manifest).frame, 6);
  assert.equal(clock.step(.5, manifest).frame, 11);
  assert.equal(clock.step(120, manifest).frame, 11);
});

test('touch wakes a sleeping companion by reversing the sleep clip once', () => {
  const clock = quietClock();
  clock.step(51, manifest);
  clock.touch();
  assert.deepEqual(clock.step(0, manifest), { clip: 'sleep', frame: 11, mood: 'happy', action: 'wake' });
  assert.equal(clock.step(.5, manifest).frame, 5);
  assert.equal(clock.step(.5, manifest).clip, 'idle');
  assert.equal(clock.lastTouch, 51);
});

test('reduced motion freezes frames, suppresses automatic actions, and supports touch', () => {
  const clock = new CompanionSpriteMotion(() => .5);
  assert.equal(clock.step(8, manifest, true).clip, 'idle');
  assert.equal(clock.step(8, manifest, true).frame, 0);
  clock.touch();
  assert.equal(clock.step(0, manifest, true).frame, 9);
  assert.equal(clock.step(.5, manifest, true).frame, 9);
  assert.equal(clock.step(1.1, manifest, true).clip, 'idle');
  assert.equal(clock.step(50, manifest, true).frame, 11);
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
    const pose = clock.step(1 / 24, manifest);
    assert.ok(Number.isInteger(pose.frame), JSON.stringify(pose));
    assert.ok(pose.frame >= 0 && pose.frame < manifest.clips[pose.clip].frames, JSON.stringify(pose));
  }
});
