/**
 * @file The ten towers of the kingdom.
 *
 * To add one: subclass Tower, register it in TowerFactory, add its unlock
 * level in config/unlocks.js and its texts in the translations (`towers.<type>`).
 */

import { Tower } from './Tower.js';
import { Effect } from '../Effect.js';
import { Soldier } from '../Soldier.js';
import { DAMAGE } from '../../config/damage.js';

// ---------------------------------------------------------------- attack towers

/** Archers: cheap, fast, hit flying enemies. Mastery: two targets at once. */
export class ArcherTower extends Tower {
  static type = 'archer';
  static cost = 60;
  static color = '#3e8ed0';
  static targets = 'both';
  static projectile = { speed: 12, size: 0.06, kind: 'arrow', arc: 0 };
  static levels = [
    { damage: 12, range: 2.8, fireRate: 1.6 },
    { damage: 18, range: 3.0, fireRate: 1.9 },
    { damage: 26, range: 3.3, fireRate: 2.3 },
  ];
  static elite = { damage: 30, range: 3.5, fireRate: 2.4, shots: 2 };

  fire(target, game) {
    super.fire(target, game);
    if (!this.isElite) return;
    // Mastery "Double shot": a second arrow at another enemy.
    const other = this.candidates(game.enemies).find((e) => e !== target);
    if (other) super.fire(other, game);
  }
}

/** Cannon (bombard): splash damage on the ground. Mastery: stuns. */
export class CannonTower extends Tower {
  static type = 'cannon';
  static cost = 95;
  static color = '#e0662a';
  static targets = 'ground';
  static projectile = { speed: 6.5, size: 0.13, kind: 'ball', arc: 0 };
  static levels = [
    { damage: 32, range: 2.6, fireRate: 0.55, splash: 0.9 },
    { damage: 50, range: 2.8, fireRate: 0.62, splash: 1.0 },
    { damage: 78, range: 3.0, fireRate: 0.7, splash: 1.15 },
  ];
  static elite = { damage: 110, range: 3.4, fireRate: 0.75, splash: 1.3, stun: 0.6 };

  buildPayload(game) {
    const p = super.buildPayload(game);
    if (this.stats.stun) p.stun = this.stats.stun;
    return p;
  }
}

/** Frost tower: magic damage that slows. Mastery: may freeze solid. */
export class FrostTower extends Tower {
  static type = 'frost';
  static cost = 80;
  static color = '#4cc3e6';
  static targets = 'both';
  static dtype = DAMAGE.MAGIC;
  static projectile = { speed: 8, size: 0.1, kind: 'orb', arc: 0 };
  static levels = [
    { damage: 6, range: 2.4, fireRate: 1.0, splash: 0.8, slow: 0.55, slowDuration: 1.4 },
    { damage: 9, range: 2.6, fireRate: 1.1, splash: 0.95, slow: 0.45, slowDuration: 1.7 },
    { damage: 13, range: 2.9, fireRate: 1.25, splash: 1.1, slow: 0.35, slowDuration: 2 },
  ];
  static elite = { damage: 18, range: 3.1, fireRate: 1.3, splash: 1.2, slow: 0.3, slowDuration: 2.2, freezeChance: 0.2 };

  buildPayload(game) {
    const p = super.buildPayload(game);
    p.slow = { factor: this.stats.slow, duration: this.stats.slowDuration };
    if (this.stats.freezeChance && game.random() < this.stats.freezeChance) p.stun = 1;
    return p;
  }
}

/** Ballista: long range bolts that ignore armor. Mastery: bolts go through a whole line. */
export class BallistaTower extends Tower {
  static type = 'ballista';
  static cost = 140;
  static color = '#c0508a';
  static targets = 'both';
  static projectile = { speed: 16, size: 0.08, kind: 'bolt', arc: 0 };
  static levels = [
    { damage: 60, range: 4.2, fireRate: 0.5 },
    { damage: 95, range: 4.6, fireRate: 0.58 },
    { damage: 145, range: 5.0, fireRate: 0.66 },
  ];
  static elite = { damage: 170, range: 5.4, fireRate: 0.7, line: true };

  buildPayload(game) {
    const p = super.buildPayload(game);
    p.pierce = true;
    return p;
  }

