/**
 * @file The game in progress, read back from storage (Game.restore): every snapshot the game
 * writes still loads, and a tampered one is refused instead of freezing or blanking the game.
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { Game, LevelCatalog, DEFAULT_MODS } from '../src/core/index.js';
import { GameMap } from '../src/core/world/GameMap.js';
import { InvalidInput } from '../src/core/input.js';
import { MOD_RULES, STAT_RULES, readGameSnapshot } from '../src/core/GameSnapshot.js';
import { playedSnapshot, tampered } from './helpers.mjs';

const SNAPSHOT = playedSnapshot(12, 75);
const COOP = playedSnapshot(31, 60, { coop: true });

/** An in-bounds cell where nothing may be built (a road, a rock, water). */
function blockedCell(levelNumber) {
  const map = new GameMap(LevelCatalog.byNumber(levelNumber).mapConfig);
  for (let row = 0; row < map.rows; row++) {
    for (let col = 0; col < map.cols; col++) if (!map.isBuildable(col, row)) return { col, row };
  }
  throw new Error('no blocked cell');
}

describe('Game.restore: snapshots the game wrote', () => {
  test('a solo game played by the bot comes back as it was', () => {
    assert.ok(SNAPSHOT.towers.length > 0 && SNAPSHOT.enemies.length > 0, 'the bot built and enemies walk');
    const game = Game.restore(SNAPSHOT);
    assert.ok(game);
    assert.equal(game.level.number, 12);
    assert.equal(game.towers.length, SNAPSHOT.towers.length);
    assert.equal(game.enemies.length, SNAPSHOT.enemies.length);
    assert.equal(game.lives, SNAPSHOT.lives);
    assert.equal(game.gold, SNAPSHOT.players[0].gold);
    assert.deepEqual(JSON.parse(JSON.stringify(game.serialize().towers)), SNAPSHOT.towers);
    for (let i = 0; i < 600; i++) game.update(1 / 30);
  });

  test('a cooperation game comes back with its two players', () => {
    const game = Game.restore(COOP);
    assert.ok(game);
    assert.equal(game.playerCount, 2);
    assert.deepEqual(
      game.players.map((p) => p.gold),
      COOP.players.map((p) => p.gold),
    );
  });
});

describe('Game.restore: tampered snapshots are refused (regressions)', () => {
  test('three players: the board has colours for two', () => {
    const snap = tampered(SNAPSHOT, (s) => s.players.push({ ...s.players[0], id: 2 }, { ...s.players[0], id: 3 }));
    assert.equal(Game.restore(snap), null);
  });

  test('a tower level that is not a number would stop the game loop', () => {
    const snap = tampered(SNAPSHOT, (s) => (s.towers[0].level = null));
    assert.equal(Game.restore(snap), null);
  });

  test('an enemy distance written as text would never reach the gate', () => {
    const snap = tampered(SNAPSHOT, (s) => (s.enemies[0].distance = '5'));
    assert.equal(Game.restore(snap), null);
  });

  test('a tower standing on a road', () => {
    const cell = blockedCell(12);
    const snap = tampered(SNAPSHOT, (s) => Object.assign(s.towers[0], cell));
    assert.equal(Game.restore(snap), null);
  });

  test('two towers on the same tile', () => {
    const snap = tampered(SNAPSHOT, (s) => s.towers.push({ ...s.towers[0] }));
    assert.equal(Game.restore(snap), null);
  });

  test('lives beyond any number the game counts', () => {
    const snap = tampered(SNAPSHOT, (s) => (s.lives = 1e308));
    assert.equal(Game.restore(snap), null);
  });

  test('a time of 1e999, which JSON turns into Infinity', () => {
    const text = JSON.stringify(SNAPSHOT).replace(/"time":[^,]+/, '"time":1e999');
    assert.equal(Game.restore(JSON.parse(text)), null);
  });

  test('a player record carrying __proto__ changes no prototype', () => {
    const text = JSON.stringify(SNAPSHOT).replace('"players":[{', '"players":[{"__proto__":{"polluted":true},');
    const game = Game.restore(JSON.parse(text));
    assert.ok(game);
    assert.equal(Object.getPrototypeOf(game.players[0]), Object.prototype);
    assert.equal(game.players[0].polluted, undefined);
  });
});

const RULES = { version: Game.SAVE_VERSION, waveGap: Game.WAVE_GAP };
const ROAD = blockedCell(12);
const many = (count, item) => Array.from({ length: count }, () => JSON.parse(JSON.stringify(item)));

