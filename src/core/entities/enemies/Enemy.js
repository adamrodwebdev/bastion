/**
 * @file Base enemy: movement along a road (or a flight lane), health, defences,
 * slow / stun / burn, and melee combat against soldiers that block it.
 */

import { Entity } from '../Entity.js';
import { mitigate, DAMAGE } from '../../config/damage.js';

/**
 * Base enemy. Subclasses override static `stats` and the hooks
 * `onUpdate(dt, game)`, `onDeath(game)` (template-method pattern).
 *
 * Distances are in tiles, speeds in tiles per second, damage per second for
 * melee. `lives` is how many lives the player loses if it reaches the exit.
 */
export class Enemy extends Entity {
  /** Unique type identifier, used by the factory, the save and the translations. */
  static type = 'enemy';

  /**
   * Base stats.
   *  - armor / resist : fractions of physical / fire+magic damage absorbed
   *  - flying         : ignores roads, soldiers and ground-only towers
   *  - stealth        : invisible to towers unless revealed (watchtower, soldier…)
   *  - blockable      : can be stopped by soldiers
   *  - immuneSlow     : frost and Freeze have no or little effect
   *  - threat         : weight used by the wave generator (≈ how hard it is to stop)
   */
  static stats = {
    hp: 50,
    speed: 1.2,
    reward: 5,
    lives: 1,
    armor: 0,
    resist: 0,
    melee: 6,
    radius: 0.28,
    color: '#888',
    flying: false,
    stealth: false,
    blockable: true,
    immuneSlow: false,
    boss: false,
    threat: 1,
  };

  /**
   * @param {import('../../world/Path.js').Path} path
   * @param {{hpMult?:number, speedMult?:number, rewardMult?:number}} [scaling]
   * @param {{pathIndex?:number, distance?:number}} [spawn]
   */
  constructor(path, scaling = {}, { pathIndex = 0, distance = 0 } = {}) {
    const start = path.pointAt(distance);
    super(start.x, start.y);
    const s = this.constructor.stats;
    this.type = this.constructor.type;
    this.scaling = scaling; // kept so summoned children scale the same way
    this.path = path;
    this.pathIndex = pathIndex;
    this.maxHp = Math.max(1, Math.round(s.hp * (scaling.hpMult ?? 1)));
    this.hp = this.maxHp;
    this.baseSpeed = s.speed * (scaling.speedMult ?? 1);
    this.reward = Math.max(1, Math.round(s.reward * (scaling.rewardMult ?? 1)));
    this.lives = s.lives;
    this.armor = s.armor;
    this.resist = s.resist;
    this.melee = s.melee * Math.sqrt(scaling.hpMult ?? 1);
    this.radius = s.radius;
    this.color = s.color;
    this.flying = s.flying;
    this.stealth = s.stealth;
    this.blockable = s.blockable && !s.flying;
    this.immuneSlow = s.immuneSlow;
    this.boss = s.boss;
    this.distance = distance;
    this.angle = start.angle;

    // Status effects.
    this.slowFactor = 1;
    this.slowTimer = 0;
    this.stunTimer = 0;
    this.burnDps = 0;
    this.burnTimer = 0;
    this.burnSource = null;
    this.speedBoost = 1; // set every frame by auras (warlord)
    this.auraResist = 0; // set every frame by auras (warlock)
    this.healPulse = 0; // visual
    this.invulnerable = false;

    this.revealed = !this.stealth;
    this.blockedBy = null; // soldier currently fighting it
    this.hitFlash = 0;
    this.reachedEnd = false;
    this.lastOwner = null; // player who dealt the last hit (coop rewards)
    this.killCause = null; // 'tower:<type>' | 'power:<id>' | 'soldier' | 'burn'
  }

  get hpRatio() {
    return this.hp / this.maxHp;
  }

  /** Remaining distance to the exit — smaller means more dangerous. */
  get remaining() {
    return this.path.length - this.distance;
  }

  /** Share of the road already travelled (0..1). */
  get progress() {
    return this.distance / this.path.length;
  }

  get isSlowed() {
    return this.slowTimer > 0;
  }

  get isStunned() {
    return this.stunTimer > 0;
  }

  /** Can a tower see (and therefore target) this enemy? */
  get targetable() {
    return this.alive && this.revealed;
  }

