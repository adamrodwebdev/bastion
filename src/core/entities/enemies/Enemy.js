/**
 * @file Base enemy: movement along the path, health, armor, slow.
 */

import { Entity } from '../Entity.js';

/**
 * Base enemy. Subclasses only override static stats or hooks
 * (`onUpdate`) — template-method pattern.
 *
 * Distances are in tiles, speeds in tiles per second.
 */
export class Enemy extends Entity {
  /** Unique type identifier, used by the factory and the save system. */
  static type = 'enemy';
  /** Base stats (tile units, seconds). */
  static stats = { hp: 50, speed: 1.2, reward: 5, damage: 1, armor: 0, radius: 0.28, color: '#888' };

  /**
   * @param {import('../../world/Path.js').Path} path
   * @param {{hpMult?:number, speedMult?:number, rewardMult?:number}} [scaling]
   */
  constructor(path, scaling = {}) {
    const start = path.pointAt(0);
    super(start.x, start.y);
    const s = this.constructor.stats;
    this.type = this.constructor.type;
    this.path = path;
    this.maxHp = Math.round(s.hp * (scaling.hpMult ?? 1));
    this.hp = this.maxHp;
    this.baseSpeed = s.speed * (scaling.speedMult ?? 1);
    this.reward = Math.max(1, Math.round(s.reward * (scaling.rewardMult ?? 1)));
    this.damage = s.damage;
    this.armor = s.armor;
    this.radius = s.radius;
    this.color = s.color;
    this.distance = 0;
    this.angle = start.angle;
    this.slowFactor = 1;
    this.slowTimer = 0;
    this.hitFlash = 0;
    this.reachedEnd = false;
  }

  get hpRatio() {
    return this.hp / this.maxHp;
  }

  /** Remaining distance to the exit — smaller means more dangerous. */
  get remaining() {
    return this.path.length - this.distance;
  }

  get isSlowed() {
    return this.slowTimer > 0;
  }

  /**
   * Applies damage, reduced by armor unless `pierce` is set.
   * @returns {number} damage actually dealt
   */
  takeDamage(amount, { pierce = false } = {}) {
    if (!this.alive) return 0;
    const dealt = pierce ? amount : Math.max(amount * 0.25, amount - this.armor);
    this.hp -= dealt;
    this.hitFlash = 0.08;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
    }
    return dealt;
  }

  applySlow(factor, duration) {
    // Keep the strongest slow, refresh the timer.
    this.slowFactor = Math.min(this.slowFactor, factor);
    this.slowTimer = Math.max(this.slowTimer, duration);
  }

  heal(amount) {
    if (!this.alive) return;
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  /**
   * Moves along the path. Speed = base speed × slow × power modifier (Freeze sets it to 0).
   * Sets `reachedEnd` when the exit is reached; Game then removes lives.
   * @param {number} dt seconds
   * @param {import('../../Game.js').Game} [game] optional so enemies can be tested alone
   */
  update(dt, game) {
    if (this.slowTimer > 0) {
      this.slowTimer -= dt;
      if (this.slowTimer <= 0) this.slowFactor = 1;
    }
    if (this.hitFlash > 0) this.hitFlash -= dt;

    const speedMod = game ? game.powers.modifier('enemySpeed') : 1;
    this.distance += this.baseSpeed * this.slowFactor * speedMod * dt;
    const p = this.path.pointAt(this.distance);
    this.x = p.x;
    this.y = p.y;
    this.angle = p.angle;

    this.onUpdate(dt, game);

    if (this.distance >= this.path.length) {
      this.reachedEnd = true;
      this.alive = false;
    }
  }

  /** Hook for subclasses. */
  // eslint-disable-next-line no-unused-vars
  onUpdate(dt, game) {}

  /** @returns {object} JSON data needed to rebuild the enemy from a save. */
  serialize() {
    return {
      type: this.type,
      hp: this.hp,
      maxHp: this.maxHp,
      distance: this.distance,
      reward: this.reward,
      baseSpeed: this.baseSpeed,
    };
  }

  /**
   * @param {object} data output of serialize()
   * @returns {this}
   */
  restore(data) {
    this.hp = data.hp;
    this.maxHp = data.maxHp;
    this.distance = data.distance;
    this.reward = data.reward;
    this.baseSpeed = data.baseSpeed;
    const p = this.path.pointAt(this.distance);
    this.x = p.x;
    this.y = p.y;
    return this;
  }
}
