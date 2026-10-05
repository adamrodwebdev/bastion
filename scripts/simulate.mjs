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
 * (or Easy) by the bot.
 */

import { Game, LevelCatalog, Difficulty, PowerManager } from '../src/core/index.js';
import { Bot } from './Bot.mjs';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);
const diff = Difficulty.get(args.diff || 'normal');
const from = Number(args.from || 1);
const to = Number(args.to || LevelCatalog.count);
const checkSave = Boolean(args.save);

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

export function play(number, difficulty = diff, { save = false, mods = expectedMods(number) } = {}) {
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

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop());
if (isMain) {
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
