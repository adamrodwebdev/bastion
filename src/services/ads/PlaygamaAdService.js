/**
 * @file Playgama Bridge SDK v2 adapter: ads, saves, language, sound and pause of the portal.
 */

import { AdService } from './AdService.js'
import { AdPolicy } from './AdPolicy.js'

/**
 * Keys of the game's saves (as StorageService namespaces them): loaded together
 * in one call at start, as Playgama asks.
 */
export const SAVE_KEYS = Object.freeze(['bastion-td:progress', 'bastion-td:settings', 'bastion-td:currentGame'])

/** An ad that has not even started loading by then was skipped (too soon, none): go on. */
const AD_START_TIMEOUT = 4_000
/**
 * An ad still loading by then will not open. On Playgama's own pages, an ad whose
 * request fails (ad blocker) leaves Bridge "loading" for good, with no failure ever
 * told, and every later request is ignored.
 */
const AD_OPEN_TIMEOUT = 12_000
/** Longest an open ad may last before the game goes on regardless, in milliseconds. */
const AD_TIMEOUT = 120_000
/** Bridge ad states during which it ignores any other ad request. */
const AD_BUSY = ['loading', 'opened', 'rewarded']
/** Bridge placements of the rewarded videos, by reward (see RewardTicket). */
const REWARDED_PLACEMENTS = { revive: 'revive', 'double-crowns': 'double_crowns' }

/** Event names of Bridge v2, with the documented values as a fallback. */
const eventsOf = (bridge) => ({
  pause: bridge.EVENT_NAME?.PAUSE_STATE_CHANGED ?? 'pause_state_changed',
  audio: bridge.EVENT_NAME?.AUDIO_STATE_CHANGED ?? 'audio_state_changed',
  interstitial: bridge.EVENT_NAME?.INTERSTITIAL_STATE_CHANGED ?? 'interstitial_state_changed',
  rewarded: bridge.EVENT_NAME?.REWARDED_STATE_CHANGED ?? 'rewarded_state_changed',
})

/** Runs a Bridge call that may throw or return a rejected promise, ignoring both. */
const quietly = (call) => {
  try {
    Promise.resolve(call()).catch(() => {})
  } catch {
    /* a lost write or signal is never worth stopping the game for */
  }
}

/**
 * localStorage-like backend over `bridge.storage` (for StorageService): every key
 * is loaded in one call at start and kept in memory, so the game reads its saves
 * synchronously; writes go to Bridge in the background, only when a value changes.
 */
export class BridgeStorage {
  /** @param {object} bridge Playgama Bridge, initialized */
  constructor(bridge) {
    this.bridge = bridge
    this.cache = new Map()
  }

  /**
   * Loads the given keys in a single `storage.get` call.
   * @param {readonly string[]} keys
   */
  async load(keys) {
    try {
      const values = await this.bridge.storage.get([...keys], false)
      keys.forEach((key, i) => {
        if (typeof values?.[i] === 'string') this.cache.set(key, values[i])
      })
    } catch {
      // No saved data (a new player) or no storage: start from scratch.
    }
  }

  /** @returns {string | null} */
  getItem(key) {
    return this.cache.has(key) ? this.cache.get(key) : null
  }

  setItem(key, value) {
    const text = String(value)
    if (this.cache.get(key) === text) return
    this.cache.set(key, text)
    quietly(() => this.bridge.storage.set([key], [text]))
  }

  removeItem(key) {
    if (!this.cache.has(key)) return
    this.cache.delete(key)
    quietly(() => this.bridge.storage.delete([key]))
  }
}

/**
 * Playgama (Bridge SDK v2), which also publishes the game on its partner sites.
 * Documentation: https://wiki.playgama.com/playgama/bridge-sdk/getting-started
 *
 * - Saves (settings included) go through `bridge.storage` (see BridgeStorage).
 * - The portal's language is used at every launch; its sound and pause states are
 *   followed, as are the full-screen ads it may launch by itself (event `portalPause`).
 * - The moments of play are told as level messages; `game_ready` once the first
 *   screen is interactive.
 * - Ads come from Bridge only, and are not offered when Bridge finds them blocked.
 */
export class PlaygamaAdService extends AdService {
  id = 'playgama'
  #bridge = null
  #events = null
  #storage = null
  #adsBlocked = false
  #portalPaused = false
  #adOpen = false
  #paused = false
  #inLevel = false

  /** @param {{ bridge?: object }} [host] where the Bridge script put `bridge` */
  constructor(host = globalThis) {
    // Playgama advises 120–240 s between interstitials (Bridge itself waits 60 s).
    super(new AdPolicy({ minIntervalMs: 180_000, graceLevels: 2 }))
    this.host = host
  }

  /** Initializes Bridge, then loads the saves. Never fails: without Bridge the game runs as on our site. */
  async init() {
    const bridge = this.host.bridge
    if (!bridge) return
    try {
      await bridge.initialize()
    } catch {
      return
    }
    this.#bridge = bridge
    this.#events = eventsOf(bridge)
    this.#followPortal(bridge)
    this.#checkAds()
    this.#storage = new BridgeStorage(bridge)
    await this.#storage.load(SAVE_KEYS)
  }

  /** Saves through `bridge.storage` (localStorage interface), or null without Bridge. */
  get cloudStorage() {
    return this.#storage
  }

