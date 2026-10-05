/**
 * @file Holds the powers taken into a level, updates their timers and combines their effects.
 */

import { ALL_POWERS } from './powers.js';
import { POWER_UNLOCK } from '../config/unlocks.js';

/** Default number of powers a player can take into a level. */
export const DEFAULT_SLOTS = 4;

export class PowerManager {
  /** @param {string[]} loadout ids of the powers taken into the level */
  constructor(loadout = []) {
    this.powers = ALL_POWERS.filter((P) => loadout.includes(P.id)).map((P) => new P());
    // Keep the player's chosen order.
    this.powers.sort((a, b) => loadout.indexOf(a.id) - loadout.indexOf(b.id));
    this._cache = null;
  }

  /**
   * Powers unlocked once `completedLevels` levels have been beaten.
   * @param {number} completedLevels
   * @returns {string[]} power ids, in unlock order
   */
  static unlockedFor(completedLevels) {
    return ALL_POWERS.filter((P) => completedLevels >= POWER_UNLOCK[P.id]).map((P) => P.id);
  }

  /**
   * Default loadout: the most recently unlocked powers that fit in the slots.
   * @param {number} completedLevels
   * @param {number} [slots]
   */
  static defaultLoadout(completedLevels, slots = DEFAULT_SLOTS) {
    return PowerManager.unlockedFor(completedLevels).slice(0, slots);
  }

  static catalogue() {
    return ALL_POWERS.map((P) => ({
      id: P.id,
      icon: P.icon,
      duration: P.duration,
      cooldown: P.cooldown,
      targeted: P.targeted,
      radius: P.radius,
      unlockAfterLevel: POWER_UNLOCK[P.id],
    }));
  }

  get(id) {
    return this.powers.find((p) => p.id === id) || null;
  }

  /**
   * @param {string} id
   * @param {import('../Game.js').Game} game
   * @param {{x:number,y:number}|null} [target]
   * @returns {boolean} false if not taken, not ready, or missing a target
   */
  activate(id, game, target = null) {
    const p = this.get(id);
    const ok = !!p && p.activate(game, target);
    this._cache = null;
    return ok;
  }

  update(dt, game) {
    for (const p of this.powers) p.update(dt, game);
    this._cache = null;
  }

  /** Total number of power activations (statistics). */
  get totalUses() {
    return this.powers.reduce((s, p) => s + p.uses, 0);
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
