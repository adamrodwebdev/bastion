/**
 * @file Procedural sound effects and ambient music with the Web Audio API (no audio files:
 * nothing to download, nothing to license). Starts on the first user gesture, as browsers require.
 */

import { EventEmitter } from '../core/utils/EventEmitter.js';

/** Minimum time between two plays of the same sound (seconds): towers fire a lot. */
const THROTTLE = { arrow: 0.06, cannon: 0.09, frost: 0.08, laser: 0.08, kill: 0.04, impact: 0.08, coin: 0.05 };

/** Music bed per level theme: root note (Hz) and chord degrees (semitones) of a slow progression. */
const MOODS = {
  menu: { root: 196, chords: [[0, 7, 12, 16], [5, 12, 17, 21], [-3, 7, 12, 15], [-5, 7, 11, 14]], wind: 0.0 },
  meadow: { root: 220, chords: [[0, 7, 12, 16], [5, 9, 12, 17], [7, 11, 14, 19], [0, 4, 7, 12]], wind: 0.25 },
  canyon: { root: 196, chords: [[0, 7, 10, 15], [-2, 5, 10, 14], [-4, 3, 8, 12], [-5, 2, 7, 10]], wind: 0.6 },
  lagoon: { root: 233, chords: [[0, 7, 11, 16], [5, 9, 12, 16], [2, 9, 14, 17], [7, 11, 14, 19]], wind: 0.2 },
  volcano: { root: 147, chords: [[0, 7, 12, 15], [1, 8, 13, 17], [0, 7, 12, 15], [-2, 5, 10, 13]], wind: 0.45 },
  fortress: { root: 175, chords: [[0, 7, 12, 15], [-4, 3, 8, 12], [-2, 5, 10, 14], [-5, 2, 7, 11]], wind: 0.4 },
  abyss: { root: 165, chords: [[0, 6, 12, 15], [1, 7, 13, 16], [-1, 6, 11, 14], [0, 3, 6, 12]], wind: 0.3 },
};

/**
 * Sound service. Every sound is synthesised on the fly from oscillators and noise.
 * Volumes are low and varied in pitch so repeated shots never become grating.
 */
export class AudioService extends EventEmitter {
  constructor({ sound = true, music = true } = {}) {
    super();
    this.soundOn = sound;
    this.musicOn = music;
    this.ctx = null;
    this.master = null;
    this.sfxBus = null;
    this.musicBus = null;
    this._noise = null;
    this._last = new Map();
    this._mood = null;
    this._musicTimer = 0;
    this._chord = 0;
    this._windNode = null;
  }

