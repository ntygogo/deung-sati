/**
 * Peaceful Mind Meditation Sound Synthesizer (ความถี่เพื่อความสงบ เบาสบาย นิ่ง)
 * 
 * Specifically calibrated psychoacoustic sound design:
 * - 432 Hz (Natural Harmonious Peace) & 136.1 Hz (Cosmic Om / Heart Stillness) & 174 Hz / 528 Hz
 * - Harmonic concordant partials (pure octaves & fifths, zero harsh inharmonic clash)
 * - Ultra-soft feather bloom attack (0.65s smooth swell — zero sharp click or startle)
 * - Theta-entrainment gentle acoustic beating (0.6 - 0.9 Hz slow breathing rhythm)
 * - Velvet low-pass filter (620 Hz) for a warm, comforting, cloud-like texture
 * - Expansive 3D stereo reverberation with 18s+ peaceful decay tail
 */

let sharedAudioCtx: AudioContext | null = null;
let cachedReverbBuffer: AudioBuffer | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!sharedAudioCtx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      sharedAudioCtx = new AudioCtx();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume();
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

/**
 * Creates an ultra-lush, velvety stereo impulse response for weightless meditation atmosphere
 */
function createPeacefulReverbImpulse(ctx: AudioContext, duration = 8.5, decay = 1.6): AudioBuffer {
  if (cachedReverbBuffer && cachedReverbBuffer.sampleRate === ctx.sampleRate) {
    return cachedReverbBuffer;
  }

  const sampleRate = ctx.sampleRate;
  const length = Math.floor(sampleRate * duration);
  const impulse = ctx.createBuffer(2, length, sampleRate);
  const left = impulse.getChannelData(0);
  const right = impulse.getChannelData(1);

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    // Multi-stage ultra-smooth exponential decay
    const envelope = Math.exp(-t * decay) + 0.5 * Math.exp(-t * (decay * 0.3));
    // Wide decorrelated stereo cloud
    left[i] = (Math.random() * 2 - 1) * envelope;
    right[i] = (Math.random() * 2 - 1) * envelope;
  }

  cachedReverbBuffer = impulse;
  return impulse;
}

export interface BowlSoundOptions {
  baseFreq?: number;   // Base frequency (default 432 Hz / 136.1 Hz Om / 174 Hz Solfeggio)
  volume?: number;     // Master volume (0.0 to 1.0, default 0.45 - soft & comforting)
  decayTime?: number;  // Sustain duration (default 18.0s)
  attackTime?: number; // Soft attack bloom (default 0.65s)
}

