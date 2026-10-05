/**
 * @file Gontran's workshop: permanent upgrades bought with crowns.
 *
 * Each upgrade has several ranks. A rank costs crowns and may require a total
 * number of stars. Tower masteries also require the tower to be unlocked in the
 * campaign. Upgrades apply to the campaign (solo and cooperation), never to
 * the duel, so that duels stay fair.
 */

import { DEFAULT_MODS } from '../Game.js';
import { TOWER_UNLOCK } from '../config/unlocks.js';
import { DEFAULT_SLOTS } from '../powers/PowerManager.js';

/**
 * @typedef {object} Upgrade
 * @property {string} id
 * @property {string} group 'defence' | 'arsenal' | 'command' | 'mastery'
 * @property {string} icon
 * @property {number[]} prices crowns for each rank
 * @property {number[]} stars stars required for each rank
 * @property {(rank:number, mods:object)=>void} apply adds the effect of `rank` ranks
 * @property {(rank:number)=>object} [params] values for the description
 * @property {string} [tower] tower that must be unlocked (masteries)
 */

const pct = (n) => Math.round(n * 100);

/** @type {Upgrade[]} */
const BASE = [
  { id: 'ramparts', group: 'defence', icon: 'heart', prices: [300, 800, 1500], stars: [0, 40, 120], apply: (r, m) => (m.lives += 2 * r), params: (r) => ({ n: 2 * r }) },
  { id: 'warChest', group: 'defence', icon: 'coin', prices: [250, 600, 1100, 1900], stars: [0, 30, 90, 180], apply: (r, m) => (m.startGold += [0, 40, 80, 130, 200][r]), params: (r) => ({ n: [0, 40, 80, 130, 200][r] }) },
  { id: 'salvage', group: 'defence', icon: 'recycle', prices: [200, 500, 900], stars: [0, 30, 80], apply: (r, m) => (m.sellRatio = 0.7 + 0.05 * r), params: (r) => ({ n: pct(0.7 + 0.05 * r) }) },
  { id: 'engineering', group: 'defence', icon: 'tower', prices: [500, 1200, 2200], stars: [20, 80, 170], apply: (r, m) => (m.towerCost *= 1 - 0.04 * r), params: (r) => ({ n: 4 * r }) },
  { id: 'steel', group: 'arsenal', icon: 'arrow', prices: [350, 900, 1700], stars: [5, 50, 130], apply: (r, m) => (m.physical *= 1 + 0.08 * r), params: (r) => ({ n: 8 * r }) },
  { id: 'alchemy', group: 'arsenal', icon: 'flask', prices: [350, 900, 1700], stars: [10, 60, 140], apply: (r, m) => ((m.magic *= 1 + 0.08 * r), (m.fire *= 1 + 0.08 * r)), params: (r) => ({ n: 8 * r }) },
  { id: 'powder', group: 'arsenal', icon: 'bomb', prices: [300, 800, 1500], stars: [10, 50, 120], apply: (r, m) => (m.splash *= 1 + 0.07 * r), params: (r) => ({ n: 7 * r }) },
  { id: 'drill', group: 'arsenal', icon: 'shield', prices: [300, 800, 1500], stars: [5, 45, 120], apply: (r, m) => ((m.soldierHp *= 1 + 0.15 * r), (m.soldierDamage *= 1 + 0.1 * r)), params: (r) => ({ n: 15 * r, d: 10 * r }) },
  { id: 'bankers', group: 'arsenal', icon: 'coin', prices: [400, 1000], stars: [40, 120], tower: 'treasury', apply: (r, m) => (m.income *= 1 + 0.2 * r), params: (r) => ({ n: 20 * r }) },
  { id: 'strategist', group: 'command', icon: 'clock', prices: [400, 1000, 1900], stars: [15, 70, 160], apply: (r, m) => (m.powerCooldown *= 1 - 0.08 * r), params: (r) => ({ n: 8 * r }) },
  { id: 'satchel', group: 'command', icon: 'power', prices: [1500], stars: [60], apply: (r, m) => (m.powerSlots += r), params: (r) => ({ n: DEFAULT_SLOTS + r }) },
];

/** Mastery of each tower: unlocks its fourth (elite) level. */
const MASTERY = [
  ['archer', 600, 15],
  ['barracks', 700, 20],
  ['cannon', 800, 25],
  ['frost', 800, 35],
  ['ballista', 1000, 50],
  ['watch', 700, 60],
  ['treasury', 900, 70],
  ['catapult', 1200, 90],
  ['fire', 1200, 110],
  ['storm', 1400, 130],
].map(([tower, price, stars]) => ({
  id: `mastery-${tower}`,
  group: 'mastery',
  icon: 'star',
  tower,
  prices: [price],
  stars: [stars],
  apply: (r, m) => {
    if (r > 0) m.elite.push(tower);
  },
}));

export const UPGRADES = Object.freeze([...BASE, ...MASTERY]);

export class UpgradeCatalog {
  static all() {
    return UPGRADES;
  }

  static get(id) {
    return UPGRADES.find((u) => u.id === id) || null;
  }

  static maxRank(id) {
    return UpgradeCatalog.get(id)?.prices.length ?? 0;
  }

  /** Total crowns needed to buy everything. */
  static totalCost() {
    return UPGRADES.reduce((s, u) => s + u.prices.reduce((a, b) => a + b, 0), 0);
  }

  /**
   * Can rank `rank + 1` of an upgrade be bought?
   * @param {string} id
   * @param {{ranks:Record<string,number>, crowns:number, stars:number, completed:number}} profile
   * @returns {{ok:boolean, reason?:'max'|'crowns'|'stars'|'locked', price?:number, stars?:number}}
   */
  static check(id, { ranks, crowns, stars, completed }) {
    const u = UpgradeCatalog.get(id);
    if (!u) return { ok: false, reason: 'max' };
    const rank = ranks[id] || 0;
    if (rank >= u.prices.length) return { ok: false, reason: 'max' };
    const price = u.prices[rank];
    const needStars = u.stars[rank];
    if (u.tower && completed + 1 < TOWER_UNLOCK[u.tower]) return { ok: false, reason: 'locked', price, stars: needStars };
    if (stars < needStars) return { ok: false, reason: 'stars', price, stars: needStars };
    if (crowns < price) return { ok: false, reason: 'crowns', price, stars: needStars };
    return { ok: true, price, stars: needStars };
  }

  /**
   * Game modifiers from bought ranks (see Game DEFAULT_MODS).
   * @param {Record<string, number>} ranks
   */
  static modsFor(ranks = {}) {
    const m = { ...DEFAULT_MODS, elite: [], powerSlots: DEFAULT_SLOTS };
    for (const u of UPGRADES) {
      const r = Math.min(ranks[u.id] || 0, u.prices.length);
      if (r > 0) u.apply(r, m);
    }
    return m;
  }
}
