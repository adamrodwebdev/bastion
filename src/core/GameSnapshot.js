/**
 * @file The game in progress, read back from a save at the door: every field the game writes
 * (Game#serialize, plus the track the game screen adds) is read with its type and its range,
 * every name from its list, every list within its count, and every tower on a tile where it
 * could have been built. A snapshot that does not fit is refused as a whole: a game half
 * restored would be another game. The campaign itself is saved apart and never depends on it.
 */

import { InputRecord, InvalidInput, readChoice, readNumber } from './input.js';
import { LIST_LIMITS } from './limits.js';
import { LevelCatalog } from './config/LevelCatalog.js';
import { Difficulty } from './config/Difficulty.js';
import { GameMap } from './world/GameMap.js';
import { TowerFactory } from './entities/towers/TowerFactory.js';
import { EnemyFactory } from './entities/enemies/EnemyFactory.js';
import { TARGETING } from './entities/towers/Targeting.js';
import { ALL_POWERS } from './powers/powers.js';

/** A count the game keeps exact: gold, kills, score, uses. */
const COUNT = Object.freeze({ min: 0, max: Number.MAX_SAFE_INTEGER, integer: true });
/** Seconds of play: a level lasts minutes; a day is far beyond any of them. */
const SECONDS = Object.freeze({ min: 0, max: 86_400 });
/** A share of something (a road travelled, a sale's refund). */
const SHARE = Object.freeze({ min: 0, max: 1 });
/** A workshop or power multiplier: bonuses and discounts stay within these. */
const FACTOR = Object.freeze({ min: 0, max: 10 });

const TRACKS = Object.freeze(['solo', 'coop']);
const STATES = Object.freeze(['prepare', 'running']);
const POWER_STATES = Object.freeze(['ready', 'active', 'cooldown']);
const DIFFICULTIES = Object.freeze(Difficulty.all().map((d) => d.id));
const TOWER_TYPES = Object.freeze(TowerFactory.types());
const ENEMY_TYPES = Object.freeze(EnemyFactory.types());
const POWER_IDS = Object.freeze(ALL_POWERS.map((P) => P.id));
const TARGETINGS = Object.freeze(TARGETING.map((T) => T.id));
/** What a kill is credited to: a tower type, a power, the soldiers, fire, or anything else. */
const KILL_CAUSES = Object.freeze([
  'burn',
  'other',
  'soldier',
  ...POWER_IDS.map((id) => `power:${id}`),
  ...TOWER_TYPES.map((type) => `tower:${type}`),
]);

/** The workshop bonuses a game was started with (Game's DEFAULT_MODS, `elite` read apart). */
export const MOD_RULES = Object.freeze({
  startGold: Object.freeze({ min: 0, max: 10_000, integer: true }),
  lives: Object.freeze({ min: 0, max: 100, integer: true }),
  physical: FACTOR,
  magic: FACTOR,
  fire: FACTOR,
  splash: FACTOR,
  soldierHp: FACTOR,
  soldierDamage: FACTOR,
  towerCost: Object.freeze({ min: 0.1, max: 10 }),
  sellRatio: SHARE,
  powerCooldown: Object.freeze({ min: 0.1, max: 10 }),
  income: FACTOR,
});

/** The statistics of a game (Game.emptyStats): counts, two shares, and three lists or maps. */
export const STAT_RULES = Object.freeze({
  kills: COUNT,
  leaks: COUNT,
  livesLost: COUNT,
  towersBuilt: COUNT,
  maxTowers: COUNT,
  sold: COUNT,
  upgrades: COUNT,
  maxTowerLevel: COUNT,
  earlyCalls: COUNT,
  earlyBonus: COUNT,
  goldEarned: COUNT,
  goldSpent: COUNT,
  blocks: COUNT,
  flyersKilled: COUNT,
  stealthKilled: COUNT,
  flyerLeaks: COUNT,
  stealthLeaks: COUNT,
  bossKills: COUNT,
  bossFurthest: SHARE,
  maxProgress: SHARE,
  maxBurst: COUNT,
});

/** Snapshots read through the door: the game restores them without reading them again. */
const READ = new WeakSet();

/** Freezes a plain value and everything in it. */
function deepFreeze(value) {
  if (typeof value === 'object' && value !== null) {
    for (const inner of Object.values(value)) deepFreeze(inner);
    Object.freeze(value);
  }
  return value;
}

