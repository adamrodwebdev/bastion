<template>
  <div class="board-overlay end-overlay" role="dialog" aria-modal="true" aria-labelledby="end-title">
    <div class="end-card card">
      <h2 id="end-title" class="end-title" :class="result.won ? 'is-won' : 'is-lost'">{{ result.won ? $t('end.won') : $t('end.lost') }}</h2>
      <p class="end-text">{{ result.won ? $t('end.wonText') : $t('end.lostText') }}</p>
      <StarRow v-if="result.won" :value="result.stars" large />
      <p class="end-score">{{ $t('end.score', { score: result.score }) }}</p>

      <ul v-if="result.won && result.challenges.length" class="end-challenges" role="list">
        <li v-for="c in result.challenges" :key="c.id" :class="{ 'is-done': c.passed, 'is-new': c.newly }">
          <AppIcon :name="c.passed ? 'check' : 'close'" />
          <span>{{ $t('achievements.list.' + c.id + '.name') }}</span>
          <span v-if="c.newly" class="badge badge-gold">{{ $t('end.new') }}</span>
        </li>
      </ul>

      <div v-if="result.won && result.crowns.total" class="end-crowns">
        <p class="end-crowns-total"><AppIcon name="crown" /> +{{ result.crowns.total }}</p>
        <p class="end-crowns-parts">
          <span v-for="p in result.crowns.parts" :key="p.id">{{ $t('end.crowns.' + p.id) }} +{{ p.amount }}</span>
        </p>
        <button v-if="result.canDouble" type="button" class="btn btn-secondary btn-sm" @click="$emit('double')">
          <AppIcon name="play" /> {{ $t('end.doubleCrowns') }}
        </button>
      </div>

      <p v-for="id in result.newPowers" :key="id" class="notice notice--success">{{ $t('end.unlocked', { power: $t('powers.' + id + '.name') }) }}</p>
      <p v-if="result.won && result.last" class="notice">{{ $t('end.campaignDone') }}</p>

      <button v-if="result.canRevive" type="button" class="btn btn-secondary" @click="$emit('revive')">
        <AppIcon name="heart" /> {{ $t('end.revive') }}
      </button>

      <div class="end-actions">
        <button v-if="result.won && !result.last" ref="primary" type="button" class="btn btn-primary" @click="$emit('next')">{{ $t('end.next') }}</button>
        <button ref="retry" type="button" class="btn" :class="result.won && !result.last ? 'btn-secondary' : 'btn-primary'" @click="$emit('retry')">{{ $t('end.retry') }}</button>
        <button type="button" class="btn btn-ghost" @click="$emit('levels')">{{ $t('end.levels') }}</button>
      </div>
    </div>
  </div>
</template>

<script>
/**
 * @file End of level: stars, challenges, crowns earned, what comes next.
 */
import AppIcon from './AppIcon.vue';
import StarRow from './StarRow.vue';

export default {
  name: 'EndPanel',
  components: { AppIcon, StarRow },
  props: { result: { type: Object, required: true } },
  emits: ['next', 'retry', 'levels', 'revive', 'double'],
  mounted() {
    this.$nextTick(() => {
      const b = this.$refs.primary || this.$refs.retry;
      if (b) b.focus();
    });
  },
};
</script>
