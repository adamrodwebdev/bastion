/**
 * @file Picks the ad service of the current build (portal SDK or none).
 */

import { NoAdService } from './AdService.js'


/**
 * Ad service of the current build. A portal's code is only imported (as a
 * separate chunk) in that portal's build: our own site contains none of it.
 * @returns {Promise<import('./AdService.js').AdService>}
 */
export async function createAdService() {
  try {
    let service = null
    // __TARGET__ is replaced at build time by the target platform: the branches of
    // the other portals are dropped from the bundle (no SDK trace on our site).
    if (__TARGET__ === 'crazygames') service = new (await import('./CrazyGamesAdService.js')).CrazyGamesAdService()
    else if (__TARGET__ === 'poki') service = new (await import('./PokiAdService.js')).PokiAdService()
    if (!service) return new NoAdService()
    await service.init()
    return service
  } catch {
    return new NoAdService()
  }
}
