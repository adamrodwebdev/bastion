/**
 * @file Adaptive soundtrack composed in real time (shared with Catapulte Mania).
 */

import { clamp } from '../../core/utils/math.js'
import { SeededRandom } from '../../core/utils/SeededRandom.js'

/**
 * Adaptive soundtrack, composed in real time (Web Audio API).
 *
 * No track to download: the music is played note by note by small synthetic
 * instruments of medieval inspiration (hurdy-gurdy drone, lute, recorder,
 * tabor, shawm). It follows the action through four intensity levels:
 *   0 · calm     : drone, sparse lute, soft recorder (menus, preparation);
 *   1 · aiming   : the tabor marks the beats;
 *   2 · action   : bass, lute in eighth notes, tighter drum (projectile in flight,
 *                  last level of a chapter);
 *   3 · climax   : shawm countermelody and drum rolls (collapse,
 *                  explosion, last target).
 * Layers fade in and out gradually: never an abrupt cut.
 *
 * Pieces are modal chord progressions (Dorian, Aeolian); melodies are drawn
 * from a fixed-seed generator: each piece always sounds the same, but without
 * an audible loop of a few seconds.
 *
 * The main theme (menus) uses a second, futuristic orchestra ("synth" style):
 * pulsing pad that ducks under the kick, sixteenth-note arpeggiator with echo,
 * gliding lead, sub bass and electronic drums. It plays at intensity 0, so it
 * builds its own 16-bar structure: intro, full groove, breakdown with a riser.
 */

/** Pieces: tempo, mode, chord progression (root in semitones, m = minor). */
export const PIECES = Object.freeze({
  menu: {
    bpm: 100,
    style: 'synth',
    scale: [0, 2, 3, 5, 7, 8, 10],
    chords: [[0, 'm'], [8, 'M'], [3, 'M'], [10, 'M'], [0, 'm'], [8, 'M'], [5, 'm'], [7, 'M']],
    seed: 11,
  },
  march: { bpm: 96, scale: [0, 2, 3, 5, 7, 9, 10], chords: [[0, 'm'], [-2, 'M'], [3, 'M'], [-2, 'M'], [0, 'm'], [5, 'M'], [-2, 'M'], [0, 'm']], seed: 23 },
  siege: { bpm: 104, scale: [0, 2, 3, 5, 7, 8, 10], chords: [[0, 'm'], [8, 'M'], [10, 'M'], [0, 'm'], [5, 'm'], [8, 'M'], [7, 'M'], [7, 'M']], seed: 37 },
  finale: { bpm: 112, scale: [0, 2, 3, 5, 7, 8, 11], chords: [[0, 'm'], [8, 'M'], [5, 'm'], [7, 'M'], [0, 'm'], [3, 'M'], [10, 'M'], [7, 'M']], seed: 41 },
})

/** Key (semitones above D) and piece for each chapter. */
const CHAPTER_MUSIC = Object.freeze({
  1: ['march', 0], 2: ['march', 2], 3: ['siege', 0], 4: ['siege', 5], 5: ['march', -2],
  6: ['siege', 2], 7: ['march', 5], 8: ['siege', -3], 9: ['siege', 3], 10: ['finale', 0],
})

const D3 = 146.83
const hz = (semi) => D3 * 2 ** (semi / 12)
const LOOKAHEAD = 0.25
const TICK_MS = 60

export class MusicDirector {
  /** @type {AudioContext | null} */
  #ctx = null
  #bus = null
  #mix = null
  #enabled = true
  #piece = null
  #pieceId = null
  #key = 0
  #step = 0
  #nextTime = 0
  #timer = null
  #rng = new SeededRandom(1)
  #melody = []
  #base = 0
  #pulse = 0
  #pulseUntil = 0
  #drone = null
  /** Synth style only: pad bus (ducked by the kick) and echo send. */
  #padBus = null
  #echo = null
  #lastLead = 0
  /** @type {(level: number) => void} */
  onClimax = () => {}

