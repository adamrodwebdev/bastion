/**
 * @file Ad and portal service interface (Adapter pattern), shared with Catapulte Mania.
 */

import { EventEmitter } from '../../core/utils/EventEmitter.js'
import { AdPolicy } from './AdPolicy.js'
import { RewardTicket } from './RewardTicket.js'

/**
 * Ad and platform service (Adapter pattern).
 *
 * The game only knows this interface; each portal has its own subclass
 * (CrazyGamesAdService, PokiAdService), loaded only in that portal's build.
 * Our own site's build uses NoAdService: no third-party script.
 *
 * Events: `pause` (an ad starts: mute the sound, block the controls)
 * and `resume` (it has finished or failed).
 */
export class AdService extends EventEmitter {
  /** Platform identifier. */
  id = 'none'
  #busy = false

  /** @param {AdPolicy} [policy] */
  constructor(policy = new AdPolicy()) {
    super()
    this.policy = policy
  }

  /** Can rewarded videos be offered? */
  get rewardedAvailable() {
    return false
  }

  /** Is an ad currently playing? */
  get busy() {
    return this.#busy
  }

  /** Initializes the SDK (never fails: the game goes on without ads). */
  async init() {}

  /** The game is loaded and ready. */
  loadingFinished() {}
  /** The player starts or resumes a game. */
  gameplayStart() {}
  /** The player leaves the game (end, pause, menu). */
  gameplayStop() {}

  /**
   * Portal share link carrying parameters (v3.9, "Beat my shot"),
   * or null: the game then uses our own site's address.
   * @param {Record<string, string>} params
   * @returns {Promise<string | null>}
   */
  async inviteLink(params) { // eslint-disable-line no-unused-vars
    return null
  }

  /** Parameter received through a share link opened on the portal, or null. */
  inviteParam(key) { // eslint-disable-line no-unused-vars
    return null
  }

  /** Highlight (record, streak): portal-specific celebration. */
  happytime() {}

  /** Player's overall progress, from 0 to 100 (portal statistics). */
  reportProgress(percent) {} // eslint-disable-line no-unused-vars

  /** Platform-synced storage (localStorage interface) or null. */
  /**
   * Does the portal ask to mute the sound? (`mute` event on every change)
   */
  get portalMuted() {
    return false
  }

  /**
   * Player's language according to the portal (e.g. "en-US"), or null.
   * CrazyGames rule: use the language provided by the SDK, English by default.
   */
  get locale() {
    return null
  }

  get cloudStorage() {
    return null
  }

  /**
   * Interstitial between two levels, if the frequency rules allow it.
   * @returns {Promise<boolean>} whether an ad was shown
   */
  async interstitial() {
    this.policy.levelDone()
    if (this.#busy || !this.policy.canInterstitial()) return false
    const shown = await this.#wrap((pause) => this._showInterstitial(pause))
    if (shown) this.policy.shown()
    return shown
  }

  /**
   * Rewarded video, at the player's request.
   * @param {string} purpose intended reward (see REWARDS)
   * @returns {Promise<RewardTicket | null>} a ticket if the video was watched to the end
   */
  async rewarded(purpose) {
    if (this.#busy || !this.rewardedAvailable) return null
    const ok = await this.#wrap((pause) => this._showRewarded(pause))
    this.policy.shown()
    return ok ? RewardTicket.issue(purpose) : null
  }

  async #wrap(show) {
    this.#busy = true
    let paused = false
    const pause = () => {
      if (!paused) this.emit('pause')
      paused = true
    }
    try {
      return (await show(pause)) === true
    } catch {
      return false
    } finally {
      this.#busy = false
      if (paused) this.emit('resume')
    }
  }

  /* To be provided by subclasses. `pause` must be called when the ad starts. */
  /** @returns {Promise<boolean>} */
  async _showInterstitial() {
    return false
  }
  /** @returns {Promise<boolean>} video watched to the end */
  async _showRewarded() {
    return false
  }
}

/** Our site and the demo: no ads, no third-party script. */
export class NoAdService extends AdService {}
