/**
 * @file Entry point: starts the services, creates the Vue app and mounts it on #app.
 */

import { createApp } from 'vue';
import App from './App.vue';
import { services } from './services/index.js';
import { store, actions, t } from './store.js';
import './styles/main.css';

services.bootstrap();
actions.init();

const app = createApp(App);
app.config.globalProperties.$t = t;
app.config.globalProperties.$store = store;
app.config.globalProperties.$actions = actions;
app.mount('#app');
// The static SEO text below the app is for crawlers and no-JS visitors: hide it once the game runs.
document.documentElement.classList.add('app-ready');

// Portal SDK (CrazyGames / Poki builds only): loaded after the first paint.
services.connectPortal().catch(() => {});
