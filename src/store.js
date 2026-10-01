/**
 * @file Reactive UI state shared by the components, and the actions that change it.
 */

import { reactive } from 'vue';
import { services } from './services/index.js';

/**
 * Reactive UI state shared by the Vue components.
 * The services stay framework-agnostic; this module is the bridge:
 * it listens to their events and mirrors what the UI needs to display.
 */
export const store = reactive({
  view: 'menu', // 'menu' | 'levels' | 'game'
  locale: 'en',
  theme: 'light',
  difficulty: 'normal',
  progress: { completed: 0, stars: {}, best: {} },
  savedGame: null,
  game: { levelIndex: 0, resume: false, key: 0 },
  toasts: [],
});

let toastId = 0;

export const actions = {
  init() {
    const { i18n, theme, saves } = services;
    store.locale = i18n.locale;
    store.theme = theme.resolved;
    store.difficulty = saves.settings.difficulty;
    store.progress = clone(saves.progress);
    store.savedGame = saves.loadGame();
    i18n.on('change', (l) => (store.locale = l));
    theme.on('change', (r) => (store.theme = r));
    saves.on('progress', (p) => (store.progress = clone(p)));
  },

  go(view) {
    store.view = view;
    if (view !== 'game') store.savedGame = services.saves.loadGame();
    if (typeof window !== 'undefined') window.scrollTo(0, 0);
  },

  setDifficulty(id) {
    store.difficulty = id;
    services.saves.updateSettings({ difficulty: id });
  },

  startLevel(levelIndex) {
    services.saves.clearGame();
    store.savedGame = null;
    store.game = { levelIndex, resume: false, key: store.game.key + 1 };
    actions.go('game');
  },

  resumeGame() {
    const snap = services.saves.loadGame();
    if (!snap) return;
    store.game = { levelIndex: snap.levelIndex, resume: true, key: store.game.key + 1 };
    actions.go('game');
  },

  toast(message, kind = 'info', ttl = 2600) {
    const id = ++toastId;
    store.toasts.push({ id, message, kind });
    if (store.toasts.length > 3) store.toasts.shift();
    setTimeout(() => {
      const i = store.toasts.findIndex((t) => t.id === id);
      if (i >= 0) store.toasts.splice(i, 1);
    }, ttl);
  },
};

/** Translation helper; reading store.locale makes templates re-render on language change. */
export function t(key, params) {
  // eslint-disable-next-line no-unused-expressions
  store.locale;
  return services.i18n.t(key, params);
}

function clone(o) {
  return JSON.parse(JSON.stringify(o));
}