  fire(target, game) {
    if (!this.stats.line) {
      super.fire(target, game);
      return;
    }
    // Mastery "Line breaker": instant bolt through every enemy on the line.
    const dx = Math.cos(this.angle);
    const dy = Math.sin(this.angle);
    const ex = this.x + dx * this.range;
    const ey = this.y + dy * this.range;
    game.addEffect(new Effect('beam', { x: this.x, y: this.y, x2: ex, y2: ey, ttl: 0.2, color: this.constructor.color }));
    for (const e of game.enemies) {
      if (!this.canHit(e)) continue;
      const t = (e.x - this.x) * dx + (e.y - this.y) * dy;
      if (t < 0 || t > this.range) continue;
      const px = this.x + dx * t;
      const py = this.y + dy * t;
      if ((e.x - px) ** 2 + (e.y - py) ** 2 <= (0.35 + e.radius) ** 2) {
        const p = this.buildPayload(game);
        game.resolveHit(p, e.x, e.y, e);
      }
    }
  }
}

/** Catapult: huge range, big splash, slow, lobbed (can miss). Mastery: burning rocks. */
export class CatapultTower extends Tower {
  static type = 'catapult';
  static cost = 160;
  static color = '#a0763c';
  static targets = 'ground';
  static projectile = { speed: 5.5, size: 0.16, kind: 'rock', arc: 1.4 };
  static levels = [
    { damage: 85, range: 5.0, minRange: 1.5, fireRate: 0.32, splash: 1.3 },
    { damage: 130, range: 5.4, minRange: 1.5, fireRate: 0.36, splash: 1.4 },
    { damage: 190, range: 5.8, minRange: 1.5, fireRate: 0.4, splash: 1.5 },
  ];
  static elite = { damage: 230, range: 6.2, minRange: 1.5, fireRate: 0.42, splash: 1.6, burn: 30 };

  buildPayload(game) {
    const p = super.buildPayload(game);
    if (this.stats.burn) p.burn = { dps: this.stats.burn * game.damageModifier(DAMAGE.FIRE, this), duration: 3 };
    return p;
  }
}

/** Brazier: short range, sets enemies on fire. Mastery: leaves burning ground. */
export class FireTower extends Tower {
  static type = 'fire';
  static cost = 120;
  static color = '#ff7b1c';
  static targets = 'ground';
  static dtype = DAMAGE.FIRE;
  static projectile = { speed: 7, size: 0.12, kind: 'fire', arc: 0 };
  static levels = [
    { damage: 9, range: 1.9, fireRate: 2, splash: 0.7, burn: 12 },
    { damage: 13, range: 2.0, fireRate: 2.1, splash: 0.75, burn: 18 },
    { damage: 18, range: 2.2, fireRate: 2.2, splash: 0.8, burn: 26 },
  ];
  static elite = { damage: 22, range: 2.4, fireRate: 2.3, splash: 0.9, burn: 34, ground: true };

  buildPayload(game) {
    const p = super.buildPayload(game);
    p.burn = { dps: this.stats.burn * game.damageModifier(DAMAGE.FIRE, this), duration: 2 };
    if (this.stats.ground) p.fireZone = { radius: 0.8, dps: this.stats.burn * 0.8, duration: 2.5 };
    return p;
  }
}

/** Storm tower: chain lightning (magic), hits flying enemies. Mastery: more chains and a stun. */
export class StormTower extends Tower {
  static type = 'storm';
  static cost = 170;
  static color = '#9b7bff';
  static targets = 'both';
  static dtype = DAMAGE.MAGIC;
  static levels = [
    { damage: 40, range: 3.0, fireRate: 0.8, chains: 3 },
    { damage: 60, range: 3.2, fireRate: 0.85, chains: 4 },
    { damage: 85, range: 3.4, fireRate: 0.9, chains: 5 },
  ];
  static elite = { damage: 100, range: 3.6, fireRate: 0.95, chains: 8, stun: 0.25 };

  fire(target, game) {
    const hit = new Set();
    let from = { x: this.x, y: this.y - 0.2 };
    let current = target;
    let factor = 1;
    for (let i = 0; i < this.stats.chains && current; i++) {
      hit.add(current);
      game.addEffect(new Effect('bolt', { x: from.x, y: from.y, x2: current.x, y2: current.y, ttl: 0.18, color: this.constructor.color }));
      const p = this.buildPayload(game);
      p.damage *= factor;
      if (this.stats.stun) p.stun = this.stats.stun;
      game.resolveHit(p, current.x, current.y, current);
      from = { x: current.x, y: current.y };
      factor *= 0.85;
      // Jump to the nearest enemy not hit yet.
      let next = null;
      let best = 1.7 * 1.7;
      for (const e of game.enemies) {
        if (hit.has(e) || !this.canHit(e)) continue;
        const d2 = (e.x - from.x) ** 2 + (e.y - from.y) ** 2;
        if (d2 < best) {
          best = d2;
          next = e;
        }
      }
      current = next;
    }
  }
}

