<template>
  <section class="home" aria-labelledby="home-title">
    <div class="home-main">
      <!-- Portals asking for a 2 to 4-word title shown in the game (Playgama): "Bastion Tower Defense". -->
      <h1 id="home-title" class="hero-title">Bastion<span v-if="longTitle" class="hero-title-sub"> Tower Defense</span></h1>
      <p class="hero-tagline mat-parch">{{ $t('app.tagline') }}</p>

      <div class="home-menu">
        <button v-if="saved" type="button" class="btn btn-primary btn-lg btn-hero home-continue" @click="$actions.resumeGame()">
          <AppIcon name="play" class="btn-hero-icon" />
          <span class="btn-hero-text">
            <span class="btn-hero-title">{{ $t('home.continue') }}</span>
            <small>{{ $t('home.continueInfo', saved) }}</small>
          </span>
          <AppIcon name="back" class="btn-hero-chevron" />
        </button>
        <button type="button" class="btn btn-lg btn-hero" :class="saved ? 'btn-secondary' : 'btn-primary'" @click="$actions.openCampaign('solo')">
          <CrestEmblem class="btn-hero-icon" />
          <span class="btn-hero-text">
            <span class="btn-hero-title">{{ $t('home.campaign') }}</span>
            <small>{{ $t('home.campaignInfo', { n: nextLevel, stars: stars, max: maxStars }) }}</small>
          </span>
          <AppIcon name="back" class="btn-hero-chevron" />
        </button>
        <div class="home-pair">
          <button type="button" class="btn btn-secondary home-wood" @click="$actions.go('multiplayer')">
            <AppIcon name="users" /> {{ $t('home.twoPlayers') }}
          </button>
          <button type="button" class="btn btn-secondary home-wood" @click="$actions.go('learn')">
            <AppIcon name="target" /> {{ $t('learn.title') }}
          </button>
        </div>
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
    </div>

    <div class="home-side">
      <!-- The kingdom's panorama, in a gilt frame. -->
      <div class="hero-frame" aria-hidden="true">
        <div class="hero-window">
          <canvas ref="hero" class="hero-canvas"></canvas>
        </div>
      </div>
      <div v-if="newPlayer" class="new-player card">
        <PixelPortrait id="gontran" height="4.2rem" decorative />
        <div class="new-player-body">
          <p class="new-player-title">{{ $t('home.newPlayer') }}</p>
          <p class="new-player-text">{{ $t('home.newPlayerText') }}</p>
        </div>
        <button type="button" class="btn btn-secondary" @click="$actions.startTraining(firstLesson)">
          {{ $t('home.newPlayerStart') }}
        </button>
      </div>
    </div>
  </section>
</template>

<script>
/**
 * @file Home screen, a title screen: the kingdom's panorama and the gilt title, the
 * campaign (or the game to continue), two players, learning, workshop, challenges
 * and chronicle; Gontran's first lesson for newcomers.
 */
import AppIcon from './AppIcon.vue';
import CrestEmblem from './CrestEmblem.vue';
import PixelPortrait from './PixelPortrait.vue';
import { LESSONS } from '../core/tutorial/Training.js';
import { services } from '../services/index.js';
import { LevelCatalog } from '../core/config/LevelCatalog.js';

export default {
  name: 'HomeScreen',
  components: { AppIcon, CrestEmblem, PixelPortrait },
  computed: {
    /** The full name under the logo, on the portals listing the game as "Bastion Tower Defense". */
    longTitle() {
      return typeof __TARGET__ === 'string' && __TARGET__ === 'playgama';
    },
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
    /** Never played: the training is offered first. */
    newPlayer() {
      return this.saves.training.length === 0 && this.saves.campaign('solo').completed === 0 && !this.saved;
    },
    firstLesson() {
      return LESSONS[0].id;
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
    async startHero() {
      const canvas = this.$refs.hero;
      if (!canvas || !canvas.getContext) return;
      // Loaded separately: the panorama never delays the first paint.
      const { HeroScene } = await import('../core/rendering/HeroScene.js');
      if (!this.$refs.hero) return;
      const scene = new HeroScene(canvas);
      scene.night = this.$store.theme === 'dark';
      scene.reduced = services.motion.reduced;
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
