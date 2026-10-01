/**
 * @file The four special powers and the level that unlocks each one.
 */

import { Power } from './Power.js';
import { Effect } from '../entities/Effect.js';

/** Freezes every enemy on the board. */
export class FreezePower extends Power {
  static id = 'freeze';
  static icon = '❄';
  static duration = 4;
  static cooldown = 28;
  static unlockAfterLevel = 1;

  get modifiers() {
    return this.isActive ? { enemySpeed: 0 } : {};
  }
}

/** Meteor shower: periodic damage to every enemy while active. */
export class MeteorPower extends Power {
  static id = 'meteor';
  static icon = '☄';
  static duration = 3;
  static cooldown = 38;
  static unlockAfterLevel = 2;

  onActivate() {
    this._tick = 0;
  }

  onTick(dt, game) {
    this._tick -= dt;
    if (this._tick > 0) return;
    this._tick = 0.5;
    const dmg = 22 + game.level.index * 10;
    for (const e of game.enemies) {
      if (!e.alive) continue;
      game.addEffect(new Effect('ring', { x: e.x, y: e.y, radius: 0.6, color: '#ff8b3e', ttl: 0.4 }));
      game.damageEnemy(e, dmg, { pierce: true }, null);
    }
  }
}

/** Doubles the gold earned for each kill. */
export class GoldRushPower extends Power {
  static id = 'goldRush';
  static icon = '¤';
  static duration = 10;
  static cooldown = 42;
  static unlockAfterLevel = 3;

  get modifiers() {
    return this.isActive ? { reward: 2 } : {};
  }
}

/** Towers fire twice as fast. */
export class OverclockPower extends Power {
  static id = 'overclock';
  static icon = '⚡';
  static duration = 8;
  static cooldown = 45;
  static unlockAfterLevel = 4;

  get modifiers() {
    return this.isActive ? { towerFireRate: 2 } : {};
  }
}

export const ALL_POWERS = [FreezePower, MeteorPower, GoldRushPower, OverclockPower];
