/**
 * @file Short vibrations on the phones that allow them.
 */

/**
 * Short vibrations through the Vibration API: Android browsers have it, iPhones
 * do not on the web, and a page may be refused it (no user gesture yet, a portal
 * frame). Each call fails silently then, so the game never depends on it.
 */
export class Haptics {
  #nav;
  #enabled = true;

  /** @param {Navigator|null} [nav] */
  constructor(nav = typeof navigator === 'undefined' ? null : navigator) {
    this.#nav = nav && typeof nav.vibrate === 'function' ? nav : null;
  }

  /** True on devices that can vibrate (the setting is only offered there). */
  get supported() {
    return this.#nav !== null;
  }

  /** @param {boolean} on the player's setting */
  setEnabled(on) {
    this.#enabled = Boolean(on);
  }

  /** @param {number|number[]} pattern milliseconds of vibration (and pauses) */
  pulse(pattern) {
    if (!this.#enabled || !this.#nav) return;
    try {
      this.#nav.vibrate(pattern);
    } catch {
      // Refused by the browser or the frame: no vibration, nothing else changes.
    }
  }
}
