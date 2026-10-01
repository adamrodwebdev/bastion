/**
 * @file Headless balance test (npm test).
 */

/**
 * Headless balance test: a simple bot plays every level in every difficulty
 * using only the engine (no DOM). Run with `npm test`.
 *
 * It checks that the engine runs without errors, that save/restore works,
 * and prints win/loss so the difficulty curve can be tuned.
 */
import { Game, LevelCatalog, Difficulty, TowerFactory, PowerManager } from '../src/core/index.js';

function botBuild(game, plan) {
  // Build next tower of the plan on the buildable cell closest to the most path cells.
  let guard = 0;
  while (guard++ < 20) {
    const type = plan[game.towers.length % plan.length];
    // Prefer upgrading once we have a few towers.
    if (game.towers.length >= 6) {
      const t = game.towers.filter((x) => x.canUpgrade).sort((a, b) => a.level - b.level)[0];
      if (t && game.gold >= t.upgradePrice && Math.random() < 0.6) {
        game.upgradeTower(t);
        continue;
      }
    }
    if (!game.canAfford(type)) return;
    const cell = bestCell(game, TowerFactory.get(type).levels[0].range);
    if (!cell) return;
    game.buildTower(type, cell.col, cell.row);
  }
}

function bestCell(game, range) {
  let best = null;
  let bestScore = -1;
  for (let r = 0; r < game.map.rows; r++) {
    for (let c = 0; c < game.map.cols; c++) {
      if (!game.map.isBuildable(c, r)) continue;
      let score = 0;
      for (const key of game.map.pathCells) {
        const [pc, pr] = key.split(',').map(Number);
        if ((pc - c) ** 2 + (pr - r) ** 2 <= range * range) score++;
      }
      if (score > bestScore) {
        bestScore = score;
        best = { col: c, row: r };
      }
    }
  }
  return best;
}

function play(levelIndex, difficulty, { usePowers = true, saveRoundTrip = false } = {}) {
  const level = LevelCatalog.get(levelIndex);
  let game = new Game({ level, difficulty, unlockedPowers: PowerManager.unlockedFor(levelIndex) });
  const plan = ['arrow', 'arrow', 'cannon', 'frost', 'arrow', 'laser', 'cannon'];
  const dt = 1 / 60;
  let steps = 0;
  while (!game.isOver && steps < 60 * 60 * 30) {
    if (game.state === 'building') {
      botBuild(game, plan);
      if (saveRoundTrip) {
        const snap = JSON.parse(JSON.stringify(game.serialize()));
        game = Game.restore(snap);
      }
      game.startWave();
    }
    if (usePowers && game.state === 'wave' && game.enemies.length > 8) {
      for (const p of game.powers.powers) if (p.isReady) game.activatePower(p.id);
    }
    if (saveRoundTrip && steps % 600 === 300 && game.state === 'wave') {
      game = Game.restore(JSON.parse(JSON.stringify(game.serialize())));
    }
    game.update(dt);
    steps++;
  }
  return { state: game.state, lives: game.lives, wave: game.waves.current, total: game.waves.total, stars: game.stars, towers: game.towers.length };
}

let errors = 0;
for (const d of Difficulty.all()) {
  const row = [];
  for (let i = 0; i < LevelCatalog.count; i++) {
    try {
      const r = play(i, d, { saveRoundTrip: i === 2 });
      row.push(`${i + 1}:${r.state === 'won' ? `W★${r.stars}(${r.lives})` : `L@${r.wave}/${r.total}`}`);
    } catch (e) {
      errors++;
      row.push(`${i + 1}:ERR`);
      console.error(e);
    }
  }
  console.log(d.id.padEnd(7), row.join('  '));
}
if (errors) process.exit(1);
