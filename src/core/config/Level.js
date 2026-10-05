/**
 * @file Level definition: map, decor, economy and waves.
 */

import { SeededRandom } from '../utils/SeededRandom.js';
import { GRID, TEMPLATES, transform } from './mapTemplates.js';
import { chapterOf, LEVELS_PER_CHAPTER } from './chapters.js';
import { WaveGenerator } from './WaveGenerator.js';
import { towersFor, newEnemiesIn, newTowersIn } from './unlocks.js';
import { GameMap } from '../world/GameMap.js';

/**
 * A campaign level. Everything is derived from its number, so the 100 levels
 * weigh nothing in the bundle and are identical on every device.
 *
 * Difficulty grows across levels (more and tougher enemies, shorter roads,
 * several entrances) and within a level (each wave is bigger than the last).
 */
export class Level {
  /**
   * @param {number} number 1 to 100
   * @param {object} [overrides] fields to replace (custom levels, tests)
   */
  constructor(number, overrides = {}) {
    const chapter = chapterOf(number);
    const index = number - 1;
    const inChapter = index % LEVELS_PER_CHAPTER;
    const rng = new SeededRandom(`level-${number}`);

    this.number = number;
    this.index = index;
    this.id = `l${number}`;
    this.chapter = chapter.id;
    this.inChapter = inChapter;
    this.theme = chapter.theme;
    this.cols = GRID.cols;
    this.rows = GRID.rows;
    this.isChapterFinal = inChapter === LEVELS_PER_CHAPTER - 1;
    this.boss = this.isChapterFinal ? (number === 100 ? 'mordrac' : 'champion') : null;

    // Map: the chapter's layout for this slot, mirrored in one of four ways.
    this.layout = chapter.layouts[inChapter];
    const template = TEMPLATES[this.layout];
    const flip = number <= 2 ? 0 : rng.int(0, 3);
    this.flip = { x: Boolean(flip & 1), y: Boolean(flip & 2) };
    this.paths = transform(template.paths, this.flip);
    this.roads = template.roads;
    const decor = Level.decorate(this.paths, chapter, rng);
    this.rocks = decor.rocks;
    this.water = decor.water;

    // Economy and enemy strength.
    // Enemies get tougher, and the gold they bring grows almost as fast, so
    // the challenge comes mostly from new enemies, short roads and several
    // entrances rather than from raw numbers.
    this.hpScale = 1 + 0.045 * index;
    this.rewardMult = this.hpScale ** 0.85;
    this.startGold = Math.round((240 * this.hpScale ** 0.75 + (this.roads - 1) * 70) / 10) * 10;
    this.towers = towersFor(number);
    this.newEnemies = newEnemiesIn(number);
    this.newTowers = newTowersIn(number);
    this.favour = chapter.favour;
    this._waves = null;
    Object.assign(this, overrides);
  }

  /** Waves are generated on first use (the level list is built at start-up). */
  get waves() {
    if (!this._waves) this._waves = WaveGenerator.generate({ number: this.number, roads: this.roads, favour: this.favour });
    return this._waves;
  }

  set waves(value) {
    this._waves = value;
  }

  get waveCount() {
    return this.waves.length;
  }

  /** Every enemy type met in the level. */
  get enemyTypes() {
    const set = new Set();
    for (const w of this.waves) for (const g of w) set.add(g.type);
    if (set.has('necromancer')) set.add('skeleton');
    if (set.has('siege')) set.add('grunt');
    return [...set];
  }

  /** HP multiplier of a given wave inside this level. */
  waveHpScale(waveIndex) {
    return this.hpScale * (1 + 0.06 * waveIndex);
  }

  /** Data for GameMap. */
  get mapConfig() {
    return { cols: this.cols, rows: this.rows, paths: this.paths, rocks: this.rocks, water: this.water };
  }

  /**
   * Rocks and water: placed on free cells, mostly away from the road so the
   * best spots stay buildable.
   */
  static decorate(paths, chapter, rng) {
    const probe = new GameMap({ cols: GRID.cols, rows: GRID.rows, paths });
    const nearRoad = (c, r) => {
      for (let dc = -1; dc <= 1; dc++) for (let dr = -1; dr <= 1; dr++) if (probe.isPath(c + dc, r + dr)) return true;
      return false;
    };
    const free = probe.buildableCells();
    const far = rng.shuffle(free.filter(([c, r]) => !nearRoad(c, r)));
    const near = rng.shuffle(free.filter(([c, r]) => nearRoad(c, r)));
    const used = new Set();
    const key = (c, r) => `${c},${r}`;

    const water = [];
    let budget = chapter.water;
    while (budget > 0 && far.length) {
      // A pond: a seed cell and a few neighbours.
      const [sc, sr] = far.pop();
      const cluster = [[sc, sr]];
      for (const [dc, dr] of rng.shuffle([[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1]])) {
        if (cluster.length >= Math.min(budget, 4)) break;
        const c = sc + dc;
        const r = sr + dr;
        if (probe.isBuildable(c, r) && !nearRoad(c, r) && !used.has(key(c, r))) cluster.push([c, r]);
      }
      for (const [c, r] of cluster) {
        if (used.has(key(c, r))) continue;
        used.add(key(c, r));
        water.push([c, r]);
        budget -= 1;
      }
    }

    const rocks = [];
    const nearShare = Math.round(chapter.rocks * 0.3);
    for (const [list, n] of [
      [near, nearShare],
      [far, chapter.rocks - nearShare],
    ]) {
      let placed = 0;
      while (placed < n && list.length) {
        const [c, r] = list.pop();
        if (used.has(key(c, r))) continue;
        used.add(key(c, r));
        rocks.push([c, r]);
        placed += 1;
      }
    }
    return { rocks, water };
  }
}
