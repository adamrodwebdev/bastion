/**
 * @file Homing projectile fired by towers.
 */

import { Entity } from './Entity.js';

/**
 * Homing projectile. On impact it hands its payload to the game,
 * which resolves damage, splash and slow effects.
 */
export class Projectile extends Entity {
  /**
   * @param {object} o
   * @param {number} o.x
   * @param {number} o.y
   * @param {import('./enemies/Enemy.js').Enemy} o.target
   * @param {number} o.speed tiles / second
   * @param {object} o.payload { damage, splash, slow, pierce, source }
   * @param {string} o.color
   * @param {number} [o.size]
   */
  constructor({ x, y, target, speed, payload, color, size = 0.09 }) {
    super(x, y);
    this.target = target;
    this.tx = target.x;
    this.ty = target.y;
    this.speed = speed;
    this.payload = payload;
    this.color = color;
    this.size = size;
  }

  update(dt, game) {
    if (this.target && this.target.alive) {
      this.tx = this.target.x;
      this.ty = this.target.y;
    } else {
      this.target = null;
    }
    const dx = this.tx - this.x;
    const dy = this.ty - this.y;
    const d = Math.hypot(dx, dy);
    const step = this.speed * dt;
    if (d <= step || d < 0.05) {
      this.x = this.tx;
      this.y = this.ty;
      game.resolveHit(this.payload, this.tx, this.ty, this.target);
      this.destroy();
      return;
    }
    this.x += (dx / d) * step;
    this.y += (dy / d) * step;
  }
}
