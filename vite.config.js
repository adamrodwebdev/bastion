/**
 * @file Vite configuration.
 *
 * - `npm run build`             → our site, no ads (dist/)
 * - `npm run build:crazygames`  → CrazyGames version, with its SDK (dist-crazygames/)
 * - `npm run build:poki`        → Poki version, with its SDK (dist-poki/)
 *
 * A strict Content-Security-Policy is injected at build time only (the Vite dev
 * server needs injected styles).
 */

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { createHash } from 'node:crypto';
import { buildCsp } from './build/csp.js';

const PORTALS = ['crazygames', 'poki'];

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

export default defineConfig(({ mode }) => {
  /** Target platform: our site ('web') or a portal (mode of the same name). */
  const target = PORTALS.includes(mode) ? mode : 'web';
  const portal = target !== 'web';

  return {
    // Relative base: the build works from any sub-folder (Netlify, portals, etc.).
    base: './',
    plugins: [vue(), cspPlugin(target), ...(portal ? [portalPlugin()] : [])],
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
