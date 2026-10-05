/**
 * @file Builds the waves of a level from a "threat budget".
 *
 * Every enemy type has a `threat` value (how hard it is to stop). Each wave
 * gets a budget that grows with the level and with the wave number, and is
 * filled with enemies picked among those already introduced, favouring the
 * chapter's own troops and any newcomer. The result is deterministic: the same
 * level always gets the same waves.
 */

import { EnemyFactory } from '../entities/enemies/EnemyFactory.js';
import { ENEMY_INTRO } from './unlocks.js';
import { SeededRandom } from '../utils/SeededRandom.js';

/** Types never picked at random (summoned or bosses). */
const SPECIAL = new Set(['skeleton', 'champion', 'mordrac']);
/** Types too tough for the first two waves of a level. */
const HEAVY = new Set(['knight', 'golem', 'ram', 'siege', 'wyvern', 'necromancer']);

/**
 * @typedef {{type:string, count:number, interval:number, delay:number, path:number, air:boolean}} WaveGroup
 */

export class WaveGenerator {
  /**
   * Number of waves of a level.
   * @param {number} number level number (1-100)
   */
  static waveCount(number) {
    if (number <= 2) return 4 + number;
    const index = number - 1;
    const chapter = Math.floor(index / 10);
    const inChapter = index % 10;
    return 7 + Math.floor(chapter * 0.7) + (inChapter >= 5 ? 1 : 0);
  }

  /**
   * Threat budget of a wave.
   * @param {number} number level number (1-100)
   * @param {number} wave 0-based wave index
   */
  static budget(number, wave) {
    const base = 7 + 0.12 * (number - 1);
    return base * (1 + 0.2 * wave);
  }

  /**
   * Enemy types available in a level, with their weights.
   * @param {number} number
   * @param {Record<string, number>} favour chapter preferences
   */
  static roster(number, favour = {}) {
    const out = {};
    for (const [type, intro] of Object.entries(ENEMY_INTRO)) {
      if (SPECIAL.has(type) || intro > number) continue;
      let w = favour[type] ?? 0.6;
      if (intro === number) w = Math.max(w, 3); // the newcomer is the star of its level
      else if (number - intro < 5) w *= 1.5;
      out[type] = w;
    }
    return out;
  }

  /**
   * @param {object} o
   * @param {number} o.number level number (1-100)
   * @param {number} o.roads number of roads of the map
   * @param {Record<string, number>} o.favour chapter preferences
   * @param {number} [o.waves] override of the wave count
   * @returns {WaveGroup[][]}
   */
  static generate({ number, roads, favour }) {
    const rng = new SeededRandom(`waves-${number}`);
    const count = WaveGenerator.waveCount(number);
    const roster = WaveGenerator.roster(number, favour);
    const index = number - 1;
    const isChapterFinal = index % 10 === 9;
    const intro = Object.keys(roster).filter((t) => ENEMY_INTRO[t] === number);
    const waves = [];

    for (let w = 0; w < count; w++) {
      const budget = WaveGenerator.budget(number, w);
      let pool = { ...roster };
      if (w < 2) for (const t of Object.keys(pool)) if (HEAVY.has(t)) delete pool[t];
      if (!Object.keys(pool).length) pool = { grunt: 1 };

      const groupCount = Math.min(Object.keys(pool).length, 1 + (w >= 2 ? 1 : 0) + (w >= 5 && rng.next() < 0.5 ? 1 : 0));
      const picked = [];
      // A newcomer shows up from the second wave of its intro level.
      if (intro.length && w >= 1 && w % 2 === 1) picked.push(intro[0]);
      while (picked.length < groupCount) {
        const t = rng.weighted(pool);
        delete pool[t];
        if (!picked.includes(t)) picked.push(t);
        if (!Object.keys(pool).length) break;
      }

      const groups = picked.map((type, g) => {
        const stats = EnemyFactory.get(type).stats;
        const share = budget / picked.length;
        const n = Math.max(1, Math.min(32, Math.round(share / stats.threat)));
        const spacing = type === 'wolf' ? 0.3 : Math.min(2.6, Math.max(0.4, 0.3 + stats.threat * 0.18)) / Math.max(0.6, stats.speed);
        return {
          type,
          count: n,
          interval: Math.round(spacing * 100) / 100,
          delay: g * 2.5,
          path: (w + g) % roads,
          air: stats.flying,
        };
      });

      if (isChapterFinal && w === count - 1) {
        // Boss wave: the chapter's champion (Mordrac himself in the last level).
        groups.push({ type: number === 100 ? 'mordrac' : 'champion', count: 1, interval: 1, delay: 6, path: 0, air: false });
        if (number === 100) groups.push({ type: 'champion', count: 2, interval: 8, delay: 14, path: Math.min(1, roads - 1), air: false });
      }
      waves.push(groups);
    }
    return waves;
  }
}
