/**
 * @file A simple automatic player, used to check that every level can be won.
 *
 * It is not clever, on purpose: if this bot wins a level in Normal, a human
 * who reads the briefing will too. It covers the roads, brings anti-air when
 * flyers come, a watchtower when sappers come, upgrades its towers and fires
 * its powers at the biggest crowd.
 */

import { TowerFactory } from '../src/core/index.js';

export class Bot {
  /**
   * @param {import('../src/core/Game.js').Game} game
   * @param {{owner?:number, usePowers?:boolean, upgradeShare?:number}} [opts]
   */
  constructor(game, { owner = 1, usePowers = true, upgradeShare = 0.55 } = {}) {
    this.game = game;
    this.owner = owner;
    this.usePowers = usePowers;
    this.upgradeShare = upgradeShare;
    this.samples = this._roadSamples();
    this.airSamples = this._airSamples();
    this.plan = this._plan();
    this.step = 0;
  }

  _roadSamples() {
    const pts = [];
    for (const p of this.game.map.paths) for (let d = 0; d < p.length; d += 0.5) pts.push(p.pointAt(d));
    return pts;
  }

  _airSamples() {
    const g = this.game;
    if (!g.level.enemyTypes.some((t) => t === 'crow' || t === 'wyvern')) return [];
    const pts = [];
    for (const p of g.map.airPaths) for (let d = 0; d < p.length; d += 0.5) pts.push(p.pointAt(d));
    return pts;
  }

  _plan() {
    const g = this.game;
    const has = (t) => g.isTowerAllowed(t);
    const enemies = new Set(g.level.enemyTypes);
    const air = ['crow', 'wyvern'].some((t) => enemies.has(t));
    const stealth = enemies.has('sapper');
    const plan = [];
    if (has('archer')) plan.push('archer');
    if (has('barracks')) plan.push('barracks');
    if (has('cannon')) plan.push('cannon');
    if (stealth && has('watch')) plan.push('watch');
    if (has('frost')) plan.push('frost');
    if (air && has('ballista')) plan.push('ballista');
    else if (has('archer')) plan.push('archer');
    if (has('storm')) plan.push('storm');
    if (has('catapult')) plan.push('catapult');
    if (has('fire')) plan.push('fire');
    if (has('ballista') && !plan.includes('ballista')) plan.push('ballista');
    plan.push(has('cannon') ? 'cannon' : 'archer');
    if (air) plan.push(has('storm') ? 'storm' : 'archer');
    return plan;
  }

  /** Best free cell for a tower type: covers the most road. */
  bestCell(type) {
    const g = this.game;
    const T = TowerFactory.get(type);
    const range = type === 'barracks' ? 1.2 : type === 'watch' ? T.levels[0].range : T.levels[0].range || 2;
    const min = T.levels[0].minRange || 0;
    let best = null;
    let bestScore = -1;
    for (let r = 0; r < g.map.rows; r++) {
      for (let c = 0; c < g.map.cols; c++) {
        if (!g.map.isBuildable(c, r)) continue;
        const x = c + 0.5;
        const y = r + 0.5;
        let score = 0;
        if (type === 'watch') {
          for (const t of g.towers) if ((t.x - x) ** 2 + (t.y - y) ** 2 <= range * range) score += 3;
        }
        for (const p of this.samples) {
          const d2 = (p.x - x) ** 2 + (p.y - y) ** 2;
          if (d2 <= range * range && d2 >= min * min) score += 1;
        }
        if (T.targets === 'both' || T.targets === 'air') {
          for (const p of this.airSamples) if ((p.x - x) ** 2 + (p.y - y) ** 2 <= range * range) score += 1.5;
        }
        if (score > bestScore) {
          bestScore = score;
          best = { col: c, row: r };
        }
      }
    }
    return bestScore > 0 ? best : null;
  }

  /** One decision round (called between waves and every few seconds). */
  act() {
    const g = this.game;
    let guard = 0;
    while (guard++ < 30) {
      const mine = g.towers.filter((t) => t.owner === this.owner);
      const gold = g.player(this.owner).gold;
      // Upgrade once the map is reasonably covered.
      if (mine.length >= 5) {
        const t = mine.filter((x) => x.canUpgrade && x.type !== 'treasury').sort((a, b) => a.level - b.level || b.kills - a.kills)[0];
        if (t && gold >= t.upgradePrice && g.random() < this.upgradeShare) {
          g.upgradeTower(t, this.owner);
          continue;
        }
      }
      const type = this.plan[this.step % this.plan.length];
      if (gold < g.priceOf(type)) return;
      const cell = this.bestCell(type);
      if (!cell) {
        this.step += 1;
        if (this.step > this.plan.length * 3) return;
        continue;
      }
      if (g.buildTower(type, cell.col, cell.row, this.owner)) this.step += 1;
      else return;
    }
  }

  /** Fires ready powers at the biggest crowd. */
  powers() {
    const g = this.game;
    if (!this.usePowers || g.state !== 'running') return;
    const alive = g.enemies.filter((e) => e.alive);
    if (alive.length < 6 && !alive.some((e) => e.boss || e.progress > 0.7)) return;
    for (const p of g.powers.powers) {
      if (!p.isReady) continue;
      let target = null;
      if (p.targeted) {
        let best = 0;
        for (const e of alive) {
          if (e.flying && p.id !== 'arrowRain') continue;
          const n = alive.filter((o) => (o.x - e.x) ** 2 + (o.y - e.y) ** 2 < 2).length + e.progress * 3;
          if (n > best) {
            best = n;
            target = { x: e.x, y: e.y };
          }
        }
        if (!target) continue;
      }
      if (p.id === 'blessing' && g.lives === g.maxLives) continue;
      g.activatePower(p.id, target, this.owner);
    }
  }
}
