/**
 * @file Training: four short guided lessons for new players, on small maps
 * made for them. Gontran explains, a golden ring shows what to touch, and the
 * lesson moves on as soon as the player has done it.
 *
 * A lesson describes its map, its towers, its gold, its waves and its script.
 * Each script step has:
 *  - `key`    text under `training.steps.<lesson>.` in the translations;
 *  - `target` optional `data-tutorial` name of the interface element to point at;
 *  - `cell`   optional [col, row] of the board tile to point at;
 *  - `cellFree` hide the tile hint once a tower stands on it;
 *  - `next`   true for an explanation closed with a "Next" button;
 *  - `when`   optional test: wait for the right moment before showing the step;
 *  - `done`   test on the game: the step is over when it returns true.
 */

import { Level } from '../config/Level.js';

const W = (type, count, interval = 1.2, delay = 0) => ({ type, count, interval, delay, path: 0, air: type === 'crow' || type === 'wyvern' });

const towerAt = (c, cell) => c.game.towers.find((t) => t.col === cell[0] && t.row === cell[1]);
const waveCleared = (c, n) => c.game.waves.current >= n && !c.game.waves.spawning && c.game.enemies.every((e) => !e.alive);

export const LESSONS = [
  {
    id: 't1',
    icon: 'hammer',
    path: [[-1, 4], [5, 4], [5, 2], [10, 2], [10, 6], [16, 6]],
    towers: ['archer'],
    gold: 200,
    loadout: [],
    waves: [[W('grunt', 4, 1.6)], [W('grunt', 6, 1.2)], [W('grunt', 6, 1), W('runner', 3, 1, 4)]],
    steps: [
      { key: 'welcome', next: true, done: () => false },
      { key: 'tile', cell: [6, 3], done: (c) => c.selected?.col === 6 && c.selected?.row === 3 || c.game.towers.length > 0 },
      { key: 'shop', target: 'shop-archer', done: (c) => c.game.towers.length > 0 },
      { key: 'second', cell: [9, 3], done: (c) => c.game.towers.length > 1 },
      { key: 'wave', target: 'wave', done: (c) => c.game.state === 'running' },
      { key: 'watch', when: (c) => c.game.enemies.length > 0, next: true, done: () => false },
      { key: 'select', cell: [6, 3], when: (c) => waveCleared(c, 1), done: (c) => Boolean(c.selectedTower) || c.game.stats.upgrades > 0 },
      { key: 'upgrade', target: 'upgrade', done: (c) => c.game.stats.upgrades > 0 },
      { key: 'more', target: 'wave', done: (c) => c.game.waves.current >= 2 },
      { key: 'finish', when: (c) => c.game.waves.current >= 2, next: true, done: () => false },
    ],
  },
  {
    id: 't2',
    icon: 'shield',
    path: [[-1, 2], [4, 2], [4, 6], [11, 6], [11, 2], [16, 2]],
    towers: ['archer', 'barracks'],
    gold: 260,
    loadout: [],
    waves: [[W('grunt', 6, 1.2)], [W('runner', 8, 0.7)], [W('grunt', 6, 1), W('shield', 3, 1.8, 5)]],
    steps: [
      { key: 'intro', next: true, done: () => false },
      { key: 'barracks', cell: [5, 5], target: 'shop-barracks', done: (c) => c.game.towers.some((t) => t.type === 'barracks') },
      { key: 'soldiers', next: true, done: () => false },
      { key: 'archers', cell: [7, 5], done: (c) => c.game.towers.some((t) => t.type === 'archer') },
      { key: 'range', cell: [7, 5], done: (c) => c.selectedTower?.type === 'archer' },
      { key: 'targeting', target: 'targeting', done: (c) => c.game.towers.some((t) => t.targeting.constructor.id !== 'first') },
      { key: 'wave', target: 'wave', done: (c) => c.game.state === 'running' },
      { key: 'sell', when: (c) => waveCleared(c, 1), next: true, done: () => false },
      { key: 'finish', when: (c) => c.game.waves.current >= 3, next: true, done: () => false },
    ],
  },
  {
    id: 't3',
    icon: 'bolt',
    path: [[-1, 6], [3, 6], [3, 2], [8, 2], [8, 6], [13, 6], [13, 3], [16, 3]],
    towers: ['archer', 'cannon'],
    gold: 300,
    loadout: ['arrowRain', 'freeze'],
    waves: [[W('grunt', 8, 1)], [W('grunt', 10, 0.8), W('wolf', 6, 0.4, 3)], [W('runner', 10, 0.6), W('grunt', 10, 0.8, 2)], [W('shield', 6, 1.2), W('grunt', 10, 0.7, 3)]],
    steps: [
      { key: 'intro', next: true, done: () => false },
      { key: 'build', cell: [4, 3], cellFree: true, done: (c) => c.game.towers.length >= 2 },
      { key: 'wave', target: 'wave', done: (c) => c.game.state === 'running' },
      { key: 'speed', target: 'speed', when: (c) => c.game.enemies.length > 0, done: (c) => c.speed > 1 },
      { key: 'early', target: 'wave', when: (c) => c.game.countdown !== null && c.game.countdown > 4, done: (c) => c.game.stats.earlyCalls >= 1 || c.game.waves.current >= 3 },
      { key: 'power', target: 'power-arrowRain', when: (c) => c.game.enemies.filter((e) => e.alive).length >= 5, done: (c) => Boolean(c.aiming) || (c.game.powers.get('arrowRain')?.uses || 0) > 0 },
      { key: 'aim', when: (c) => Boolean(c.aiming), done: (c) => (c.game.powers.get('arrowRain')?.uses || 0) > 0 },
      { key: 'cooldown', next: true, done: () => false },
      { key: 'freeze', target: 'power-freeze', when: (c) => c.game.enemies.filter((e) => e.alive).length >= 6, done: (c) => (c.game.powers.get('freeze')?.uses || 0) > 0 },
      { key: 'pause', target: 'pause', next: true, done: () => false },
      { key: 'finish', when: (c) => c.game.waves.current >= 4, next: true, done: () => false },
    ],
  },
  {
    id: 't4',
    icon: 'eye',
    path: [[-1, 4], [4, 4], [4, 1], [9, 1], [9, 7], [13, 7], [13, 4], [16, 4]],
    towers: ['archer', 'cannon', 'frost', 'watch', 'ballista'],
    gold: 420,
    loadout: ['arrowRain'],
    waves: [[W('crow', 5, 1.4)], [W('sapper', 4, 1.6), W('grunt', 4, 1.2, 2)], [W('knight', 3, 2.4), W('grunt', 6, 1, 3)], [W('crow', 4, 1), W('sapper', 3, 1.6, 2), W('knight', 2, 3, 4)]],
    steps: [
      { key: 'intro', next: true, done: () => false },
      { key: 'info', target: 'next-wave', next: true, done: () => false },
      { key: 'flyers', target: 'shop-archer', done: (c) => c.game.towers.some((t) => t.type === 'archer' || t.type === 'ballista') },
      { key: 'wave', target: 'wave', done: (c) => c.game.state === 'running' },
      { key: 'sappers', target: 'shop-watch', when: (c) => c.game.waves.current >= 1 && !c.game.waves.currentWaveSpawning && c.game.enemies.every((e) => !e.alive), done: (c) => c.game.towers.some((t) => t.type === 'watch') },
      { key: 'next2', target: 'wave', done: (c) => c.game.waves.current >= 2 },
      { key: 'armor', target: 'shop-frost', when: (c) => c.game.waves.current >= 2 && !c.game.waves.currentWaveSpawning, done: (c) => c.game.towers.some((t) => t.type === 'frost') },
      { key: 'types', next: true, done: () => false },
      { key: 'finish', when: (c) => c.game.waves.current >= 4, next: true, done: () => false },
    ],
  },
];

