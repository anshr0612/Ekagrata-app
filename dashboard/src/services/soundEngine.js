// Web Audio API Procedural Generator for Focus Soundscapes
// Generates infinite, lightweight, offline soundscapes: Binaural Alpha (10Hz), Rain, Forest Drone, Vedic Bowl OM

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.activeNodes = [];
    this.currentTrack = null;
    this.volume = 0.35;
    this.gainNode = null;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      this.gainNode.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
  }

  stop() {
    this.activeNodes.forEach(node => {
      try {
        if (node.stop) node.stop();
        if (node.disconnect) node.disconnect();
      } catch (e) {}
    });
    this.activeNodes = [];
    this.currentTrack = null;
  }

  // 1. Alpha Waves (10Hz binaural beat for calm, single-pointed attention)
  playAlphaWaves() {
    this.init();
    this.stop();
    this.currentTrack = 'alpha';

    const baseFreq = 216; // A 432Hz harmonic
    const beatFreq = 10;  // 10Hz Alpha rhythm

    // Left channel
    const oscL = this.ctx.createOscillator();
    oscL.type = 'sine';
    oscL.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
    const panL = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    if (panL) panL.pan.setValueAtTime(-1, this.ctx.currentTime);

    // Right channel
    const oscR = this.ctx.createOscillator();
    oscR.type = 'sine';
    oscR.frequency.setValueAtTime(baseFreq + beatFreq, this.ctx.currentTime);
    const panR = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    if (panR) panR.pan.setValueAtTime(1, this.ctx.currentTime);

    // Gentle sub-bass warmth (108Hz)
    const subOsc = this.ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(108, this.ctx.currentTime);
    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(0.2, this.ctx.currentTime);

    // Master track filter to keep it warm and pillowy
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(350, this.ctx.currentTime);

    if (panL && panR) {
      oscL.connect(panL);
      panL.connect(filter);
      oscR.connect(panR);
      panR.connect(filter);
    } else {
      oscL.connect(filter);
      oscR.connect(filter);
    }

    subOsc.connect(subGain);
    subGain.connect(filter);

    filter.connect(this.gainNode);

    oscL.start();
    oscR.start();
    subOsc.start();

    this.activeNodes.push(oscL, oscR, subOsc, filter);
  }

  // 2. Brown Noise & Soft Rain (Gentle masking of chatter and distractions)
  playRain() {
    this.init();
    this.stop();
    this.currentTrack = 'rain';

    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + 0.02 * white) / 1.02; // Brown noise formula
      lastOut = output[i];
      output[i] *= 3.5;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    // Filter simulating rain striking a window
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, this.ctx.currentTime);

    whiteNoise.connect(filter);
    filter.connect(this.gainNode);

    whiteNoise.start();
    this.activeNodes.push(whiteNoise, filter);
  }

  // 3. Resonant Singing Bowl / OM Drone (Harmonic overtone meditation)
  playBowlDrone() {
    this.init();
    this.stop();
    this.currentTrack = 'bowl';

    // Harmonic ratios for singing bowl resonance: fundamental 136.1 Hz (Cosmic Om), 272.2 Hz, 408.3 Hz
    const freqs = [136.1, 272.2, 408.3, 544.4];
    const gains = [0.4, 0.25, 0.15, 0.08];

    const masterFilter = this.ctx.createBiquadFilter();
    masterFilter.type = 'lowpass';
    masterFilter.frequency.setValueAtTime(600, this.ctx.currentTime);
    masterFilter.connect(this.gainNode);

    freqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      // Subtle LFO modulation for shimmery shimmer
      const lfo = this.ctx.createOscillator();
      lfo.frequency.setValueAtTime(0.15 + idx * 0.05, this.ctx.currentTime);
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(2.0, this.ctx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      const oscGain = this.ctx.createGain();
      oscGain.gain.setValueAtTime(gains[idx], this.ctx.currentTime);

      osc.connect(oscGain);
      oscGain.connect(masterFilter);

      osc.start();
      lfo.start();
      this.activeNodes.push(osc, lfo, oscGain, lfoGain);
    });

    this.activeNodes.push(masterFilter);
  }

  // Play a single Tibetan bell chime at the start/end of a session or breathing cycle
  playChime() {
    this.init();
    const bellOsc = this.ctx.createOscillator();
    const bellGain = this.ctx.createGain();

    bellOsc.type = 'sine';
    bellOsc.frequency.setValueAtTime(528, this.ctx.currentTime); // 528 Hz Solfeggio frequency

    const now = this.ctx.currentTime;
    bellGain.gain.setValueAtTime(0.3, now);
    bellGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.5);

    bellOsc.connect(bellGain);
    bellGain.connect(this.ctx.destination);

    bellOsc.start(now);
    bellOsc.stop(now + 3.6);
  }
}

export const soundEngine = new SoundEngine();

export const AMBIENT_SOUNDS = [
  {
    id: 'alpha',
    name: '10Hz Alpha Waves',
    nameHi: '१०हर्ट्ज़ अल्फा तरंगें',
    desc: 'Binaural frequencies scientifically tuned for deep focus and flow',
    icon: '🧠',
  },
  {
    id: 'rain',
    name: 'Gentle Rain Mask',
    nameHi: 'मंद वर्षा का स्वर',
    desc: 'Soft acoustic masking to silence environmental distractions',
    icon: '🌧️',
  },
  {
    id: 'bowl',
    name: 'Tibetan OM Drone',
    nameHi: 'तिब्बती ॐ गुंजन',
    desc: '136.1Hz harmonic resonance for quiet meditation & calm sitting',
    icon: '🧘',
  },
];
