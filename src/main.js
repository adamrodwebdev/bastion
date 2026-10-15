/**
 * @file Entry point: starts the services, creates the Vue app and mounts it on #app.
 */

import { createApp } from 'vue';
import App from './App.vue';
import { services } from './services/index.js';
import { store, actions, t } from './store.js';
import './styles/main.css';

// Build target on the root element: portal-specific layout rules (see main.css).
document.documentElement.dataset.target = typeof __TARGET__ === 'string' ? __TARGET__ : 'web';

// Playgama first starts its SDK and loads the saves from it; then the player's
// language is loaded (one small file), then the app starts.
const ready = services.preparePortal().catch(() => {});
ready.then(() => services.bootstrap()).then(() => {
  actions.init();
  const app = createApp(App);
  app.config.globalProperties.$t = t;
  app.config.globalProperties.$store = store;
  app.config.globalProperties.$actions = actions;
  app.mount('#app');
  // The static SEO text below the app is for crawlers and no-JS visitors: hide it once the game runs.
  document.documentElement.classList.add('app-ready');
  // Portal SDK (CrazyGames / Poki: loaded after the first paint; Playgama: already
  // started), then its pause state, followed by the game screens.
  services
    .connectPortal()
    .then((ads) => {
      store.portalPaused = ads.portalPaused;
      ads.on('portalPause', (paused) => (store.portalPaused = paused));
    })
    .catch(() => {});
});
