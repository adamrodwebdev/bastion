/**
 * @file Base special power with its timer: ready → active → cooldown → ready.
 */

/**
 * Special power with a timer (chronometer).
 * Life cycle: ready → active (for `duration` s) → cooldown (for `cooldown` s) → ready.
 *
 * Instant powers have `duration = 0` and go straight to cooldown.
 * Targeted powers (`targeted = true`) need a position on the board: the player
 * picks the power, then taps where it should land.
 *
 * While active, a power can expose gameplay modifiers through `modifiers`
 * (e.g. { enemySpeed: 0 }) that the engine multiplies together.
 */
export class Power {
  static id = 'power';
  static icon = '★';
  static duration = 5;
  static cooldown = 30;
  static targeted = false;
  /** Radius of the area shown while aiming a targeted power (tiles). */
  static radius = 0;

  constructor() {
    this.id = this.constructor.id;
    this.state = 'ready';
    this.timer = 0;
    this.cooldownTotal = this.constructor.cooldown;
    this.uses = 0;
    this.target = null;
  }

  get duration() {
    return this.constructor.duration;
  }

  get cooldown() {
    return this.cooldownTotal;
  }

  get targeted() {
    return this.constructor.targeted;
  }

  get isReady() {
    return this.state === 'ready';
  }

  get isActive() {
    return this.state === 'active';
  }

  /** Seconds left in the current phase (displayed by the chronometer). */
  get remaining() {
    return Math.max(0, this.timer);
  }

  /** 0..1 progress of the current phase, used for the circular chrono. */
  get progress() {
    if (this.state === 'active') return this.duration ? this.timer / this.duration : 0;
    if (this.state === 'cooldown') return 1 - this.timer / this.cooldown;
    return 1;
  }

  /** Modifiers applied while active. */
  get modifiers() {
    return {};
  }

  /**
   * @param {import('../Game.js').Game} game
   * @param {{x:number, y:number}|null} [target] required for targeted powers
   * @returns {boolean}
   */
  activate(game, target = null) {
    if (!this.isReady) return false;
    if (this.targeted && !target) return false;
    this.target = target;
    this.uses += 1;
    this.cooldownTotal = this.constructor.cooldown * game.modifier('powerCooldown');
    this.onActivate(game, target);
    if (this.duration > 0) {
      this.state = 'active';
      this.timer = this.duration;
    } else {
      this.state = 'cooldown';
      this.timer = this.cooldown;
    }
    return true;
  }

  update(dt, game) {
    if (this.state === 'ready') return;
    this.timer -= dt;
    if (this.state === 'active') {
      this.onTick(dt, game);
      if (this.timer <= 0) {
        this.onEnd(game);
        this.state = 'cooldown';
        this.timer = this.cooldown;
      }
    } else if (this.timer <= 0) {
      this.state = 'ready';
      this.timer = 0;
    }
  }

  // Hooks -----------------------------------------------------------------
  // eslint-disable-next-line no-unused-vars
  onActivate(game, target) {}
  // eslint-disable-next-line no-unused-vars
  onTick(dt, game) {}
  // eslint-disable-next-line no-unused-vars
  onEnd(game) {}

  serialize() {
    return { id: this.id, state: this.state, timer: this.timer, uses: this.uses };
  }

  restore(data) {
    // An "active" power is restored as cooldown to avoid exploits.
    this.uses = data.uses || 0;
    if (data.state === 'active') {
      this.state = 'cooldown';
      this.timer = this.cooldown;
    } else {
      this.state = data.state;
      this.timer = data.timer;
    }
    return this;
  }
}
