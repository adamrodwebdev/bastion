/**
 * @file Holds the unlocked powers, updates their timers and combines their effects.
 */

import { ALL_POWERS } from './powers.js';

/** Owns the unlocked powers, updates their timers and aggregates modifiers. */
export class PowerManager {
  /** @param {string[]} unlockedIds */
  constructor(unlockedIds = []) {
    this.powers = ALL_POWERS.filter((P) => unlockedIds.includes(P.id)).map((P) => new P());
    this._cache = null;
  }

  /**
   * Powers unlocked once `completedLevels` levels have been beaten.
   * @param {number} completedLevels
   * @returns {string[]} power ids
   */
  static unlockedFor(completedLevels) {
    return ALL_POWERS.filter((P) => completedLevels >= P.unlockAfterLevel).map((P) => P.id);
  }

  static catalogue() {
    return ALL_POWERS.map((P) => ({
      id: P.id,
      icon: P.icon,
      duration: P.duration,
      cooldown: P.cooldown,
      unlockAfterLevel: P.unlockAfterLevel,
    }));
  }

  get(id) {
    return this.powers.find((p) => p.id === id) || null;
  }

  /**
   * @param {string} id
   * @param {import('../Game.js').Game} game
   * @returns {boolean} false if locked or not ready
   */
  activate(id, game) {
    const p = this.get(id);
    const ok = !!p && p.activate(game);
    this._cache = null;
    return ok;
  }

  update(dt, game) {
    for (const p of this.powers) p.update(dt, game);
    this._cache = null;
  }

  /**
   * Product of the given modifier across active powers (1 when none).
   * Known names: 'enemySpeed', 'towerFireRate', 'reward'.
   * Cached until the next update/activation because it is read hundreds of times per frame.
   * @param {string} name
   * @returns {number}
   */
  modifier(name) {
    if (!this._cache) {
      this._cache = {};
      for (const p of this.powers) {
        for (const [k, v] of Object.entries(p.modifiers)) this._cache[k] = (this._cache[k] ?? 1) * v;
      }
    }
    return this._cache[name] ?? 1;
  }

  serialize() {
    return this.powers.map((p) => p.serialize());
  }

  restore(list = []) {
    for (const data of list) {
      const p = this.get(data.id);
      if (p) p.restore(data);
    }
    this._cache = null;
  }
}
