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
   *
   * Level design rules (see the senior-level-designer skill):
   * - Sawtooth pacing in 3-wave acts: build-up (×1), spike (×1.2), breather (×0.8).
   * - A new enemy type is first shown alone, in a small group, before the regular groups
   *   (teach → develop → twist), at the wave given by INTRODUCTIONS.
   * - The last wave is a telegraphed climax (boss, or a tank pair in the first level).
   */
  static generateWaves(L) {
    const total = 6 + L;
    const waves = [];
    for (let w = 0; w < total; w++) {
      const isLast = w === total - 1;
      const pace = Level.intensity(w, total);
      const groups = [{ type: 'grunt', count: Math.round((6 + w * 2 + L) * pace), interval: Math.max(0.45, 0.9 - L * 0.06), delay: 0 }];
      if (w >= 1) groups.push({ type: 'runner', count: Math.round((2 + w + L) * pace), interval: 0.5, delay: 2.5 });
      if ((L === 1 && w >= 3) || (L >= 2 && w >= 2) || L >= 3) {
        groups.push({ type: 'tank', count: 1 + Math.floor(w / 2) + Math.floor(L / 2), interval: 2.2, delay: 4 });
      }
      if (L >= 2 && w >= 3) groups.push({ type: 'healer', count: 1 + Math.floor(w / 3), interval: 2.6, delay: 5 });
      if (isLast) {
        if (L === 0) groups.push({ type: 'tank', count: 2, interval: 3, delay: 6 });
        else groups.push({ type: 'boss', count: 1 + Math.floor(L / 3), interval: 6, delay: 8 });
      }
      const intro = Level.INTRODUCTIONS.find((i) => i.level === L && i.wave === w);
      if (intro) {
        // Show the newcomer alone first; the rest of the wave follows a few seconds later.
        for (const g of groups) g.delay += intro.gap;
        groups.unshift({ type: intro.type, count: intro.count, interval: intro.interval, delay: 0 });
      }
      waves.push(groups);
    }
    return waves;
  }

  /**
   * Intensity multiplier of a wave: flat start, then 3-wave acts (normal, spike, breather),
   * and a final push. Applied to the counts of the basic enemies.
   */
  static intensity(w, total) {
    if (w === 0) return 1;
    if (w === total - 1) return 1.1;
    return [1, 1.2, 0.8][(w - 1) % 3];
  }

  /** Where each enemy type is introduced in the campaign, alone, before the usual groups. */
  static INTRODUCTIONS = [
    { level: 0, wave: 1, type: 'runner', count: 3, interval: 0.7, gap: 4 },
    { level: 1, wave: 2, type: 'tank', count: 2, interval: 2, gap: 6 },
    { level: 2, wave: 3, type: 'healer', count: 1, interval: 1, gap: 6 },
  ];
}
