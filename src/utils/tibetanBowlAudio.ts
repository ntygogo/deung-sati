/**
 * High-Fidelity Web Audio Synthesizer for Tibetan Singing Bowl
 * 
 * Acoustically models:
 * - 7-Metal Himalayan bronze resonance with non-integer inharmonic partials
 * - Slow acoustic beating (binaural amplitude & frequency pulsation from hand-hammered rim asymmetry)
 * - Soft wool mallet attack transient (bandpass strike resonance)
 * - Procedural stereo convolution reverb for deep spatial reverberation & long peaceful decay tail (12s+)
 * - Master soft-knee dynamics limiter for warm, velvety low-end
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
 * Generates a smooth, lush stereo impulse response for spatial meditation reverberation
 */
function createReverbImpulse(ctx: AudioContext, duration = 6.5, decay = 2.8): AudioBuffer {
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
    // Multi-exponential decay with gentle diffusion
    const envelope = Math.exp(-t * decay) + 0.3 * Math.exp(-t * (decay * 0.45));
    // Stereo decorrelation noise
    left[i] = (Math.random() * 2 - 1) * envelope;
    right[i] = (Math.random() * 2 - 1) * envelope;
  }

  cachedReverbBuffer = impulse;
  return impulse;
}

export interface BowlSoundOptions {
  baseFreq?: number; // Base frequency (default 174 Hz Solfeggio / 216 Hz 432-tuning)
  volume?: number;   // Master gain (0.0 to 1.0)
  decayTime?: number; // Sustain duration in seconds
}

export function playDeepTibetanSingingBowl(options: BowlSoundOptions = {}): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const {
    baseFreq = 216, // A3 (tuned to 432 Hz root) - deeply grounding and calming
    volume = 0.65,
    decayTime = 14.0,
  } = options;

  const now = ctx.currentTime;

  // 1. Master Output with Warm Soft-Knee Compressor (prevents clipping, adds analog warmth)
  const masterCompressor = ctx.createDynamicsCompressor();
  masterCompressor.threshold.setValueAtTime(-14, now);
  masterCompressor.knee.setValueAtTime(20, now);
  masterCompressor.ratio.setValueAtTime(4, now);
  masterCompressor.attack.setValueAtTime(0.005, now);
  masterCompressor.release.setValueAtTime(0.3, now);
  masterCompressor.connect(ctx.destination);

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(volume, now);
  masterGain.connect(masterCompressor);

  // 2. Spatial Convolver (Reverb) Bus
  const convolver = ctx.createConvolver();
  convolver.buffer = createReverbImpulse(ctx, 7.0, 2.2);

  const reverbWetGain = ctx.createGain();
  reverbWetGain.gain.setValueAtTime(0.55, now);
  convolver.connect(reverbWetGain);
  reverbWetGain.connect(masterGain);

  // Dry path gain
  const dryGain = ctx.createGain();
  dryGain.gain.setValueAtTime(0.75, now);
  dryGain.connect(masterGain);

  // 3. Acoustic Overtones & Inharmonic Partials (Real Bronze Bowl Spectral Fingerprint)
  // Each partial has a paired twin with slight micro-detuning (0.4 - 1.8 Hz) producing rich acoustic beating
  const partials = [
    { ratio: 0.5,   gain: 0.45, decay: decayTime * 0.95, beatFreq: 0.6, q: 1.0 }, // Sub-bass chest resonance
    { ratio: 1.0,   gain: 0.95, decay: decayTime * 1.0,  beatFreq: 1.1, q: 1.0 }, // Fundamental tone
    { ratio: 1.006, gain: 0.85, decay: decayTime * 0.98, beatFreq: 1.4, q: 1.0 }, // Detuned fundamental (acoustic beat)
    { ratio: 2.76,  gain: 0.55, decay: decayTime * 0.82, beatFreq: 1.8, q: 1.2 }, // 1st Inharmonic rim partial
    { ratio: 2.78,  gain: 0.45, decay: decayTime * 0.78, beatFreq: 2.1, q: 1.2 }, // Detuned rim partial
    { ratio: 5.41,  gain: 0.28, decay: decayTime * 0.65, beatFreq: 2.6, q: 1.5 }, // 2nd Inharmonic shimmer
    { ratio: 8.92,  gain: 0.12, decay: decayTime * 0.48, beatFreq: 3.2, q: 2.0 }, // 3rd High silver overtone
    { ratio: 13.1,  gain: 0.05, decay: decayTime * 0.32, beatFreq: 4.0, q: 3.0 }, // Air sparkle
  ];

  partials.forEach(({ ratio, gain, decay, beatFreq }) => {
    const osc = ctx.createOscillator();
    const partialGain = ctx.createGain();

    osc.type = 'sine';
    const targetFreq = baseFreq * ratio;
    osc.frequency.setValueAtTime(targetFreq, now);

    // Subtle slow frequency vibrato (modeling uneven hand-hammered thickness)
    const vibrato = ctx.createOscillator();
    const vibratoGain = ctx.createGain();
    vibrato.frequency.setValueAtTime(beatFreq, now);
    vibratoGain.gain.setValueAtTime(targetFreq * 0.0035, now);
    vibrato.connect(osc.frequency);
    vibrato.start(now);
    vibrato.stop(now + decay);

    // Smooth soft attack (0.08s) followed by natural exponential ring decay
    partialGain.gain.setValueAtTime(0.0001, now);
    partialGain.gain.exponentialRampToValueAtTime(gain, now + 0.09);
    // Multi-stage decay for rich sustain body
    partialGain.gain.exponentialRampToValueAtTime(gain * 0.45, now + decay * 0.3);
    partialGain.gain.exponentialRampToValueAtTime(0.00001, now + decay);

    osc.connect(partialGain);
    partialGain.connect(dryGain);
    partialGain.connect(convolver);

    osc.start(now);
    osc.stop(now + decay);
  });

  // 4. Soft Padded Wool Mallet Strike Transient
  // Creates the physical, warm wooden/felt contact on the bronze rim without harsh clicks
  try {
    const bufferSize = Math.floor(ctx.sampleRate * 0.08); // 80ms mallet strike
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const malletFilter = ctx.createBiquadFilter();
    malletFilter.type = 'bandpass';
    malletFilter.frequency.setValueAtTime(baseFreq * 2.2, now);
    malletFilter.Q.setValueAtTime(3.5, now);

    const malletGain = ctx.createGain();
    malletGain.gain.setValueAtTime(0.22, now);
    malletGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.075);

    noiseSource.connect(malletFilter);
    malletFilter.connect(malletGain);
    malletGain.connect(dryGain);
    malletGain.connect(convolver);

    noiseSource.start(now);
    noiseSource.stop(now + 0.08);
  } catch {
    // Graceful fallback if buffer source fails
  }
}
