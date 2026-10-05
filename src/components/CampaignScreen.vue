<template>
  <section class="campaign" aria-labelledby="campaign-title">
    <ScreenHeader :title="$store.track === 'coop' ? $t('campaign.coopTitle') : $t('campaign.title')">
      <span class="chip"><AppIcon name="star" /> {{ totalStars }} / 300</span>
    </ScreenHeader>

    <nav class="chapter-tabs" :aria-label="$t('campaign.chapters')">
      <button
        v-for="c in chapters"
        :key="c.id"
        type="button"
        class="chapter-tab"
        :class="['theme-' + c.theme, { 'is-active': $store.chapter === c.id, 'is-locked': !c.unlocked }]"
        :aria-current="$store.chapter === c.id ? 'page' : undefined"
        :disabled="!c.unlocked"
        @click="$store.chapter = c.id"
      >
        <span class="chapter-num">{{ c.id }}</span>
        <span class="chapter-name">{{ $t('chapters.c' + c.id + '.name') }}</span>
        <span class="chapter-stars">{{ c.stars }}/30</span>
      </button>
    </nav>

    <header class="chapter-head" :class="'theme-' + chapter.theme">
      <div>
        <p class="eyebrow">{{ $t('campaign.chapter', { n: chapter.id }) }}</p>
        <h2 class="chapter-title">{{ $t('chapters.c' + chapter.id + '.name') }}</h2>
        <p class="chapter-desc">{{ $t('chapters.c' + chapter.id + '.desc') }}</p>
      </div>
      <DifficultyPicker compact />
    </header>

    <ol class="level-grid" role="list">
      <li v-for="l in levels" :key="l.number">
        <button
          type="button"
          class="level-card"
          :class="['theme-' + chapter.theme, { 'is-locked': !l.unlocked, 'is-boss': l.boss, 'is-next': l.next }]"
          :disabled="!l.unlocked"
          :aria-label="l.label"
          @click="$actions.openBriefing(l.number)"
        >
          <svg class="level-preview" :viewBox="'0 0 16 9'" aria-hidden="true">
            <rect width="16" height="9" class="lp-ground" />
            <polyline v-for="(p, i) in l.paths" :key="'e' + i" :points="p" class="lp-road-edge" />
            <polyline v-for="(p, i) in l.paths" :key="'r' + i" :points="p" class="lp-road" />
          </svg>
          <span class="level-number">{{ l.number }}</span>
          <AppIcon v-if="!l.unlocked" name="lock" class="level-lock" />
          <AppIcon v-else-if="l.boss" name="skull" class="level-boss" />
          <span class="level-foot">
            <StarRow :value="l.stars" />
            <span class="level-ach" :aria-label="$t('campaign.challengesDone', { count: l.ach })">
              <span v-for="i in 3" :key="i" :class="i <= l.ach ? 'pip-on' : 'pip-off'" aria-hidden="true"></span>
            </span>
          </span>
        </button>
      </li>
    </ol>

    <BriefingPanel v-if="$store.briefing" :number="$store.briefing" />
  </section>
</template>

<script>
/**
 * @file Campaign map: ten chapters of ten levels, with stars and challenges.
 */
import AppIcon from './AppIcon.vue';
import ScreenHeader from './ScreenHeader.vue';
import StarRow from './StarRow.vue';
import DifficultyPicker from './DifficultyPicker.vue';
import BriefingPanel from './BriefingPanel.vue';
import { services } from '../services/index.js';
import { LevelCatalog, CHAPTERS } from '../core/index.js';
import { countAchievements } from '../core/progression/Achievements.js';

export default {
  name: 'CampaignScreen',
  components: { AppIcon, ScreenHeader, StarRow, DifficultyPicker, BriefingPanel },
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
      return CHAPTERS.map((c) => {
        const first = (c.id - 1) * 10 + 1;
        let stars = 0;
        for (let n = first; n < first + 10; n++) stars += this.saves.starsFor(n, null, this.track);
        return { id: c.id, theme: c.theme, unlocked: first <= this.completed + 1, stars };
      });
    },
    chapter() {
      return CHAPTERS[this.$store.chapter - 1];
    },
    totalStars() {
      let s = 0;
      for (let n = 1; n <= LevelCatalog.count; n++) s += this.saves.starsFor(n, null, this.track);
      return s;
    },
    levels() {
      return LevelCatalog.chapter(this.chapter.id).map((level) => {
        const unlocked = this.saves.isLevelUnlocked(level.number, this.track);
        const stars = this.saves.starsFor(level.number, null, this.track);
        const ach = countAchievements(this.saves.achievementsFor(level.number, this.track));
        return {
          number: level.number,
          unlocked,
          stars,
          ach,
          boss: Boolean(level.boss),
          next: level.number === this.completed + 1,
          paths: level.paths.map((wp) => wp.map(([c, r]) => `${c + 0.5},${r + 0.5}`).join(' ')),
          label: unlocked
            ? this.$t('campaign.levelLabel', { n: level.number, stars, ach })
            : this.$t('campaign.levelLocked', { n: level.number }),
        };
      });
    },
  },
};
</script>
