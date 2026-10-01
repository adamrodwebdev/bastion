/**
 * @file Base tower: targeting, cooldown, upgrades, selling.
 */

import { Entity } from '../Entity.js';
import { Projectile } from '../Projectile.js';
import { createTargeting } from './Targeting.js';

/**
 * Base tower. Stats per level live in the static `levels` array of each
 * subclass; `fire()` can be overridden for special behaviours.
 */
export class Tower extends Entity {
  static type = 'tower';
  static cost = 50;
  static color = '#888';
  static projectileSpeed = 8;
  /** One entry per upgrade level. */
  static levels = [{ damage: 10, range: 2.5, fireRate: 1 }];

  constructor(col, row) {
    super(col + 0.5, row + 0.5);
    this.col = col;
    this.row = row;
    this.type = this.constructor.type;
    this.level = 1;
    this.invested = this.constructor.cost;
    this.cooldown = 0;
    this.angle = -Math.PI / 2;
    this.kills = 0;
    this.recoil = 0;
    this.targeting = createTargeting('first');
  }

  /** @returns {{damage:number, range:number, fireRate:number, splash?:number}} stats of the current level */
  get stats() {
    return this.constructor.levels[this.level - 1];
  }

  get range() {
    return this.stats.range;
  }

  get maxLevel() {
    return this.constructor.levels.length;
  }

  get canUpgrade() {
    return this.level < this.maxLevel;
  }

  /** Price of the next level: grows with the level (0 when maxed). */
  get upgradePrice() {
    return this.canUpgrade ? Math.round(this.constructor.cost * (0.7 + 0.45 * this.level)) : 0;
  }

  /** Refund when sold: 70 % of the build price plus all upgrades. */
  get sellValue() {
    return Math.floor(this.invested * 0.7);
  }

  /** Damage per second, shown in the UI. */
  get dps() {
    return Math.round(this.stats.damage * this.stats.fireRate);
  }

  /**
   * Raises the level. Does NOT take gold: Game.upgradeTower() handles payment.
   * @returns {boolean}
   */
  upgrade() {
    if (!this.canUpgrade) return false;
    this.invested += this.upgradePrice;
    this.level += 1;
    return true;
  }

  /** @param {'first'|'strongest'|'closest'} id */
  setTargeting(id) {
    this.targeting = createTargeting(id);
  }

  /**
   * Picks a target among the living enemies within range, using the current strategy.
   * @param {import('../enemies/Enemy.js').Enemy[]} enemies
   * @returns {import('../enemies/Enemy.js').Enemy|null}
   */
  findTarget(enemies) {
    const r2 = this.range * this.range;
    const inRange = [];
    for (const e of enemies) {
      if (!e.alive) continue;
      const dx = e.x - this.x;
      const dy = e.y - this.y;
      if (dx * dx + dy * dy <= r2) inRange.push(e);
    }
    return inRange.length ? this.targeting.pick(inRange, this) : null;
  }

  /**
   * Counts down the cooldown and fires when ready.
   * The Overclock power speeds up the cooldown through `towerFireRate`.
   * @param {number} dt seconds
   * @param {import('../../Game.js').Game} game
   */
  update(dt, game) {
    const rateMod = game.powers.modifier('towerFireRate');
    if (this.recoil > 0) this.recoil = Math.max(0, this.recoil - dt * 4);
    this.cooldown -= dt * rateMod;
    if (this.cooldown > 0) return;
    const target = this.findTarget(game.enemies);
    if (!target) {
      this.cooldown = 0;
      return;
    }
    this.angle = Math.atan2(target.y - this.y, target.x - this.x);
    this.fire(target, game);
    this.recoil = 1;
    this.cooldown = 1 / this.stats.fireRate;
  }

  /** Payload delivered by projectiles. Subclasses enrich it. */
  buildPayload() {
    return { damage: this.stats.damage, splash: this.stats.splash || 0, source: this };
  }

  /**
   * Default attack: launches a homing projectile. Override for other behaviours (see LaserTower).
   * @param {import('../enemies/Enemy.js').Enemy} target
   * @param {import('../../Game.js').Game} game
   */
  fire(target, game) {
    game.addProjectile(
      new Projectile({
        x: this.x + Math.cos(this.angle) * 0.3,
        y: this.y + Math.sin(this.angle) * 0.3,
        target,
        speed: this.constructor.projectileSpeed,
        payload: this.buildPayload(),
        color: this.constructor.color,
        size: this.constructor.projectileSize || 0.09,
      }),
    );
  }

  /** @returns {object} JSON data needed to rebuild the tower from a save. */
  serialize() {
    return {
      type: this.type,
      col: this.col,
      row: this.row,
      level: this.level,
      invested: this.invested,
      kills: this.kills,
      targeting: this.targeting.constructor.id,
    };
  }

  /**
   * @param {object} data output of serialize()
   * @returns {this}
   */
  restore(data) {
    this.level = data.level;
    this.invested = data.invested;
    this.kills = data.kills || 0;
    this.setTargeting(data.targeting);
    return this;
  }
}
