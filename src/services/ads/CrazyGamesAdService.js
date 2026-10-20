/**
 * @file CrazyGames SDK v3 adapter.
 */

import { AdService } from './AdService.js'
import { AdPolicy } from './AdPolicy.js'
import { loadScript, SDK_URLS } from './loadScript.js'

/**
 * Ads stay off until CrazyGames moves the game to Full Launch: in Basic Launch the
 * portal refuses every ad, and an offer that cannot work (a rewarded button that
 * does nothing) is a reason for rejection. The Full Launch build turns them on:
 * `VITE_CRAZYGAMES_ADS=on npm run build:crazygames`.
 */
const ADS = import.meta.env.VITE_CRAZYGAMES_ADS === 'on'

/**
 * CrazyGames (SDK v3): "midgame" interstitials, "rewarded" videos,
 * gameplay events and synced save data (`data` module).
 * Documentation: https://docs.crazygames.com/sdk/intro/
 */
export class CrazyGamesAdService extends AdService {
  id = 'crazygames'
  #sdk = null

  constructor() {
    // CrazyGames rule: at most one interstitial every 3 minutes.
    super(new AdPolicy({ minIntervalMs: 180_000, graceLevels: 2 }))
  }

  async init() {
    try {
      // The CrazyGames build loads the SDK in the <head>; load it here only if it is missing.
      if (!globalThis.CrazyGames?.SDK) await loadScript(SDK_URLS.crazygames)
      const sdk = globalThis.CrazyGames?.SDK
      if (!sdk) return
      // Timeout: if the portal does not answer, the game starts anyway.
      await Promise.race([sdk.init(), new Promise((_, reject) => setTimeout(() => reject(new Error('sdk init timeout')), 8000))])
      if (sdk.environment === 'disabled') return
      this.#sdk = sdk
      sdk.game?.loadingStart?.()
      // Sound muted from the CrazyGames site: follow the setting and its changes.
      sdk.game?.addSettingsChangeListener?.((settings) => this.emit('mute', settings?.muteAudio === true))
    } catch {
      this.#sdk = null // ad blocker, network…: the game goes on without it
    }
  }

  get rewardedAvailable() {
    return ADS && this.#sdk !== null
  }

  get portalMuted() {
    try {
      return this.#sdk?.game?.settings?.muteAudio === true
    } catch {
      return false
    }
  }

  get locale() {
    try {
      const locale = this.#sdk?.user?.systemInfo?.locale
      return typeof locale === 'string' && /^[A-Za-z]{2,3}(?:[-_][A-Za-z0-9]{2,8})*$/.test(locale) ? locale : null
    } catch {
      return null
    }
  }

  get cloudStorage() {
    const data = this.#sdk?.data
    return data && typeof data.getItem === 'function' && typeof data.setItem === 'function' ? data : null
  }

  loadingFinished() {
    this.#sdk?.game?.loadingStop?.()
  }

  /** CrazyGames invite link (`game` module). */
  async inviteLink(params) {
    try {
      const link = this.#sdk?.game?.inviteLink?.(params)
      return typeof link === 'string' && /^https:\/\//.test(link) ? link : null
    } catch {
      return null
    }
  }
  inviteParam(key) {
    try {
      const v = this.#sdk?.game?.getInviteParam?.(key)
      return typeof v === 'string' ? v : null
    } catch {
      return null
    }
  }
  happytime() {
    this.#sdk?.game?.happytime?.()
  }
  reportProgress(percent) {
    const p = Math.max(0, Math.min(100, Math.round(Number(percent) || 0)))
    this.#sdk?.game?.reportGameCompletedPercentage?.(p)
  }
  gameplayStart() {
    this.#sdk?.game?.gameplayStart?.()
  }
  gameplayStop() {
    this.#sdk?.game?.gameplayStop?.()
  }

  #request(type, pause) {
    if (!this.#sdk) return Promise.resolve(false)
    return new Promise((resolve) => {
      this.#sdk.ad.requestAd(type, {
        adStarted: () => pause(),
        adFinished: () => resolve(true),
        adError: () => resolve(false),
      })
    })
  }

  _showInterstitial(pause) {
    return ADS ? this.#request('midgame', pause) : Promise.resolve(false)
  }

  _showRewarded(pause) {
    return ADS ? this.#request('rewarded', pause) : Promise.resolve(false)
  }
}