export function playDeepTibetanSingingBowl(options: BowlSoundOptions = {}): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const {
    baseFreq = 432,   // 432 Hz (Natural harmony tuning - feels light, open, and peaceful)
    volume = 0.45,     // Gentle, soothing level
    decayTime = 18.0,  // Long ethereal decay tail
    attackTime = 0.65, // Feather-soft bloom attack
  } = options;

  const now = ctx.currentTime;

  // 1. Master Output with Warm Analog Limiter
  const masterCompressor = ctx.createDynamicsCompressor();
  masterCompressor.threshold.setValueAtTime(-20, now);
  masterCompressor.knee.setValueAtTime(30, now);
  masterCompressor.ratio.setValueAtTime(3.0, now);
  masterCompressor.attack.setValueAtTime(0.04, now);
  masterCompressor.release.setValueAtTime(0.5, now);
  masterCompressor.connect(ctx.destination);

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(volume, now);
  masterGain.connect(masterCompressor);

  // 2. Velvet Warm Low-Pass Tone Filter (Smooths away any sharp/piercing edge)
  const velvetFilter = ctx.createBiquadFilter();
  velvetFilter.type = 'lowpass';
  velvetFilter.frequency.setValueAtTime(640, now); // Warm, soothing ceiling
  velvetFilter.Q.setValueAtTime(0.6, now);
  velvetFilter.connect(masterGain);

  // 3. Ethereal Stereo Reverberation Bus
  const convolver = ctx.createConvolver();
  convolver.buffer = createPeacefulReverbImpulse(ctx, 9.0, 1.5);

  const reverbWetGain = ctx.createGain();
  reverbWetGain.gain.setValueAtTime(0.70, now);
  convolver.connect(reverbWetGain);
  reverbWetGain.connect(velvetFilter);

  // Dry path gain
  const dryGain = ctx.createGain();
  dryGain.gain.setValueAtTime(0.50, now);
  dryGain.connect(velvetFilter);

  // 4. Harmonically Pure Partials for Mind Stillness & Lightness
  // Harmonic intervals: Sub-octave (0.5), Fundamental (1.0), Binaural Twin (1.002), Perfect 5th (1.5), Octave (2.0)
  const harmonicPartials = [
    { ratio: 0.5,    gain: 0.45, decay: decayTime * 1.0,  beatFreq: 0.5 }, // Deep grounding cradle (calms heart rate)
    { ratio: 1.0,    gain: 1.00, decay: decayTime * 1.0,  beatFreq: 0.8 }, // Pure fundamental tone
    { ratio: 1.0025, gain: 0.80, decay: decayTime * 0.98, beatFreq: 1.0 }, // Twin frequency (slow Theta brainwave entrainment)
    { ratio: 1.5,    gain: 0.30, decay: decayTime * 0.85, beatFreq: 1.2 }, // Perfect fifth (comforting, harmonious)
    { ratio: 2.0,    gain: 0.20, decay: decayTime * 0.75, beatFreq: 1.5 }, // Soft upper octave (openness, lightness)
    { ratio: 3.0,    gain: 0.05, decay: decayTime * 0.50, beatFreq: 1.8 }, // Subtle ethereal sheen
  ];

  harmonicPartials.forEach(({ ratio, gain, decay, beatFreq }) => {
    const osc = ctx.createOscillator();
    const partialGain = ctx.createGain();

    osc.type = 'sine';
    const targetFreq = baseFreq * ratio;
    osc.frequency.setValueAtTime(targetFreq, now);

    // Ultra-gentle organic frequency beating (like a slow, gentle breath)
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.setValueAtTime(beatFreq, now);
    lfoGain.gain.setValueAtTime(targetFreq * 0.0015, now);
    lfo.connect(osc.frequency);
    lfo.start(now);
    lfo.stop(now + decay);

    // Feather-soft swelling attack (0.65s - 0.85s) to eliminate all startle
    partialGain.gain.setValueAtTime(0.00001, now);
    partialGain.gain.exponentialRampToValueAtTime(gain, now + attackTime);

    // Long, graceful fade into silence
    partialGain.gain.exponentialRampToValueAtTime(gain * 0.35, now + decay * 0.4);
    partialGain.gain.exponentialRampToValueAtTime(0.00001, now + decay);

    osc.connect(partialGain);
    partialGain.connect(dryGain);
    partialGain.connect(convolver);

    osc.start(now);
    osc.stop(now + decay);
  });

  // 5. Soft Velvet Mallet (Felt touch — completely round & soft)
  try {
    const bufferSize = Math.floor(ctx.sampleRate * 0.15);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const feltFilter = ctx.createBiquadFilter();
    feltFilter.type = 'lowpass';
    feltFilter.frequency.setValueAtTime(baseFreq * 0.8, now); // Very soft low air cushion
    feltFilter.Q.setValueAtTime(1.0, now);

    const feltGain = ctx.createGain();
    feltGain.gain.setValueAtTime(0.00001, now);
    feltGain.gain.exponentialRampToValueAtTime(0.06, now + 0.08);
    feltGain.gain.exponentialRampToValueAtTime(0.00001, now + 0.14);

    noiseSource.connect(feltFilter);
    feltFilter.connect(feltGain);
    feltGain.connect(dryGain);
    feltGain.connect(convolver);

    noiseSource.start(now);
    noiseSource.stop(now + 0.15);
  } catch {
    // Fallback
  }
}
