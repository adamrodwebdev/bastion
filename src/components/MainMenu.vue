<template>
  <section class="menu" aria-labelledby="menu-title">
    <div class="hero">
      <div class="hero-text">
        <h1 id="menu-title" class="hero-title">Bastion</h1>
        <p class="hero-tagline">{{ $t('app.tagline') }}</p>
      </div>
      <svg class="hero-art" viewBox="0 0 220 120" aria-hidden="true">
        <path d="M0 96 Q 40 70 80 90 T 160 80 T 220 92 V120 H0Z" class="hero-hill" />
        <path d="M-5 104 C 40 104 50 70 100 72 S 160 104 225 100" class="hero-road" />
        <g class="hero-tower" transform="translate(150 34)">
          <rect x="0" y="12" width="34" height="46" rx="4" />
          <path d="M-3 12h40V2h-7v5h-6V2h-6v5h-6V2h-6v5H4V2h-7z" />
          <rect x="12" y="38" width="10" height="20" rx="5" class="hero-door" />
        </g>
        <circle cx="64" cy="76" r="6" class="hero-enemy" />
        <circle cx="40" cy="86" r="5" class="hero-enemy hero-enemy--2" />
        <circle cx="18" cy="96" r="4" class="hero-enemy hero-enemy--3" />
      </svg>
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
import { services } from '../services/index.js';
import { LevelCatalog } from '../core/index.js';

export default {
  name: 'MainMenu',
  components: { DifficultyPicker },
  data() {
    return { confirmReset: false };
  },
  computed: {
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
