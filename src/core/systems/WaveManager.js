/**
 * @file Turns wave definitions into a spawn schedule and spawns enemies on time.
 */

import { EnemyFactory } from '../entities/enemies/EnemyFactory.js';

/**
 * Turns the level's wave definitions into a timed spawn schedule
 * and spawns enemies when their time comes.
 */
export class WaveManager {
  /**
   * @param {import('../config/Level.js').Level} level
   * @param {import('../config/Difficulty.js').Difficulty} difficulty
   */
  constructor(level, difficulty) {
    this.level = level;
    this.difficulty = difficulty;
    this.waveIndex = -1; // index of the wave currently running / last run
    this.queue = []; // [{ time, type }]
    this.elapsed = 0;
    this.spawning = false;
  }

  get total() {
    return this.level.waveCount;
  }

  /** Number of waves already started (1-based for display). */
  get current() {
    return this.waveIndex + 1;
  }

  get hasMoreWaves() {
    return this.waveIndex < this.total - 1;
  }

  /** Composition of the upcoming wave, for the "next wave" preview. */
  preview() {
    const next = this.level.waves[this.waveIndex + 1];
    if (!next) return [];
    const totals = {};
    for (const g of next) totals[g.type] = (totals[g.type] || 0) + g.count;
    return Object.entries(totals).map(([type, count]) => ({ type, count }));
  }

  startNext() {
    if (!this.hasMoreWaves) return false;
    this.waveIndex += 1;
    this.queue = WaveManager.buildSchedule(this.level.waves[this.waveIndex]);
    this.elapsed = 0;
    this.spawning = true;
    return true;
  }

  static buildSchedule(groups) {
    const q = [];
    for (const g of groups) {
      for (let i = 0; i < g.count; i++) q.push({ time: g.delay + i * g.interval, type: g.type });
    }
    return q.sort((a, b) => a.time - b.time);
  }

  scaling() {
    const d = this.difficulty;
    return {
      hpMult: this.level.waveHpScale(Math.max(0, this.waveIndex)) * d.hpMult,
      speedMult: d.speedMult,
      rewardMult: d.rewardMult,
    };
  }

  /** @returns {import('../entities/enemies/Enemy.js').Enemy[]} newly spawned enemies */
  update(dt, path) {
    if (!this.spawning) return [];
    this.elapsed += dt;
    const spawned = [];
    const scaling = this.scaling();
    while (this.queue.length && this.queue[0].time <= this.elapsed) {
      const { type } = this.queue.shift();
      spawned.push(EnemyFactory.create(type, path, scaling));
    }
    if (!this.queue.length) this.spawning = false;
    return spawned;
  }

  serialize() {
    return { waveIndex: this.waveIndex, queue: this.queue, elapsed: this.elapsed, spawning: this.spawning };
  }

  restore(data) {
    this.waveIndex = data.waveIndex;
    this.queue = data.queue || [];
    this.elapsed = data.elapsed || 0;
    this.spawning = !!data.spawning;
  }
}
