/**
 * @file Shared test helpers: a storage backend in memory, and snapshots of real games
 * played by the campaign bot.
 */

import { Game, LevelCatalog, Difficulty, PowerManager, COOP_HP } from '../src/core/index.js';
import { Bot } from '../scripts/Bot.mjs';

/** A localStorage stand-in over a Map; `failReads` makes every read throw, like a blocked storage. */
export class MemoryBackend {
  /** @param {Record<string, string>} [items] */
  constructor(items = {}) {
    this.items = new Map(Object.entries(items));
    this.writes = 0;
    this.failReads = false;
  }

  getItem(key) {
    if (this.failReads) throw new Error('storage blocked');
    return this.items.has(key) ? this.items.get(key) : null;
  }

  setItem(key, value) {
    this.writes += 1;
    this.items.set(key, String(value));
  }

  removeItem(key) {
    this.writes += 1;
    this.items.delete(key);
  }
}

/**
 * A game played by the bot for some seconds, then saved as the game screen saves it
 * (with its track) and read back as JSON, as storage gives it.
 * @param {number} levelNumber
 * @param {number} seconds of play
 * @param {{coop?: boolean, difficulty?: string}} [o]
 * @returns {object}
 */
export function playedSnapshot(levelNumber, seconds, { coop = false, difficulty = 'normal' } = {}) {
  const level = LevelCatalog.byNumber(levelNumber);
  const game = new Game({
    level,
    difficulty: Difficulty.get(difficulty),
    loadout: PowerManager.defaultLoadout(levelNumber - 1),
    mods: { physical: 1.1, startGold: 40, lives: 2, elite: ['archer'] },
    players: coop ? 2 : 1,
    hpMult: coop ? COOP_HP : 1,
  });
  const bot = new Bot(game);
  const dt = 1 / 30;
  let nextAct = 0;
  bot.act();
  game.startWave();
  while (!game.isOver && game.time < seconds) {
    if (game.time >= nextAct) {
      bot.act();
      bot.powers();
      nextAct = game.time + 2;
    }
    game.update(dt);
  }
  return JSON.parse(JSON.stringify({ ...game.serialize(), track: coop ? 'coop' : 'solo' }));
}

/** A deep copy of a snapshot, changed by `edit`. */
export function tampered(snapshot, edit) {
  const copy = JSON.parse(JSON.stringify(snapshot));
  edit(copy);
  return copy;
}
