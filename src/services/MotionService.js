/**
 * @file Full motion or fades only: the player's setting and the system's wish.
 */

/**
 * Motion is reduced when the player turns it off in the settings, or when the
 * system asks for less motion (prefers-reduced-motion), which always wins.
 * The result is written on <html data-motion="full|reduced"> for the stylesheet;
 * the screen transitions and the boards read `reduced`.
 */
export class MotionService {
  #root;
  #query;
  #enabled = true;

  /**
   * @param {HTMLElement|null} [root] element that receives `data-motion`
   * @param {MediaQueryList|null} [query] the system's reduced-motion query
   */
  constructor(
    root = typeof document === 'undefined' ? null : document.documentElement,
    query = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null,
  ) {
    this.#root = root;
    this.#query = query;
    if (query) {
      if (query.addEventListener) query.addEventListener('change', () => this.#apply());
      else if (query.addListener) query.addListener(() => this.#apply()); // Safari < 14
    }
    this.#apply();
  }

  /** True when the system asks for less motion: the setting cannot override it. */
  get systemReduced() {
    return Boolean(this.#query && this.#query.matches);
  }

  /** True when movement gives way to short fades. */
  get reduced() {
    return !this.#enabled || this.systemReduced;
  }

  /** @param {boolean} on the player's setting */
  setEnabled(on) {
    this.#enabled = Boolean(on);
    this.#apply();
  }

  #apply() {
    if (this.#root) this.#root.dataset.motion = this.reduced ? 'reduced' : 'full';
  }
}
