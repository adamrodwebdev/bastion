/**
 * @file Challenges: three per level (300 in the campaign), on top of the stars.
 *
 * 19 challenges in three families, and every level gets one of each:
 *  - STYLE   : a constraint on how you play (no power, few towers…);
 *  - FEAT    : a show of skill (no life lost, crowd killed at once…);
 *  - THEME   : something specific to the level's enemies (flyers, sappers,
 *              the boss…) or to a kind of tower.
 * The pick rotates from one level to the next, and thresholds grow with the
 * campaign. Challenges are checked at the end of a WON level, from statistics
 * the engine counted itself (Game#stats): nothing is declared by the UI.
 */

import { TOWER_UNLOCK, POWER_UNLOCK } from '../config/unlocks.js';

const has = (level, type) => level.enemyTypes.includes(type);
const unlocked = (level, tower) => level.number >= TOWER_UNLOCK[tower];
const kills = (run, causes) => causes.reduce((s, c) => s + (run.stats.killsByCause[c] || 0), 0);

const FIRE = ['tower:fire', 'burn', 'power:greekFire'];
const MAGIC = ['tower:frost', 'tower:storm', 'power:wrath'];
const ARTILLERY = ['tower:cannon', 'tower:catapult'];

/** Thresholds that grow with the campaign (level number 1 to 100). */
export const SCALE = Object.freeze({
  frugal: (l) => 5 + Math.floor(l.number / 20) + (l.roads - 1),
  rush: (l) => Math.min(l.waveCount - 1, 2 + Math.floor(l.number / 25)),
  rich: (l) => Math.round((250 * l.rewardMult) / 10) * 10,
  burst: (l) => 6 + Math.floor(l.number / 12),
  wall: (l) => 12 + Math.floor(l.number / 4),
  themed: (l) => 10 + Math.floor(l.number / 6),
});

/**
 * Definitions.
 *  - family   : 'style' | 'feat' | 'theme'
 *  - eligible : does the challenge make sense in this level?
 *  - test     : passed? (run = { stats, game facts }, level)
 *  - params   : values shown in the description
 */
export const ACHIEVEMENTS = Object.freeze({
  // --- Style
  noPower: { family: 'style', icon: 'power', eligible: (l) => l.number > POWER_UNLOCK.arrowRain, test: (r) => r.powersUsed === 0 },
  frugal: { family: 'style', icon: 'tower', eligible: (l) => l.number >= 3, test: (r, l) => r.stats.maxTowers <= SCALE.frugal(l), params: (l) => ({ n: SCALE.frugal(l) }) },
  humble: { family: 'style', icon: 'level', eligible: (l) => l.number >= 5, test: (r) => r.stats.maxTowerLevel <= 2 },
  specialist: { family: 'style', icon: 'type', eligible: (l) => l.towers.length >= 4, test: (r) => r.stats.towerTypes.length <= 2 },
  noBarracks: { family: 'style', icon: 'shield', eligible: (l) => unlocked(l, 'barracks') && l.number > TOWER_UNLOCK.barracks, test: (r) => !r.stats.towerTypes.includes('barracks') },
  noSell: { family: 'style', icon: 'coin', eligible: (l) => l.number >= 2, test: (r) => r.stats.sold === 0 && r.stats.towersBuilt <= SCALE.frugal(l) + 3, params: (l) => ({ n: SCALE.frugal(l) + 3 }) },

  // --- Feat
  flawless: { family: 'feat', icon: 'heart', eligible: () => true, test: (r) => r.stats.livesLost === 0 },
  rush: { family: 'feat', icon: 'horn', eligible: (l) => l.waveCount >= 4, test: (r, l) => r.stats.earlyCalls >= SCALE.rush(l), params: (l) => ({ n: SCALE.rush(l) }) },
  rich: { family: 'feat', icon: 'coin', eligible: (l) => l.number >= 2, test: (r, l) => r.gold >= SCALE.rich(l), params: (l) => ({ n: SCALE.rich(l) }) },
  burst: { family: 'feat', icon: 'skull', eligible: (l) => l.number >= 4, test: (r, l) => r.stats.maxBurst >= SCALE.burst(l), params: (l) => ({ n: SCALE.burst(l) }) },
  rampart: { family: 'feat', icon: 'wall', eligible: (l) => l.number >= 3, test: (r) => r.stats.maxProgress <= 0.7 && r.stats.leaks === 0, params: () => ({ n: 70 }) },
  master: { family: 'feat', icon: 'star', eligible: (l) => l.number >= 3, test: (r) => r.stats.maxTowerLevel >= 3 },

  // --- Theme
  skyguard: { family: 'theme', icon: 'wing', eligible: (l) => has(l, 'crow') || has(l, 'wyvern'), test: (r) => r.stats.flyerLeaks === 0 && r.stats.flyersKilled > 0 },
  eagleEye: { family: 'theme', icon: 'eye', eligible: (l) => has(l, 'sapper'), test: (r) => r.stats.stealthLeaks === 0 && r.stats.stealthKilled > 0 },
  giantSlayer: { family: 'theme', icon: 'crown', eligible: (l) => Boolean(l.boss), test: (r) => r.stats.bossKills > 0 && r.stats.bossFurthest <= 0.5, params: () => ({ n: 50 }) },
  wall: { family: 'theme', icon: 'shield', eligible: (l) => unlocked(l, 'barracks'), test: (r, l) => r.stats.blocks >= SCALE.wall(l), params: (l) => ({ n: SCALE.wall(l) }) },
  pyro: { family: 'theme', icon: 'flame', eligible: (l) => unlocked(l, 'fire') || l.number > POWER_UNLOCK.greekFire, test: (r, l) => kills(r, FIRE) >= SCALE.themed(l), params: (l) => ({ n: SCALE.themed(l) }) },
  arcane: { family: 'theme', icon: 'bolt', eligible: (l) => unlocked(l, 'frost'), test: (r, l) => kills(r, MAGIC) >= SCALE.themed(l), params: (l) => ({ n: SCALE.themed(l) }) },
  artillery: { family: 'theme', icon: 'bomb', eligible: (l) => unlocked(l, 'cannon'), test: (r, l) => kills(r, ARTILLERY) >= SCALE.themed(l), params: (l) => ({ n: SCALE.themed(l) }) },
});

