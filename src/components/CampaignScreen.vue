<template>
  <section class="campaign" :class="'theme-' + chapter.theme" aria-labelledby="campaign-title">
    <header class="cmap-top">
      <button type="button" class="icon-btn cmap-back" :aria-label="$t('app.back')" :title="$t('app.back')" @click="$actions.go('home')">
        <AppIcon name="back" />
      </button>
      <div :key="'banner-' + chapter.id" class="cmap-banner cloth">
        <span class="cmap-eyebrow">
          <template v-if="track === 'coop'">{{ $t('campaign.coopTitle') }} · </template>{{ $t('campaign.chapter', { n: chapter.id }) }}
        </span>
        <h1 id="campaign-title" class="cmap-title">{{ $t('chapters.c' + chapter.id + '.name') }}</h1>
      </div>
      <span class="cmap-stars mat-iron" :title="$t('campaign.chapterStars', { stars: chapterStars, max: 30 })">
        <AppIcon name="star" /><span class="sr-only">{{ $t('campaign.chapterStars', { stars: chapterStars, max: 30 }) }}</span>
        <span aria-hidden="true">{{ chapterStars }}/30</span>
      </span>
    </header>
    <p class="cmap-desc">{{ $t('chapters.c' + chapter.id + '.desc') }}</p>

    <div ref="stage" class="cmap-stage" @pointerdown="swipeStart" @pointerup="swipeEnd" @pointercancel="swipe = null">
      <canvas ref="land" class="cmap-land" :class="{ 'is-ready': landReady }" aria-hidden="true"></canvas>
      <div class="cmap-wash" aria-hidden="true"></div>
      <svg v-if="size.w" class="cmap-route" :viewBox="`0 0 ${size.w} ${size.h}`" aria-hidden="true">
        <path class="route-all" :d="route.all" />
        <path class="route-done" :d="route.done" />
        <path v-if="route.step" :key="'step-' + chapter.id" class="route-step" :d="route.step" pathLength="1" />
      </svg>
      <ol :key="'nodes-' + chapter.id" class="cmap-nodes" role="list">
        <li v-for="(n, i) in nodes" :key="n.number" :style="{ left: n.x + 'px', top: n.y + 'px', '--i': i }">
          <button
            type="button"
            class="node"
            :class="{ 'is-done': n.done, 'is-next': n.next, 'is-locked': !n.unlocked, 'is-boss': n.boss }"
            :disabled="!n.unlocked"
            :aria-label="n.label"
            @click="open(n)"
          >
            <AppIcon v-if="!n.unlocked" name="lock" />
            <span v-else class="node-num">{{ n.number }}</span>
            <AppIcon v-if="n.boss" name="skull" class="node-skull" />
          </button>
          <span v-if="n.done" class="node-stars" aria-hidden="true">{{ '★'.repeat(n.stars) + '☆'.repeat(3 - n.stars) }}</span>
        </li>
      </ol>
      <!-- The kingdom's pennant over the level to play. -->
      <span v-if="current" :key="'flag-' + chapter.id" class="cmap-pennant" :style="{ left: current.x + 'px', top: current.y + 'px' }" aria-hidden="true">
        <span class="pennant-pole"></span>
        <span class="pennant-cloth cloth"></span>
      </span>
    </div>

    <nav class="cmap-bottom" :aria-label="$t('campaign.chapters')">
      <button type="button" class="btn btn-secondary cmap-arrow" :disabled="!canGo(-1)" :aria-label="$t('campaign.prevChapter')" @click="go(-1)">
        <AppIcon name="back" />
      </button>
      <span class="cmap-dots">
        <button
          v-for="c in chapters"
          :key="c.id"
          type="button"
          class="cmap-dot"
          :class="{ 'is-on': c.id === chapter.id }"
          :disabled="!c.unlocked"
          :aria-current="c.id === chapter.id ? 'page' : undefined"
          :aria-label="$t('campaign.chapterName', { n: c.id, name: $t('chapters.c' + c.id + '.name') })"
          @click="$store.chapter = c.id"
        ></button>
      </span>
      <button type="button" class="btn btn-secondary cmap-arrow" :disabled="!canGo(1)" :aria-label="$t('campaign.nextChapter')" @click="go(1)">
        <AppIcon name="back" class="flip" />
      </button>
    </nav>

    <BriefingPanel v-if="$store.briefing" :number="$store.briefing" />
  </section>
</template>

<script>
/**
 * @file Campaign map: one chapter at a time, its ten levels on a road across the
 * chapter's land (painted by the board's painter, aged into an old map), the
 * kingdom's pennant over the level to play, and the chapters on either side.
 */
import AppIcon from './AppIcon.vue';
import BriefingPanel from './BriefingPanel.vue';
import { services } from '../services/index.js';
import { LevelCatalog, CHAPTERS } from '../core/index.js';
import { countAchievements } from '../core/progression/Achievements.js';
import { levelSpots, roadSegments, pathData } from '../core/rendering/mapRoute.js';

/** A swipe across the map turns the page: at least this far, mostly sideways. */
const SWIPE_PX = 50;