  /** Language given by the portal (ISO 639-1), or null. */
  get locale() {
    try {
      const code = this.#bridge?.platform.language
      return typeof code === 'string' && /^[A-Za-z]{2,3}(?:[-_][A-Za-z0-9]{2,8})*$/.test(code) ? code : null
    } catch {
      return null
    }
  }

  /** Playgama rule: the interface follows `platform.language` at every launch. */
  get localeAuthoritative() {
    return this.#bridge !== null
  }

  get portalMuted() {
    try {
      return this.#bridge ? this.#bridge.platform.isAudioEnabled === false : false
    } catch {
      return false
    }
  }

  /** Paused by the portal (hidden tab, its own overlay) or by a full-screen ad. */
  get portalPaused() {
    return this.#paused
  }

  get rewardedAvailable() {
    return this.#canShow(this.#bridge?.advertisement?.isRewardedSupported === true)
  }

  loadingFinished() {
    this.#send('game_ready')
  }

  gameplayStart() {
    this.#send(this.#inLevel ? 'level_resumed' : 'level_started')
    this.#inLevel = true
  }

  gameplayStop() {
    if (this.#inLevel) this.#send('level_paused')
  }

  /** The level is over: won or lost. */
  levelEnded(won) {
    if (!this.#inLevel) return
    this.#inLevel = false
    this.#send(won ? 'level_completed' : 'level_failed')
  }

  _showInterstitial(pause) {
    const ads = this.#bridge?.advertisement
    if (!ads || !this.#canShow(ads.isInterstitialSupported === true)) return Promise.resolve(false)
    return this.#watch(this.#events.interstitial, pause, () => ads.showInterstitial('between_levels')).then(
      (result) => result.opened,
    )
  }

  _showRewarded(pause, purpose) {
    const ads = this.#bridge?.advertisement
    if (!ads || !this.rewardedAvailable) return Promise.resolve(false)
    const placement = REWARDED_PLACEMENTS[purpose] ?? 'revive'
    return this.#watch(this.#events.rewarded, pause, () => ads.showRewarded(placement)).then((result) => result.rewarded)
  }

  /**
   * Follows the portal: its pause, its sound button, and every full-screen ad
   * (Playgama may launch some by itself), during which the game must be still and silent.
   */
  #followPortal(bridge) {
    const ads = bridge.advertisement
    this.#portalPaused = bridge.platform.isPaused === true
    this.#adOpen = [ads?.interstitialState, ads?.rewardedState].includes('opened')
    this.#tellPaused()
    bridge.platform.on(this.#events.pause, (paused) => {
      this.#portalPaused = paused === true
      this.#tellPaused()
    })
    bridge.platform.on(this.#events.audio, (enabled) => this.emit('mute', enabled === false))
    const onAd = (state) => {
      if (state === 'opened') this.#adOpen = true
      else if (state === 'closed' || state === 'failed') this.#adOpen = false
      else return
      this.#tellPaused()
    }
    ads?.on(this.#events.interstitial, onAd)
    ads?.on(this.#events.rewarded, onAd)
  }

  #tellPaused() {
    const paused = this.#portalPaused || this.#adOpen
    if (paused === this.#paused) return
    this.#paused = paused
    this.emit('portalPause', paused)
  }

  /**
   * True if Bridge can show an ad now: the format is supported, ads are not
   * blocked, and no ad is under way (Bridge would ignore the request).
   */
  #canShow(supported) {
    const ads = this.#bridge?.advertisement
    if (!ads || !supported || this.#adsBlocked) return false
    return !AD_BUSY.includes(ads.interstitialState ?? '') && !AD_BUSY.includes(ads.rewardedState ?? '')
  }

  /** Asks Bridge once whether ads can run at all: if not, none is offered or requested. */
  #checkAds() {
    try {
      Promise.resolve(this.#bridge.advertisement?.checkAdBlock?.()).then(
        (blocked) => {
          this.#adsBlocked = blocked === true
        },
        () => {},
      )
    } catch {
      // No answer: ads stay offered, and a request that hangs is given up.
    }
  }

  /**
   * Shows an ad and follows its states: `opened` pauses and silences the game; the ad
   * is over at `closed` or `failed`, or when it never opens.
   * @returns {Promise<{ opened: boolean, rewarded: boolean }>}
   */
  #watch(event, pause, show) {
    const ads = this.#bridge.advertisement
    return new Promise((resolve) => {
      let opened = false
      let rewarded = false
      let timer = null
      const finish = () => {
        clearTimeout(timer)
        ads.off?.(event, handler)
        resolve({ opened, rewarded })
      }
      /** Each state gives the ad a new deadline to reach the next one. */
      const wait = (delay) => {
        clearTimeout(timer)
        timer = setTimeout(finish, delay)
      }
      const handler = (state) => {
        if (state === 'loading') wait(AD_OPEN_TIMEOUT)
        else if (state === 'opened') {
          wait(AD_TIMEOUT)
          if (!opened) pause()
          opened = true
        } else if (state === 'rewarded') rewarded = true
        else if (state === 'closed' || state === 'failed') finish()
      }
      wait(AD_START_TIMEOUT)
      ads.on(event, handler)
      try {
        show()
      } catch {
        finish()
      }
    })
  }

  #send(message) {
    quietly(() => this.#bridge?.platform.sendMessage(message))
  }
}
