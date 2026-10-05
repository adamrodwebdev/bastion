/**
 * @file Duel on one screen: two players, two boards, endless waves, and troops
 * bought to attack the other player.
 *
 * Both boards receive exactly the same waves at the same time. Each player may
 * also spend gold to SEND enemies onto the other board; every troop sent also
 * raises the sender's income, paid at the start of each wave (the classic
 * "send to earn" rule of versus tower defense). The last player standing wins.
 */

import { EventEmitter } from '../utils/EventEmitter.js';
import { Game } from '../Game.js';
import { Level } from '../config/Level.js';
import { Difficulty } from '../config/Difficulty.js';
import { EnemyFactory } from '../entities/enemies/EnemyFactory.js';
import { SeededRandom } from '../utils/SeededRandom.js';

/** Troops that can be sent: price, how many come, and income gained per send. */
export const SENDABLE = Object.freeze({
  grunt: { cost: 30, count: 3, income: 3, from: 0 },
  runner: { cost: 35, count: 3, income: 3, from: 0 },
  crow: { cost: 50, count: 2, income: 5, from: 2 },
  sapper: { cost: 60, count: 2, income: 6, from: 3 },
  knight: { cost: 90, count: 1, income: 9, from: 4 },
  golem: { cost: 160, count: 1, income: 16, from: 6 },
});

/** Arenas: campaign levels whose map is used for duels (one road, readable). */
export const ARENAS = Object.freeze([1, 3, 12, 18, 27, 34, 43, 57]);

/** Enemies that join the endless waves, by wave number. */
const ROSTER = [
  ['grunt', 0],
  ['runner', 1],
  ['wolf', 2],
  ['shield', 3],
  ['crow', 4],
  ['priest', 5],
  ['knight', 6],
  ['sapper', 7],
  ['berserker', 8],
  ['wyvern', 10],
  ['golem', 12],
  ['necromancer', 14],
  ['warlock', 16],
];

export class DuelMatch extends EventEmitter {
  /** Seconds to build before the first wave. */
  static PREPARE = 20;
  static START_GOLD = 300;
  static BASE_INCOME = 20;

  /**
   * @param {{arena?:number}} [o] campaign level number used as map
   */
  constructor({ arena = ARENAS[0] } = {}) {
    super();
    const extraWave = (i) => DuelMatch.wave(i);
    const level = new Level(arena, {
      waves: [],
      startGold: DuelMatch.START_GOLD,
      towers: ['archer', 'barracks', 'cannon', 'frost', 'ballista', 'watch', 'treasury', 'catapult', 'fire', 'storm'],
      waveHpScale: (w) => 1 + 0.12 * w + 0.004 * w * w,
      rewardMult: 1,
    });
    this.level = level;
    this.games = [1, 2].map(
      (p) =>
        new Game({
          level,
          difficulty: Difficulty.NORMAL,
          loadout: ['arrowRain', 'freeze'],
          players: 1,
          endless: true,
          extraWave,
          seed: `duel-${p}`,
        }),
    );
    this.income = [DuelMatch.BASE_INCOME, DuelMatch.BASE_INCOME];
    this.sent = [0, 0];
    this.prepare = DuelMatch.PREPARE;
    this.winner = null;
    this.games.forEach((g, i) => {
      g.on('waveStart', () => {
        g.earn(1, this.income[i], 'income');
        this.emit('income', { player: i + 1, amount: this.income[i] });
      });
      g.on('lost', () => this._finish(i === 0 ? 2 : 1));
    });
  }

  /** Waves of the duel: a growing budget, enemies joining over time. */
  static wave(index) {
    const rng = new SeededRandom(`duel-wave-${index}`);
    const pool = ROSTER.filter(([, from]) => index >= from).map(([t]) => t);
    const budget = 8 * (1 + 0.28 * index);
    const groups = [];
    const kinds = Math.min(pool.length, 1 + Math.floor(index / 3));
    const picked = rng.shuffle([...pool]).slice(0, kinds);
    picked.forEach((type, g) => {
      const s = EnemyFactory.get(type).stats;
      groups.push({ type, count: Math.max(1, Math.round(budget / picked.length / s.threat)), interval: Math.max(0.35, 0.3 + s.threat * 0.15), delay: g * 2, path: 0, air: s.flying });
    });
    if (index > 0 && index % 10 === 9) groups.push({ type: 'champion', count: 1, interval: 1, delay: 5, path: 0, air: false });
    return groups;
  }

  get over() {
    return this.winner !== null;
  }

  get started() {
    return this.prepare <= 0;
  }

  /** Can this player send this troop now? */
  canSend(player, type) {
    const s = SENDABLE[type];
    const g = this.games[player - 1];
    return Boolean(s) && this.started && !this.over && g.gold >= s.cost && g.waves.current > s.from;
  }

  /**
   * Buys troops and sends them onto the other board.
   * @param {1|2} player sender
   * @param {string} type key of SENDABLE
   */
  send(player, type) {
    if (!this.canSend(player, type)) return false;
    const s = SENDABLE[type];
    const me = this.games[player - 1];
    const other = this.games[2 - player];
    me.gold -= s.cost;
    me.stats.goldSpent += s.cost;
    this.income[player - 1] += s.income;
    this.sent[player - 1] += s.count;
    other.inject(type, s.count);
    this.emit('send', { player, type, count: s.count });
    return true;
  }

  update(dt) {
    if (this.over) return;
    if (this.prepare > 0) {
      this.prepare -= dt;
      if (this.prepare <= 0) {
        for (const g of this.games) g.startWave();
        this.emit('start');
      }
    }
    for (const g of this.games) g.update(dt);
  }

  set paused(v) {
    for (const g of this.games) g.paused = v;
  }

  _finish(winner) {
    if (this.over) return;
    this.winner = winner;
    const w = this.games[winner - 1];
    if (!w.isOver) w.state = 'won';
    this.emit('over', { winner, waves: Math.max(...this.games.map((g) => g.waves.current)) });
  }
}
