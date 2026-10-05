/**
 * @file Loads a portal SDK script once, from an allow-list.
 */

/**
 * Loads a third-party script (portal SDK) only once, with a timeout.
 * Only the https addresses listed in SDK_URLS are accepted; the portal build's
 * CSP only allows these domains for scripts anyway.
 */
export const SDK_URLS = Object.freeze({
  crazygames: 'https://sdk.crazygames.com/crazygames-sdk-v3.js',
  poki: 'https://game-cdn.poki.com/scripts/v2/poki-sdk.js',
})

const loading = new Map()

/**
 * @param {string} url one of the SDK_URLS values
 * @param {number} [timeoutMs]
 * @returns {Promise<void>}
 */
export function loadScript(url, timeoutMs = 8000) {
  if (!Object.values(SDK_URLS).includes(url)) return Promise.reject(new Error('script not allowed'))
  if (!loading.has(url)) {
    const p = new Promise((resolve, reject) => {
      const el = document.createElement('script')
      el.src = url
      el.async = true
      const timer = setTimeout(() => reject(new Error('sdk timeout')), timeoutMs)
      el.onload = () => {
        clearTimeout(timer)
        resolve()
      }
      el.onerror = () => {
        clearTimeout(timer)
        reject(new Error('sdk blocked'))
      }
      document.head.append(el)
    })
    p.catch(() => loading.delete(url))
    loading.set(url, p)
  }
  return loading.get(url)
}