export default {
  name: 'CampaignScreen',
  components: { AppIcon, BriefingPanel },
  data() {
    return { size: { w: 0, h: 0 }, landReady: false, swipe: null };
  },
  computed: {
    saves() {
      // eslint-disable-next-line no-unused-expressions
      this.$store.progressTick;
      return services.saves;
    },
    track() {
      return this.$store.track;
    },
    completed() {
      return this.saves.campaign(this.track).completed;
    },
    chapters() {
      return CHAPTERS.map((c) => ({ id: c.id, unlocked: (c.id - 1) * 10 + 1 <= this.completed + 1 }));
    },
    chapter() {
      return CHAPTERS[this.$store.chapter - 1];
    },
    levels() {
      return LevelCatalog.chapter(this.chapter.id).map((level) => {
        const unlocked = this.saves.isLevelUnlocked(level.number, this.track);
        const stars = this.saves.starsFor(level.number, null, this.track);
        const ach = countAchievements(this.saves.achievementsFor(level.number, this.track));
        const boss = Boolean(level.boss);
        const params = { n: level.number, stars, ach, boss: this.$t('chapters.c' + this.chapter.id + '.boss') };
        const key = unlocked ? (boss ? 'campaign.levelBoss' : 'campaign.levelLabel') : boss ? 'campaign.levelBossLocked' : 'campaign.levelLocked';
        return { number: level.number, unlocked, stars, done: stars > 0, boss, next: level.number === this.completed + 1, label: this.$t(key, params) };
      });
    },
    chapterStars() {
      return this.levels.reduce((sum, l) => sum + l.stars, 0);
    },
    spots() {
      return this.size.w ? levelSpots(this.chapter.id, this.size.w, this.size.h) : [];
    },
    nodes() {
      return this.levels.map((l, i) => ({ ...l, ...(this.spots[i] || { x: 0, y: 0 }) }));
    },
    current() {
      return this.nodes.find((n) => n.next) || null;
    },
    /** The road: all of it faint, the part travelled in ink, the last stretch in gold. */
    route() {
      if (!this.spots.length) return { all: '', done: '', step: '' };
      const segments = roadSegments(this.spots);
      const reached = this.current ? this.nodes.indexOf(this.current) : this.nodes.filter((n) => n.done).length - 1;
      return {
        all: pathData(segments),
        done: pathData(segments.slice(0, Math.max(0, reached))),
        step: this.current && reached > 0 ? pathData(segments.slice(reached - 1, reached)) : '',
      };
    },
  },
  watch: {
    'chapter.id'() {
      this.paintLand();
    },
    '$store.theme'() {
      this.paintLand();
    },
  },
  mounted() {
    const measure = () => {
      const stage = this.$refs.stage;
      if (!stage) return;
      const w = Math.round(stage.clientWidth);
      const h = Math.round(stage.clientHeight);
      if (w === this.size.w && h === this.size.h) return;
      this.size = { w, h };
      this.paintLand();
    };
    measure();
    if (typeof ResizeObserver === 'function') {
      this.observer = new ResizeObserver(() => {
        cancelAnimationFrame(this.raf);
        this.raf = requestAnimationFrame(measure);
      });
      this.observer.observe(this.$refs.stage);
    }
  },
  beforeUnmount() {
    this.observer?.disconnect();
    cancelAnimationFrame(this.raf);
  },
  methods: {
    canGo(step) {
      const next = this.chapters[this.chapter.id - 1 + step];
      return Boolean(next && next.unlocked);
    },
    go(step) {
      if (this.canGo(step)) this.$store.chapter = this.chapter.id + step;
    },
    open(node) {
      if (this.swiped) return;
      this.$actions.openBriefing(node.number);
    },
    swipeStart(e) {
      this.swiped = false;
      this.swipe = { x: e.clientX, y: e.clientY };
    },
    swipeEnd(e) {
      if (!this.swipe) return;
      const dx = e.clientX - this.swipe.x;
      const dy = e.clientY - this.swipe.y;
      this.swipe = null;
      if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(dy) * 2) return;
      this.swiped = true;
      this.go(dx < 0 ? 1 : -1);
    },
    /** The chapter's land, painted once per chapter, theme and size (loaded with the board's painter). */
    async paintLand() {
      const canvas = this.$refs.land;
      const { w, h } = this.size;
      if (!canvas || !w || !h) return;
      const night = this.$store.theme === 'dark';
      const key = `${this.chapter.id}:${night}:${w}x${h}`;
      if (key === this.painted) return;
      this.painted = key;
      this.landReady = false;
      const { paintChapterLand } = await import('../core/rendering/ChapterMap.js');
      if (key !== this.painted || !this.$refs.land) return;
      // Three of the chapter's levels together give the land its woods and waters.
      const first = (this.chapter.id - 1) * 10 + 1;
      const levels = [first, first + 4, first + 8].map((n) => LevelCatalog.byNumber(n));
      paintChapterLand(canvas, levels, { width: w, height: h, night });
      this.landReady = true;
    },
  },
};
</script>
