/**
 * @file Level definition and procedural wave generation.
 */

/**
 * A level = a map layout + a list of waves + scaling factors.
 * Difficulty grows across levels (more waves, tougher enemies, shorter roads)
 * and within a level (each wave is stronger than the previous one).
 */
export class Level {
  constructor({ id, index, cols = 15, rows = 10, waypoints, rocks, startGold, theme }) {
    this.id = id;
    this.index = index;
    this.number = index + 1;
    this.cols = cols;
    this.rows = rows;
    this.waypoints = waypoints;
    this.rocks = rocks;
    this.startGold = startGold;
    this.theme = theme;
    this.hpScale = 1 + 0.42 * index;
    this.waves = Level.generateWaves(index);
  }

  get waveCount() {
    return this.waves.length;
  }

  /** HP multiplier of a given wave inside this level. */
  waveHpScale(waveIndex) {
    return this.hpScale * (1 + 0.12 * waveIndex);
  }

  /**
   * Procedural wave composition: each group = { type, count, interval, delay }.
   */
  static generateWaves(L) {
    const total = 6 + L;
    const waves = [];
    for (let w = 0; w < total; w++) {
      const isLast = w === total - 1;
      const groups = [{ type: 'grunt', count: 6 + w * 2 + L, interval: Math.max(0.45, 0.9 - L * 0.06), delay: 0 }];
      if (w >= 1) groups.push({ type: 'runner', count: 2 + w + L, interval: 0.5, delay: 2.5 });
      if ((L === 1 && w >= 3) || (L >= 2 && w >= 2) || L >= 3) {
        groups.push({ type: 'tank', count: 1 + Math.floor(w / 2) + Math.floor(L / 2), interval: 2.2, delay: 4 });
      }
      if (L >= 2 && w >= 3) groups.push({ type: 'healer', count: 1 + Math.floor(w / 3), interval: 2.6, delay: 5 });
      if (isLast) {
        if (L === 0) groups.push({ type: 'tank', count: 2, interval: 3, delay: 6 });
        else groups.push({ type: 'boss', count: 1 + Math.floor(L / 3), interval: 6, delay: 8 });
      }
      waves.push(groups);
    }
    return waves;
  }
}
