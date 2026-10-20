<template>
  <a class="skip-link" href="#main">{{ $t('app.skip') }}</a>

  <header class="app-header" :class="{ 'app-header--compact': inPlay, 'app-header--bare': $store.view === 'home' }">
    <button type="button" class="brand" :aria-label="$t('app.home')" @click="$actions.go('home')">
      <svg class="brand-logo" viewBox="0 0 32 32" aria-hidden="true">
        <path d="M5 28V11l3-2v-4h4v3h3V5h2v3h3V5h4v4l3 2v17z" fill="currentColor" />
        <path d="M13 28v-6a3 3 0 0 1 6 0v6z" fill="var(--bg)" />
      </svg>
      <span class="brand-name">Bastion</span>
    </button>

    <div class="header-actions">
      <span v-if="!inPlay" class="crowns-badge" :title="$t('workshop.crowns')">
        <AppIcon name="crown" /><span class="sr-only">{{ $t('workshop.crowns') }}</span>{{ crowns }}
      </span>
      <label class="select-wrap">
        <span class="sr-only">{{ $t('app.language') }}</span>
        <AppIcon name="globe" class="select-icon" />
        <select class="lang-select" :value="$store.locale" @change="setLocale($event.target.value)">
          <option v-for="l in languages" :key="l.code" :value="l.code">{{ l.label }}</option>
        </select>
      </label>
      <button
        type="button"
        class="icon-btn"
        :aria-label="$store.muted ? $t('app.unmute') : $t('app.mute')"
        :title="$store.muted ? $t('app.unmute') : $t('app.mute')"
        :aria-pressed="$store.muted ? 'true' : 'false'"
        @click="$actions.toggleMute()"
      >
        <AppIcon :name="$store.muted ? 'mute' : 'sound'" />
      </button>
      <button
        type="button"
        class="icon-btn"
        :aria-label="$store.theme === 'dark' ? $t('app.themeToLight') : $t('app.themeToDark')"
        :title="$store.theme === 'dark' ? $t('app.themeToLight') : $t('app.themeToDark')"
        @click="toggleTheme"
      >
        <AppIcon :name="$store.theme === 'dark' ? 'sun' : 'moon'" />
      </button>
      <button v-if="!inPlay" type="button" class="icon-btn" :aria-label="$t('settings.title')" :title="$t('settings.title')" @click="$actions.go('settings')">
        <AppIcon name="gear" />
      </button>
    </div>
  </header>

  <main id="main" class="app-main" :class="'view-' + $store.view" tabindex="-1">
    <Transition :css="false" mode="out-in" @leave="onLeave" @enter="onEnter">
      <HomeScreen v-if="$store.view === 'home'" />
      <CampaignScreen v-else-if="$store.view === 'campaign'" />
      <GameScreen v-else-if="$store.view === 'game'" :key="$store.game.key" />
      <WorkshopScreen v-else-if="$store.view === 'workshop'" />
      <AchievementsScreen v-else-if="$store.view === 'achievements'" />
      <ChronicleScreen v-else-if="$store.view === 'chronicle'" />
      <SettingsScreen v-else-if="$store.view === 'settings'" />
      <MultiplayerScreen v-else-if="$store.view === 'multiplayer'" />
      <DuelScreen v-else-if="$store.view === 'duel'" :key="$store.duel.key" />
      <LearnScreen v-else-if="$store.view === 'learn'" />
    </Transition>
  </main>

  <footer v-if="!inPlay" class="app-footer">
    <p>{{ $t('app.footer') }}</p>
  </footer>

  <StoryPanel v-if="$store.story" :beat-id="$store.story.id" />
  <div v-if="$store.adBusy" class="ad-veil" role="status">{{ $t('app.adBreak') }}</div>
  <ToastStack />
  <ScreenWipe ref="wipe" />
</template>

<script>
/**
 * @file Root component: header (language, theme), current screen, story, toasts.
 */
import { defineAsyncComponent } from 'vue';
import AppIcon from './components/AppIcon.vue';
import HomeScreen from './components/HomeScreen.vue';
import ScreenWipe from './components/ScreenWipe.vue';
import ToastStack from './components/ToastStack.vue';

// Every screen but the home one is loaded on demand: the first page stays light
// (fast on phones), the rest is fetched in the background right after.
const screens = {
  CampaignScreen: () => import('./components/CampaignScreen.vue'),
  GameScreen: () => import('./components/GameScreen.vue'),
  WorkshopScreen: () => import('./components/WorkshopScreen.vue'),
  AchievementsScreen: () => import('./components/AchievementsScreen.vue'),
  ChronicleScreen: () => import('./components/ChronicleScreen.vue'),
  SettingsScreen: () => import('./components/SettingsScreen.vue'),
  MultiplayerScreen: () => import('./components/MultiplayerScreen.vue'),
  DuelScreen: () => import('./components/DuelScreen.vue'),
  StoryPanel: () => import('./components/StoryPanel.vue'),
  LearnScreen: () => import('./components/LearnScreen.vue'),
};
const lazy = Object.fromEntries(Object.entries(screens).map(([name, load]) => [name, defineAsyncComponent(load)]));

/** Warms up the other screens once the browser is idle. */
function prefetchScreens() {
  const run = () => Object.values(screens).forEach((load) => load().catch(() => {}));
  if (typeof requestIdleCallback === 'function') requestIdleCallback(run, { timeout: 4000 });
  else setTimeout(run, 2500);
}
import { services } from './services/index.js';
import { scrollToTop } from './store.js';

/**
 * A short fade of a screen, for reduced motion (resolves at once where nothing can animate).
 * A screen that fades out stays hidden until it is removed (fill).
 */
function fade(el, from, to, duration, fill = 'none') {
  if (!el || el.nodeType !== 1 || typeof el.animate !== 'function') return Promise.resolve();
  return el.animate([{ opacity: from }, { opacity: to }], { duration, easing: 'ease', fill }).finished.catch(() => {});
}

export default {
  name: 'App',
  components: { AppIcon, HomeScreen, ScreenWipe, ToastStack, ...lazy },
  computed: {
    languages() {
      return services.i18n.available;
    },
    inPlay() {
      return this.$store.view === 'game' || this.$store.view === 'duel';
    },
    crowns() {
      // eslint-disable-next-line no-unused-expressions
      this.$store.progressTick;
      return services.saves.progress.crowns;
    },
  },
  watch: {
    inPlay: {
      immediate: true,
      handler(v) {
        document.documentElement.classList.toggle('in-game', v);
      },
    },
    // The screen on show, for the rules that change the page around it (sky, header).
    '$store.view': {
      immediate: true,
      handler(view) {
        document.documentElement.dataset.view = view;
      },
    },
  },
  mounted() {
    prefetchScreens();
  },
  methods: {
    setLocale(code) {
      services.i18n.setLocale(code);
    },
    toggleTheme() {
      services.theme.toggle();
    },
    /** The old screen goes: the banner drops over it (it fades out with reduced motion). */
    onLeave(el, done) {
      if (services.motion.reduced) {
        fade(el, 1, 0, 100, 'forwards').then(done);
        return;
      }
      this.$refs.wipe.cover().then(() => {
        done();
        scrollToTop();
        // The new screen is in place under the banner by the next frame: lift it.
        this.$nextTick(() => requestAnimationFrame(() => this.$refs.wipe?.reveal()));
      });
    },
    /** The new screen comes: already there under the banner, or a short fade in. */
    onEnter(el, done) {
      if (!services.motion.reduced) {
        done();
        return;
      }
      scrollToTop();
      fade(el, 0, 1, 150).then(done);
    },
  },
};
</script>