// ---------------------------------------------------------------- barracks

/**
 * Barracks: trains soldiers who stand on the nearest road and block enemies.
 * Dead soldiers come back after a while. Mastery: armored knights.
 */
export class BarracksTower extends Tower {
  static type = 'barracks';
  static cost = 75;
  static color = '#6b8e23';
  static targets = 'none';
  static category = 'barracks';
  static levels = [
    { soldiers: 2, hp: 90, dps: 8, armor: 0, respawn: 8, range: 2.4 },
    { soldiers: 3, hp: 140, dps: 12, armor: 0.1, respawn: 7, range: 2.6 },
    { soldiers: 3, hp: 200, dps: 17, armor: 0.2, respawn: 6, range: 2.8 },
  ];
  static elite = { soldiers: 3, hp: 320, dps: 26, armor: 0.4, respawn: 5, range: 3.0, knights: true };

  constructor(...args) {
    super(...args);
    this.soldiers = [];
    this.rally = null;
  }

  get dps() {
    return Math.round(this.stats.dps * this.stats.soldiers);
  }

  onPlaced(game) {
    const cp = game.map.closestRoadPoint(this.x, this.y);
    // A barracks too far from any road would be useless: rally at its feet.
    this.rally = cp && Math.sqrt(cp.d2) <= this.range ? { x: cp.x, y: cp.y } : { x: this.x, y: this.y + 0.5 };
    this._syncSoldiers(game);
  }

  onUpgraded(game) {
    this._syncSoldiers(game);
  }

  onRemoved(game) {
    for (const s of this.soldiers) {
      s.release();
      s.alive = false;
      s.removed = true;
    }
    this.soldiers = [];
    game.compactSoldiers();
  }

  _syncSoldiers(game) {
    const st = this.stats;
    const hp = st.hp * game.modifier('soldierHp');
    const offsets = [
      [0, 0],
      [-0.28, 0.22],
      [0.28, 0.22],
    ];
    while (this.soldiers.length < st.soldiers) {
      const [ox, oy] = offsets[this.soldiers.length];
      const s = new Soldier({ x: this.rally.x + ox, y: this.rally.y + oy, hp, dps: st.dps, armor: st.armor, source: this, owner: this.owner });
      this.soldiers.push(s);
      game.addSoldier(s);
    }
    for (const s of this.soldiers) {
      const ratio = s.hpRatio;
      s.maxHp = hp;
      s.hp = s.alive ? hp * Math.max(ratio, 0.5) : 0;
      s.dps = st.dps;
      s.armor = st.armor;
      s.kind = st.knights ? 'knight' : 'footman';
    }
  }

  update(dt, game) {
    for (const s of this.soldiers) {
      if (s.alive) continue;
      s.respawnTimer += dt;
      if (s.respawnTimer >= this.stats.respawn) {
        s.respawnTimer = 0;
        s.revive();
      }
    }
  }

  serialize() {
    return { ...super.serialize(), rally: this.rally };
  }
}

// ---------------------------------------------------------------- support

/**
 * Watchtower: no attack. Reveals invisible enemies around it and extends the
 * range of nearby towers. Mastery: lighthouse (bigger radius, critical hits).
 */
export class WatchTower extends Tower {
  static type = 'watch';
  static cost = 70;
  static color = '#e8c547';
  static targets = 'none';
  static category = 'support';
  static levels = [
    { range: 2.5, rangeBuff: 0.1 },
    { range: 3.0, rangeBuff: 0.15 },
    { range: 3.5, rangeBuff: 0.2 },
  ];
  static elite = { range: 4.5, rangeBuff: 0.25, crit: 0.15 };

  /** A watchtower's own range is never boosted by another watchtower. */
  get range() {
    return this.stats.range;
  }

  get dps() {
    return 0;
  }
}

/** Treasury: no attack. Pays gold at the start of every wave. */
export class TreasuryTower extends Tower {
  static type = 'treasury';
  static cost = 110;
  static color = '#d4a017';
  static targets = 'none';
  static category = 'economy';
  static levels = [{ income: 25 }, { income: 40 }, { income: 60 }];
  static elite = { income: 100 };

  get range() {
    return 0;
  }

  get dps() {
    return 0;
  }

  onWaveStart(game) {
    const amount = Math.round(this.stats.income * game.modifier('income'));
    game.earn(this.owner, amount, 'treasury');
    game.addEffect(new Effect('text', { x: this.x, y: this.y - 0.3, text: `+${amount}`, color: '#ffd166', ttl: 0.9 }));
  }
}