  /** @param {import('./AudioService.js').AudioService} audio */
  constructor(audio) {
    this.audio = audio
    audio.whenReady((ctx, bus) => {
      this.#ctx = ctx
      this.#bus = bus
      this.#mix = ctx.createGain()
      this.#mix.gain.value = 1
      this.#mix.connect(bus)
      if (this.#pieceId) this.#start()
    })
  }

  /** Effective intensity (0 to 3). */
  get intensity() {
    const now = this.#ctx?.currentTime ?? 0
    return now < this.#pulseUntil ? Math.max(this.#base, this.#pulse) : this.#base
  }

  get playing() {
    return Boolean(this.#timer)
  }

  /** Enables or mutes the music ("Music" setting at 0). */
  setEnabled(on) {
    this.#enabled = Boolean(on)
    if (!this.#enabled) this.#halt()
    else if (this.#pieceId && this.#ctx) this.#start()
  }

  /**
   * Plays a piece (crossfades if another one was already playing).
   * @param {'menu' | 'chapter'} scene
   * @param {{ chapter?: number }} [opts]
   */
  play(scene, { chapter = 1 } = {}) {
    const [id, key] = scene === 'menu' ? ['menu', 0] : CHAPTER_MUSIC[clamp(chapter, 1, 10)] || CHAPTER_MUSIC[1]
    if (this.#pieceId === id && this.#key === key && this.playing) return
    this.#pieceId = id
    this.#key = key
    this.#piece = PIECES[id]
    this.#rng = new SeededRandom(this.#piece.seed + key * 7)
    this.#melody = []
    this.#step = 0
    if (this.#ctx && this.#enabled) this.#start()
  }

  /** Base intensity (0 to 3). */
  setIntensity(level) {
    this.#base = clamp(Math.round(level), 0, 3)
  }

  /** Temporary surge (collapse, explosion). */
  surge(level = 3, seconds = 4) {
    if (!this.#ctx) return
    const was = this.intensity
    this.#pulse = clamp(level, 0, 3)
    this.#pulseUntil = Math.max(this.#pulseUntil, this.#ctx.currentTime + seconds)
    if (this.#pulse >= 3 && was < 3) this.onClimax(3)
  }

  /** Lowers the volume (pause, end screen) without stopping. */
  duck(on) {
    if (!this.#mix) return
    this.#mix.gain.setTargetAtTime(on ? 0.3 : 1, this.#ctx.currentTime, 0.25)
  }

  /** Fades out then stops (victory, defeat). */
  stop(fade = 1.2) {
    if (!this.#ctx || !this.#mix) return this.#halt()
    const t = this.#ctx.currentTime
    this.#mix.gain.setTargetAtTime(0.0001, t, fade / 4)
    const old = this.#mix
    this.#halt(false)
    setTimeout(() => old.disconnect(), fade * 1000 + 200)
    this.#mix = this.#ctx.createGain()
    this.#mix.gain.value = 1
    this.#mix.connect(this.#bus)
    this.#pieceId = null
  }

  /** Schedules the next notes (called by the timer; public for tests). */
  tick() {
    if (this.#timer) this.#schedule()
  }

  /* ---------- Internal ---------- */

  #start() {
    this.#halt(false)
    if (!this.#enabled || !this.#ctx || !this.#piece) return
    this.#nextTime = this.#ctx.currentTime + 0.1
    if (this.#piece.style === 'synth') this.#makeSynthRack()
    else this.#drone = this.#makeDrone()
    this.#timer = setInterval(() => this.#schedule(), TICK_MS)
    this.#schedule()
  }

  #halt(clearPiece = false) {
    clearInterval(this.#timer)
    this.#timer = null
    if (this.#drone) {
      const d = this.#drone
      const t = this.#ctx.currentTime
      d.gain.gain.setTargetAtTime(0.0001, t, 0.3)
      setTimeout(() => d.oscs.forEach((o) => o.stop()), 1500)
      this.#drone = null
    }
    if (this.#padBus) {
      const nodes = [this.#padBus, this.#echo.input]
      const t = this.#ctx.currentTime
      this.#padBus.gain.setTargetAtTime(0.0001, t, 0.3)
      this.#echo.input.gain.setTargetAtTime(0.0001, t, 0.3)
      setTimeout(() => nodes.forEach((n) => n.disconnect()), 2500)
      this.#padBus = null
      this.#echo = null
    }
    if (clearPiece) this.#pieceId = null
  }

  #schedule() {
    const ctx = this.#ctx
    if (!ctx) return
    // Large delay (tab in background): restart without catching up.
    if (this.#nextTime < ctx.currentTime - 0.5) this.#nextTime = ctx.currentTime + 0.05
    const eighth = 30 / this.#piece.bpm
    while (this.#nextTime < ctx.currentTime + LOOKAHEAD) {
      this.#playStep(this.#step, this.#nextTime, eighth)
      this.#nextTime += eighth
      this.#step++
    }
  }

  /** One eighth note: decides what each instrument plays. */
  #playStep(step, t, eighth) {
    if (this.#piece.style === 'synth') return this.#synthStep(step, t, eighth)
    const p = this.#piece
    const lvl = this.intensity
    const inBar = step % 8
    const bar = Math.floor(step / 8)
    const [root, quality] = p.chords[bar % p.chords.length]
    const chord = [0, quality === 'm' ? 3 : 4, 7].map((x) => x + root + this.#key)
    const phraseEnd = bar % 4 === 3

    // Drone: gently follows the intensity.
    if (this.#drone) this.#drone.gain.gain.setTargetAtTime([0.05, 0.06, 0.07, 0.08][lvl], t, 0.8)

    // Lute: arpeggio (quarter notes when calm, eighth notes above).
    if (lvl >= 2 || inBar % 2 === 0) {
      const pattern = [0, 1, 2, 1, 0, 2, 1, 2]
      const note = chord[pattern[inBar]] + 12 * (inBar >= 4 && lvl >= 1 ? 1 : 0)
      this.#pluck(t, hz(note), lvl >= 2 ? 0.11 : 0.09)
    }

    // Bass (action): root note on the beats.
    if (lvl >= 2 && inBar % 2 === 0) this.#bass(t, hz(chord[0] - 12), eighth * 1.6)

    // Tabor.
    if (lvl >= 1) {
      const hits = lvl === 1 ? [0, 4] : lvl === 2 ? [0, 3, 4, 6] : [0, 2, 3, 4, 6, 7]
      if (hits.includes(inBar)) this.#drum(t, (inBar === 0 ? 1 : 0.6) * (lvl === 3 ? 1.3 : 1))
      if (lvl >= 2 && inBar % 2 === 1) this.#shaker(t, 0.05)
      if (lvl === 3 && phraseEnd && inBar >= 6) {
        this.#drum(t + eighth / 2, 0.5)
        this.#drum(t + (eighth * 3) / 4, 0.55)
      }
      if (lvl === 3 && bar % 4 === 0 && inBar === 0) this.#cymbal(t)
    }

    // Melody: one phrase per bar, composed on the fly (fixed seed).
    if (inBar === 0) this.#melody = this.#compose(chord, lvl)
    const notes = this.#melody.filter((n) => n.at === inBar)
    const playMelody = lvl >= 1 || bar % 2 === 0
    for (const n of notes) {
      if (playMelody) this.#flute(t, hz(n.semi + 12), eighth * n.len * 0.95, lvl >= 2 ? 0.075 : 0.06)
      // Climax: the shawm doubles a sixth higher.
      if (lvl === 3) this.#shawm(t, hz(n.semi + 21), eighth * n.len * 0.9)
    }
  }

  /** One-bar phrase: scale notes around the chord tones. */
  #compose(chord, lvl) {
    const r = this.#rng
    const rhythms = lvl >= 2
      ? [[2, 1, 1, 2, 2], [1, 1, 1, 1, 2, 2], [2, 2, 1, 1, 2], [3, 1, 2, 2]]
      : [[4, 4], [2, 2, 4], [3, 1, 4], [2, 2, 2, 2], [6, 2]]
    const rhythm = rhythms[r.int(0, rhythms.length - 1)]
    const scale = this.#piece.scale.map((s) => s + this.#key)
    const pool = []
    for (let o = 0; o < 2; o++) for (const s of scale) pool.push(s + 12 * o)
    let idx = pool.findIndex((s) => (s - chord[r.int(0, 2)]) % 12 === 0)
    if (idx < 0) idx = 4
    const out = []
    let at = 0
    rhythm.forEach((len, i) => {
      // Mostly stepwise motion, an occasional small leap; the phrase ends on a chord tone.
      if (i > 0) idx = clamp(idx + [-2, -1, -1, 1, 1, 2, 0][r.int(0, 6)], 0, pool.length - 1)
      if (i === rhythm.length - 1) {
        const target = pool.findIndex((s, k) => k >= idx - 2 && chord.some((c) => (s - c) % 12 === 0))
        if (target >= 0) idx = target
      }
      out.push({ at, len, semi: pool[idx] })
      at += len
    })
    return out
  }

  /**
   * One eighth note of the futuristic theme.
   * 16-bar cycle: 0-3 intro (pad, arpeggio), 4-11 full groove,
   * 12-15 breakdown (no kick) ending with a noise riser.
   * Intensity still adds layers if the theme is ever used in play.
   */
  #synthStep(step, t, eighth) {
    const p = this.#piece
    const lvl = this.intensity
    const inBar = step % 8
    const bar = Math.floor(step / 8)
    const part = bar % 16
    const intro = part < 4
    const breakdown = part >= 12
    const groove = !intro && !breakdown
    const [root, quality] = p.chords[bar % p.chords.length]
    const chord = [0, quality === 'm' ? 3 : 4, 7].map((x) => x + root + this.#key)
    const sixteenth = eighth / 2

    // Pad: one long chord per bar.
    if (inBar === 0) this.#pad(t, chord, eighth * 8, breakdown ? 1.25 : 1)

    // Arpeggiator: two sixteenths per step, up and down two octaves.
    const tones = [chord[0], chord[1], chord[2], chord[0] + 12]
    const pattern = [0, 2, 1, 3, 0, 2, 1, 3, 1, 3, 2, 3, 0, 2, 1, 2]
    const arpOn = !breakdown || inBar >= 4
    for (let k = 0; k < 2 && arpOn; k++) {
      const i = inBar * 2 + k
      const accent = i % 4 === 0
      this.#arp(t + k * sixteenth, hz(tones[pattern[i]] + 12), accent ? 0.05 : 0.034, part >= 4 ? 1 : 0.6)
    }

    // Kick, with the pad pumping under it.
    const kicks = lvl >= 2 ? [0, 2, 4, 6] : [0, 4]
    if ((groove || lvl >= 1) && kicks.includes(inBar)) {
      this.#kick(t, 0.9)
      this.#pump(t, eighth)
    }

    // Sub bass: long notes, then pulsing eighths from the groove on.
    if (groove || lvl >= 1) {
      const oct = inBar % 2 === 1 && (lvl >= 2 || part >= 8) ? 12 : 0
      this.#subBass(t, hz(chord[0] - 24 + oct), eighth * 0.9, inBar % 2 === 0 ? 0.13 : 0.09)
    } else if (inBar === 0) {
      this.#subBass(t, hz(chord[0] - 24), eighth * 7.5, 0.08)
    }

    // Hats on the off-beats, clap on 2 and 4 (second half of the groove).
    if (groove || lvl >= 1) {
      if (inBar % 2 === 1) this.#hat(t, 0.05, 0.035)
      if (lvl >= 2) this.#hat(t + sixteenth, 0.025, 0.02)
      if ((part >= 8 || lvl >= 2) && (inBar === 2 || inBar === 6)) this.#clap(t)
    }
    if (lvl === 3 && bar % 4 === 0 && inBar === 0) this.#cymbal(t)

    // Riser at the end of the breakdown.
    if (part === 15 && inBar === 0) this.#riser(t, eighth * 8)

    // Lead: one phrase per bar, every bar in the groove, one bar in two otherwise.
    if (inBar === 0) this.#melody = this.#compose(chord, groove ? 2 : 0)
    const playLead = groove || bar % 2 === 1
    if (!playLead || intro && part < 2) return
    for (const n of this.#melody.filter((m) => m.at === inBar)) {
      this.#lead(t, hz(n.semi + 12), eighth * n.len * 0.92, groove ? 0.05 : 0.04)
    }
  }

  /* ---------- Synth instruments ---------- */

  #makeSynthRack() {
    const ctx = this.#ctx
    this.#padBus = ctx.createGain()
    this.#padBus.gain.value = 1
    this.#padBus.connect(this.#mix)
    // Echo: dotted-eighth delay, darkened at each repeat.
    const input = ctx.createGain()
    input.gain.value = 0.3
    const delay = ctx.createDelay(2)
    delay.delayTime.value = (30 / this.#piece.bpm) * 1.5
    const feedback = ctx.createGain()
    feedback.gain.value = 0.38
    const tone = ctx.createBiquadFilter()
    tone.type = 'lowpass'
    tone.frequency.value = 2600
    input.connect(delay).connect(tone).connect(feedback).connect(delay)
    tone.connect(this.#mix)
    this.#echo = { input }
    this.#lastLead = 0
  }

  /** Synth voice gain routed to the mix and, optionally, to the echo. */
  #voice(t, attack, hold, release, peak, send = 0) {
    const g = this.#env(t, attack, hold, release, peak)
    if (send && this.#echo) {
      const s = this.#ctx.createGain()
      s.gain.value = send
      g.connect(s).connect(this.#echo.input)
    }
    return g
  }

  #pad(t, chord, dur, bright) {
    const ctx = this.#ctx
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.022, t + 0.5)
    g.gain.setValueAtTime(0.022, t + dur - 0.1)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.7)
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.Q.value = 2
    lp.frequency.setValueAtTime(500 * bright, t)
    lp.frequency.linearRampToValueAtTime(1300 * bright, t + dur * 0.6)
    lp.frequency.linearRampToValueAtTime(700 * bright, t + dur + 0.6)
    lp.connect(g).connect(this.#padBus || this.#mix)
    for (const semi of [chord[0], chord[1], chord[2], chord[0] + 12]) {
      for (const detune of [-9, 0, 9]) {
        const o = this.#osc('sawtooth', hz(semi), t, dur + 0.75, lp)
        o.detune.value = detune
      }
    }
  }

  /** Pumping: the pad dips under each kick ("sidechain"). */
  #pump(t, eighth) {
    if (!this.#padBus) return
    const g = this.#padBus.gain
    g.cancelScheduledValues(t)
    g.setValueAtTime(1, t)
    g.linearRampToValueAtTime(0.3, t + 0.01)
    g.setTargetAtTime(1, t + 0.03, eighth * 0.35)
  }

  #arp(t, freq, peak, open) {
    const g = this.#voice(t, 0.003, 0.02, 0.14, peak, 0.6)
    const lp = this.#ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.Q.value = 6
    lp.frequency.setValueAtTime(freq * 2 + 2400 * open, t)
    lp.frequency.exponentialRampToValueAtTime(freq * 1.2, t + 0.14)
    lp.connect(g)
    this.#osc('square', freq, t, 0.2, lp)
  }

  #lead(t, freq, dur, peak) {
    const ctx = this.#ctx
    const g = this.#voice(t, 0.02, Math.max(0, dur - 0.1), 0.25, peak, 0.5)
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 2400
    lp.Q.value = 1.5
    lp.connect(g)
    // Glide from the previous note, then a delayed vibrato.
    const from = this.#lastLead || freq
    this.#lastLead = freq
    const lfo = ctx.createOscillator()
    const depth = ctx.createGain()
    lfo.frequency.value = 5.5
    depth.gain.setValueAtTime(0, t)
    depth.gain.linearRampToValueAtTime(8, t + Math.min(dur, 0.5))
    lfo.connect(depth)
    lfo.start(t)
    lfo.stop(t + dur + 0.3)
    for (const detune of [-7, 7]) {
      const o = this.#osc('sawtooth', from, t, dur + 0.3, lp)
      o.frequency.exponentialRampToValueAtTime(freq, t + 0.06)
      o.detune.value = detune
      depth.connect(o.detune)
    }
  }

  #subBass(t, freq, dur, peak) {
    const g = this.#env(t, 0.008, dur * 0.5, dur * 0.5, peak)
    const lp = this.#ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.setValueAtTime(900, t)
    lp.frequency.exponentialRampToValueAtTime(180, t + Math.min(dur, 0.25))
    lp.connect(g)
    this.#osc('sine', freq, t, dur, g)
    this.#osc('sawtooth', freq, t, dur, lp)
  }

  #kick(t, k) {
    const g = this.#env(t, 0.002, 0.02, 0.3, 0.3 * k)
    const o = this.#osc('sine', 130, t, 0.35, g)
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12)
    this.#noise(t, 0.012, 3000, 'highpass', 0.05 * k)
  }

  #hat(t, dur, peak) {
    this.#noise(t, dur, 8500, 'highpass', peak)
  }

  #clap(t) {
    for (const [dt, k] of [[0, 0.6], [0.012, 0.7], [0.026, 1]]) this.#noise(t + dt, dt === 0.026 ? 0.16 : 0.01, 1600, 'bandpass', 0.09 * k)
  }

  /** Filtered noise sweeping up over one bar, into the next section. */
  #riser(t, dur) {
    const ctx = this.#ctx
    const len = Math.ceil(ctx.sampleRate * (dur + 0.1))
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
    const src = ctx.createBufferSource()
    src.buffer = buf
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.Q.value = 3
    bp.frequency.setValueAtTime(400, t)
    bp.frequency.exponentialRampToValueAtTime(7000, t + dur)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.05, t + dur * 0.95)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.05)
    src.connect(bp).connect(g).connect(this.#mix)
    src.start(t)
    src.stop(t + dur + 0.1)
  }

  /* ---------- Instruments ---------- */

  #env(t, attack, hold, release, peak) {
    const g = this.#ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack)
    g.gain.setValueAtTime(Math.max(0.0002, peak), t + attack + hold)
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release)
    g.connect(this.#mix)
    return g
  }

  #osc(type, freq, t, dur, dest) {
    const o = this.#ctx.createOscillator()
    o.type = type
    o.frequency.setValueAtTime(freq, t)
    o.connect(dest)
    o.start(t)
    o.stop(t + dur + 0.05)
    return o
  }

  #makeDrone() {
    const ctx = this.#ctx
    const gain = ctx.createGain()
    gain.gain.value = 0.0001
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 420
    lp.Q.value = 0.7
    lp.connect(gain).connect(this.#mix)
    const root = hz(this.#key - 12)
    const oscs = [root, root * 1.5, root * 1.003].map((f) => {
      const o = ctx.createOscillator()
      o.type = 'sawtooth'
      o.frequency.value = f
      o.connect(lp)
      o.start()
      return o
    })
    // Slight breathing of the filter, like a hurdy-gurdy wheel.
    const lfo = ctx.createOscillator()
    const depth = ctx.createGain()
    lfo.frequency.value = 0.18
    depth.gain.value = 120
    lfo.connect(depth).connect(lp.frequency)
    lfo.start()
    oscs.push(lfo)
    gain.gain.setTargetAtTime(0.05, ctx.currentTime, 1.5)
    return { gain, oscs }
  }

  #pluck(t, freq, peak) {
    const g = this.#env(t, 0.004, 0, 0.55, peak)
    const lp = this.#ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.setValueAtTime(freq * 6, t)
    lp.frequency.exponentialRampToValueAtTime(freq * 1.5, t + 0.4)
    lp.connect(g)
    this.#osc('triangle', freq, t, 0.6, lp)
    this.#osc('sawtooth', freq * 1.002, t, 0.6, lp)
  }

  #flute(t, freq, dur, peak) {
    const g = this.#env(t, 0.05, Math.max(0, dur - 0.12), 0.12, peak)
    const o = this.#osc('sine', freq, t, dur + 0.15, g)
    // Vibrato that builds up on sustained notes.
    const lfo = this.#ctx.createOscillator()
    const depth = this.#ctx.createGain()
    lfo.frequency.value = 5.2
    depth.gain.setValueAtTime(0, t)
    depth.gain.linearRampToValueAtTime(freq * 0.006, t + Math.min(dur, 0.4))
    lfo.connect(depth).connect(o.frequency)
    lfo.start(t)
    lfo.stop(t + dur + 0.15)
    this.#osc('sine', freq * 2, t, dur + 0.15, this.#env(t, 0.05, Math.max(0, dur - 0.12), 0.12, peak * 0.12))
  }

  #shawm(t, freq, dur) {
    const g = this.#env(t, 0.03, Math.max(0, dur - 0.08), 0.08, 0.06)
    const bp = this.#ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 1400
    bp.Q.value = 1.4
    bp.connect(g)
    this.#osc('sawtooth', freq, t, dur + 0.1, bp)
  }

