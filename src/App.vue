<template>
  <a class="skip-link" href="#main">{{ $t('app.skip') }}</a>

  <header class="app-header" :class="{ 'app-header--compact': inPlay }">
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
    <HomeScreen v-if="$store.view === 'home'" />
    <CampaignScreen v-else-if="$store.view === 'campaign'" />
    <GameScreen v-else-if="$store.view === 'game'" :key="$store.game.key" />
    <WorkshopScreen v-else-if="$store.view === 'workshop'" />
    <AchievementsScreen v-else-if="$store.view === 'achievements'" />
    <ChronicleScreen v-else-if="$store.view === 'chronicle'" />
    <SettingsScreen v-else-if="$store.view === 'settings'" />
    <MultiplayerScreen v-else-if="$store.view === 'multiplayer'" />
    <DuelScreen v-else-if="$store.view === 'duel'" :key="$store.duel.key" />
  </main>

  <footer v-if="!inPlay" class="app-footer">
    <p>{{ $t('app.footer') }}</p>
  </footer>

  <StoryPanel v-if="$store.story" :beat-id="$store.story.id" />
  <div v-if="$store.adBusy" class="ad-veil" role="status">{{ $t('app.adBreak') }}</div>
  <ToastStack />
</template>

<script>
/**
 * @file Root component: header (language, theme), current screen, story, toasts.
 */
import AppIcon from './components/AppIcon.vue';
import HomeScreen from './components/HomeScreen.vue';
import CampaignScreen from './components/CampaignScreen.vue';
import GameScreen from './components/GameScreen.vue';
import WorkshopScreen from './components/WorkshopScreen.vue';
import AchievementsScreen from './components/AchievementsScreen.vue';
import ChronicleScreen from './components/ChronicleScreen.vue';
import SettingsScreen from './components/SettingsScreen.vue';
import MultiplayerScreen from './components/MultiplayerScreen.vue';
import DuelScreen from './components/DuelScreen.vue';
import StoryPanel from './components/StoryPanel.vue';
import ToastStack from './components/ToastStack.vue';
import { services } from './services/index.js';

export default {
  name: 'App',
  components: { AppIcon, HomeScreen, CampaignScreen, GameScreen, WorkshopScreen, AchievementsScreen, ChronicleScreen, SettingsScreen, MultiplayerScreen, DuelScreen, StoryPanel, ToastStack },
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
  },
  methods: {
    setLocale(code) {
      services.i18n.setLocale(code);
    },
    toggleTheme() {
      services.theme.toggle();
    },
  },
};
</script>
