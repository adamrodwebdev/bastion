/**
 * @file Vite configuration.
 *
 * - `npm run build`             → our site, no ads (dist/)
 * - `npm run build:crazygames`  → CrazyGames version, with its SDK (dist-crazygames/)
 * - `npm run build:poki`        → Poki version, with its SDK (dist-poki/)
 * - `npm run build:playgama`    → Playgama version, with its Bridge SDK (dist-playgama/);
 *                                 `npm run package:playgama` checks it and zips it
 *
 * A strict Content-Security-Policy is injected at build time only (the Vite dev
 * server needs injected styles), except in the Playgama build: its Bridge loads the
 * SDK of whichever partner site runs the game, from many hosts.
 */

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { createHash } from 'node:crypto';
import { buildCsp } from './build/csp.js';

const PORTALS = ['crazygames', 'poki', 'playgama'];

/** CrazyGames HTML5 SDK v3, loaded in the <head> before the game code (their documentation). */
export const CRAZYGAMES_SDK = 'https://sdk.crazygames.com/crazygames-sdk-v3.js';

/** Playgama Bridge SDK v2: the only external file the Playgama build may load. */
export const PLAYGAMA_BRIDGE = 'https://bridge.playgama.com/v2/stable/playgama-bridge.js';

/**
 * Bridge configuration (playgama-bridge-config.json next to index.html):
 * interstitials between levels, rewarded videos for a second chance and for
 * doubling crowns, both orientations. Language and saves need no configuration.
 */
const PLAYGAMA_CONFIG = {
  advertisement: {
    minimumDelayBetweenInterstitial: 60,
    interstitial: {
      placementFallback: 'between_levels',
      placements: [{ id: 'between_levels' }],
    },
    rewarded: {
      preloadOnStart: 'revive',
      placementFallback: 'revive',
      placements: [{ id: 'revive' }, { id: 'double_crowns' }],
    },
  },
  device: {
    useBuiltInOrientationPopup: false,
    supportedOrientations: ['portrait', 'landscape'],
  },
};

/** Injects the CSP, allowing the inline (non-module) scripts of index.html by hash. */
function cspPlugin(target) {
  return {
    name: 'bastion-csp',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml(html) {
      const hashes = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(
        ([, code]) => `'sha256-${createHash('sha256').update(code).digest('base64')}'`,
      );
      const meta = `<meta http-equiv="Content-Security-Policy" content="${buildCsp({ target, inlineScriptHashes: hashes })}" />`;
      return html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    ${meta}`);
    },
  };
}

/**
 * Portals run the game in a sandboxed iframe (origin "null"): browsers refuse
 * module scripts and fonts served without CORS headers there. We ship a single
 * classic script and fonts inlined in the CSS. SEO extras (manifest, canonical,
 * structured data, crawler text) are dropped: the portal page does that job.
 */
function portalPlugin() {
  return {
    name: 'bastion-portal',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml(html) {
      return html
        .replace(/<script type="module" crossorigin src=/g, '<script defer src=')
        .replace(/<link rel="stylesheet" crossorigin href=/g, '<link rel="stylesheet" href=')
        .replace(/<link rel="modulepreload"[^>]*>\n?/g, '')
        .replace(/ *<link rel="(manifest|canonical|alternate)"[^>]*>\n?/g, '')
        .replace(/ *<script type="application\/ld\+json">[\s\S]*?<\/script>\n?/, '')
        .replace(/ *<section class="seo-about"[\s\S]*?<\/section>\n?/, '');
    },
  };
}

/**
 * Playgama: Bridge loaded in the <head> before the game (the portal's build check
 * looks for it there), its configuration next to index.html, and no localStorage:
 * the script applying the saved theme before first paint is removed (saves live in
 * `bridge.storage`). The page of Playgama has its own social and search tags: ours
 * (pointing to our site) and the home-screen icon are removed.
 */
function playgamaPlugin() {
  return {
    name: 'bastion-playgama',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml(html) {
      return {
        html: html
          .replace(/ *<!-- Applies the saved theme before first paint[^>]*-->\s*<script>[\s\S]*?<\/script>\n?/, '')
          .replace(/ *<meta (property|name)="(og:[^"]*|twitter:[^"]*|keywords|robots)"[^>]*>\n?/g, '')
          .replace(/ *<link rel="apple-touch-icon"[^>]*>\n?/g, '')
          .replace(/<title>[^<]*<\/title>/, '<title>Bastion Tower Defense</title>'),
        tags: [{ tag: 'script', attrs: { src: PLAYGAMA_BRIDGE }, injectTo: 'head-prepend' }],
      };
    },
    generateBundle() {
      const source = `${JSON.stringify(PLAYGAMA_CONFIG, null, 2)}\n`;
      this.emitFile({ type: 'asset', fileName: 'playgama-bridge-config.json', source });
    },
  };
}

/**
 * CrazyGames: SDK v3 first in the <head>, before the game code, as its documentation
 * asks (the game then awaits its init). The portal's page has its own social and
 * search tags: ours (pointing to our site) and the home-screen icon are removed.
 */
function crazygamesPlugin() {
  return {
    name: 'bastion-crazygames',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml(html) {
      return {
        html: html
          .replace(/ *<meta (property|name)="(og:[^"]*|twitter:[^"]*|keywords|robots)"[^>]*>\n?/g, '')
          .replace(/ *<link rel="apple-touch-icon"[^>]*>\n?/g, ''),
        tags: [{ tag: 'script', attrs: { src: CRAZYGAMES_SDK }, injectTo: 'head-prepend' }],
      };
    },
  };
}

export default defineConfig(({ mode }) => {
  /** Target platform: our site ('web') or a portal (mode of the same name). */
  const target = PORTALS.includes(mode) ? mode : 'web';
  const portal = target !== 'web';

  return {
    // Relative base: the build works from any sub-folder (Netlify, portals, etc.).
    base: './',
    plugins: [
      vue(),
      ...(target === 'playgama' ? [] : [cspPlugin(target)]),
      ...(portal ? [portalPlugin()] : []),
      ...(target === 'playgama' ? [playgamaPlugin()] : []),
      ...(target === 'crazygames' ? [crazygamesPlugin()] : []),
    ],
    build: {
      outDir: portal ? `dist-${target}` : 'dist',
      // Broad compatibility (Safari 14+, Chrome/Edge/Firefox 90+), modern syntax down-levelled by esbuild.
      target: ['es2020', 'safari14', 'chrome90', 'firefox90', 'edge90'],
      cssTarget: ['safari14', 'chrome90', 'firefox90'],
      cssCodeSplit: false,
      sourcemap: false,
      reportCompressedSize: true,
      assetsInlineLimit: portal ? Number.MAX_SAFE_INTEGER : 4096,
      modulePreload: portal ? false : { polyfill: true },
      rollupOptions: portal
        ? { output: { format: 'iife', inlineDynamicImports: true } }
        : // Vue in its own long-term cacheable chunk.
          { output: { manualChunks: { vue: ['vue'] } } },
    },
    define: {
      __TARGET__: JSON.stringify(target),
      __VUE_OPTIONS_API__: true,
      __VUE_PROD_DEVTOOLS__: false,
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
    },
    server: { host: true },
  };
});