/** Crowns earned the first time a lesson is completed. */
export const TRAINING_REWARD = 25;

export function lessonById(id) {
  return LESSONS.find((l) => l.id === id) || null;
}

/** A Level object for a lesson (meadow look, gentle economy). */
export function trainingLevel(lesson) {
  return new Level(1, {
    id: lesson.id,
    training: lesson.id,
    paths: [lesson.path],
    roads: 1,
    rocks: [[1, 1], [14, 8], [0, 8], [15, 0]],
    water: [],
    towers: lesson.towers,
    newTowers: [],
    newEnemies: [],
    startGold: lesson.gold,
    boss: null,
    isChapterFinal: false,
    waves: lesson.waves,
  });
}

/**
 * Runs a lesson's script; same interface as Tutorial (current / dismiss).
 */
export class TrainingScript {
  constructor(lesson) {
    this.lesson = lesson;
    this.step = 0;
    this.acked = false;
    this.finished = [];
    this.skipped = false;
  }

  get active() {
    return !this.skipped && this.step < this.lesson.steps.length;
  }

  /**
   * @param {object} ctx { game, selected, selectedTower, armedType, speed, aiming }
   * @returns {{key:string, params:object, target?:string, cell?:number[], next?:boolean}|null}
   */
  current(ctx) {
    if (this.skipped) return null;
    while (this.step < this.lesson.steps.length) {
      const s = this.lesson.steps[this.step];
      if ((s.next && this.acked) || (!s.next && s.done(ctx))) {
        this.step += 1;
        this.acked = false;
        continue;
      }
      if (s.when && !s.when(ctx)) return null;
      const cell = s.cellFree && s.cell && towerAt(ctx, s.cell) ? undefined : s.cell;
      return { key: `training.steps.${this.lesson.id}.${s.key}`, params: {}, target: s.target, cell, next: Boolean(s.next), raw: true };
    }
    return null;
  }

  /** "Next" on an explanation step. */
  ack() {
    this.acked = true;
  }

  /** The player closed the coach: no more guidance for this lesson. */
  dismiss() {
    this.skipped = true;
  }
}

export { towerAt };
