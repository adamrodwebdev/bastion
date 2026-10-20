<template>
  <section class="card level-goals" :aria-label="$t('briefing.challenges')">
    <h2 class="panel-title">{{ $t('briefing.challenges') }}</h2>
    <ul class="challenges" role="list">
      <li v-for="c in challenges" :key="c.id" class="challenge" :class="{ 'is-done': c.done }">
        <AppIcon :name="c.done ? 'check' : c.icon" />
        <span>
          <strong>{{ $t('achievements.list.' + c.id + '.name') }}</strong>
          <span class="challenge-desc">{{ $t('achievements.list.' + c.id + '.desc', c.params) }}</span>
        </span>
      </li>
    </ul>
  </section>
</template>

<script>
/**
 * @file The level's three challenges beside the map on larger screens: optional goals
 * stay in view while playing (a first game goes straight into level 1, without the briefing).
 */
import AppIcon from './AppIcon.vue';
import { services } from '../services/index.js';
import { levelChallenges } from '../core/progression/Achievements.js';

export default {
  name: 'LevelGoals',
  components: { AppIcon },
  props: {
    level: { type: Object, required: true },
    track: { type: String, default: 'solo' },
  },
  computed: {
    challenges() {
      // eslint-disable-next-line no-unused-expressions
      this.$store.progressTick;
      return levelChallenges(this.level, services.saves.achievementsFor(this.level.number, this.track));
    },
  },
};
</script>
