<template>
  <a class="skip-link" href="#main">{{ $t('app.skip') }}</a>

  <header class="app-header">
    <button type="button" class="brand" @click="$actions.go('menu')">
      <svg class="brand-logo" viewBox="0 0 32 32" aria-hidden="true">
        <path d="M5 28V11l3-2v-4h4v3h3V5h2v3h3V5h4v4l3 2v17z" fill="currentColor" />
        <path d="M13 28v-6a3 3 0 0 1 6 0v6z" fill="var(--bg)" />
      </svg>
      <span>Bastion</span>
    </button>

    <div class="header-actions">
      <label class="select-wrap">
        <span class="sr-only">{{ $t('app.language') }}</span>
        <svg class="select-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm6.9 6h-3a15.7 15.7 0 0 0-1.4-3.6A8 8 0 0 1 18.9 8ZM12 4a13.6 13.6 0 0 1 1.9 4h-3.8A13.6 13.6 0 0 1 12 4ZM4.3 14a8 8 0 0 1 0-4h3.4a16.5 16.5 0 0 0 0 4Zm.8 2h3a15.7 15.7 0 0 0 1.4 3.6A8 8 0 0 1 5.1 16Zm3-8h-3a8 8 0 0 1 4.4-3.6A15.7 15.7 0 0 0 8.1 8ZM12 20a13.6 13.6 0 0 1-1.9-4h3.8A13.6 13.6 0 0 1 12 20Zm2.3-6H9.7a14.7 14.7 0 0 1 0-4h4.6a14.7 14.7 0 0 1 0 4Zm.2 5.6a15.7 15.7 0 0 0 1.4-3.6h3a8 8 0 0 1-4.4 3.6Zm1.8-5.6a16.5 16.5 0 0 0 0-4h3.4a8 8 0 0 1 0 4Z" fill="currentColor" />
        </svg>
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
        <svg v-if="$store.theme === 'dark'" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="4.5" fill="currentColor" />
          <path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
        <svg v-else viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z" fill="currentColor" />
        </svg>
      </button>
    </div>
  </header>

  <main id="main" class="app-main" tabindex="-1">
    <MainMenu v-if="$store.view === 'menu'" />
    <LevelSelect v-else-if="$store.view === 'levels'" />
    <GameScreen v-else-if="$store.view === 'game'" :key="$store.game.key" />
  </main>

  <footer v-if="$store.view !== 'game'" class="app-footer">
    <p>{{ $t('app.footer') }}</p>
  </footer>

  <ToastStack />
</template>

<script>
/**
 * @file Root component: header (language, theme), current screen, toasts.
 */
import MainMenu from './components/MainMenu.vue';
import LevelSelect from './components/LevelSelect.vue';
import GameScreen from './components/GameScreen.vue';
import ToastStack from './components/ToastStack.vue';
import { services } from './services/index.js';

export default {
  name: 'App',
  components: { MainMenu, LevelSelect, GameScreen, ToastStack },
  computed: {
    languages() {
      return services.i18n.available;
    },
  },
  watch: {
    '$store.view': {
      immediate: true,
      handler(view) {
        document.documentElement.classList.toggle('in-game', view === 'game');
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