/** The reason the door refuses a snapshot: the field's path and the problem, or 'accepted'. */
function refusal(value) {
  try {
    readGameSnapshot(value, RULES);
    return 'accepted';
  } catch (error) {
    return error instanceof InvalidInput ? `${error.field}: ${error.problem}` : `threw ${String(error)}`;
  }
}

describe('readGameSnapshot: hostile snapshots, field by field', () => {
  test('the snapshots the bot wrote are accepted', () => {
    assert.equal(refusal(SNAPSHOT), 'accepted');
    assert.equal(refusal(COOP), 'accepted');
  });

  for (const [name, value] of [['null', null], ['a list', []], ['a text', '{}'], ['a number', 2]]) {
    test(`${name} is no snapshot`, () => assert.equal(refusal(value), 'currentGame: not-a-record'));
  }

  // [what, edit, the path of the field refused]
  const rows = [
    ['the first save format (version 1)', (s) => (s.version = 1), 'currentGame.version'],
    ['a version written as text', (s) => (s.version = '2'), 'currentGame.version'],
    ['a later version', (s) => (s.version = 3), 'currentGame.version'],
    ['level 0', (s) => (s.levelNumber = 0), 'currentGame.levelNumber'],
    ['level 101', (s) => (s.levelNumber = 101), 'currentGame.levelNumber'],
    ['a level written as text', (s) => (s.levelNumber = '12'), 'currentGame.levelNumber'],
    ['half a level', (s) => (s.levelNumber = 12.5), 'currentGame.levelNumber'],
    ['a difficulty in capitals', (s) => (s.difficulty = 'HARD'), 'currentGame.difficulty'],
    ['a difficulty named __proto__', (s) => (s.difficulty = '__proto__'), 'currentGame.difficulty'],
    ['no player', (s) => (s.players = []), 'currentGame.players'],
    ['three players', (s) => s.players.push({ ...s.players[0], id: 2 }, { ...s.players[0], id: 3 }), 'currentGame.players'],
    ['player 2 first', (s) => (s.players[0].id = 2), 'currentGame.players[0].id'],
    ['negative gold', (s) => (s.players[0].gold = -1), 'currentGame.players[0].gold'],
    ['gold written as text', (s) => (s.players[0].gold = '900'), 'currentGame.players[0].gold'],
    ['a fraction of gold', (s) => (s.players[0].gold = 10.5), 'currentGame.players[0].gold'],
    ['a cooperation track for one player', (s) => (s.track = 'coop'), 'currentGame.track'],
    ['a track the game has not', (s) => (s.track = 'duel'), 'currentGame.track'],
    ['a start gold of a billion', (s) => (s.mods.startGold = 1e9), 'currentGame.mods.startGold'],
    ['free towers', (s) => (s.mods.towerCost = 0), 'currentGame.mods.towerCost'],
    ['a sale refunding twice the price', (s) => (s.mods.sellRatio = 2), 'currentGame.mods.sellRatio'],
    ['a workshop bonus missing', (s) => delete s.mods.physical, 'currentGame.mods.physical'],
    ['a mastery of an unknown tower', (s) => (s.mods.elite = ['dragon']), 'currentGame.mods.elite[0]'],
    ['more masteries than towers', (s) => (s.mods.elite = many(17, 'archer')), 'currentGame.mods.elite'],
    ['enemy health multiplied by ten', (s) => (s.hpMult = 10), 'currentGame.hpMult'],
    ['no life left', (s) => (s.lives = 0), 'currentGame.lives'],
    ['more lives than the maximum', (s) => (s.lives = s.maxLives + 1), 'currentGame.lives'],
    ['a million lives', (s) => (s.maxLives = 1e6), 'currentGame.maxLives'],
    ['a score beyond exact integers', (s) => (s.score = 1e300), 'currentGame.score'],
    ['a won game', (s) => (s.state = 'won'), 'currentGame.state'],
    ['a negative time', (s) => (s.time = -1), 'currentGame.time'],
    ['a countdown longer than the gap between waves', (s) => (s.countdown = 99), 'currentGame.countdown'],
    ['a countdown written as text', (s) => (s.countdown = '3'), 'currentGame.countdown'],
    ['a wave beyond the level', (s) => (s.waves.waveIndex = 99), 'currentGame.waves.waveIndex'],
    ['spawns waiting before any wave', (s) => (s.waves.waveIndex = -1), 'currentGame.waves.queue'],
    ['an unknown enemy waiting', (s) => (s.waves.queue[0].type = 'dragon'), 'currentGame.waves.queue[0].type'],
    ['a spawn on a road the map has not', (s) => (s.waves.queue[0].path = 9), 'currentGame.waves.queue[0].path'],
    ['a spawn of a wave not started', (s) => (s.waves.queue[0].wave = s.waves.waveIndex + 1), 'currentGame.waves.queue[0].wave'],
    ['a spawn time written as text', (s) => (s.waves.queue[0].time = '1'), 'currentGame.waves.queue[0].time'],
    ['a flight flag written as text', (s) => (s.waves.queue[0].air = 'yes'), 'currentGame.waves.queue[0].air'],
    ['more spawns than any level sends', (s) => (s.waves.queue = many(1_025, s.waves.queue[0])), 'currentGame.waves.queue'],
    ['an unknown power', (s) => (s.powers[0].id = 'nuke'), 'currentGame.powers[0].id'],
    ['a power in no known state', (s) => (s.powers[0].state = 'exploding'), 'currentGame.powers[0].state'],
    ['a negative power timer', (s) => (s.powers[0].timer = -1), 'currentGame.powers[0].timer'],
    ['an unknown power in the loadout', (s) => (s.loadout = ['nuke']), 'currentGame.loadout[0]'],
    ['an unknown tower', (s) => (s.towers[0].type = 'dragon'), 'currentGame.towers[0].type'],
    ['a tower named __proto__', (s) => (s.towers[0].type = '__proto__'), 'currentGame.towers[0].type'],
    ['a tower off the map', (s) => (s.towers[0].col = 16), 'currentGame.towers[0].col'],
    ['a tower at a negative row', (s) => (s.towers[0].row = -1), 'currentGame.towers[0].row'],
    ['a tower on a road', (s) => Object.assign(s.towers[0], ROAD), 'currentGame.towers[0].col'],
    ['two towers on one tile', (s) => s.towers.push({ ...s.towers[0] }), `currentGame.towers[${SNAPSHOT.towers.length}].col`],
    ['a tower of player 2 in a solo game', (s) => (s.towers[0].owner = 2), 'currentGame.towers[0].owner'],
    ['a tower at level 0', (s) => (s.towers[0].level = 0), 'currentGame.towers[0].level'],
    ['a mastery the workshop has not given', (s) => Object.assign(s.towers.find((t) => t.type !== 'archer'), { level: 4 }), 'currentGame.towers['],
    ['a tower level that is null', (s) => (s.towers[0].level = null), 'currentGame.towers[0].level'],
    ['a negative investment', (s) => (s.towers[0].invested = -5), 'currentGame.towers[0].invested'],
    ['an unknown targeting', (s) => (s.towers[0].targeting = 'random'), 'currentGame.towers[0].targeting'],
    ['more towers than tiles', (s) => (s.towers = many(145, s.towers[0])), 'currentGame.towers'],
    ['an unknown enemy', (s) => (s.enemies[0].type = 'dragon'), 'currentGame.enemies[0].type'],
    ['an enemy on a road the map has not', (s) => (s.enemies[0].pathIndex = 9), 'currentGame.enemies[0].pathIndex'],
    ['an enemy healthier than its maximum', (s) => (s.enemies[0].hp = s.enemies[0].maxHp + 1), 'currentGame.enemies[0].hp'],
    ['an enemy without health', (s) => (s.enemies[0].maxHp = 0), 'currentGame.enemies[0].maxHp'],
    ['an enemy beyond the end of its road', (s) => (s.enemies[0].distance = 1e6), 'currentGame.enemies[0].distance'],
    ['an enemy distance written as text', (s) => (s.enemies[0].distance = '5'), 'currentGame.enemies[0].distance'],
    ['an enemy faster than anything', (s) => (s.enemies[0].baseSpeed = 1e6), 'currentGame.enemies[0].baseSpeed'],
    ['a flight flag missing on an enemy', (s) => delete s.enemies[0].air, 'currentGame.enemies[0].air'],
    ['more enemies than any level sends', (s) => (s.enemies = many(1_025, s.enemies[0])), 'currentGame.enemies'],
    ['negative kills', (s) => (s.stats.kills = -1), 'currentGame.stats.kills'],
    ['a statistic missing', (s) => delete s.stats.leaks, 'currentGame.stats.leaks'],
    ['a road travelled twice', (s) => (s.stats.maxProgress = 2), 'currentGame.stats.maxProgress'],
    ['an unknown tower built', (s) => (s.stats.towerTypes = ['dragon']), 'currentGame.stats.towerTypes[0]'],
    ['kills credited to "constructor"', (s) => (s.stats.killsByCause = { constructor: 1 }), 'currentGame.stats.killsByCause key'],
    ['negative kills of a cause', (s) => (s.stats.killsByCause = { 'tower:archer': -1 }), 'currentGame.stats.killsByCause.tower:archer'],
    ['kills of a tower named __proto__', (s) => (s.stats.killsByTower = JSON.parse('{"__proto__": 1}')), 'currentGame.stats.killsByTower key'],
  ];
  for (const [what, edit, field] of rows) {
    test(`refuses ${what}`, () => {
      const result = refusal(tampered(SNAPSHOT, edit));
      assert.ok(result.startsWith(field), `${result} (expected ${field})`);
    });
  }

  test('a clock of 1e999 (Infinity once parsed) is refused', () => {
    const text = JSON.stringify(SNAPSHOT).replace(/"clock":[^,}]+/, '"clock":1e999');
    assert.equal(refusal(JSON.parse(text)), 'currentGame.waves.clock: not-a-number');
  });

  test('unknown fields are ignored, never copied into the game', () => {
    const snap = tampered(SNAPSHOT, (s) => {
      s.godMode = true;
      s.players[0].isAdmin = true;
      s.towers[0].damage = 1e9;
    });
    const game = Game.restore(snap);
    assert.ok(game);
    assert.equal(game.godMode, undefined);
    assert.equal(game.players[0].isAdmin, undefined);
    assert.equal(game.towers[0].damage, undefined);
  });
});

