/**
 * @file Vite configuration (build targets, chunks, Vue flags).
 */

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  // Relative base: the build works from any sub-folder (GitHub Pages, Netlify, etc.).
  base: './',
  build: {
    // Broad compatibility (Safari 14+, Chrome/Edge/Firefox 90+), modern syntax down-levelled by esbuild.
    target: ['es2020', 'safari14', 'chrome90', 'firefox90', 'edge90'],
    cssTarget: ['safari14', 'chrome90', 'firefox90'],
    cssCodeSplit: false,
    sourcemap: false,
    modulePreload: { polyfill: true },
    reportCompressedSize: true,
    rollupOptions: {
      output: {
        // Vue in its own long-term cacheable chunk.
        manualChunks: { vue: ['vue'] },
      },
    },
  },
  define: {
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: false,
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
  },
});
