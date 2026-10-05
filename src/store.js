/**
 * @file Reactive UI state shared by the components, and the actions that change it.
 */

import { reactive } from 'vue';
import { services } from './services/index.js';
import { StoryRepository } from './core/story/StoryRepository.js';

/**
 * Reactive UI state shared by the Vue components.
 * The services stay framework-agnostic; this module is the bridge:
 * it listens to their events and mirrors what the UI needs to display.
 */
export const store = reactive({
  /** 'home' | 'campaign' | 'game' | 'workshop' | 'achievements' | 'chronicle' | 'settings' | 'multiplayer' | 'duel' */
  view: 'home',
  locale: 'en',
  theme: 'light',
  difficulty: 'normal',
  /** Campaign shown on the map: 'solo' or 'coop'. */
  track: 'solo',
  chapter: 1,
  /** Level number whose briefing is open, or null. */
  briefing: null,
  /** Episode being read: { id, next } or null. */
  story: null,
  /** Bumped on every progress change: computed properties read it to refresh. */
  progressTick: 0,
  savedGame: null,
  game: { levelNumber: 1, resume: false, key: 0, track: 'solo', loadout: [] },
  duel: { key: 0, arena: 1 },
  toasts: [],
  adBusy: false,
});

let toastId = 0;
let storyDone = null;

export const actions = {
  init() {
    const { i18n, theme, saves } = services;
    store.locale = i18n.locale;
    store.theme = theme.resolved;
    store.difficulty = saves.settings.difficulty;
    store.savedGame = saves.loadGame();
    store.chapter = Math.min(10, Math.floor(saves.campaign('solo').completed / 10) + 1);
    i18n.on('change', (l) => (store.locale = l));
    theme.on('change', (r) => (store.theme = r));
    saves.on('progress', () => (store.progressTick += 1));
    saves.on('settings', () => (store.progressTick += 1));
  },

  go(view) {
    store.view = view;
    store.briefing = null;
    if (view !== 'game') store.savedGame = services.saves.loadGame();
    if (typeof window !== 'undefined') window.scrollTo(0, 0);
  },

  setDifficulty(id) {
    store.difficulty = id;
    services.saves.updateSettings({ difficulty: id });
  },

  /** Opens the campaign map (solo or cooperation) on the furthest chapter. */
  openCampaign(track = 'solo') {
    store.track = track;
    store.chapter = Math.min(10, Math.floor(services.saves.campaign(track).completed / 10) + 1);
    actions.go('campaign');
  },

  /**
   * Opens a level's briefing; reads the chapter's episode first if it has not
   * been read yet (and the story is enabled).
   */
  openBriefing(number) {
    const beat = StoryRepository.beatBefore(number);
    if (beat && services.saves.settings.story && !services.saves.hasSeen('episodes', beat.id)) {
      actions.showStory(beat.id, () => (store.briefing = number));
      return;
    }
    store.briefing = number;
  },

  closeBriefing() {
    store.briefing = null;
  },

  /** Shows an episode of the Chronicle, then calls `then`. */
  showStory(id, then = null) {
    storyDone = then;
    store.story = { id };
  },

  closeStory() {
    const id = store.story?.id;
    if (id) services.saves.markSeen('episodes', id);
    store.story = null;
    const next = storyDone;
    storyDone = null;
    if (next) next();
  },

  /**
   * @param {number} levelNumber
   * @param {{track?:string, loadout?:string[]}} [o]
   */
  startLevel(levelNumber, { track = store.track, loadout = null } = {}) {
    services.saves.clearGame();
    store.savedGame = null;
    store.briefing = null;
    store.game = {
      levelNumber,
      resume: false,
      key: store.game.key + 1,
      track,
      loadout: loadout || services.saves.loadout(track),
    };
    actions.go('game');
  },

  resumeGame() {
    const snap = services.saves.loadGame();
    if (!snap) return;
    store.game = { levelNumber: snap.levelNumber, resume: true, key: store.game.key + 1, track: snap.track || 'solo', loadout: snap.loadout || [] };
    actions.go('game');
  },

  startDuel(arena) {
    store.duel = { key: store.duel.key + 1, arena };
    actions.go('duel');
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

  /** Interstitial ad between two levels (portal builds only; never during play). */
  async betweenLevels() {
    const ads = services.ads;
    if (!ads) return;
    store.adBusy = true;
    try {
      await ads.interstitial();
    } finally {
      store.adBusy = false;
    }
  },
};

/** Translation helper; reading store.locale makes templates re-render on language change. */
export function t(key, params) {
  // eslint-disable-next-line no-unused-expressions
  store.locale;
  return services.i18n.t(key, params);
}
