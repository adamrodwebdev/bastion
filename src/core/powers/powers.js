/**
 * @file The ten special powers.
 *
 * Their strength follows the level (`game.powerScale`), so they stay useful in
 * the last chapters. The level that unlocks each power is in config/unlocks.js.
 */

import { Power } from './Power.js';
import { Effect } from '../entities/Effect.js';
import { Soldier } from '../entities/Soldier.js';
import { DAMAGE } from '../config/damage.js';

const inRadius = (e, x, y, r) => (e.x - x) ** 2 + (e.y - y) ** 2 <= r * r;

/** Arrow rain: volleys of arrows on a chosen spot (hits flying enemies too). */
export class ArrowRainPower extends Power {
  static id = 'arrowRain';
  static icon = '➶';
  static duration = 2;
  static cooldown = 22;
  static targeted = true;
  static radius = 1.5;

  onActivate(game, target) {
    this._tick = 0;
    game.addEffect(new Effect('zone', { x: target.x, y: target.y, radius: ArrowRainPower.radius, color: '#cfd8e3', ttl: this.duration }));
  }

  onTick(dt, game) {
    this._tick -= dt;
    if (this._tick > 0) return;
    this._tick = 0.4;
    const { x, y } = this.target;
    for (const e of game.enemies) {
      if (e.alive && inRadius(e, x, y, ArrowRainPower.radius)) {
        game.damageEnemy(e, 22 * game.powerScale, DAMAGE.PHYSICAL, { cause: 'power:arrowRain' });
      }
    }
  }
}

/** Freeze: every enemy on the board stops (bosses are only slowed). */
export class FreezePower extends Power {
  static id = 'freeze';
  static icon = '❄';
  static duration = 4;
  static cooldown = 30;

  get modifiers() {
    return this.isActive ? { enemySpeed: 0 } : {};
  }
}

/** Reinforcements: three militiamen block the road where you tap. */
export class ReinforcementsPower extends Power {
  static id = 'reinforcements';
  static icon = '⚔';
  static duration = 0;
  static cooldown = 26;
  static targeted = true;
  static radius = 0.6;

  onActivate(game, target) {
    const cp = game.map.closestRoadPoint(target.x, target.y);
    const scale = game.powerScale;
    [[0, 0], [-0.3, 0.2], [0.3, 0.2]].forEach(([ox, oy]) => {
      game.addSoldier(
        new Soldier({ x: cp.x + ox, y: cp.y + oy, hp: 70 * scale * game.modifier('soldierHp'), dps: 10 * Math.sqrt(scale), lifetime: 14, owner: game.powerOwner, kind: 'militia' }),
      );
    });
    game.addEffect(new Effect('ring', { x: cp.x, y: cp.y, radius: 0.9, color: '#cde', ttl: 0.4 }));
  }
}

/** Gold rush: gold from kills is doubled. */
export class GoldRushPower extends Power {
  static id = 'goldRush';
  static icon = '¤';
  static duration = 10;
  static cooldown = 45;

  get modifiers() {
    return this.isActive ? { reward: 2 } : {};
  }
}

/** Meteors: periodic damage to every enemy while active. */
export class MeteorPower extends Power {
  static id = 'meteor';
  static icon = '☄';
  static duration = 3;
  static cooldown = 40;

  onActivate() {
    this._tick = 0;
  }

  onTick(dt, game) {
    this._tick -= dt;
    if (this._tick > 0) return;
    this._tick = 0.5;
    for (const e of game.enemies) {
      if (!e.alive) continue;
      game.addEffect(new Effect('ring', { x: e.x, y: e.y, radius: 0.6, color: '#ff8b3e', ttl: 0.4 }));
      game.damageEnemy(e, 20 * game.powerScale, DAMAGE.TRUE, { cause: 'power:meteor' });
    }
  }
}

/** Rally (bugle call): towers fire almost twice as fast. */
export class RallyPower extends Power {
  static id = 'rally';
  static icon = '⚡';
  static duration = 8;
  static cooldown = 45;

  get modifiers() {
    return this.isActive ? { towerFireRate: 1.8 } : {};
  }
}

/** Earthquake: stuns and hurts every enemy on the ground. */
export class QuakePower extends Power {
  static id = 'quake';
  static icon = '≋';
  static duration = 0;
  static cooldown = 50;

  onActivate(game) {
    game.shake(0.6);
    for (const e of game.enemies) {
      if (!e.alive || e.flying) continue;
      e.applyStun(2.5);
      game.damageEnemy(e, 35 * game.powerScale, DAMAGE.TRUE, { cause: 'power:quake' });
    }
  }
}

/** Greek fire: sets a stretch of road on fire. */
export class GreekFirePower extends Power {
  static id = 'greekFire';
  static icon = '♨';
  static duration = 0;
  static cooldown = 35;
  static targeted = true;
  static radius = 1.3;

  onActivate(game, target) {
    game.addFireZone({ x: target.x, y: target.y, radius: GreekFirePower.radius, dps: 28 * game.powerScale, duration: 6, source: null, owner: game.powerOwner, cause: 'power:greekFire' });
  }
}

/** Blessing: the queen's priests restore three lives. */
export class BlessingPower extends Power {
  static id = 'blessing';
  static icon = '✚';
  static duration = 0;
  static cooldown = 90;

  onActivate(game) {
    game.restoreLives(3);
  }
}

/** Wrath of the sky: lightning strikes the strongest enemies. */
export class WrathPower extends Power {
  static id = 'wrath';
  static icon = 'ϟ';
  static duration = 0;
  static cooldown = 55;

  onActivate(game) {
    const targets = game.enemies.filter((e) => e.alive).sort((a, b) => b.hp - a.hp).slice(0, 6);
    for (const e of targets) {
      game.addEffect(new Effect('bolt', { x: e.x + 0.3, y: -0.5, x2: e.x, y2: e.y, ttl: 0.3, color: '#b9a4ff' }));
      game.damageEnemy(e, 120 * game.powerScale, DAMAGE.MAGIC, { cause: 'power:wrath' });
    }
  }
}

/** Every power, in unlock order. */
export const ALL_POWERS = [
  ArrowRainPower,
  FreezePower,
  ReinforcementsPower,
  GoldRushPower,
  MeteorPower,
  RallyPower,
  QuakePower,
  GreekFirePower,
  BlessingPower,
  WrathPower,
];
