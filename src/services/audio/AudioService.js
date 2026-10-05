/**
 * @file Sound effects synthesised in real time (Web Audio API) and music control.
 *
 * No audio file to download: every sound is built from oscillators and
 * filtered noise. The audio context is only created after a user gesture
 * (browser rule): call `unlock()` from a click, tap or key press.
 */

import { clamp } from '../../core/utils/math.js';
import { MusicDirector } from './MusicDirector.js';

/** Minimum delay between two plays of the same sound (seconds). */
const THROTTLE = { default: 0.05, hit: 0.07, kill: 0.06 };

export class AudioService {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicBus = null;
    this.noise = null;
    this.last = new Map();
    this.sfxVolume = 0.8;
    this.musicVolume = 0.6;
    this.adMuted = false;
    this.portalMuted = false;
    this.readyCallbacks = new Set();
    this.director = new MusicDirector(this);
    this.scene = null;
  }

  // ------------------------------------------------------------- volumes
  setVolumes({ sfx = this.sfxVolume, music = this.musicVolume } = {}) {
    this.sfxVolume = clamp(Number(sfx) || 0, 0, 1);
    this.musicVolume = clamp(Number(music) || 0, 0, 1);
    this.director.setEnabled(this.musicVolume > 0);
    this._applyGain();
  }

  /** Silence during an ad (independent of the player's settings). */
  setAdMuted(on) {
    this.adMuted = Boolean(on);
    this._applyGain();
  }

  /** Silence requested by the portal (mute button of the portal page). */
  setPortalMuted(on) {
    this.portalMuted = Boolean(on);
    this._applyGain();
  }

  get silent() {
    return this.adMuted || this.portalMuted;
  }

  _applyGain() {
    if (!this.ctx) return;
    this.master.gain.value = this.silent ? 0 : this.sfxVolume * 0.7;
    this.musicBus.gain.setTargetAtTime(this.silent ? 0 : this.musicVolume * 0.7, this.ctx.currentTime, 0.1);
  }

  // ------------------------------------------------------------- context
  /** Interface used by MusicDirector: calls fn(ctx, bus) once audio is available. */
  whenReady(fn) {
    if (this.ctx) fn(this.ctx, this.musicBus);
    else this.readyCallbacks.add(fn);
    return () => this.readyCallbacks.delete(fn);
  }

  /** To call on a user gesture (click, tap, key). */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    const Ctx = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Ctx) return;
    try {
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = 0;
      this.musicBus.connect(this.ctx.destination);
      const len = this.ctx.sampleRate;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      this._applyGain();
    } catch {
      this.ctx = null;
      return;
    }
    for (const fn of this.readyCallbacks) fn(this.ctx, this.musicBus);
    this.readyCallbacks.clear();
  }

  /** Pauses sound (hidden tab) or resumes it. */
  suspend(on) {
    if (!this.ctx) return;
    if (on) this.ctx.suspend().catch(() => {});
    else this.ctx.resume().catch(() => {});
  }

  // ------------------------------------------------------------- music
  /**
   * @param {'menu'|'battle'|'victory'} scene
   * @param {{chapter?:number}} [opts]
   */
  music(scene, { chapter = 1 } = {}) {
    this.scene = scene;
    if (scene === 'victory') {
      this.director.stop(1.5);
      return;
    }
    this.director.play(scene === 'menu' ? 'menu' : 'chapter', { chapter });
    this.director.setIntensity(scene === 'menu' ? 0 : 1);
  }

  /** Background intensity of the battle music (0 calm → 3 climax). */
  intensity(level) {
    this.director.setIntensity(level);
  }

  /** Short surge (boss, explosion, lives lost). */
  surge(level = 3, seconds = 4) {
    this.director.surge(level, seconds);
  }

  duck(on) {
    this.director.duck(on);
  }

  // ------------------------------------------------------------- effects
  /**
   * Plays a sound effect.
   * @param {string} id e.g. 'build', 'hit-cannon', 'kill', 'horn'
   */
  sfx(id) {
    if (!this.ctx || this.silent || this.sfxVolume === 0) return;
    const now = this.ctx.currentTime;
    const family = id.startsWith('hit-') ? 'hit' : id === 'kill' ? 'kill' : 'default';
    const key = family === 'default' ? id : id;
    if (now - (this.last.get(key) ?? -1) < THROTTLE[family]) return;
    this.last.set(key, now);
    try {
      this._synth(id, this.master, now);
    } catch {
      /* a missing sound is never critical */
    }
  }

  _env(start, attack, decay, peak) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), start + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, start + attack + decay);
    return g;
  }

  _noise(out, t, { type = 'bandpass', freq = 800, q = 1, attack = 0.005, decay = 0.2, peak = 0.5, sweepTo = null }) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + attack + decay);
    f.Q.value = q;
    const g = this._env(t, attack, decay, peak);
    src.connect(f).connect(g).connect(out);
    src.start(t, Math.random() * 0.5);
    src.stop(t + attack + decay + 0.05);
  }

  _tone(out, t, { type = 'sine', freq = 440, to = null, attack = 0.01, decay = 0.3, peak = 0.3 }) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + attack + decay);
    const g = this._env(t, attack, decay, peak);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + attack + decay + 0.05);
  }

  _synth(id, out, t) {
    switch (id) {
      case 'hit-archer':
        this._tone(out, t, { type: 'triangle', freq: 900, to: 500, decay: 0.06, peak: 0.05 });
        break;
      case 'hit-cannon':
        this._noise(out, t, { type: 'lowpass', freq: 700, sweepTo: 90, decay: 0.35, peak: 0.35 });
        this._tone(out, t, { freq: 90, to: 45, decay: 0.3, peak: 0.25 });
        break;
      case 'hit-catapult':
        this._noise(out, t, { type: 'lowpass', freq: 500, sweepTo: 60, decay: 0.6, peak: 0.5 });
        this._tone(out, t, { freq: 70, to: 35, decay: 0.5, peak: 0.35 });
        break;
      case 'hit-frost':
        for (const f of [1568, 2093]) this._tone(out, t, { freq: f, decay: 0.18, peak: 0.04 });
        break;
      case 'hit-ballista':
        this._noise(out, t, { type: 'bandpass', freq: 600, q: 2, decay: 0.1, peak: 0.25 });
        break;
      case 'hit-fire':
        this._noise(out, t, { type: 'bandpass', freq: 1500, q: 1.5, decay: 0.15, peak: 0.08 });
        break;
      case 'hit-storm':
        this._noise(out, t, { type: 'highpass', freq: 2500, decay: 0.12, peak: 0.12 });
        this._tone(out, t, { type: 'sawtooth', freq: 110, to: 60, decay: 0.15, peak: 0.06 });
        break;
      case 'hit-power':
        this._noise(out, t, { type: 'lowpass', freq: 900, sweepTo: 120, decay: 0.25, peak: 0.2 });
        break;
      case 'kill':
        this._tone(out, t, { type: 'triangle', freq: 420, to: 180, decay: 0.12, peak: 0.07 });
        break;
      case 'bossDown':
        this._noise(out, t, { type: 'lowpass', freq: 900, sweepTo: 50, decay: 1.4, peak: 0.8 });
        for (const [i, f] of [392, 523, 659, 784].entries()) this._tone(out, t + 0.2 + i * 0.1, { type: 'triangle', freq: f, decay: 0.5, peak: 0.18 });
        break;
      case 'build':
        this._noise(out, t, { type: 'bandpass', freq: 500, q: 2, decay: 0.12, peak: 0.3 });
        this._tone(out, t + 0.06, { type: 'triangle', freq: 330, decay: 0.12, peak: 0.12 });
        break;
      case 'upgrade':
        for (const [i, f] of [523, 659, 784].entries()) this._tone(out, t + i * 0.06, { type: 'triangle', freq: f, decay: 0.2, peak: 0.12 });
        break;
      case 'sell':
        for (const [i, f] of [1319, 1568].entries()) this._tone(out, t + i * 0.07, { freq: f, decay: 0.15, peak: 0.1 });
        break;
      case 'leak':
        this._tone(out, t, { type: 'square', freq: 220, to: 160, decay: 0.3, peak: 0.12 });
        this._tone(out, t + 0.15, { type: 'square', freq: 196, to: 140, decay: 0.3, peak: 0.12 });
        break;
      case 'horn':
        this._tone(out, t, { type: 'sawtooth', freq: 196, attack: 0.08, decay: 0.7, peak: 0.12 });
        this._tone(out, t, { type: 'sawtooth', freq: 293.7, attack: 0.08, decay: 0.7, peak: 0.08 });
        break;
      case 'heal':
        for (const [i, f] of [659, 784, 988, 1319].entries()) this._tone(out, t + i * 0.08, { freq: f, decay: 0.3, peak: 0.1 });
        break;
      case 'victory':
        for (const [i, f] of [392, 523, 659, 784, 1047].entries()) this._tone(out, t + i * 0.12, { type: 'triangle', freq: f, decay: 0.5, peak: 0.22 });
        break;
      case 'defeat':
        for (const [i, f] of [392, 349, 311, 262].entries()) this._tone(out, t + i * 0.18, { type: 'triangle', freq: f, decay: 0.5, peak: 0.2 });
        break;
      case 'error':
        this._tone(out, t, { type: 'square', freq: 180, decay: 0.12, peak: 0.06 });
        break;
      case 'click':
        this._tone(out, t, { type: 'square', freq: 660, decay: 0.03, peak: 0.04 });
        break;
      case 'power-freeze':
        this._noise(out, t, { type: 'highpass', freq: 3000, sweepTo: 6000, attack: 0.05, decay: 0.8, peak: 0.2 });
        break;
      case 'power-meteor':
      case 'power-quake':
        this._noise(out, t, { type: 'lowpass', freq: 400, sweepTo: 50, attack: 0.05, decay: 1.4, peak: 0.7 });
        break;
      case 'power-wrath':
        this._noise(out, t, { type: 'highpass', freq: 1800, decay: 0.4, peak: 0.4 });
        this._tone(out, t, { type: 'sawtooth', freq: 80, to: 40, decay: 0.8, peak: 0.2 });
        break;
      default:
        if (id.startsWith('power-')) {
          for (const [i, f] of [523, 659, 784, 1047].entries()) this._tone(out, t + i * 0.05, { freq: f, decay: 0.3, peak: 0.12 });
        }
    }
  }
}
