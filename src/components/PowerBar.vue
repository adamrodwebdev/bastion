<template>
  <section v-if="powers.length" class="panel power-bar" aria-labelledby="powers-bar-title">
    <h2 id="powers-bar-title" class="panel-title">
      {{ $t('powers.title') }}
      <small v-if="!waveRunning">{{ $t('powers.onlyDuringWave') }}</small>
    </h2>
    <div class="power-grid">
      <button
        v-for="p in powers"
        :key="p.id"
        type="button"
        class="power-btn"
        :class="'is-' + p.state"
        :disabled="!p.ready || !waveRunning"
        :title="$t('powers.' + p.id + '.desc')"
        @click="$emit('activate', p.id)"
      >
        <svg class="chrono" viewBox="0 0 44 44" aria-hidden="true">
          <circle class="chrono-track" cx="22" cy="22" r="19" />
          <circle class="chrono-fill" cx="22" cy="22" r="19" :style="{ strokeDashoffset: circumference * (1 - p.progress) }" :stroke-dasharray="circumference" />
          <text x="22" y="23" class="chrono-icon">{{ p.icon }}</text>
        </svg>
        <span class="power-label">
          <span class="power-name">{{ $t('powers.' + p.id + '.name') }}</span>
          <span class="power-state">
            <template v-if="p.state === 'ready'">{{ $t('powers.ready') }}</template>
            <template v-else-if="p.state === 'active'">{{ $t('powers.active', { s: p.seconds }) }}</template>
            <template v-else>{{ $t('powers.cooldown', { s: p.seconds }) }}</template>
          </span>
        </span>
      </button>
    </div>
  </section>
</template>

<script>
/**
 * @file Special power buttons with their circular timer.
 */
export default {
  name: 'PowerBar',
  props: {
    powers: { type: Array, required: true },
    waveRunning: { type: Boolean, default: false },
  },
  emits: ['activate'],
  data() {
    return { circumference: 2 * Math.PI * 19 };
  },
};
</script>
