class AudioService {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private engineGain: GainNode | null = null;
  private engineOsc: OscillatorNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  
  private isMuted: boolean = false;
  private isMusicEnabled: boolean = true;
  private bgmInterval: number | null = null;
  
  // Music specific nodes for persistent atmosphere
  private droneNodes: AudioNode[] = [];
  private delayNode: DelayNode | null = null;
  private delayFeedback: GainNode | null = null;

  constructor() {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      this.masterGain.gain.value = 0.3;

      // Separate gain for music to toggle it independently
      this.musicGain = this.ctx.createGain();
      this.musicGain.connect(this.masterGain);
      this.musicGain.gain.value = 0.4; 

      // Initialize delay bus for music effects
      this.initDelayLine();

    } catch (e) {
      console.warn("Web Audio API not supported", e);
    }
  }

  private initDelayLine() {
    if (!this.ctx || !this.musicGain) return;
    
    this.delayNode = this.ctx.createDelay(2.0);
    this.delayFeedback = this.ctx.createGain();
    const delayFilter = this.ctx.createBiquadFilter();

    // Spacey tape delay settings
    this.delayNode.delayTime.value = 0.333; // Dotted 8th at ~135bpm
    this.delayFeedback.gain.value = 0.4;
    delayFilter.type = 'highpass';
    delayFilter.frequency.value = 600; // Thin out the echoes

    // Route: Input -> Delay -> Filter -> Feedback -> Delay
    this.delayNode.connect(delayFilter);
    delayFilter.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delayNode);
    
    // Wet signal to music bus
    delayFilter.connect(this.musicGain);
  }

  public async init() {
    if (this.ctx?.state === 'suspended') {
      await this.ctx.resume();
    }
    this.createNoiseBuffer();
    this.initEngineSound();
  }

  private createNoiseBuffer() {
    if (!this.ctx || this.noiseBuffer) return;
    const bufferSize = this.ctx.sampleRate * 2; // 2 seconds
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
  }

  private initEngineSound() {
    if (!this.ctx || !this.masterGain || this.engineOsc) return;

    this.engineOsc = this.ctx.createOscillator();
    this.engineGain = this.ctx.createGain();
    
    // Low rumble
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 50;
    
    // Filter out high end to make it sound mechanical/muffled
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 200;

    this.engineOsc.connect(filter);
    filter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);
    
    // Start silent
    this.engineGain.gain.value = 0;
    this.engineOsc.start();
  }

  public setThrust(isThrusting: boolean) {
    if (!this.ctx || !this.engineGain || !this.engineOsc || this.isMuted) return;
    
    const t = this.ctx.currentTime;
    if (isThrusting) {
        // Ramp up volume and slight pitch increase
        this.engineGain.gain.setTargetAtTime(0.2, t, 0.1);
        this.engineOsc.frequency.setTargetAtTime(70, t, 0.15);
    } else {
        // Ramp down
        this.engineGain.gain.setTargetAtTime(0, t, 0.2);
        this.engineOsc.frequency.setTargetAtTime(50, t, 0.2);
    }
  }

  public playShoot() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    // Star Wars Blaster style: Sawtooth + Lowpass sweep
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1800, t);
    filter.frequency.exponentialRampToValueAtTime(800, t + 0.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    
    osc.type = 'sawtooth';
    
    // Pitch drop
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(150, t + 0.25);
    
    // Envelope
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    
    osc.start(t);
    osc.stop(t + 0.25);
  }

  public playExplosion(size: 'small' | 'large' | 'massive') {
    if (!this.ctx || !this.masterGain || this.isMuted || !this.noiseBuffer) return;
    
    const t = this.ctx.currentTime;
    
    // Use noise buffer for a crashing sound
    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    
    const gain = this.ctx.createGain();
    
    let duration = 0.5;
    let startFreq = 1000;
    let volume = 0.5;
    
    if (size === 'small') { duration = 0.3; startFreq = 800; volume = 0.3; }
    if (size === 'large') { duration = 0.6; startFreq = 600; volume = 0.6; }
    if (size === 'massive') { duration = 1.5; startFreq = 400; volume = 0.8; }

    // Filter envelope: bright crunch fading to deep rumble
    filter.frequency.setValueAtTime(startFreq, t);
    filter.frequency.exponentialRampToValueAtTime(20, t + duration);
    
    // Volume envelope
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
    
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    
    source.start();
    source.stop(t + duration);
  }

  public playPowerupSpawn() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(800, this.ctx.currentTime + 0.3);
    
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  public playPowerupCollect() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(1200, this.ctx.currentTime + 0.1);
    osc.frequency.setValueAtTime(1200, this.ctx.currentTime + 0.1);
    osc.frequency.linearRampToValueAtTime(1800, this.ctx.currentTime + 0.2);

    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.2);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  public playGameOver() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(10, t + 2.5);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.linearRampToValueAtTime(0, t + 2.5);

    osc.start(t);
    osc.stop(t + 2.5);

    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.connect(subGain);
    subGain.connect(this.masterGain);

    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(100, t);
    subOsc.frequency.linearRampToValueAtTime(20, t + 2.5);
    
    subGain.gain.setValueAtTime(0.5, t);
    subGain.gain.linearRampToValueAtTime(0, t + 2.5);

    subOsc.start(t);
    subOsc.stop(t + 2.5);
  }

  public toggleMute() {
    this.isMuted = !this.isMuted;
    const t = this.ctx!.currentTime;
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.3, t, 0.1);
    }
    if (this.isMuted && this.engineGain) {
        this.engineGain.gain.setTargetAtTime(0, t, 0.1);
    }
  }

  public toggleMusic() {
    this.isMusicEnabled = !this.isMusicEnabled;
    if (this.isMusicEnabled) {
        this.startBGM();
    } else {
        this.stopBGM();
    }
  }

  public isMusicOn() {
      return this.isMusicEnabled;
  }

  // --- Generative Sci-Fi Music Engine ---

  private startDrone() {
    if (!this.ctx || !this.musicGain) return;
    
    // Create a thick atmospheric pad using two detuned sawtooths through a filtered LFO
    const t = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc1.frequency.value = 55; // Low A
    osc2.frequency.value = 55.5; // Detuned

    filter.type = 'lowpass';
    filter.Q.value = 5;

    // Slow sweeping filter
    lfo.type = 'sine';
    lfo.frequency.value = 0.05;
    lfoGain.gain.value = 150;
    filter.frequency.value = 300;

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.08, t + 2); // Fade in

    osc1.start(t);
    osc2.start(t);
    lfo.start(t);

    this.droneNodes.push(osc1, osc2, filter, gain, lfo, lfoGain);
  }

  private stopDrone() {
    this.droneNodes.forEach(node => {
        if (node instanceof OscillatorNode) {
            try { node.stop(); } catch(e) {}
        }
        node.disconnect();
    });
    this.droneNodes = [];
  }

  public startBGM() {
    if (!this.ctx || !this.musicGain || this.bgmInterval || !this.isMusicEnabled) return;
    
    this.startDrone();

    let step = 0;
    const tempo = 135; 
    const stepTime = (60 / tempo / 4) * 1000; // 16th note duration in ms

    const playBeat = () => {
      if (!this.ctx || !this.musicGain || this.isMuted) return;
      const t = this.ctx.currentTime;
      
      const bar = Math.floor(step / 16);
      const beat = step % 16;

      // 1. Cinematic Kick (Every beat)
      if (beat % 4 === 0) {
         const osc = this.ctx.createOscillator();
         const g = this.ctx.createGain();
         osc.connect(g);
         g.connect(this.musicGain!);
         
         // Deep punch
         osc.frequency.setValueAtTime(120, t);
         osc.frequency.exponentialRampToValueAtTime(30, t + 0.2);
         
         g.gain.setValueAtTime(0.4, t);
         g.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
         
         osc.start(t);
         osc.stop(t + 0.3);
      }

      // 2. Driving Bassline (Moving 8ths)
      if (beat % 2 === 0) {
          const osc = this.ctx.createOscillator();
          const g = this.ctx.createGain();
          const f = this.ctx.createBiquadFilter();
          
          osc.connect(f);
          f.connect(g);
          g.connect(this.musicGain!);
          
          osc.type = 'sawtooth';
          
          // Dramatic Progression: C Minor -> Eb Major -> F Minor -> G Dom
          let note = 65.41; // C2
          const prog = bar % 8;
          if (prog >= 4 && prog < 6) note = 77.78; // Eb2
          if (prog === 6) note = 87.31; // F2
          if (prog === 7) note = 98.00; // G2

          // Octave jumps to make it driving
          if (beat % 4 !== 0) note *= 2; 

          osc.frequency.setValueAtTime(note, t);
          
          f.type = 'lowpass';
          f.frequency.setValueAtTime(500, t);
          f.frequency.exponentialRampToValueAtTime(100, t + 0.15);
          
          g.gain.setValueAtTime(0.15, t);
          g.gain.linearRampToValueAtTime(0, t + 0.15);
          
          osc.start(t);
          osc.stop(t + 0.2);
      }

      // 3. Hi-Hat Ticks (Fast 16ths)
      if (this.noiseBuffer) {
         const isOpen = beat % 4 === 2;
         const s = this.ctx.createBufferSource();
         s.buffer = this.noiseBuffer;
         const g = this.ctx.createGain();
         const f = this.ctx.createBiquadFilter();
         
         s.connect(f);
         f.connect(g);
         g.connect(this.musicGain!);
         
         f.type = 'highpass';
         f.frequency.value = 8000;
         
         g.gain.setValueAtTime(isOpen ? 0.06 : 0.02, t);
         g.gain.exponentialRampToValueAtTime(0.001, t + (isOpen ? 0.08 : 0.03));
         
         s.start(t);
         s.stop(t + 0.1);
      }

      // 4. Sci-Fi Arpeggio (Randomized technological bleeps)
      // Plays 16th notes with some probability, sent through delay
      if (Math.random() > 0.3) {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        
        osc.connect(g);
        g.connect(this.musicGain!);
        if (this.delayNode) g.connect(this.delayNode); // Send to delay bus
        
        osc.type = 'square';
        
        // C Minor Pentatonic Extended
        const scale = [261.63, 311.13, 349.23, 392.00, 466.16, 523.25, 622.25]; 
        const idx = Math.floor(Math.random() * scale.length);
        const freq = scale[idx] * (Math.random() > 0.7 ? 2 : 1); // Sometimes octave up
        
        osc.frequency.setValueAtTime(freq, t);
        
        g.gain.setValueAtTime(0.04, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        
        osc.start(t);
        osc.stop(t + 0.1);
      }

      step++;
    };

    this.bgmInterval = window.setInterval(playBeat, stepTime);
  }

  public stopBGM() {
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
    this.stopDrone();
  }
}

export const audioService = new AudioService();