/**
 * @file Mordrac's horde: every enemy type.
 *
 * To add one: subclass Enemy (static `type` and `stats`, optional hooks), then
 * register it in EnemyFactory and add its name and description to the
 * translations (`enemies.<type>`).
 */

import { Enemy } from './Enemy.js';
import { distSq } from '../../utils/math.js';

/** Foot soldier: the bulk of every wave. */
export class Grunt extends Enemy {
  static type = 'grunt';
  static stats = { ...Enemy.stats, hp: 60, speed: 1.1, reward: 6, melee: 6, radius: 0.26, color: '#d9534f', threat: 1 };
}

/** Scout: fast and fragile. */
export class Runner extends Enemy {
  static type = 'runner';
  static stats = { ...Enemy.stats, hp: 38, speed: 2.1, reward: 5, melee: 4, radius: 0.21, color: '#f0a020', threat: 0.9 };
}

/** War wolf: very fast, comes in packs. */
export class Wolf extends Enemy {
  static type = 'wolf';
  static stats = { ...Enemy.stats, hp: 30, speed: 2.6, reward: 3, melee: 5, radius: 0.2, color: '#8a8f99', threat: 0.6 };
}

/** Shield bearer: arrows and cannonballs bounce off, magic and fire do not. */
export class ShieldBearer extends Enemy {
  static type = 'shield';
  static stats = { ...Enemy.stats, hp: 95, speed: 0.95, reward: 9, armor: 0.6, melee: 8, radius: 0.27, color: '#b07d3a', threat: 1.9 };
}

/** Black knight: heavily armored, costs two lives. */
export class Knight extends Enemy {
  static type = 'knight';
  static stats = { ...Enemy.stats, hp: 230, speed: 0.8, reward: 15, lives: 2, armor: 0.4, resist: 0.1, melee: 14, radius: 0.33, color: '#5b4b8a', threat: 4 };
}

/** War priest: heals the enemies around him. */
export class Priest extends Enemy {
  static type = 'priest';
  static stats = { ...Enemy.stats, hp: 90, speed: 1.0, reward: 12, resist: 0.3, melee: 5, radius: 0.27, color: '#2f9e6a', threat: 2.6 };

  constructor(...args) {
    super(...args);
    this.healCooldown = 2;
  }

  onUpdate(dt, game) {
    this.healCooldown -= dt;
    if (this.healCooldown > 0 || !game) return;
    this.healCooldown = 2.5;
    this.healPulse = 0.4;
    const r2 = 1.7 * 1.7;
    for (const e of game.enemies) {
      if (e !== this && e.alive && distSq(e.x, e.y, this.x, this.y) <= r2) e.heal(e.maxHp * 0.12);
    }
  }
}

/** Warlock: a dark ward around him makes allies resist fire and magic. */
export class Warlock extends Enemy {
  static type = 'warlock';
  static stats = { ...Enemy.stats, hp: 95, speed: 0.95, reward: 14, resist: 0.5, melee: 6, radius: 0.27, color: '#7a2f8f', threat: 2.8 };
  static AURA = 1.8;

  applyAuras(game) {
    const r2 = Warlock.AURA * Warlock.AURA;
    for (const e of game.enemies) {
      if (e !== this && e.alive && distSq(e.x, e.y, this.x, this.y) <= r2) e.auraResist = Math.max(e.auraResist, 0.35);
    }
  }
}

/** Giant crow: flying, weak, only archers / ballistas / frost / storm hit it. */
export class Crow extends Enemy {
  static type = 'crow';
  static stats = { ...Enemy.stats, hp: 42, speed: 1.7, reward: 6, melee: 0, radius: 0.22, color: '#3a3f4b', flying: true, threat: 1.2 };
}

/** Wyvern: flying and tough. */
export class Wyvern extends Enemy {
  static type = 'wyvern';
  static stats = { ...Enemy.stats, hp: 210, speed: 1.0, reward: 18, lives: 2, armor: 0.2, melee: 0, radius: 0.34, color: '#2f7a6e', flying: true, threat: 4.2 };
}

/** Sapper: crawls through tunnels, invisible unless a watchtower spots him. */
export class Sapper extends Enemy {
  static type = 'sapper';
  static stats = { ...Enemy.stats, hp: 75, speed: 1.3, reward: 10, melee: 7, radius: 0.24, color: '#6e5a3c', stealth: true, threat: 2.2 };
}

/** Berserker: goes into a frenzy (much faster) when wounded. */
export class Berserker extends Enemy {
  static type = 'berserker';
  static stats = { ...Enemy.stats, hp: 135, speed: 1.0, reward: 12, melee: 16, radius: 0.29, color: '#c0392b', threat: 2.8 };

  get enraged() {
    return this.hpRatio < 0.5;
  }