  /**
   * Applies damage after armor / resistances.
   * Use Game#damageEnemy() instead: it also handles rewards and statistics.
   * @param {number} amount
   * @param {string} [type] one of DAMAGE
   * @param {{pierce?:boolean}} [opts]
   * @returns {number} damage actually dealt
   */
  takeDamage(amount, type = DAMAGE.PHYSICAL, { pierce = false } = {}) {
    if (!this.alive || this.invulnerable || amount <= 0) return 0;
    const dealt = mitigate(amount, type, { armor: this.armor, resist: Math.min(0.9, this.resist + this.auraResist) }, { pierce });
    this.hp -= dealt;
    this.hitFlash = 0.08;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
    }
    return dealt;
  }

  /**
   * @param {number} factor speed multiplier (0.4 = 60 % slower)
   * @param {number} duration seconds
   */
  applySlow(factor, duration) {
    if (this.immuneSlow) factor = Math.max(factor, 0.85);
    if (this.boss) factor = Math.max(factor, 0.6);
    // Keep the strongest slow, refresh the timer.
    this.slowFactor = Math.min(this.slowFactor, factor);
    this.slowTimer = Math.max(this.slowTimer, duration);
  }

  /** Stops the enemy for `duration` seconds (bosses resist a lot). */
  applyStun(duration) {
    if (this.boss) duration *= 0.3;
    if (this.immuneSlow) duration *= 0.5;
    this.stunTimer = Math.max(this.stunTimer, duration);
  }

  /**
   * Sets the enemy on fire (the strongest burn wins, timer refreshed).
   * @param {number} dps fire damage per second
   * @param {number} duration seconds
   * @param {object} [source] tower or power responsible
   */
  applyBurn(dps, duration, source = null) {
    if (dps >= this.burnDps || this.burnTimer <= 0) {
      this.burnDps = dps;
      this.burnSource = source;
    }
    this.burnTimer = Math.max(this.burnTimer, duration);
  }

  heal(amount) {
    if (!this.alive) return;
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  /** Moves the enemy and applies its status effects. */
  update(dt, game) {
    if (this.hitFlash > 0) this.hitFlash -= dt;
    if (this.healPulse > 0) this.healPulse -= dt;
    if (this.slowTimer > 0) {
      this.slowTimer -= dt;
      if (this.slowTimer <= 0) this.slowFactor = 1;
    }
    if (this.stunTimer > 0) this.stunTimer -= dt;
    if (this.burnTimer > 0) {
      this.burnTimer -= dt;
      if (game) game.damageEnemy(this, this.burnDps * dt, DAMAGE.FIRE, { source: this.burnSource, cause: 'burn' });
      else this.takeDamage(this.burnDps * dt, DAMAGE.FIRE);
      if (!this.alive) return;
    }

    if (this.blockedBy && (!this.blockedBy.alive || this.blockedBy.engaged !== this)) this.blockedBy = null;

    const moving = !this.isStunned && !this.blockedBy;
    if (moving) {
      const powerMod = game ? game.enemySpeedModifier(this) : 1;
      this.distance += this.baseSpeed * this.slowFactor * this.speedBoost * powerMod * dt;
      const p = this.path.pointAt(this.distance);
      this.x = p.x;
      this.y = p.y;
      this.angle = p.angle;
    } else if (this.blockedBy) {
      // Melee: hits the soldier blocking the road.
      this.blockedBy.takeDamage(this.melee * dt, game);
    }

    this.onUpdate(dt, game);

    if (this.distance >= this.path.length) {
      this.reachedEnd = true;
      this.alive = false;
    }
  }

  /**
   * Hook for enemies that boost others (or themselves). Called every step,
   * before anyone moves, right after Game has reset `speedBoost` / `auraResist`.
   */
  // eslint-disable-next-line no-unused-vars
  applyAuras(game) {}

  /** Hook for subclasses, called every step while alive. */
  // eslint-disable-next-line no-unused-vars
  onUpdate(dt, game) {}

  /** Hook for subclasses, called once when killed (not when it escapes). */
  // eslint-disable-next-line no-unused-vars
  onDeath(game) {}

  /** @returns {object} JSON data needed to rebuild the enemy from a save. */
  serialize() {
    return {
      type: this.type,
      pathIndex: this.pathIndex,
      air: this.path.air,
      hp: this.hp,
      maxHp: this.maxHp,
      distance: this.distance,
      reward: this.reward,
      baseSpeed: this.baseSpeed,
      melee: this.melee,
    };
  }

  /**
   * @param {object} data output of serialize()
   * @returns {this}
   */
  restore(data) {
    this.hp = data.hp;
    this.maxHp = data.maxHp;
    this.distance = data.distance;
    this.reward = data.reward;
    this.baseSpeed = data.baseSpeed;
    if (data.melee) this.melee = data.melee;
    const p = this.path.pointAt(this.distance);
    this.x = p.x;
    this.y = p.y;
    return this;
  }
}
