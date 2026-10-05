/**
 * @file Ad frequency rules common to every portal.
 */

/**
 * Ad frequency rules, common to every platform.
 *
 * - Never while aiming or during a flight: only between two levels.
 * - No interstitial before the player has finished `graceLevels` levels
 *   in the session (a first discovery is never interrupted).
 * - At least `minIntervalMs` (3 min, CrazyGames rule) between two interstitials.
 * - A rewarded video, chosen by the player, postpones the next interstitial.
 */
export class AdPolicy {
  #last = -Infinity
  #levels = 0

  /**
   * @param {{ minIntervalMs?: number, graceLevels?: number, now?: () => number }} [opts]
   */
  constructor({ minIntervalMs = 180_000, graceLevels = 2, now = () => Date.now() } = {}) {
    this.minIntervalMs = Math.max(0, Math.min(3_600_000, Math.round(minIntervalMs)))
    this.graceLevels = Math.max(0, Math.min(100, Math.round(graceLevels)))
    this.now = now
  }

  /** A level has just ended (won or lost). */
  levelDone() {
    this.#levels++
  }

  /** Can an interstitial be shown now? */
  canInterstitial() {
    return this.#levels >= this.graceLevels && this.now() - this.#last >= this.minIntervalMs
  }

  /** An ad (of any kind) has just been shown. */
  shown() {
    this.#last = this.now()
  }
}
