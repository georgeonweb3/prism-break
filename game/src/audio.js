// Synthesised sound effects (WebAudio, no audio files): every sound is an
// oscillator or a filtered noise burst built at runtime, so the game loads
// nothing over the network. The context is created on the first user gesture
// (browsers block audio before one); until then every call is a no-op.

export function createSound() {
  let ctx = null;
  let muted = false;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return ctx;
    }
    try {
      const AC = window.AudioContext ?? window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      return ctx;
    } catch {
      return null;
    }
  }

  function tone(freq, dur, type, gain, slideTo) {
    if (muted) return;
    const c = ensure();
    if (!c) return;
    try {
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, c.currentTime);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + dur);
      g.gain.setValueAtTime(gain, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
      osc.connect(g).connect(c.destination);
      osc.start();
      osc.stop(c.currentTime + dur);
    } catch {
      // Audio is decoration: a failure never breaks the game.
    }
  }

  function noise(dur, gain, filterFreq) {
    if (muted) return;
    const c = ensure();
    if (!c) return;
    try {
      const len = Math.max(1, Math.floor(c.sampleRate * dur));
      const buffer = c.createBuffer(1, len, c.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = c.createBufferSource();
      src.buffer = buffer;
      const filter = c.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = filterFreq;
      const g = c.createGain();
      g.gain.setValueAtTime(gain, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
      src.connect(filter).connect(g).connect(c.destination);
      src.start();
    } catch {
      // Audio is decoration: a failure never breaks the game.
    }
  }

  return {
    /** Call from any user gesture so the context is allowed to start. */
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
    paddle() {
      tone(220, 0.07, 'square', 0.12, 330);
    },
    wall() {
      tone(180, 0.05, 'square', 0.08, 240);
    },
    brick(hitsLeft) {
      noise(0.09, 0.22, 3200);
      tone(hitsLeft === 0 ? 660 : 440, 0.09, 'triangle', 0.16, hitsLeft === 0 ? 990 : 550);
    },
    steel() {
      tone(140, 0.06, 'sawtooth', 0.1, 110);
      noise(0.04, 0.1, 1800);
    },
    powerup() {
      tone(523, 0.09, 'sine', 0.16);
      setTimeout(() => tone(659, 0.09, 'sine', 0.16), 80);
      setTimeout(() => tone(784, 0.14, 'sine', 0.18), 160);
    },
    launch() {
      tone(330, 0.12, 'sine', 0.14, 660);
    },
    lose() {
      tone(392, 0.22, 'sawtooth', 0.14, 196);
      setTimeout(() => tone(262, 0.3, 'sawtooth', 0.12, 131), 180);
    },
    clear() {
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.16, 'triangle', 0.16), i * 110));
    },
    over() {
      [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, 0.25, 'triangle', 0.14), i * 160));
    },
    win() {
      [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => tone(f, 0.2, 'triangle', 0.16), i * 120));
    },
  };
}