  #bass(t, freq, dur) {
    const g = this.#env(t, 0.01, dur * 0.4, dur * 0.6, 0.12)
    const lp = this.#ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 300
    lp.connect(g)
    this.#osc('square', freq, t, dur, lp)
  }

  #drum(t, k) {
    const g = this.#env(t, 0.002, 0, 0.28, 0.22 * k)
    const o = this.#osc('sine', 150, t, 0.3, g)
    o.frequency.exponentialRampToValueAtTime(55, t + 0.25)
    this.#noise(t, 0.06, 900, 'bandpass', 0.12 * k)
  }

  #shaker(t, peak) {
    this.#noise(t, 0.05, 6000, 'highpass', peak)
  }

  #cymbal(t) {
    this.#noise(t, 1.2, 5000, 'highpass', 0.06)
  }

  #noise(t, dur, freq, type, peak) {
    const ctx = this.#ctx
    const len = Math.ceil(ctx.sampleRate * Math.min(dur + 0.05, 1.3))
    if (!this.noiseBuffer || this.noiseBuffer.length < len) {
      this.noiseBuffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 1.3), ctx.sampleRate)
      const d = this.noiseBuffer.getChannelData(0)
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    }
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuffer
    const f = ctx.createBiquadFilter()
    f.type = type
    f.frequency.value = freq
    const g = this.#env(t, 0.002, 0, dur, peak)
    src.connect(f).connect(g)
    src.start(t)
    src.stop(t + dur + 0.05)
  }
}
