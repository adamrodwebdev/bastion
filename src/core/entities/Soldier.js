/**
 * @file Soldier: a melee unit that stands on the road and blocks one enemy.
 *
 * Soldiers come from barracks (they respawn after dying) or from the
 * Reinforcements power (temporary, no respawn).
 */

import { Entity } from './Entity.js';
import { DAMAGE } from '../config/damage.js';

export class Soldier extends Entity {
  /** Distance (tiles) at which an idle soldier engages a passing enemy. */
  static ENGAGE_RANGE = 0.6;

  /**
   * @param {object} o
   * @param {number} o.x rally position
   * @param {number} o.y rally position
   * @param {number} o.hp
   * @param {number} o.dps melee damage per second
   * @param {number} [o.armor] fraction of damage absorbed
   * @param {object|null} [o.source] barracks tower (null for reinforcements)
   * @param {number|null} [o.lifetime] seconds before disappearing (reinforcements)
   * @param {number|null} [o.owner] player id (coop)
   * @param {string} [o.kind] 'footman' | 'knight' | 'militia' (drawing only)
   */
  constructor({ x, y, hp, dps, armor = 0, source = null, lifetime = null, owner = null, kind = 'footman' }) {
    super(x, y);
    this.homeX = x;
    this.homeY = y;
    this.maxHp = hp;
    this.hp = hp;
    this.dps = dps;
    this.armor = armor;
    this.source = source;
    this.lifetime = lifetime;
    this.owner = owner;
    this.kind = kind;
    this.engaged = null;
    this.respawnTimer = 0;
    this.swing = 0; // animation
    this.blocks = 0; // enemies stopped (statistics)
  }

  get hpRatio() {
    return this.hp / this.maxHp;
  }

  /** Moves the rally position (barracks upgrade / rebuild). */
  setHome(x, y) {
    this.homeX = x;
    this.homeY = y;
    if (!this.engaged) {
      this.x = x;
      this.y = y;
    }
  }

  /** Called by the enemy it fights. */
  takeDamage(amount) {
    if (!this.alive) return;
    this.hp -= amount * (1 - this.armor);
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      this.release();
    }
  }

  /** Lets go of the enemy it was blocking. */
  release() {
    if (this.engaged && this.engaged.blockedBy === this) this.engaged.blockedBy = null;
    this.engaged = null;
  }

  /** Brings a dead barracks soldier back at full health. */
  revive() {
    this.alive = true;
    this.hp = this.maxHp;
    this.x = this.homeX;
    this.y = this.homeY;
    this.engaged = null;
  }

  /**
   * @param {number} dt
   * @param {import('../Game.js').Game} game
   */
  update(dt, game) {
    if (!this.alive) return;
    if (this.lifetime !== null) {
      this.lifetime -= dt;
      if (this.lifetime <= 0) {
        this.release();
        this.alive = false;
        this.expired = true;
        return;
      }
    }
    if (this.swing > 0) this.swing -= dt;

    if (this.engaged && (!this.engaged.alive || this.engaged.blockedBy !== this)) this.engaged = null;

    if (!this.engaged) {
      // Look for an enemy passing by.
      const r2 = Soldier.ENGAGE_RANGE * Soldier.ENGAGE_RANGE;
      let best = null;
      for (const e of game.enemies) {
        if (!e.alive || !e.blockable || e.blockedBy) continue;
        const d2 = (e.x - this.homeX) ** 2 + (e.y - this.homeY) ** 2;
        if (d2 <= r2 && (!best || e.distance > best.distance)) best = e;
      }
      if (best) {
        this.engaged = best;
        best.blockedBy = this;
        best.revealed = true;
        this.blocks += 1;
        game.stats.blocks += 1;
      } else {
        // Walk back home and recover.
        this.x += (this.homeX - this.x) * Math.min(1, dt * 4);
        this.y += (this.homeY - this.y) * Math.min(1, dt * 4);
        this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.08 * dt);
        return;
      }
    }

    // Fight: stand next to the enemy and hit it.
    const e = this.engaged;
    this.x += (e.x - 0.25 - this.x) * Math.min(1, dt * 8);
    this.y += (e.y - this.y) * Math.min(1, dt * 8);
    if (this.swing <= 0) this.swing = 0.45;
    game.damageEnemy(e, this.dps * game.modifier('soldierDamage') * dt, DAMAGE.PHYSICAL, {
      source: this.source,
      owner: this.owner,
      cause: 'soldier',
    });
  }
}
