<template>
  <section class="achievements" aria-labelledby="ach-title">
    <ScreenHeader :title="$t('achievements.title')">
      <span class="chip"><AppIcon name="trophy" /> {{ total }} / 300</span>
    </ScreenHeader>

    <p class="lead">{{ $t('achievements.intro') }}</p>

    <nav class="chapter-tabs chapter-tabs--small" :aria-label="$t('campaign.chapters')">
      <button v-for="c in chapters" :key="c.id" type="button" class="chapter-tab" :class="['theme-' + c.theme, { 'is-active': chapter === c.id }]" :aria-current="chapter === c.id ? 'page' : undefined" @click="chapter = c.id">
        <span class="chapter-num">{{ c.id }}</span>
        <span class="chapter-stars">{{ c.done }}/30</span>
      </button>
    </nav>

    <ul class="ach-levels" role="list">
      <li v-for="l in levels" :key="l.number" class="ach-level card" :class="{ 'is-locked': !l.unlocked }">
        <h2 class="ach-level-title">{{ $t('briefing.level', { n: l.number }) }}</h2>
        <ul class="challenges" role="list">
          <li v-for="c in l.challenges" :key="c.id" class="challenge" :class="{ 'is-done': c.done }">
            <AppIcon :name="c.done ? 'check' : c.icon" />
            <span>
              <strong>{{ $t('achievements.list.' + c.id + '.name') }}</strong>
              <span class="challenge-desc">{{ $t('achievements.list.' + c.id + '.desc', c.params) }}</span>
            </span>
          </li>
        </ul>
      </li>
    </ul>
  </section>
</template>

<script>
/**
 * @file All challenges, chapter by chapter (three per level).
 */
import AppIcon from './AppIcon.vue';
import ScreenHeader from './ScreenHeader.vue';
import { services } from '../services/index.js';
import { LevelCatalog, CHAPTERS } from '../core/index.js';
import { achievementsFor, achievementParams, ACHIEVEMENTS, countAchievements } from '../core/progression/Achievements.js';

export default {
  name: 'AchievementsScreen',
  components: { AppIcon, ScreenHeader },
  data() {
    return { chapter: this.$store.chapter || 1 };
  },
  computed: {
    saves() {
      // eslint-disable-next-line no-unused-expressions
      this.$store.progressTick;
      return services.saves;
    },
    maskOf() {
      return (n) => this.saves.achievementsFor(n, 'solo') | this.saves.achievementsFor(n, 'coop');
    },
    total() {
      return this.saves.totalAchievements;
    },
    chapters() {
      return CHAPTERS.map((c) => {
        let done = 0;
        for (let n = (c.id - 1) * 10 + 1; n <= c.id * 10; n++) done += countAchievements(this.maskOf(n));
        return { id: c.id, theme: c.theme, done };
      });
    },
    levels() {
      return LevelCatalog.chapter(this.chapter).map((level) => {
        const mask = this.maskOf(level.number);
        return {
          number: level.number,
          unlocked: this.saves.isLevelUnlocked(level.number, 'solo') || this.saves.isLevelUnlocked(level.number, 'coop'),
          challenges: achievementsFor(level).map((id, i) => ({
            id,
            icon: ACHIEVEMENTS[id].icon,
            params: achievementParams(id, level),
            done: Boolean(mask & (1 << i)),
          })),
        };
      });
    },
  },
};
</script>
