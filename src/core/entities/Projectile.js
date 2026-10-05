/**
 * @file Projectiles fired by towers: arrows, cannonballs, bolts, rocks, fire pots.
 */

import { Entity } from './Entity.js';

/**
 * A projectile flies towards its target and hands its payload to the game on
 * impact (Game#resolveHit resolves damage, splash and status effects).
 *
 *  - homing (default): follows the target while it is alive.
 *  - lobbed (`arc` > 0): aimed at where the target will be, flies in a curve and
 *    lands on the ground there (catapult): it can miss a fast enemy.
 */
export class Projectile extends Entity {
  /**
   * @param {object} o
   * @param {number} o.x
   * @param {number} o.y
   * @param {import('./enemies/Enemy.js').Enemy} o.target
   * @param {number} o.speed tiles per second
   * @param {object} o.payload see Game#resolveHit
   * @param {string} o.color
   * @param {number} [o.size]
   * @param {string} [o.kind] drawing style: 'arrow' | 'ball' | 'bolt' | 'rock' | 'fire' | 'orb'
   * @param {number} [o.arc] height of the curve (0 = straight)
   */
  constructor({ x, y, target, speed, payload, color, size = 0.09, kind = 'ball', arc = 0 }) {
    super(x, y);
    this.target = target;
    this.speed = speed;
    this.payload = payload;
    this.color = color;
    this.size = size;
    this.kind = kind;
    this.arc = arc;
    this.homing = arc === 0;
    this.sx = x;
    this.sy = y;
    if (this.homing) {
      this.tx = target.x;
      this.ty = target.y;
    } else {
      // Lead the target: where will it be when the rock lands?
      const flight = Math.hypot(target.x - x, target.y - y) / speed;
      const ahead = target.path.pointAt(target.distance + target.baseSpeed * target.slowFactor * flight * 0.85);
      this.tx = ahead.x;
      this.ty = ahead.y;
      this.total = Math.max(0.01, Math.hypot(this.tx - x, this.ty - y));
    }
    this.angle = Math.atan2(this.ty - y, this.tx - x);
    this.height = 0;
  }

  update(dt, game) {
    if (this.homing) {
      if (this.target && this.target.alive) {
        this.tx = this.target.x;
        this.ty = this.target.y;
      } else {
        this.target = null;
      }
    }
    const dx = this.tx - this.x;
    const dy = this.ty - this.y;
    const d = Math.hypot(dx, dy);
    const step = this.speed * dt;
    if (d <= step || d < 0.05) {
      this.x = this.tx;
      this.y = this.ty;
      game.resolveHit(this.payload, this.tx, this.ty, this.homing ? this.target : null);
      this.destroy();
      return;
    }
    this.angle = Math.atan2(dy, dx);
    this.x += (dx / d) * step;
    this.y += (dy / d) * step;
    if (!this.homing) {
      const t = 1 - d / this.total;
      this.height = Math.sin(Math.PI * t) * this.arc;
    }
  }
}
