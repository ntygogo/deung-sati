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
    sitDown: { src: '/sitDown.webp', frames: 24, fps: 12 },
    seated: { src: '/seated.webp', frames: 36, fps: 12 },
    lieDown: { src: '/lieDown.webp', frames: 36, fps: 12 },
    sleeping: { src: '/sleeping.webp', frames: 36, fps: 12 },
    rise: { src: '/rise.webp', frames: 36, fps: 12 },
    spin: { src: '/spin.webp', frames: 48, fps: 12 },
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

test('repeated taps visit all six gestures and repeat the cycle without consuming idle actions', () => {
  const clock = quietClock();
  const expected = ['wave', 'play', 'spin', 'curious', 'stretch', 'greet', 'wave', 'play', 'spin', 'curious', 'stretch', 'greet'];
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
  assert.equal(high.step(18, manifest).clip, 'spin');
  assert.equal(high.nextGesture, 52);
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

test('quiet time transitions into seated rest and suppresses standing gestures', () => {
  const clock = quietClock();
  clock.nextGesture = REST_AFTER;
  assert.equal(clock.step(REST_AFTER, manifest).clip, 'sitDown');
  assert.equal(clock.step(2, manifest).clip, 'seated');
  assert.equal(clock.posture, 'seated');
  assert.equal(clock.step(10, manifest).mood, 'rest');
  assert.equal(clock.active, null);
});

test('an active gesture finishes before sitting down', () => {
  const clock = quietClock();
  clock.nextGesture = REST_AFTER - 1;
  assert.equal(clock.step(REST_AFTER - 1, manifest).clip, 'wave');
  assert.equal(clock.step(1.1, manifest).clip, 'wave');
  assert.equal(clock.step(.91, manifest).clip, 'sitDown');
});

test('automatic rest goes standing to seated to lying, with sleeping breathing frames', () => {
  const clock = quietClock();
  assert.equal(clock.step(REST_AFTER, manifest).clip, 'sitDown');
  assert.equal(clock.step(2, manifest).clip, 'seated');
  assert.equal(clock.step(SLEEP_AFTER - clock.time, manifest).clip, 'lieDown');
  assert.equal(clock.step(3, manifest).clip, 'sleeping');
  assert.equal(clock.posture, 'lying');
  assert.equal(clock.step(.5, manifest).frame, 6);
  assert.equal(clock.step(.5, manifest).mood, 'sleep');
  assert.equal(clock.step(120, manifest).clip, 'sleeping');
});

test('touch wakes a lying companion, rises, stretches, then returns to idle', () => {
  const clock = quietClock();
  clock.request('sleep');
  assert.equal(clock.step(0, manifest).clip, 'sitDown');
  assert.equal(clock.step(2, manifest).clip, 'lieDown');
  assert.equal(clock.step(3, manifest).clip, 'sleeping');
  clock.touch();
  assert.deepEqual(clock.step(0, manifest), { clip: 'rise', frame: 0, mood: 'happy', action: 'wake' });
  assert.equal(clock.step(3, manifest).clip, 'stretch');
  assert.equal(clock.step(2, manifest).clip, 'idle');
  assert.equal(clock.posture, 'standing');
});

test('waking by tap or pet does not consume the next tap gesture', () => {
  for (const interaction of ['tap', 'pet'] as const) {
    const clock = quietClock();
    clock.touch();
    clock.step(2, manifest);
    clock.request('sleep');
    clock.step(0, manifest);
    clock.step(2, manifest);
    clock.step(3, manifest);
    clock.touch(interaction);
    assert.equal(clock.step(0, manifest).action, 'wake');
    assert.equal(clock.touches, 1);
    clock.step(3, manifest);
    clock.step(2, manifest);
    clock.touch();
    assert.equal(clock.step(0, manifest).clip, 'play');
  }
});

test('reduced motion freezes ambient and resting frames and supports commands', () => {
  const clock = new CompanionSpriteMotion(() => .5);
  assert.equal(clock.step(8, manifest, true).clip, 'idle');
  assert.equal(clock.step(8, manifest, true).frame, 0);
  clock.touch();
  assert.equal(clock.step(0, manifest, true).frame, 12);
  assert.equal(clock.step(.5, manifest, true).frame, 12);
  assert.equal(clock.step(1.6, manifest, true).clip, 'idle');
  clock.request('sleep');
  assert.equal(clock.step(0, manifest, true).frame, 23);
  assert.equal(clock.step(2, manifest, true).frame, 35);
  assert.equal(clock.step(3, manifest, true).clip, 'sleeping');
  assert.equal(clock.step(1, manifest, true).frame, 0);
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

test('seated breathing stays seated rather than returning to standing details', () => {
  const clock = quietClock();
  clock.request('sit');
  assert.equal(clock.step(0, manifest).clip, 'sitDown');
  assert.equal(clock.step(2, manifest).clip, 'seated');
  assert.equal(clock.step(.5, manifest).frame, 6);
  assert.equal(clock.step(3, manifest).frame, 6);
  assert.equal(clock.posture, 'seated');
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

test('touch reverses a partially completed sit from the displayed frame', () => {
  const clock = quietClock();
  clock.request('sit');
  clock.step(0, manifest);
  const midway = clock.step(.75, manifest);
  assert.equal(midway.frame, 9);
  clock.touch();
  const wake = clock.step(0, manifest);
  assert.equal(wake.clip, 'sitDown');
  assert.equal(wake.frame, midway.frame);
  assert.equal(wake.action, 'wake');
  assert.equal(clock.step(10 / 12, manifest).clip, 'stretch');
});

test('touch while lying down reverses to seated, stands, and stretches', () => {
  const clock = quietClock();
  clock.request('sleep');
  clock.step(0, manifest);
  clock.step(2, manifest);
  const midway = clock.step(1, manifest);
  assert.equal(midway.clip, 'lieDown');
  clock.touch();
  assert.equal(clock.step(0, manifest).frame, midway.frame);
  assert.equal(clock.step(13 / 12, manifest).clip, 'sitDown');
  assert.equal(clock.step(2, manifest).clip, 'stretch');
  assert.equal(clock.posture, 'standing');
});

test('repeated touches cannot restart an in-flight wake', () => {
  const clock = quietClock();
  clock.request('sleep');
  clock.step(0, manifest);
  clock.step(2, manifest);
  clock.step(3, manifest);
  clock.touch();
  clock.step(.5, manifest);
  const at = clock.active?.at;
  clock.touch('pet');
  assert.equal(clock.active?.at, at);
  assert.equal(clock.step(2.5, manifest).clip, 'stretch');
});

test('spin request wakes a lying companion before turning', () => {
  const clock = quietClock();
  clock.request('sleep');
  clock.step(0, manifest);
  clock.step(2, manifest);
  clock.step(3, manifest);
  clock.request('spin');
  assert.equal(clock.step(0, manifest).clip, 'rise');
  assert.equal(clock.step(3, manifest).clip, 'spin');
  assert.equal(clock.step(4, manifest).clip, 'idle');
  assert.equal(clock.posture, 'standing');
});

test('asking a sleeping companion to sit reverses only the lie-down transition', () => {
  const clock = quietClock();
  clock.request('sleep');
  clock.step(0, manifest);
  clock.step(2, manifest);
  clock.step(3, manifest);
  clock.request('sit');
  assert.equal(clock.step(0, manifest).clip, 'lieDown');
  assert.equal(clock.step(3, manifest).clip, 'seated');
});

test('all commands and interruptions keep frames inside their atlas bounds', () => {
  const clock = new CompanionSpriteMotion(() => .37);
  for (let tick = 0; tick < 300 * 24; tick++) {
    if (tick % 719 === 0) clock.request('sit');
    if (tick % 953 === 0) clock.request('sleep');
    if (tick % 1171 === 0) clock.request('spin');
    if (tick % 157 === 0) clock.touch(tick % 2 ? 'pet' : 'tap');
    const pose = clock.step(1 / 24, manifest);
    assert.ok(Number.isInteger(pose.frame));
    assert.ok(pose.frame >= 0 && pose.frame < manifest.clips[pose.clip].frames, JSON.stringify(pose));
  }
});

test('touch while returning from lying to sitting still stands before stretching', () => {
  const clock = quietClock();
  clock.request('sleep');
  clock.step(0, manifest);
  clock.step(2, manifest);
  clock.step(3, manifest);
  clock.request('sit');
  clock.step(1, manifest);
  clock.touch();
  assert.equal(clock.step(2, manifest).clip, 'sitDown');
  assert.equal(clock.step(2, manifest).clip, 'stretch');
  assert.equal(clock.posture, 'standing');
});
