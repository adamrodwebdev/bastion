<template>
  <section class="home" aria-labelledby="home-title">
    <div class="hero">
      <svg class="hero-art" viewBox="0 0 320 150" aria-hidden="true">
        <path d="M0 118 Q 60 92 120 110 T 240 100 T 320 112 V150 H0Z" class="hero-hill" />
        <path d="M-5 128 C 60 128 80 92 150 95 S 240 128 325 122" class="hero-road" />
        <g class="hero-tower" transform="translate(222 40)">
          <rect x="0" y="16" width="44" height="58" rx="4" />
          <path d="M-4 16h52V3h-9v6h-8V3h-8v6h-8V3h-8v6H5V3h-9z" />
          <rect x="16" y="48" width="12" height="26" rx="6" class="hero-door" />
          <path d="M22 3V-14l16 6-16 6" class="hero-flag" />
        </g>
        <g class="hero-tower hero-tower--small" transform="translate(150 68)">
          <rect x="0" y="10" width="26" height="34" rx="3" />
          <path d="M-3 10h32V2h-6v4h-5V2h-5v4h-5V2H3v4H-3z" />
        </g>
        <circle cx="92" cy="96" r="6" class="hero-enemy" />
        <circle cx="66" cy="104" r="5" class="hero-enemy hero-enemy--2" />
        <circle cx="42" cy="112" r="7" class="hero-enemy hero-enemy--3" />
        <path d="M110 40 q8 -8 16 0 q8 -8 16 0" class="hero-crow" />
      </svg>
      <h1 id="home-title" class="hero-title">Bastion</h1>
      <p class="hero-tagline">{{ $t('app.tagline') }}</p>
    </div>

    <div class="home-menu">
      <button v-if="saved" type="button" class="btn btn-primary btn-lg home-continue" @click="$actions.resumeGame()">
        <AppIcon name="play" />
        <span class="btn-stack">
          <span>{{ $t('home.continue') }}</span>
          <small>{{ $t('home.continueInfo', saved) }}</small>
        </span>
      </button>
      <button type="button" class="btn btn-lg" :class="saved ? 'btn-secondary' : 'btn-primary'" @click="$actions.openCampaign('solo')">
        <AppIcon name="map" />
        <span class="btn-stack">
          <span>{{ $t('home.campaign') }}</span>
          <small>{{ $t('home.campaignInfo', { n: nextLevel, stars: stars, max: maxStars }) }}</small>
        </span>
      </button>
      <button type="button" class="btn btn-secondary btn-lg" @click="$actions.go('multiplayer')">
        <AppIcon name="users" />
        <span class="btn-stack">
          <span>{{ $t('home.twoPlayers') }}</span>
          <small>{{ $t('home.twoPlayersInfo') }}</small>
        </span>
      </button>
      <div class="home-grid">
        <button type="button" class="tile" @click="$actions.go('workshop')">
          <AppIcon name="hammer" />
          <span class="tile-title">{{ $t('workshop.title') }}</span>
          <span class="tile-meta"><AppIcon name="crown" /> {{ crowns }}</span>
        </button>
        <button type="button" class="tile" @click="$actions.go('achievements')">
          <AppIcon name="trophy" />
          <span class="tile-title">{{ $t('achievements.title') }}</span>
          <span class="tile-meta">{{ achievements }} / 300</span>
        </button>
        <button type="button" class="tile" @click="$actions.go('chronicle')">
          <AppIcon name="book" />
          <span class="tile-title">{{ $t('story.chronicle') }}</span>
          <span class="tile-meta">{{ $t('home.episodes', { count: episodes }) }}</span>
        </button>
      </div>
    </div>

    <details class="card howto">
      <summary>{{ $t('howTo.title') }}</summary>
      <ol class="howto-list">
        <li v-for="n in 7" :key="n">{{ $t('howTo.steps.' + n) }}</li>
      </ol>
    </details>
  </section>
</template>

<script>
/**
 * @file Home screen: continue, campaign, two players, workshop, challenges, chronicle.
 */
import AppIcon from './AppIcon.vue';
import { services } from '../services/index.js';
import { LevelCatalog } from '../core/index.js';

export default {
  name: 'HomeScreen',
  components: { AppIcon },
  computed: {
    saves() {
      // eslint-disable-next-line no-unused-expressions
      this.$store.progressTick;
      return services.saves;
    },
    saved() {
      const s = this.$store.savedGame;
      if (!s) return null;
      const level = LevelCatalog.byNumber(s.levelNumber);
      if (!level) return null;
      return { n: level.number, wave: Math.max(1, s.waves.waveIndex + 1), total: level.waveCount };
    },
    nextLevel() {
      return Math.min(LevelCatalog.count, this.saves.campaign('solo').completed + 1);
    },
    stars() {
      return this.saves.totalStars;
    },
    maxStars() {
      return LevelCatalog.count * 3;
    },
    crowns() {
      return this.saves.progress.crowns;
    },
    achievements() {
      return this.saves.totalAchievements;
    },
    episodes() {
      return this.saves.progress.episodes.length;
    },
  },
};
</script>
