/**
 * Web Audio API Sound Synthesizer for "ดึงสติ"
 *
 * Generates pure healing frequencies, binaural beats, Tibetan singing bowls,
 * and realistic nature soundscapes directly in the browser with ZERO external audio files.
 * Works 100% offline and instantly.
 */

export interface SoundTrack {
  id: string;
  name: string;
  category: 'frequency' | 'nature' | 'bowl';
  description: string;
  frequencyLabel: string;
  volume: number; // 0 to 1
  isPlaying: boolean;
}

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeNodes: Map<string, { gain: GainNode; stop: () => void }> = new Map();
  private timerId: ReturnType<typeof setInterval> | null = null;
  private timerRemainingSeconds: number = 0;
  private onTimerTickCallback: ((seconds: number) => void) | null = null;

  public tracks: SoundTrack[] = [
    {
      id: 'freq-432',
      name: '432 Hz Miracle Tone',
      category: 'frequency',
      description: 'คลื่นความถี่ธรรมชาติ ช่วยให้หัวใจเต้นช้าลงและจิตใจสงบ',
      frequencyLabel: '432 Hz',
      volume: 0.7,
      isPlaying: false,
    },
    {
      id: 'freq-528',
      name: '528 Hz Inner Peace',
      category: 'frequency',
      description: 'คลื่นแห่งการเยียวยาและคลายความวิตกกังวลสะสม',
      frequencyLabel: '528 Hz',
      volume: 0.7,
      isPlaying: false,
    },
    {
      id: 'theta-waves',
      name: 'Theta Sleep Waves (6 Hz)',
      category: 'frequency',
      description: 'Binaural Beat สำหรับกล่อมสมองเข้าสู่สภาวะผ่อนคลายลึกและหลับสบาย',
      frequencyLabel: 'Theta 6 Hz',
      volume: 0.6,
      isPlaying: false,
    },
    {
      id: 'tibetan-bowl',
      name: 'Tibetan Singing Bowl',
      category: 'bowl',
      description: 'เสียงขันธิเบตสะท้อนกังวาน ช่วยเคลียร์ความคิดที่ฟุ้งซ่าน',
      frequencyLabel: 'Singing Bowl',
      volume: 0.75,
      isPlaying: false,
    },
    {
      id: 'nature-rain',
      name: 'สายฝนกระทบกระจก',
      category: 'nature',
      description: 'เสียงเม็ดฝนตกกระทบนุ่มนวล ช่วยตัดเสียงรบกวนภายนอก',
      frequencyLabel: 'Pink Noise Rain',
      volume: 0.65,
      isPlaying: false,
    },
    {
      id: 'nature-ocean',
      name: 'คลื่นทะเลซัดสาด',
      category: 'nature',
      description: 'เสียงเกลียวคลื่นซัดหาดทรายเป็นจังหวะหายใจธรรมชาติ',
      frequencyLabel: 'Ocean Waves',
      volume: 0.7,
      isPlaying: false,
    },
    {
      id: 'nature-wind',
      name: 'สายลมแผ่วเบา',
      category: 'nature',
      description: 'เสียงลมพัดผ่านยอดไม้ในค่ำคืนที่เงียบสงบ',
      frequencyLabel: 'Night Breeze',
      volume: 0.55,
      isPlaying: false,
    },
  ];

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMasterVolume(vol: number) {
    this.initContext();
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(Math.max(0, Math.min(1, vol)), this.ctx.currentTime, 0.05);
    }
  }

  public setTrackVolume(trackId: string, volume: number) {
    const track = this.tracks.find((t) => t.id === trackId);
    if (track) {
      track.volume = Math.max(0, Math.min(1, volume));
      const active = this.activeNodes.get(trackId);
      if (active && this.ctx) {
        active.gain.gain.setTargetAtTime(track.volume, this.ctx.currentTime, 0.05);
      }
    }
  }

  public toggleTrack(trackId: string): boolean {
    const track = this.tracks.find((t) => t.id === trackId);
    if (!track) return false;

    if (track.isPlaying) {
      this.stopTrack(trackId);
      track.isPlaying = false;
      return false;
    } else {
      this.startTrack(trackId);
      track.isPlaying = true;
      return true;
    }
  }

  private startTrack(trackId: string) {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    // Stop existing if any
    this.stopTrack(trackId);

    const track = this.tracks.find((t) => t.id === trackId);
    if (!track) return;

    const trackGain = this.ctx.createGain();
    trackGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
    trackGain.gain.exponentialRampToValueAtTime(Math.max(0.01, track.volume), this.ctx.currentTime + 1.2);
    trackGain.connect(this.masterGain);

    let stopFn = () => {};

    switch (trackId) {
      case 'freq-432':
        stopFn = this.synthesizePureTone(432, trackGain);
        break;
      case 'freq-528':
        stopFn = this.synthesizePureTone(528, trackGain);
        break;
      case 'theta-waves':
        stopFn = this.synthesizeBinaural(216, 6, trackGain);
        break;
      case 'tibetan-bowl':
        stopFn = this.synthesizeSingingBowl(trackGain);
        break;
      case 'nature-rain':
        stopFn = this.synthesizeRain(trackGain);
        break;
      case 'nature-ocean':
        stopFn = this.synthesizeOcean(trackGain);
        break;
      case 'nature-wind':
        stopFn = this.synthesizeWind(trackGain);
        break;
    }

    this.activeNodes.set(trackId, {
      gain: trackGain,
      stop: () => {
        if (this.ctx) {
          trackGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.3);
          setTimeout(() => {
            stopFn();
            trackGain.disconnect();
          }, 350);
        } else {
          stopFn();
          trackGain.disconnect();
        }
      },
    });
  }

  public stopTrack(trackId: string) {
    const active = this.activeNodes.get(trackId);
    if (active) {
      active.stop();
      this.activeNodes.delete(trackId);
    }
    const track = this.tracks.find((t) => t.id === trackId);
    if (track) {
      track.isPlaying = false;
    }
  }

  public stopAll() {
    for (const track of this.tracks) {
      this.stopTrack(track.id);
    }
    this.clearSleepTimer();
  }

  // --- Sound Synthesizers ---

  private synthesizePureTone(freq: number, destination: AudioNode): () => void {
    if (!this.ctx) return () => {};

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const subOsc = this.ctx.createOscillator();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, this.ctx.currentTime);

    // Warm sub-harmonic
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(freq / 2, this.ctx.currentTime);

    // Gentle shimmer modulation
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq + 0.5, this.ctx.currentTime);

    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(0.3, this.ctx.currentTime);

    const shimmerGain = this.ctx.createGain();
    shimmerGain.gain.setValueAtTime(0.2, this.ctx.currentTime);

    osc1.connect(destination);
    subOsc.connect(subGain);
    subGain.connect(destination);
    osc2.connect(shimmerGain);
    shimmerGain.connect(destination);

    osc1.start();
    osc2.start();
    subOsc.start();

    return () => {
      try {
        osc1.stop();
        osc2.stop();
        subOsc.stop();
      } catch (e) {}
    };
  }

  private synthesizeBinaural(carrierFreq: number, beatFreq: number, destination: AudioNode): () => void {
    if (!this.ctx) return () => {};

    const merger = this.ctx.createChannelMerger(2);

    const oscL = this.ctx.createOscillator();
    oscL.type = 'sine';
    oscL.frequency.setValueAtTime(carrierFreq, this.ctx.currentTime);

    const oscR = this.ctx.createOscillator();
    oscR.type = 'sine';
    oscR.frequency.setValueAtTime(carrierFreq + beatFreq, this.ctx.currentTime);

    oscL.connect(merger, 0, 0); // Left channel
    oscR.connect(merger, 0, 1); // Right channel
    merger.connect(destination);

    oscL.start();
    oscR.start();

    return () => {
      try {
        oscL.stop();
        oscR.stop();
      } catch (e) {}
    };
  }

  private synthesizeSingingBowl(destination: AudioNode): () => void {
    if (!this.ctx) return () => {};

    let isRunning = true;
    const baseFreq = 261.63; // C4 bowl

    const strikeBowl = () => {
      if (!this.ctx || !isRunning) return;

      const harmonics = [1, 2.76, 5.4, 8.9];
      const gains = [0.6, 0.25, 0.1, 0.05];

      harmonics.forEach((h, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq * h, this.ctx.currentTime);

        g.gain.setValueAtTime(0.001, this.ctx.currentTime);
        g.gain.linearRampToValueAtTime(gains[idx] * 0.7, this.ctx.currentTime + 0.08);
        g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 7.5);

        osc.connect(g);
        g.connect(destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 8);
      });
    };

    strikeBowl();
    const interval = setInterval(() => {
      if (isRunning) strikeBowl();
    }, 7000);

    return () => {
      isRunning = false;
      clearInterval(interval);
    };
  }

  private synthesizeRain(destination: AudioNode): () => void {
    if (!this.ctx) return () => {};

    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.07;
      b6 = white * 0.115926;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, this.ctx.currentTime);

    whiteNoise.connect(filter);
    filter.connect(destination);
    whiteNoise.start();

    return () => {
      try {
        whiteNoise.stop();
      } catch (e) {}
    };
  }

  private synthesizeOcean(destination: AudioNode): () => void {
    if (!this.ctx) return () => {};

    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.12;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, this.ctx.currentTime);

    // LFO to swell waves every 6 seconds
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.16, this.ctx.currentTime); // ~6.25 sec cycle

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(320, this.ctx.currentTime);

    lfo.connect(filter.frequency);
    whiteNoise.connect(filter);
    filter.connect(destination);

    whiteNoise.start();
    lfo.start();

    return () => {
      try {
        whiteNoise.stop();
        lfo.stop();
      } catch (e) {}
    };
  }

  private synthesizeWind(destination: AudioNode): () => void {
    if (!this.ctx) return () => {};

    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.08;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const bandpass = this.ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(320, this.ctx.currentTime);
    bandpass.Q.setValueAtTime(3.0, this.ctx.currentTime);

    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.08, this.ctx.currentTime); // ~12 sec gust

    lfo.connect(bandpass.frequency);
    whiteNoise.connect(bandpass);
    bandpass.connect(destination);

    whiteNoise.start();
    lfo.start();

    return () => {
      try {
        whiteNoise.stop();
        lfo.stop();
      } catch (e) {}
    };
  }

  // --- Sleep Timer ---

  public setSleepTimer(minutes: number, onTick?: (remainingSeconds: number) => void) {
    this.clearSleepTimer();
    if (minutes <= 0) return;

    this.timerRemainingSeconds = minutes * 60;
    this.onTimerTickCallback = onTick || null;

    if (this.onTimerTickCallback) {
      this.onTimerTickCallback(this.timerRemainingSeconds);
    }

    this.timerId = setInterval(() => {
      this.timerRemainingSeconds -= 1;

      if (this.onTimerTickCallback) {
        this.onTimerTickCallback(this.timerRemainingSeconds);
      }

      if (this.timerRemainingSeconds <= 0) {
        this.stopAll();
      }
    }, 1000);
  }

  public clearSleepTimer() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.timerRemainingSeconds = 0;
    if (this.onTimerTickCallback) {
      this.onTimerTickCallback(0);
    }
  }

  public getTimerRemaining(): number {
    return this.timerRemainingSeconds;
  }

  // --- Ultra-Long Pure Authentic Tibetan Singing Bowl (เสียงขันธิเบตกังวานลากยาวพิเศษ 20 วินาที ซ้อนทับต่อเนื่อง) ---
  private emergencyGain: GainNode | null = null;
  private emergencyStopFns: Array<() => void> = [];
  private emergencyInterval: ReturnType<typeof setInterval> | null = null;

  public startEtherealEmergencyChime(volume: number = 0.75) {
    this.stopEtherealEmergencyChime();
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    this.emergencyGain = this.ctx.createGain();
    this.emergencyGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
    this.emergencyGain.gain.exponentialRampToValueAtTime(Math.max(0.01, volume), this.ctx.currentTime + 0.6);
    this.emergencyGain.connect(this.masterGain);

    // Warm Acoustic Resonance Filter for authentic bronze bowl acoustics
    const bowlAcousticFilter = this.ctx.createBiquadFilter();
    bowlAcousticFilter.type = 'lowpass';
    bowlAcousticFilter.frequency.setValueAtTime(1400, this.ctx.currentTime);
    bowlAcousticFilter.Q.setValueAtTime(1.5, this.ctx.currentTime);
    bowlAcousticFilter.connect(this.emergencyGain);

    const baseFreq = 261.63; // C4 Heart Bowl
    const deepBaseFreq = 130.81; // C3 Grand Master Bowl (Deep grounding)

    // 1. Continuous Singing Rim Friction Drone (เสียงวนขอบขันธิเบตลากยาวไม่มีวันหมด)
    const rimOsc1 = this.ctx.createOscillator();
    const rimOsc2 = this.ctx.createOscillator();
    const rimSub = this.ctx.createOscillator();
    const rimGain = this.ctx.createGain();

    rimOsc1.type = 'sine';
    rimOsc1.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);

    rimOsc2.type = 'sine';
    rimOsc2.frequency.setValueAtTime(baseFreq * 2.76, this.ctx.currentTime); // Second harmonic

    rimSub.type = 'sine';
    rimSub.frequency.setValueAtTime(deepBaseFreq, this.ctx.currentTime); // Deep grounding floor

    // Subtle gentle circular mallet rotation LFO
    const malletLfo = this.ctx.createOscillator();
    const malletGain = this.ctx.createGain();
    malletLfo.type = 'sine';
    malletLfo.frequency.setValueAtTime(0.25, this.ctx.currentTime); // Slow 4-second circular rotation
    malletGain.gain.setValueAtTime(2.0, this.ctx.currentTime);
    malletLfo.connect(malletGain);
    malletGain.connect(rimOsc1.frequency);

    rimGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
    rimGain.gain.exponentialRampToValueAtTime(0.28, this.ctx.currentTime + 2.0);

    rimOsc1.connect(rimGain);
    rimOsc2.connect(rimGain);
    rimSub.connect(rimGain);
    rimGain.connect(bowlAcousticFilter);

    rimOsc1.start();
    rimOsc2.start();
    rimSub.start();
    malletLfo.start();

    // 2. Ultra-Long Tibetan Singing Bowl Strike (เคาะขันธิเบตลากยาว 18-20 วินาที)
    const strikeUltraLongTibetanBowl = () => {
      if (!this.ctx || !this.emergencyGain) return;

      // Layer 1: Grand Deep Master Bowl (Decay 18.0 seconds)
      const deepHarmonics = [1, 2.0, 2.76];
      const deepGains = [0.7, 0.35, 0.15];
      deepHarmonics.forEach((h, idx) => {
        if (!this.ctx || !this.emergencyGain) return;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(deepBaseFreq * h, this.ctx.currentTime);

        g.gain.setValueAtTime(0.0001, this.ctx.currentTime);
        g.gain.linearRampToValueAtTime(deepGains[idx] * 0.7, this.ctx.currentTime + 0.06);
        g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 18.0);

        osc.connect(g);
        g.connect(bowlAcousticFilter);

        osc.start();
        osc.stop(this.ctx.currentTime + 18.5);
      });

      // Layer 2: Main Singing Bowl (Decay 16.0 seconds)
      const harmonics = [1, 2.76, 5.4, 8.93];
      const gains = [0.6, 0.28, 0.1, 0.03];
      const decays = [16.0, 14.0, 10.0, 6.0];

      harmonics.forEach((h, idx) => {
        if (!this.ctx || !this.emergencyGain) return;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq * h, this.ctx.currentTime);

        g.gain.setValueAtTime(0.0001, this.ctx.currentTime);
        g.gain.linearRampToValueAtTime(gains[idx] * 0.8, this.ctx.currentTime + 0.05);
        g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + decays[idx]);

        osc.connect(g);
        g.connect(bowlAcousticFilter);

        osc.start();
        osc.stop(this.ctx.currentTime + decays[idx] + 0.5);
      });
    };

    // Strike immediately upon opening
    strikeUltraLongTibetanBowl();

    // Re-strike gently every 11 seconds so the 18s tails overlap seamlessly into an endless sound bath
    this.emergencyInterval = setInterval(() => {
      strikeUltraLongTibetanBowl();
    }, 11000);

    this.emergencyStopFns.push(() => {
      try {
        rimOsc1.stop();
        rimOsc2.stop();
        rimSub.stop();
        malletLfo.stop();
      } catch (e) {}
    });
  }

  public stopEtherealEmergencyChime() {
    if (this.emergencyInterval) {
      clearInterval(this.emergencyInterval);
      this.emergencyInterval = null;
    }

    if (this.emergencyGain && this.ctx) {
      const g = this.emergencyGain;
      g.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.45);
      setTimeout(() => {
        try {
          this.emergencyStopFns.forEach((fn) => fn());
          this.emergencyStopFns = [];
          g.disconnect();
        } catch (e) {}
      }, 500);
      this.emergencyGain = null;
    } else {
      this.emergencyStopFns.forEach((fn) => fn());
      this.emergencyStopFns = [];
      this.emergencyGain = null;
    }
  }
}

export const soundEngine = new SoundEngine();