const FAMILIES = Object.freeze(['style', 'feat', 'theme']);
/** Theme challenges tied to the level's own enemies: picked first. */
const SPECIFIC = Object.freeze(['skyguard', 'eagleEye', 'giantSlayer']);

/**
 * The three challenges of a level: one per family, among those that make
 * sense here, rotating from one level to the next.
 * @param {import('../config/Level.js').Level} level
 * @returns {string[]}
 */
export function achievementsFor(level) {
  const picked = [];
  const ids = Object.keys(ACHIEVEMENTS);
  FAMILIES.forEach((family, f) => {
    const usable = (fam) => ids.filter((id) => (!fam || ACHIEVEMENTS[id].family === fam) && !picked.includes(id) && ACHIEVEMENTS[id].eligible(level));
    let pool = usable(family);
    if (family === 'theme' && pool.some((id) => SPECIFIC.includes(id))) pool = pool.filter((id) => SPECIFIC.includes(id));
    if (!pool.length) pool = usable(null);
    // Fixed pseudo-random pick (hash of the level number).
    const h = (Math.imul(level.number * 31 + f * 101 + 7, 2654435761) >>> 0) >>> 8;
    picked.push(pool[h % pool.length]);
  });
  return picked;
}

/**
 * Facts about a finished level needed by the tests.
 * @param {import('../Game.js').Game} game
 * @param {number} [owner] player whose gold counts (cooperation: both players' gold)
 */
export function runOf(game) {
  return {
    stats: game.stats,
    powersUsed: game.powers.totalUses,
    gold: game.players.reduce((s, p) => s + p.gold, 0),
    lives: game.lives,
  };
}

/**
 * Mask of challenges passed (bit i = i-th challenge of the level).
 * @param {import('../config/Level.js').Level} level
 * @param {ReturnType<typeof runOf>} run
 */
export function evaluateAchievements(level, run) {
  return achievementsFor(level).reduce((mask, id, i) => (ACHIEVEMENTS[id].test(run, level) ? mask | (1 << i) : mask), 0);
}

/** Number of bits set in a challenge mask (0..3). */
export function countAchievements(mask) {
  return (mask & 1) + ((mask >> 1) & 1) + ((mask >> 2) & 1);
}

/** Display parameters of a challenge (threshold…) for the translation. */
export function achievementParams(id, level) {
  return ACHIEVEMENTS[id].params?.(level) ?? {};
}
