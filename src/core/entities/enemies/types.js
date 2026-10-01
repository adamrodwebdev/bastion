/**
 * @file Concrete enemy types. To add one: subclass Enemy, then register it in EnemyFactory.
 */

import { Enemy } from './Enemy.js';
import { distSq } from '../../utils/math.js';

/** Standard foot soldier. */
export class Grunt extends Enemy {
  static type = 'grunt';
  static stats = { hp: 55, speed: 1.25, reward: 6, damage: 1, armor: 0, radius: 0.26, color: '#e5484d' };
}

/** Fast but fragile. */
export class Runner extends Enemy {
  static type = 'runner';
  static stats = { hp: 32, speed: 2.4, reward: 5, damage: 1, armor: 0, radius: 0.2, color: '#f5a524' };
}

/** Slow, heavily armored: weak towers barely scratch it. */
export class Tank extends Enemy {
  static type = 'tank';
  static stats = { hp: 190, speed: 0.75, reward: 14, damage: 2, armor: 6, radius: 0.34, color: '#8e6bd8' };
}

/** Periodically heals the enemies around it. */
export class Healer extends Enemy {
  static type = 'healer';
  static stats = { hp: 80, speed: 1.05, reward: 12, damage: 1, armor: 1, radius: 0.27, color: '#30a46c' };

  constructor(path, scaling) {
    super(path, scaling);
    this.healCooldown = 2;
    this.pulse = 0;
  }

  onUpdate(dt, game) {
    if (this.pulse > 0) this.pulse -= dt;
    this.healCooldown -= dt;
    if (this.healCooldown > 0 || !game) return;
    this.healCooldown = 2.5;
    this.pulse = 0.4;
    const r2 = 1.6 * 1.6;
    for (const e of game.enemies) {
      if (e !== this && e.alive && distSq(e.x, e.y, this.x, this.y) <= r2) e.heal(e.maxHp * 0.12);
    }
  }
}

/** End-of-level boss. Costs several lives if it gets through. */
export class Boss extends Enemy {
  static type = 'boss';
  static stats = { hp: 900, speed: 0.55, reward: 80, damage: 8, armor: 4, radius: 0.42, color: '#d6409f' };
}
