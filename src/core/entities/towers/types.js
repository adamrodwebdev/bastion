/**
 * @file Concrete tower types. To add one: subclass Tower, then register it in TowerFactory and add its translations.
 */

import { Tower } from './Tower.js';
import { Effect } from '../Effect.js';

/** Cheap, fast single-target tower. */
export class ArrowTower extends Tower {
  static type = 'arrow';
  static cost = 50;
  static color = '#3e9bf5';
  static projectileSpeed = 11;
  static projectileSize = 0.07;
  static levels = [
    { damage: 11, range: 2.6, fireRate: 1.6 },
    { damage: 17, range: 2.9, fireRate: 1.9 },
    { damage: 26, range: 3.2, fireRate: 2.3 },
  ];
}

/** Slow area-of-effect tower. */
export class CannonTower extends Tower {
  static type = 'cannon';
  static cost = 85;
  static color = '#f76b15';
  static projectileSpeed = 6;
  static projectileSize = 0.13;
  static levels = [
    { damage: 30, range: 2.4, fireRate: 0.6, splash: 0.9 },
    { damage: 48, range: 2.6, fireRate: 0.7, splash: 1.05 },
    { damage: 75, range: 2.9, fireRate: 0.8, splash: 1.2 },
  ];
}

/** Slows every enemy caught in its blast. */
export class FrostTower extends Tower {
  static type = 'frost';
  static cost = 70;
  static color = '#4ccce6';
  static projectileSpeed = 8;
  static projectileSize = 0.1;
  static levels = [
    { damage: 5, range: 2.2, fireRate: 1, splash: 0.8, slow: 0.55, slowDuration: 1.4 },
    { damage: 8, range: 2.5, fireRate: 1.1, splash: 0.95, slow: 0.45, slowDuration: 1.7 },
    { damage: 12, range: 2.8, fireRate: 1.25, splash: 1.1, slow: 0.35, slowDuration: 2 },
  ];

  buildPayload() {
    const p = super.buildPayload();
    p.slow = { factor: this.stats.slow, duration: this.stats.slowDuration };
    return p;
  }
}

/** Long range hitscan beam that ignores armor. */
export class LaserTower extends Tower {
  static type = 'laser';
  static cost = 130;
  static color = '#e93d82';
  static levels = [
    { damage: 55, range: 4, fireRate: 0.5 },
    { damage: 90, range: 4.5, fireRate: 0.58 },
    { damage: 140, range: 5, fireRate: 0.66 },
  ];

  fire(target, game) {
    game.addEffect(
      new Effect('beam', {
        x: this.x,
        y: this.y,
        x2: target.x,
        y2: target.y,
        ttl: 0.18,
        color: this.constructor.color,
      }),
    );
    game.resolveHit({ damage: this.stats.damage, splash: 0, pierce: true, source: this }, target.x, target.y, target);
  }
}