describe('readGameSnapshot: every snapshot the game wrote still loads', () => {
  for (const [level, seconds, coop] of [
    [1, 20, false],
    [31, 60, true],
    [55, 90, false],
    [87, 100, false],
    [100, 120, false],
  ]) {
    test(`level ${level}${coop ? ' in cooperation' : ''}, after ${seconds} s of play, comes back field for field`, () => {
      const snap = playedSnapshot(level, seconds, { coop });
      assert.equal(refusal(snap), 'accepted');
      const game = Game.restore(snap);
      assert.ok(game);
      const again = JSON.parse(JSON.stringify({ ...game.serialize(), savedAt: snap.savedAt, track: snap.track }));
      // A power that was active comes back on cooldown (Power#restore: its effect is not replayed).
      snap.powers.forEach((power, i) => {
        if (power.state !== 'active') assert.deepEqual(again.powers[i], power);
        else assert.deepEqual([again.powers[i].id, again.powers[i].state, again.powers[i].uses], [power.id, 'cooldown', power.uses]);
      });
      assert.deepEqual({ ...again, powers: [] }, { ...snap, powers: [] });
    });
  }

  test('a snapshot without its track reads it from its players', () => {
    assert.equal(Game.readSnapshot(tampered(SNAPSHOT, (s) => delete s.track)).track, 'solo');
    assert.equal(Game.readSnapshot(tampered(COOP, (s) => delete s.track)).track, 'coop');
  });

  test('a spawn without its flight flag flies or walks as its kind does', () => {
    const snap = Game.readSnapshot(tampered(SNAPSHOT, (s) => delete s.waves.queue[0].air));
    assert.equal(Object.prototype.hasOwnProperty.call(snap.waves.queue[0], 'air'), false);
  });

  test('an enemy without its melee strength keeps the strength of its kind', () => {
    assert.ok(Game.restore(tampered(SNAPSHOT, (s) => delete s.enemies[0].melee)));
  });

  test('the first save format (version 1) is ignored, as the contributing guide says', () => {
    const v1 = {
      version: 1,
      savedAt: 0,
      levelIndex: 2,
      difficulty: 'normal',
      unlockedPowers: [],
      gold: 100,
      lives: 20,
      score: 0,
      kills: 0,
      state: 'running',
      time: 30,
      waves: { waveIndex: 1, queue: [], elapsed: 3, spawning: false },
      powers: [],
      towers: [],
      enemies: [],
    };
    assert.equal(Game.restore(v1), null);
  });
});

describe('readGameSnapshot follows the game', () => {
  test('it reads every workshop bonus the game keeps', () => {
    assert.deepEqual([...Object.keys(MOD_RULES), 'elite'].sort(), Object.keys(DEFAULT_MODS).sort());
  });

  test('it reads every statistic the game counts', () => {
    const read = [...Object.keys(STAT_RULES), 'towerTypes', 'killsByCause', 'killsByTower'];
    assert.deepEqual(read.sort(), Object.keys(Game.emptyStats()).sort());
  });

  test('a snapshot read once is restored without being read again', () => {
    const snap = Game.readSnapshot(SNAPSHOT);
    assert.equal(Game.readSnapshot(snap), snap);
    assert.ok(Object.isFrozen(snap.towers[0]));
  });
});
