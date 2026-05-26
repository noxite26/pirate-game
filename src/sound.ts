/**
 * Web Audio API Retro Sound Effects Synthesizer for Cursed Keel
 * Provides high-fidelity, organic chip-tune sounds locally without external asset dependencies.
 */

class SoundController {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  private initCtx() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public toggleMute() {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  public getMuteStatus() {
    return this.isMuted;
  }

  private playTone(freqs: number[], durationSecs: number, type: OscillatorType = "sine", gainVal: number = 0.1, ramp: boolean = true) {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = type;
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    const now = ctx.currentTime;
    gainNode.gain.setValueAtTime(gainVal, now);

    if (freqs.length === 1) {
      osc.frequency.setValueAtTime(freqs[0], now);
    } else {
      // Dynamic frequency sweep
      osc.frequency.setValueAtTime(freqs[0], now);
      const step = durationSecs / (freqs.length - 1);
      for (let i = 1; i < freqs.length; i++) {
        osc.frequency.exponentialRampToValueAtTime(freqs[i], now + i * step);
      }
    }

    if (ramp) {
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + durationSecs);
    } else {
      gainNode.gain.setValueAtTime(gainVal, now + durationSecs - 0.05);
      gainNode.gain.linearRampToValueAtTime(0.0001, now + durationSecs);
    }

    osc.start(now);
    osc.stop(now + durationSecs);
  }

  public playFootstep() {
    // Noise/Thud simulation for hollow wooden boards
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(120, now);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);

    osc.start(now);
    osc.stop(now + 0.16);
  }

  public playFrogHit() {
    // Squishy, comical frog ribbit / hit sound
    this.playTone([220, 580, 440, 880], 0.25, "triangle", 0.15);
    // Add a quick secondary bubble noise
    setTimeout(() => {
      this.playTone([600, 1200], 0.12, "sine", 0.08);
    }, 80);
  }

  public playKeyPickup() {
    // Majestic crystal twinkle
    this.playTone([987.77, 1318.51, 1567.98, 1975.53], 0.35, "sine", 0.12);
  }

  public playChestOpen() {
    // Creaking wood sound + glitter open
    this.playTone([150, 180, 110], 0.2, "sawtooth", 0.06);
    setTimeout(() => {
      this.playTone([523.25, 659.25, 783.99, 1046.50, 1318.51], 0.4, "sine", 0.12);
    }, 150);
  }

  public playArtifactPickup() {
    // Cursed magical crescendo
    this.playTone([300, 600, 900, 1200, 1500], 0.8, "sine", 0.1, false);
    setTimeout(() => {
      this.playTone([1500, 1800, 2200], 0.4, "triangle", 0.08);
    }, 200);
  }

  public playAlert() {
    // Sudden brass warning note, slide up rapidly
    this.playTone([350, 750, 950], 0.3, "sawtooth", 0.15);
  }

  public playUpgrade() {
    // Positive arpeggio
    this.playTone([523, 659, 783, 1046], 0.4, "sine", 0.12);
  }

  public playLoss() {
    // Low detuned descending sweep for Game Over
    this.playTone([300, 200, 150, 90], 0.8, "sawtooth", 0.18);
  }

  public playExtractionVictory() {
    // Little jolly pirate victory melody! (Three major chords)
    // Cord 1: C major
    this.playTone([523.25, 659.25, 783.99], 0.2, "sine", 0.1);
    
    setTimeout(() => {
      // Cord 2: F major
      this.playTone([587.33, 698.46, 880.00], 0.2, "sine", 0.1);
    }, 200);

    setTimeout(() => {
      // Cord 3: G major
      this.playTone([783.99, 987.77, 1174.66], 0.4, "sine", 0.12);
    }, 400);
  }
}

export const sound = new SoundController();
