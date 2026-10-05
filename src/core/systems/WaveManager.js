/**
 * @file Turns wave definitions into a spawn schedule and tells the game when to spawn.
 */

/**
 * Keeps a single clock and a queue of spawn orders. Waves may overlap: when
 * the player calls the next wave early, its orders join the queue while the
 * previous ones are still coming.
 *
 * In endless mode (duel), waves past the end of the list are produced by
 * `extraWave(index)`.
 */
export class WaveManager {
  /**
   * @param {import('../config/Level.js').Level} level
   * @param {{endless?:boolean, extraWave?:(index:number)=>Array<object>}} [opts]
   */
  constructor(level, { endless = false, extraWave = null } = {}) {
    this.level = level;
    this.endless = endless;
    this.extraWave = extraWave;
    this.waveIndex = -1; // index of the last wave started
    this.queue = []; // [{ time, type, path, air, wave }]
    this.clock = 0;
  }

  get total() {
    return this.endless ? Infinity : this.level.waveCount;
  }

  /** Number of waves already started (1-based for display). */
  get current() {
    return this.waveIndex + 1;
  }

  get hasMoreWaves() {
    return this.endless || this.waveIndex < this.level.waveCount - 1;
  }

  /** Are spawn orders still pending? */
  get spawning() {
    return this.queue.length > 0;
  }

  /** Is the latest wave still spawning? */
  get currentWaveSpawning() {
    return this.queue.some((q) => q.wave === this.waveIndex);
  }

  /** Groups of a wave (from the level, or generated in endless mode). */
  wave(index) {
    if (index < this.level.waveCount) return this.level.waves[index];
    return this.extraWave ? this.extraWave(index) : [];
  }

  /** Composition of the upcoming wave, for the "next wave" preview. */
  preview() {
    if (!this.hasMoreWaves) return [];
    const next = this.wave(this.waveIndex + 1);
    const totals = {};
    for (const g of next) totals[g.type] = (totals[g.type] || 0) + g.count;
    return Object.entries(totals).map(([type, count]) => ({ type, count }));
  }

  /** Queues the next wave. @returns {boolean} */
  startNext() {
    if (!this.hasMoreWaves) return false;
    this.waveIndex += 1;
    const w = this.waveIndex;
    for (const g of this.wave(w)) {
      for (let i = 0; i < g.count; i++) {
        this.queue.push({ time: this.clock + g.delay + i * g.interval, type: g.type, path: g.path, air: g.air, wave: w });
      }
    }
    this.queue.sort((a, b) => a.time - b.time);
    return true;
  }

  /**
   * Advances the clock.
   * @returns {Array<{type:string, path:number, air:boolean, wave:number}>} orders due now
   */
  update(dt) {
    this.clock += dt;
    const due = [];
    while (this.queue.length && this.queue[0].time <= this.clock) due.push(this.queue.shift());
    return due;
  }

  serialize() {
    return { waveIndex: this.waveIndex, queue: this.queue, clock: this.clock };
  }

  restore(data) {
    this.waveIndex = data.waveIndex;
    this.queue = data.queue || [];
    this.clock = data.clock || 0;
  }
}