/** A list of names from a closed set (tower types, powers), within its count. */
const namesFrom = (choices, maxItems) => ({ maxItems, item: (value, field) => readChoice(value, choices, field) });

/**
 * A map keyed by names from a closed set, counting something: `{ "tower:archer": 12 }`.
 * @param {InputRecord} map
 * @param {{names: readonly string[], maxKeys: number, field: string}} rule
 */
function countsByName(map, { names, maxKeys, field }) {
  const counts = {};
  for (const key of map.keys(maxKeys)) {
    counts[readChoice(key, names, `${field} key ${JSON.stringify(key)}`)] = map.number(key, COUNT);
  }
  return counts;
}

/**
 * @param {InputRecord} mods
 * @returns {object}
 */
function readMods(mods) {
  const out = {};
  for (const [name, rule] of Object.entries(MOD_RULES)) out[name] = mods.number(name, rule);
  out.elite = mods.list('elite', namesFrom(TOWER_TYPES, LIST_LIMITS.towerTypes));
  return out;
}

/** @param {InputRecord} stats */
function readStats(stats) {
  const out = {};
  for (const [name, rule] of Object.entries(STAT_RULES)) out[name] = stats.number(name, rule);
  out.towerTypes = stats.list('towerTypes', namesFrom(TOWER_TYPES, LIST_LIMITS.towerTypes));
  const causes = { names: KILL_CAUSES, maxKeys: LIST_LIMITS.killCauses, field: 'currentGame.stats.killsByCause' };
  out.killsByCause = countsByName(stats.record('killsByCause'), causes);
  const towers = { names: TOWER_TYPES, maxKeys: TOWER_TYPES.length, field: 'currentGame.stats.killsByTower' };
  out.killsByTower = countsByName(stats.record('killsByTower'), towers);
  return out;
}

/**
 * @param {InputRecord} snap
 * @returns {Array<{id:number, gold:number, earned:number, kills:number}>}
 */
function readPlayers(snap) {
  const players = snap.list('players', {
    maxItems: LIST_LIMITS.players,
    item: (value, field) => {
      const player = InputRecord.from(value, field);
      const [id, gold, earned, kills] = ['id', 'gold', 'earned', 'kills'].map((name) => player.number(name, COUNT));
      return { id, gold, earned, kills };
    },
  });
  if (players.length === 0) throw new InvalidInput('currentGame.players', 'empty');
  // Player 1, then player 2: the board's colours and the owners of the towers follow them.
  players.forEach((player, i) => {
    readNumber(player.id, { min: i + 1, max: i + 1, integer: true }, `currentGame.players[${i}].id`);
  });
  return players;
}

/**
 * @param {InputRecord} waves
 * @param {{waveCount:number, roads:number}} level
 */
function readWaves(waves, level) {
  const waveIndex = waves.number('waveIndex', { min: -1, max: level.waveCount - 1, integer: true });
  const queue = waves.list('queue', {
    maxItems: LIST_LIMITS.spawns,
    item: (value, field) => {
      const order = InputRecord.from(value, field);
      const spawn = {
        time: order.number('time', SECONDS),
        type: order.choice('type', ENEMY_TYPES),
        path: order.number('path', { min: 0, max: level.roads - 1, integer: true }),
        wave: order.number('wave', { min: 0, max: Math.max(0, waveIndex), integer: true }),
      };
      // Absent, the enemy flies or walks as its kind does.
      if (order.has('air')) spawn.air = order.boolean('air');
      return spawn;
    },
  });
  if (waveIndex < 0 && queue.length > 0) throw new InvalidInput('currentGame.waves.queue', 'too-many');
  return { waveIndex, queue, clock: waves.number('clock', SECONDS) };
}

/**
 * @param {InputRecord} snap
 * @param {GameMap} map
 * @param {{players:number, elite:readonly string[]}} o
 */
function readTowers(snap, map, { players, elite }) {
  const taken = new Set();
  return snap.list('towers', {
    maxItems: LIST_LIMITS.towers,
    item: (value, field) => {
      const tower = InputRecord.from(value, field);
      const type = tower.choice('type', TOWER_TYPES);
      const T = TowerFactory.get(type);
      const col = tower.number('col', { min: 0, max: map.cols - 1, integer: true });
      const row = tower.number('row', { min: 0, max: map.rows - 1, integer: true });
      // On a tile where it could have been built, one tower per tile.
      const tile = GameMap.key(col, row);
      if (!map.isBuildable(col, row) || taken.has(tile)) throw new InvalidInput(`${field}.col`, 'out-of-range');
      taken.add(tile);
      const maxLevel = T.levels.length + (T.elite && elite.includes(type) ? 1 : 0);
      return {
        type,
        col,
        row,
        owner: tower.number('owner', { min: 1, max: players, integer: true }),
        level: tower.number('level', { min: 1, max: maxLevel, integer: true }),
        invested: tower.number('invested', COUNT),
        kills: tower.number('kills', COUNT),
        targeting: tower.choice('targeting', TARGETINGS),
      };
    },
  });
}