  /** Creates the audio graph; must be called from a user gesture (click, key, tap). */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.8;
    const comp = this.ctx.createDynamicsCompressor();
    this.master.connect(comp).connect(this.ctx.destination);
    this.sfxBus = this.ctx.createGain();
    this.sfxBus.gain.value = this.soundOn ? 0.55 : 0;
    this.sfxBus.connect(this.master);
    this.musicBus = this.ctx.createGain();
    this.musicBus.gain.value = this.musicOn ? 0.22 : 0;
    this.musicBus.connect(this.master);
    // One second of white noise, reused by every noisy sound.
    const len = this.ctx.sampleRate;
    this._noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this._noise.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    if (this._mood) this._startMusic();
  }

  setSound(on) {
    this.soundOn = on;
    if (this.sfxBus) this.sfxBus.gain.setTargetAtTime(on ? 0.55 : 0, this.ctx.currentTime, 0.05);
    this.emit('change');
  }

  setMusic(on) {
    this.musicOn = on;
    if (this.musicBus) this.musicBus.gain.setTargetAtTime(on ? 0.22 : 0, this.ctx.currentTime, 0.3);
    if (on && this._mood && this.ctx) this._startMusic();
    this.emit('change');
  }

  // ------------------------------------------------------------------ music
  /** Selects the ambient bed ('menu' or a level theme). Plays once audio is unlocked. */
  playMood(id) {
    if (this._mood === id) return;
    this._mood = id;
    if (this.ctx) this._startMusic();
  }

  _startMusic() {
    clearInterval(this._musicTimer);
    this._chord = 0;
    this._setWind(MOODS[this._mood] ? MOODS[this._mood].wind : 0);
    if (!this.musicOn) return;
    const bar = 4.8;
    const tick = () => {
      if (!this.ctx || !this.musicOn || document.hidden) return;
      this._playChord(bar);
    };
    tick();
    this._musicTimer = setInterval(tick, bar * 1000);
  }

  _playChord(bar) {
    const mood = MOODS[this._mood] || MOODS.menu;
    const chord = mood.chords[this._chord % mood.chords.length];
    this._chord++;
    const t0 = this.ctx.currentTime + 0.05;
    const f = (semi) => mood.root * Math.pow(2, semi / 12);
    // Soft pad: two slightly detuned triangles per note, slow attack and release.
    for (const semi of chord) {
      for (const det of [-4, 4]) {
        const o = this.ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.value = f(semi) / 2;
        o.detune.value = det;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(0.05, t0 + 1.4);
        g.gain.linearRampToValueAtTime(0.035, t0 + bar - 0.8);
        g.gain.linearRampToValueAtTime(0, t0 + bar + 0.8);
        o.connect(g).connect(this.musicBus);
        o.start(t0);
        o.stop(t0 + bar + 0.9);
      }
    }
    // A few plucked notes on top (a sparse, calm arpeggio).
    for (let i = 0; i < 4; i++) {
      if (Math.random() < 0.35) continue;
      const semi = chord[Math.floor(Math.random() * chord.length)] + 12;
      this._tone({ type: 'sine', freq: f(semi), end: f(semi), dur: 0.9, vol: 0.06, bus: this.musicBus, at: t0 + 0.6 + i * (bar / 4) });
    }
  }

  _setWind(level) {
    if (!this.ctx) return;
    if (!this._windNode) {
      const src = this.ctx.createBufferSource();
      src.buffer = this._noise;
      src.loop = true;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 420;
      bp.Q.value = 0.6;
      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 0.08;
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 180;
      lfo.connect(lfoGain).connect(bp.frequency);
      const g = this.ctx.createGain();
      g.gain.value = 0;
      src.connect(bp).connect(g).connect(this.musicBus);
      src.start();
      lfo.start();
      this._windNode = g;
    }
    this._windNode.gain.setTargetAtTime(level * 0.12, this.ctx.currentTime, 1);
  }

  // ------------------------------------------------------------------ effects
  /**
   * Plays a named sound effect.
   * @param {string} name arrow | cannon | frost | laser | impact | kill | coin | leak | build | upgrade | sell | wave | power | win | lose | click | boss
   */
  play(name) {
    if (!this.ctx || !this.soundOn || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const gap = THROTTLE[name] || 0;
    if (gap && now - (this._last.get(name) || 0) < gap) return;
    this._last.set(name, now);
    const v = 0.92 + Math.random() * 0.16; // pitch variation
    switch (name) {
      case 'arrow':
        this._noiseHit({ freq: 2600 * v, q: 3, dur: 0.06, vol: 0.18, type: 'bandpass' });
        this._tone({ type: 'triangle', freq: 900 * v, end: 500 * v, dur: 0.07, vol: 0.06 });
        break;
      case 'cannon':
        this._tone({ type: 'sine', freq: 140 * v, end: 45, dur: 0.28, vol: 0.4 });
        this._noiseHit({ freq: 900, q: 0.7, dur: 0.18, vol: 0.25, type: 'lowpass' });
        break;
      case 'impact':
        this._noiseHit({ freq: 500 * v, q: 0.8, dur: 0.3, vol: 0.32, type: 'lowpass' });
        this._tone({ type: 'sine', freq: 90 * v, end: 35, dur: 0.3, vol: 0.3 });
        break;
      case 'frost':
        this._tone({ type: 'sine', freq: 1500 * v, end: 2300 * v, dur: 0.12, vol: 0.07 });
        this._tone({ type: 'triangle', freq: 2200 * v, end: 1800 * v, dur: 0.16, vol: 0.04, at: now + 0.03 });
        break;
      case 'laser':
        this._tone({ type: 'sawtooth', freq: 1200 * v, end: 180, dur: 0.18, vol: 0.07, filter: 2400 });
        break;
      case 'kill':
        this._tone({ type: 'square', freq: 420 * v, end: 160 * v, dur: 0.09, vol: 0.05, filter: 1800 });
        break;
      case 'coin':
        this._tone({ type: 'sine', freq: 1318 * v, end: 1318 * v, dur: 0.08, vol: 0.08 });
        this._tone({ type: 'sine', freq: 1760 * v, end: 1760 * v, dur: 0.16, vol: 0.08, at: now + 0.06 });
        break;
      case 'leak':
        this._tone({ type: 'sine', freq: 110, end: 55, dur: 0.45, vol: 0.45 });
        this._tone({ type: 'sawtooth', freq: 233, end: 220, dur: 0.35, vol: 0.06, filter: 800 });
        break;
      case 'build':
        this._noiseHit({ freq: 700, q: 1, dur: 0.12, vol: 0.3, type: 'lowpass' });
        this._tone({ type: 'triangle', freq: 260, end: 180, dur: 0.12, vol: 0.18 });
        break;
      case 'upgrade':
        [523, 659, 784, 1047].forEach((f, i) => this._tone({ type: 'triangle', freq: f, end: f, dur: 0.14, vol: 0.09, at: now + i * 0.06 }));
        break;
      case 'sell':
        [784, 523].forEach((f, i) => this._tone({ type: 'triangle', freq: f, end: f, dur: 0.12, vol: 0.08, at: now + i * 0.07 }));
        break;
      case 'wave':
        // War horn: two detuned saws through a slowly opening filter.
        for (const [f, d] of [[146.8, 0], [220, 0.02]]) this._tone({ type: 'sawtooth', freq: f, end: f * 1.01, dur: 1.1, vol: 0.09, filter: 900, attack: 0.15, at: now + d });
        break;
      case 'boss':
        for (const f of [73.4, 77.8]) this._tone({ type: 'sawtooth', freq: f, end: f * 0.97, dur: 1.6, vol: 0.12, filter: 500, attack: 0.3 });
        break;
      case 'power':
        this._noiseHit({ freq: 1200, q: 0.8, dur: 0.5, vol: 0.18, type: 'bandpass', sweep: 4000 });
        this._tone({ type: 'sine', freq: 330, end: 990, dur: 0.4, vol: 0.1 });
        break;
      case 'win':
        [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this._tone({ type: 'triangle', freq: f, end: f, dur: i === 5 ? 0.6 : 0.16, vol: 0.12, at: now + i * 0.13 }));
        break;
      case 'lose':
        [392, 349, 311, 262].forEach((f, i) => this._tone({ type: 'triangle', freq: f, end: f * 0.98, dur: 0.35, vol: 0.12, at: now + i * 0.22 }));
        break;
      case 'click':
        this._tone({ type: 'triangle', freq: 660, end: 520, dur: 0.05, vol: 0.06 });
        break;
      default:
        break;
    }
  }

  _tone({ type, freq, end, dur, vol, at, filter, attack = 0.005, bus }) {
    const ctx = this.ctx;
    const t0 = at || ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, end), t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    let node = o;
    if (filter) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = filter;
      node = node.connect(f);
    }
    node.connect(g).connect(bus || this.sfxBus);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  _noiseHit({ freq, q, dur, vol, type, sweep }) {
    const ctx = this.ctx;
    const t0 = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this._noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t0);
    if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t0 + dur);
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(this.sfxBus);
    src.start(t0, Math.random() * 0.5);
    src.stop(t0 + dur + 0.02);
  }
}
