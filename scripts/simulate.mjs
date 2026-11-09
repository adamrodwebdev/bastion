/**
 * @file Headless balance test: a bot plays the campaign (npm test).
 *
 * Usage:
 *   node scripts/simulate.mjs                 all levels, Normal
 *   node scripts/simulate.mjs --diff=hard     another difficulty
 *   node scripts/simulate.mjs --from=21 --to=30
 *   node scripts/simulate.mjs --save          also checks save / restore mid-level
 *
 * Exits with code 1 if the engine throws or if a level cannot be won in Normal
 * (or Easy) by the bot, and with code 2 on an argument it does not know or
 * cannot read (a level that is not a whole number from 1 to 100, an unknown
 * difficulty): a mistyped run never passes without playing.
 */

import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Game, LevelCatalog, Difficulty, PowerManager } from '../src/core/index.js';
import { InvalidInput, parseNumber, readChoice } from '../src/core/input.js';
import { Bot } from './Bot.mjs';

/** The options of the command line, each with its reader: the arguments are outside values. */
const LEVEL = { min: 1, max: LevelCatalog.count, integer: true };
const OPTIONS = new Map([
  ['diff', (value) => Difficulty.get(readChoice(value, Difficulty.all().map((d) => d.id), '--diff'))],
  ['from', (value) => parseNumber(value, LEVEL, '--from')],
  ['to', (value) => parseNumber(value, LEVEL, '--to')],
  ['save', (value) => readChoice(value, [true], '--save')],
]);

/**
 * Reads the command line: `--name=value` for the known names, `--save` alone.
 * @param {readonly string[]} argv
 * @returns {{diff: Difficulty, from: number, to: number, save: boolean}}
 * @throws {InvalidInput} on an argument that is unknown, repeated or unreadable
 */
function readArguments(argv) {
  const read = new Map();
  for (const arg of argv) {
    const [, name, value] = /^--([a-z]+)(?:=(.*))?$/s.exec(arg) ?? [];
    if (!OPTIONS.has(name) || read.has(name)) throw new InvalidInput(arg, 'not-a-choice');
    read.set(name, OPTIONS.get(name)(value ?? true));
  }
  const options = {
    diff: read.get('diff') ?? Difficulty.NORMAL,
    from: read.get('from') ?? 1,
    to: read.get('to') ?? LevelCatalog.count,
    save: read.has('save'),
  };
  if (options.from > options.to) throw new InvalidInput('--from', 'out-of-range');
  return options;
}

/** Workshop bonuses a player is expected to have reached around a level. */
export function expectedMods(number) {
  const t = Math.min(1, (number - 1) / 80);
  return {
    physical: 1 + 0.24 * t,
    magic: 1 + 0.24 * t,
    fire: 1 + 0.24 * t,
    splash: 1 + 0.2 * t,
    soldierHp: 1 + 0.3 * t,
    startGold: Math.round(60 * t),
    lives: Math.round(3 * t),
    towerCost: 1 - 0.1 * t,
    powerCooldown: 1 - 0.2 * t,
    elite: number > 40 ? ['archer', 'cannon', 'barracks', 'frost'] : number > 25 ? ['archer', 'cannon'] : [],
  };
}

export function play(number, difficulty = Difficulty.NORMAL, { save = false, mods = expectedMods(number) } = {}) {
  const level = LevelCatalog.byNumber(number);
  let game = new Game({ level, difficulty, loadout: PowerManager.defaultLoadout(number - 1), mods });
  let bot = new Bot(game);
  const dt = 1 / 30;
  let steps = 0;
  let nextAct = 0;
  bot.act();
  game.startWave();
  while (!game.isOver && steps < 30 * 60 * 40) {
    if (game.time >= nextAct) {
      bot.act();
      bot.powers();
      nextAct = game.time + 2;
    }
    if (save && steps % 900 === 450) {
      const snap = JSON.parse(JSON.stringify(game.serialize()));
      game = Game.restore(snap);
      if (!game) throw new Error(`restore failed on level ${number}`);
      bot = new Bot(game);
    }
    game.update(dt);
    steps++;
  }
  return {
    state: game.state,
    lives: game.lives,
    max: game.maxLives,
    wave: game.waves.current,
    total: game.waves.total,
    stars: game.stars,
    towers: game.towers.length,
    time: Math.round(game.time),
  };
}

// Run only when executed directly (not when imported). Compared as file paths so that
// Windows paths (backslashes, drive letter case) are recognised too.
const entry = process.argv[1] ? resolve(process.argv[1]) : '';
const self = fileURLToPath(import.meta.url);
const isMain = process.platform === 'win32' ? entry.toLowerCase() === self.toLowerCase() : entry === self;
if (isMain) {
  let options;
  try {
    options = readArguments(process.argv.slice(2));
  } catch (error) {
    if (!(error instanceof InvalidInput)) throw error;
    const usage = `node scripts/simulate.mjs [--diff=easy|normal|hard] [--from=1] [--to=${LevelCatalog.count}] [--save]`;
    console.error(`${error.field}: ${error.problem}. Usage: ${usage}`);
    process.exit(2);
  }
  const { diff, from, to, save: checkSave } = options;
  let errors = 0;
  let losses = 0;
  const row = [];
  const t0 = Date.now();
  for (let n = from; n <= to; n++) {
    try {
      const r = play(n, diff, { save: checkSave });
      const ok = r.state === 'won';
      if (!ok) losses++;
      row.push(`${String(n).padStart(3)}:${ok ? `W${r.stars}(${r.lives}/${r.max})` : `L@${r.wave}/${r.total}`}`);
    } catch (e) {
      errors++;
      row.push(`${String(n).padStart(3)}:ERR`);
      console.error(`Level ${n}:`, e);
    }
    if (row.length === 10) {
      console.log(row.join(' '));
      row.length = 0;
    }
  }
  if (row.length) console.log(row.join(' '));
  console.log(`${diff.id}: ${to - from + 1 - losses - errors} won, ${losses} lost, ${errors} errors (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  if (errors || (losses && diff.id !== 'hard')) process.exit(1);
}