/**
 * @param {InputRecord} snap
 * @param {GameMap} map
 */
function readEnemies(snap, map) {
  return snap.list('enemies', {
    maxItems: LIST_LIMITS.enemies,
    item: (value, field) => {
      const enemy = InputRecord.from(value, field);
      const air = enemy.boolean('air');
      const pathIndex = enemy.number('pathIndex', { min: 0, max: map.paths.length - 1, integer: true });
      const length = (air ? map.airPaths : map.paths)[pathIndex].length;
      const maxHp = enemy.number('maxHp', { min: 1, max: 1e9 });
      const read = {
        type: enemy.choice('type', ENEMY_TYPES),
        pathIndex,
        air,
        hp: enemy.number('hp', { min: 0, max: maxHp }),
        maxHp,
        distance: enemy.number('distance', { min: -length, max: length }),
        reward: enemy.number('reward', COUNT),
        baseSpeed: enemy.number('baseSpeed', { min: 0, max: 100 }),
      };
      if (enemy.has('melee')) read.melee = enemy.number('melee', { min: 0, max: 1e9 });
      return read;
    },
  });
}

/**
 * Reads a game in progress from outside (a save, parsed JSON).
 * @param {unknown} value parsed JSON, or the record a save slot read
 * @param {{version:number, waveGap:number}} rules the save version the game writes, the seconds between waves
 * @returns {object} the snapshot, frozen, every field typed
 * @throws {InvalidInput} when it does not fit
 */
export function readGameSnapshot(value, { version, waveGap }) {
  const snap = value instanceof InputRecord ? value : InputRecord.from(value, 'currentGame');
  snap.number('version', { min: version, max: version, integer: true });
  const levelNumber = snap.number('levelNumber', { min: 1, max: LevelCatalog.count, integer: true });
  const level = LevelCatalog.byNumber(levelNumber);
  const map = new GameMap(level.mapConfig);
  const players = readPlayers(snap);
  const track = snap.has('track') ? snap.choice('track', TRACKS) : TRACKS[players.length - 1];
  if (track !== TRACKS[players.length - 1]) throw new InvalidInput('currentGame.track', 'not-a-choice');
  const mods = readMods(snap.record('mods'));
  const maxLives = snap.number('maxLives', { min: 1, max: 1_000, integer: true });
  const read = {
    levelNumber,
    difficulty: snap.choice('difficulty', DIFFICULTIES),
    track,
    loadout: snap.list('loadout', namesFrom(POWER_IDS, LIST_LIMITS.powers)),
    mods,
    hpMult: snap.number('hpMult', { min: 1, max: 4 }),
    players,
    lives: snap.number('lives', { min: 1, max: maxLives, integer: true }),
    maxLives,
    score: snap.number('score', COUNT),
    state: snap.choice('state', STATES),
    time: snap.number('time', SECONDS),
    countdown: snap.isNull('countdown') ? null : snap.number('countdown', { min: 0, max: waveGap }),
    waves: readWaves(snap.record('waves'), { waveCount: level.waveCount, roads: map.paths.length }),
    powers: snap.list('powers', {
      maxItems: LIST_LIMITS.powers,
      item: (item, field) => {
        const power = InputRecord.from(item, field);
        return {
          id: power.choice('id', POWER_IDS),
          state: power.choice('state', POWER_STATES),
          timer: power.number('timer', SECONDS),
          uses: power.number('uses', COUNT),
        };
      },
    }),
    towers: readTowers(snap, map, { players: players.length, elite: mods.elite }),
    enemies: readEnemies(snap, map),
    stats: readStats(snap.record('stats')),
  };
  READ.add(read);
  return deepFreeze(read);
}

/**
 * Was this snapshot read through the door (by readGameSnapshot)?
 * @param {unknown} value
 */
export function isReadSnapshot(value) {
  return typeof value === 'object' && value !== null && READ.has(value);
}
