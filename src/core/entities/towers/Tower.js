/**
 * @file Base tower: targeting, cooldown, upgrades (3 levels + elite mastery), selling.
 */

import { Entity } from '../Entity.js';
import { Projectile } from '../Projectile.js';
import { createTargeting } from './Targeting.js';
import { DAMAGE } from '../../config/damage.js';

/**
 * Base tower. Stats per level live in the static `levels` array of each
 * subclass, plus an optional `elite` level (the "mastery") that must first be
 * unlocked in the workshop. `fire()` can be overridden for special attacks.
 *
 * `targets` says what the tower can hit: 'ground', 'air', 'both' or 'none'
 * (support towers). Invisible enemies can only be targeted once revealed.
 */
export class Tower extends Entity {
  static type = 'tower';
  static cost = 50;
  static color = '#888';
  static targets = 'both';
  static dtype = DAMAGE.PHYSICAL;
  /** 'attack' | 'barracks' | 'support' | 'economy' (UI grouping). */
  static category = 'attack';
  static projectile = { speed: 8, size: 0.09, kind: 'ball', arc: 0 };
  /** One entry per normal level (1 to 3). */
  static levels = [{ damage: 10, range: 2.5, fireRate: 1 }];
  /** Mastery level stats (level 4), or null. */
  static elite = null;

  /**
   * @param {number} col
   * @param {number} row
   * @param {{owner?:number, eliteUnlocked?:boolean, priceFactor?:number}} [opts]
   */
  constructor(col, row, { owner = 1, eliteUnlocked = false, priceFactor = 1 } = {}) {
    super(col + 0.5, row + 0.5);
    this.col = col;
    this.row = row;
    this.type = this.constructor.type;
    this.owner = owner;
    this.eliteUnlocked = eliteUnlocked;
    this.priceFactor = priceFactor;
    this.level = 1;
    this.invested = this.buildPrice;
    this.cooldown = 0;
    this.angle = -Math.PI / 2;
    this.kills = 0;
    this.damageDealt = 0;
    this.recoil = 0;
    this.rangeBuff = 0; // set every frame by nearby watchtowers
    this.critChance = 0; // set every frame by an elite watchtower
    this.targeting = createTargeting('first');
  }

  /** Price paid to build this tower (with workshop discounts). */
  get buildPrice() {
    return Math.round(this.constructor.cost * this.priceFactor);
  }

  get baseLevels() {
    return this.constructor.levels.length;
  }

  get isElite() {
    return this.level > this.baseLevels;
  }

  get stats() {
    return this.isElite ? this.constructor.elite : this.constructor.levels[this.level - 1];
  }

  get range() {
    return (this.stats.range || 0) * (1 + this.rangeBuff);
  }

  get maxLevel() {
    return this.baseLevels + (this.eliteUnlocked && this.constructor.elite ? 1 : 0);
  }

  get canUpgrade() {
    return this.level < this.maxLevel;
  }

  /** Price of the next level (0 when maxed). The mastery costs more. */
  get upgradePrice() {
    if (!this.canUpgrade) return 0;
    const c = this.constructor.cost;
    const raw = this.level >= this.baseLevels ? c * 1.9 : c * (0.7 + 0.45 * this.level);
    return Math.round(raw * this.priceFactor);
  }

  /** Damage per second, shown in the UI. */
  get dps() {
    const s = this.stats;
    return Math.round((s.damage || 0) * (s.fireRate || 0) * (s.shots || 1));
  }

  /** Raises the level. Does NOT take gold: Game#upgradeTower() handles payment. */
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

  /** Can this tower attack this enemy right now? */
  canHit(enemy) {
    if (!enemy.targetable) return false;
    const t = this.constructor.targets;
    if (t === 'none') return false;
    if (enemy.flying) return t !== 'ground';
    return t !== 'air';
  }

  /** Enemies closer than this cannot be targeted (catapult). */
  get minRange() {
    return this.stats.minRange || 0;
  }

  /**
   * Living, visible enemies within range that this tower can hit.
   * @param {import('../enemies/Enemy.js').Enemy[]} enemies
   */
  candidates(enemies) {
    const r2 = this.range * this.range;
    const m2 = this.minRange * this.minRange;
    const out = [];
    for (const e of enemies) {
      if (!this.canHit(e)) continue;
      const d2 = (e.x - this.x) ** 2 + (e.y - this.y) ** 2;
      if (d2 <= r2 && d2 >= m2) out.push(e);
    }
    return out;
  }

  /** Picks a target with the current strategy, or null. */
  findTarget(enemies) {
    const c = this.candidates(enemies);
    return c.length ? this.targeting.pick(c, this) : null;
  }

  /** Called once by Game when the tower is placed on the map. */
  // eslint-disable-next-line no-unused-vars
  onPlaced(game) {}

  /** Called by Game after an upgrade. */
  // eslint-disable-next-line no-unused-vars
  onUpgraded(game) {}

  /** Called by Game before the tower is removed (sold). */
  // eslint-disable-next-line no-unused-vars
  onRemoved(game) {}

  /** Called by Game when a new wave starts. */
  // eslint-disable-next-line no-unused-vars
  onWaveStart(game) {}

  /**
   * Counts down the cooldown and fires when ready. The Rally power speeds the
   * cooldown up through `game.towerRateModifier()`.
   */
  update(dt, game) {
    if (this.recoil > 0) this.recoil = Math.max(0, this.recoil - dt * 4);
    if (this.constructor.targets === 'none') return;
    this.cooldown -= dt * game.towerRateModifier(this);
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

  /**
   * Damage of one hit, with workshop bonuses and a possible critical hit.
   * @returns {{damage:number, crit:boolean}}
   */
  rollDamage(game) {
    const base = this.stats.damage * game.damageModifier(this.constructor.dtype, this);
    const crit = this.critChance > 0 && game.random() < this.critChance;
    return { damage: crit ? base * 2 : base, crit };
  }

  /** Payload delivered by projectiles. Subclasses enrich it. */
  buildPayload(game) {
    const { damage, crit } = this.rollDamage(game);
    const s = this.stats;
    return {
      damage,
      crit,
      dtype: this.constructor.dtype,
      splash: s.splash ? s.splash * game.modifier('splash') : 0,
      pierce: false,
      source: this,
      owner: this.owner,
      cause: `tower:${this.type}`,
    };
  }

  /** Default attack: launches a projectile at the target. */
  fire(target, game) {
    const p = this.constructor.projectile;
    game.addProjectile(
      new Projectile({
        x: this.x + Math.cos(this.angle) * 0.3,
        y: this.y + Math.sin(this.angle) * 0.3,
        target,
        speed: p.speed,
        payload: this.buildPayload(game),
        color: this.constructor.color,
        size: p.size,
        kind: p.kind,
        arc: p.arc,
      }),
    );
  }

  /** @returns {object} JSON data needed to rebuild the tower from a save. */
  serialize() {
    return {
      type: this.type,
      col: this.col,
      row: this.row,
      owner: this.owner,
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
    this.level = Math.min(data.level, this.maxLevel);
    this.invested = data.invested;
    this.kills = data.kills || 0;
    this.setTargeting(data.targeting);
    return this;
  }
}
