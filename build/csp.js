/**
 * @file Content-Security-Policy of the production builds.
 *
 * - Our site ("web"): no third-party script, no eval, no outgoing connection.
 *   The only inline script (theme applied before first paint) is allowed by its
 *   SHA-256 hash, computed at build time.
 * - Portal builds (CrazyGames / Poki): the ad networks load their own scripts,
 *   frames, inline styles and videos from many domains, so HTTPS sources are
 *   allowed. eval, plugins, <base> changes and form posts stay forbidden.
 */

/** Origin of each portal SDK. */
export const PORTAL_SDK_ORIGINS = Object.freeze({
  crazygames: 'https://sdk.crazygames.com',
  poki: 'https://game-cdn.poki.com',
});

/**
 * @param {{ target?: string, inlineScriptHashes?: string[] }} [options]
 * @returns {string} the policy, ready for a <meta http-equiv> tag
 */
export function buildCsp({ target = 'web', inlineScriptHashes = [] } = {}) {
  if (target !== 'web') return buildPortalCsp(target, inlineScriptHashes);
  return [
    "default-src 'self'",
    `script-src 'self' ${inlineScriptHashes.join(' ')}`.trim(),
    "style-src 'self'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "media-src 'self' data: blob:",
    "manifest-src 'self'",
    "worker-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join('; ');
}

/**
 * @param {string} target 'crazygames' | 'poki'
 * @param {string[]} inlineScriptHashes
 */
export function buildPortalCsp(target, inlineScriptHashes = []) {
  const sdk = PORTAL_SDK_ORIGINS[target];
  if (!sdk) throw new Error(`unknown target "${target}"`);
  return [
    "default-src 'self'",
    `script-src 'self' ${inlineScriptHashes.join(' ')} ${sdk} https:`.replace(/\s+/g, ' '),
    "style-src 'self' 'unsafe-inline' https:",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https:",
    "connect-src 'self' https: wss:",
    "media-src 'self' data: blob: https:",
    "frame-src https:",
    "manifest-src 'self'",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join('; ');
}