  applyAuras() {
    if (this.enraged) this.speedBoost = Math.max(this.speedBoost, 1.8);
  }
}

/** Ice golem: slow, huge, barely slowed by frost. */
export class Golem extends Enemy {
  static type = 'golem';
  static stats = { ...Enemy.stats, hp: 330, speed: 0.6, reward: 22, lives: 3, armor: 0.25, resist: 0.4, melee: 20, radius: 0.36, color: '#7fb3d5', immuneSlow: true, threat: 5.5 };
}

/** Battering ram: armored, cannot be stopped by soldiers. */
export class Ram extends Enemy {
  static type = 'ram';
  static stats = { ...Enemy.stats, hp: 420, speed: 0.5, reward: 25, lives: 4, armor: 0.5, melee: 0, radius: 0.36, color: '#8b5a2b', blockable: false, threat: 6.5 };
}

/** Necromancer: raises skeletons around him. */
export class Necromancer extends Enemy {
  static type = 'necromancer';
  static stats = { ...Enemy.stats, hp: 145, speed: 0.85, reward: 18, resist: 0.4, melee: 6, radius: 0.28, color: '#4b2c5e', threat: 4 };

  constructor(...args) {
    super(...args);
    this.summonCooldown = 3;
  }

  onUpdate(dt, game) {
    if (!game || this.blockedBy) return;
    this.summonCooldown -= dt;
    if (this.summonCooldown > 0) return;
    this.summonCooldown = 5;
    this.healPulse = 0.4;
    for (const offset of [-0.35, 0.35]) {
      game.spawnEnemy('skeleton', { pathIndex: this.pathIndex, distance: Math.max(0, this.distance + offset), scaling: this.scaling, air: false, summoned: true });
    }
  }
}

/** Skeleton: raised by necromancers, gives almost no gold. */
export class Skeleton extends Enemy {
  static type = 'skeleton';
  static stats = { ...Enemy.stats, hp: 28, speed: 1.2, reward: 1, melee: 4, radius: 0.2, color: '#d8d4c4', threat: 0.4 };
}

/** Siege tower: when destroyed, the soldiers inside jump out. Cannot be blocked. */
export class SiegeTower extends Enemy {
  static type = 'siege';
  static stats = { ...Enemy.stats, hp: 380, speed: 0.55, reward: 20, lives: 3, armor: 0.3, melee: 0, radius: 0.38, color: '#7b5e3b', blockable: false, threat: 6 };

  onDeath(game) {
    for (const offset of [-0.4, -0.15, 0.15, 0.4]) {
      game.spawnEnemy('grunt', { pathIndex: this.pathIndex, distance: Math.max(0, this.distance + offset), scaling: this.scaling, air: false, summoned: true });
    }
  }
}

/** Champion: chapter boss. Rallies nearby troops (they move faster). */
export class Champion extends Enemy {
  static type = 'champion';
  static stats = { ...Enemy.stats, hp: 1700, speed: 0.5, reward: 120, lives: 10, armor: 0.3, resist: 0.3, melee: 40, radius: 0.44, color: '#a32020', boss: true, threat: 26 };

  applyAuras(game) {
    const r2 = 2.2 * 2.2;
    for (const e of game.enemies) {
      if (e !== this && e.alive && distSq(e.x, e.y, this.x, this.y) <= r2) e.speedBoost = Math.max(e.speedBoost, 1.25);
    }
  }
}

/**
 * Duke Mordrac, final boss: raises a ward every few seconds (immune to damage)
 * and calls his black knights.
 */
export class Mordrac extends Enemy {
  static type = 'mordrac';
  static stats = { ...Enemy.stats, hp: 6500, speed: 0.4, reward: 500, lives: 20, armor: 0.35, resist: 0.35, melee: 60, radius: 0.5, color: '#1d1d2b', boss: true, blockable: true, threat: 90 };

  constructor(...args) {
    super(...args);
    this.wardCooldown = 8;
    this.wardTimer = 0;
    this.callCooldown = 10;
  }

  onUpdate(dt, game) {
    if (this.wardTimer > 0) {
      this.wardTimer -= dt;
      if (this.wardTimer <= 0) this.invulnerable = false;
    } else {
      this.wardCooldown -= dt;
      if (this.wardCooldown <= 0) {
        this.wardCooldown = 10;
        this.wardTimer = 2.2;
        this.invulnerable = true;
      }
    }
    if (!game) return;
    this.callCooldown -= dt;
    if (this.callCooldown <= 0) {
      this.callCooldown = 12;
      game.spawnEnemy('knight', { pathIndex: this.pathIndex, distance: Math.max(0, this.distance - 0.6), scaling: this.scaling, air: false, summoned: true });
    }
  }
}
