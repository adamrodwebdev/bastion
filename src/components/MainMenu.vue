<template>
  <section class="menu" aria-labelledby="menu-title">
    <div class="hero">
      <div class="hero-scene">
        <LevelMap :level="heroLevel" showcase />
        <div class="hero-text">
          <h1 id="menu-title" class="hero-title">Bastion</h1>
          <p class="hero-tagline">{{ $t('app.tagline') }}</p>
        </div>
      </div>
    </div>

    <div class="menu-card card">
      <div class="menu-actions">
        <button v-if="saved" type="button" class="btn btn-primary btn-lg" @click="$actions.resumeGame()">
          <span>{{ $t('menu.continue') }}</span>
          <small class="btn-sub">{{ $t('menu.continueInfo', saved) }}</small>
        </button>
        <button type="button" class="btn btn-lg" :class="saved ? 'btn-secondary' : 'btn-primary'" @click="$actions.go('levels')">
          {{ $t('menu.play') }}
        </button>
      </div>

      <DifficultyPicker />

      <p class="menu-stars">
        <span class="star-icon" aria-hidden="true">★</span>
        {{ $t('menu.stars', { count: totalStars }) }} / {{ maxStars }}
      </p>

      <p v-if="!storageOk" class="notice notice--warn">{{ $t('menu.storageOff') }}</p>
    </div>

    <details class="card howto">
      <summary>{{ $t('howTo.title') }}</summary>
      <ol class="howto-list">
        <li v-for="n in 6" :key="n">{{ $t('howTo.steps.' + n) }}</li>
      </ol>
    </details>

    <div v-if="confirmReset" class="card reset-confirm" role="alertdialog" aria-labelledby="reset-text">
      <p id="reset-text">{{ $t('menu.resetConfirm') }}</p>
      <div class="reset-actions">
        <button ref="resetYes" type="button" class="btn btn-danger" @click="reset">{{ $t('menu.reset') }}</button>
        <button type="button" class="btn btn-secondary" @click="confirmReset = false">{{ $t('menu.cancel') }}</button>
      </div>
    </div>
    <button v-else type="button" class="btn btn-ghost btn-danger-text" @click="askReset">{{ $t('menu.reset') }}</button>
  </section>
</template>

<script>
/**
 * @file Home screen: continue / play, difficulty, stars, how to play, reset.
 */
import DifficultyPicker from './DifficultyPicker.vue';
import LevelMap from './LevelMap.vue';
import { services } from '../services/index.js';
import { LevelCatalog } from '../core/index.js';

export default {
  name: 'MainMenu',
  components: { DifficultyPicker, LevelMap },
  data() {
    return { confirmReset: false };
  },
  computed: {
    heroLevel() {
      return LevelCatalog.get(0);
    },
    saved() {
      const s = this.$store.savedGame;
      if (!s) return null;
      const level = LevelCatalog.get(s.levelIndex);
      if (!level) return null;
      return { n: level.number, wave: Math.max(1, s.waves.waveIndex + 1), total: level.waveCount };
    },
    totalStars() {
      const stars = this.$store.progress.stars;
      return LevelCatalog.all().reduce((sum, l) => sum + Math.max(0, ...Object.values(stars[l.id] || {})), 0);
    },
    maxStars() {
      return LevelCatalog.count * 3;
    },
    storageOk() {
      return services.storage.persistent;
    },
  },
  methods: {
    // In-page confirmation (native confirm() dialogs are blocked in some embeds).
    askReset() {
      this.confirmReset = true;
      this.$nextTick(() => this.$refs.resetYes && this.$refs.resetYes.focus());
    },
    reset() {
      services.saves.resetAll();
      this.$store.savedGame = null;
      this.confirmReset = false;
      this.$actions.toast(this.$t('menu.resetDone'), 'success');
    },
  },
};
</script>
