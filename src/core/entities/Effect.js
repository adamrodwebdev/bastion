/**
 * @file Short visual effects (explosions, beams, lightning, floating numbers).
 */

import { Entity } from './Entity.js';

/**
 * Short-lived visual effect. Pure presentation: no gameplay impact.
 *  - ring   : expanding circle (explosion, upgrade, aura)
 *  - spark  : burst of particles (death)
 *  - beam   : straight line (ballista bolt trail)
 *  - bolt   : zigzag lightning between two points
 *  - zone   : filled area that fades (fire on the ground, arrow rain)
 *  - text   : floating text (gold, damage)
 */
export class Effect extends Entity {
  /**
   * @param {'ring'|'spark'|'beam'|'bolt'|'zone'|'text'} kind
   * @param {object} o
   */
  constructor(kind, { x, y, x2 = 0, y2 = 0, ttl = 0.35, color = '#fff', radius = 0.5, text = '' }) {
    super(x, y);
    this.kind = kind;
    this.x2 = x2;
    this.y2 = y2;
    this.ttl = ttl;
    this.maxTtl = ttl;
    this.color = color;
    this.radius = radius;
    this.text = text;
    this.seed = Math.random() * 1000;
  }

  /** 0 → just created, 1 → about to disappear. */
  get t() {
    return 1 - this.ttl / this.maxTtl;
  }

  update(dt) {
    this.ttl -= dt;
    if (this.kind === 'text') this.y -= dt * 0.6;
    if (this.ttl <= 0) this.destroy();
  }
}
