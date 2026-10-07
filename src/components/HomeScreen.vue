<template>
  <section class="home" aria-labelledby="home-title">
    <div class="hero">
      <canvas ref="hero" class="hero-art hero-canvas" aria-hidden="true"></canvas>
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
import { HeroScene } from '../core/rendering/HeroScene.js';

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
  watch: {
    '$store.theme'(mode) {
      if (this.scene) {
        this.scene.night = mode === 'dark';
        this.scene.draw(this.time || 0);
      }
    },
  },
  mounted() {
    // The panorama is decoration: painted after the first frame so it never delays the page.
    this.raf = requestAnimationFrame(() => this.startHero());
  },
  beforeUnmount() {
    cancelAnimationFrame(this.raf);
    this.observer?.disconnect();
  },
  methods: {
    startHero() {
      const canvas = this.$refs.hero;
      if (!canvas || !canvas.getContext) return;
      const scene = new HeroScene(canvas);
      scene.night = this.$store.theme === 'dark';
      scene.reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.scene = scene;
      this.time = 4;
      const fit = () => {
        scene.resize(canvas.clientWidth || 420, Math.min(globalThis.devicePixelRatio || 1, 2));
        scene.draw(this.time);
      };
      fit();
      if (typeof ResizeObserver === 'function') {
        this.observer = new ResizeObserver(fit);
        this.observer.observe(canvas);
      }
      if (scene.reduced) return;
      let last = performance.now();
      const loop = (now) => {
        this.raf = requestAnimationFrame(loop);
        // About 30 frames per second is plenty for a menu.
        if (now - last < 32 || document.hidden) return;
        this.time += Math.min(0.1, (now - last) / 1000);
        last = now;
        scene.draw(this.time);
      };
      this.raf = requestAnimationFrame(loop);
    },
  },
};
</script>
