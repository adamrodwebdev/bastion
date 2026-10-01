/**
 * @file Base special power with its timer: ready → active → cooldown → ready.
 */

/**
 * Special power with a timer (chronometer).
 * Life cycle: ready → active (for `duration` s) → cooldown (for `cooldown` s) → ready.
 *
 * While active, a power can expose gameplay modifiers through `modifiers`
 * (e.g. { enemySpeed: 0 }) that the engine multiplies together.
 */
export class Power {
  static id = 'power';
  static icon = '★';
  static duration = 5;
  static cooldown = 30;
  /** Level (1-based) that must be completed to unlock this power. */
  static unlockAfterLevel = 1;

  constructor() {
    this.id = this.constructor.id;
    this.state = 'ready';
    this.timer = 0;
  }

  get duration() {
    return this.constructor.duration;
  }

  get cooldown() {
    return this.constructor.cooldown;
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
    if (this.state === 'active') return this.timer / this.duration;
    if (this.state === 'cooldown') return 1 - this.timer / this.cooldown;
    return 1;
  }

  /** Modifiers applied while active. */
  get modifiers() {
    return {};
  }

  activate(game) {
    if (!this.isReady) return false;
    this.state = 'active';
    this.timer = this.duration;
    this.onActivate(game);
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
  onActivate(game) {}
  // eslint-disable-next-line no-unused-vars
  onTick(dt, game) {}
  // eslint-disable-next-line no-unused-vars
  onEnd(game) {}

  serialize() {
    return { id: this.id, state: this.state, timer: this.timer };
  }

  restore(data) {
    // An "active" power is restored as cooldown to avoid exploits.
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
