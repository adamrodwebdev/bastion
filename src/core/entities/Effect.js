/**
 * @file Short visual effects (explosions, laser beams, floating numbers).
 */

import { Entity } from './Entity.js';

/**
 * Short-lived visual effect (explosion ring, laser beam, floating text...).
 * Pure presentation: no gameplay impact.
 */
export class Effect extends Entity {
  /**
   * @param {'ring'|'beam'|'text'|'spark'} kind
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
