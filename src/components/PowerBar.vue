<template>
  <section v-if="powers.length" class="panel power-bar" :aria-label="$t('powers.title')">
    <div class="power-grid">
      <button
        v-for="(p, i) in powers"
        :key="p.id"
        type="button"
        class="power-btn"
        :class="['is-' + p.state, { 'is-aiming': aiming === p.id }]"
        :disabled="!p.ready || !enabled"
        :aria-pressed="aiming === p.id ? 'true' : undefined"
        :title="$t('powers.' + p.id + '.desc')"
        :data-tutorial="'power-' + p.id"
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
            <template v-if="aiming === p.id">{{ $t('powers.aim') }}</template>
            <template v-else-if="p.state === 'ready'">{{ $t('powers.ready') }}</template>
            <template v-else-if="p.state === 'active'">{{ $t('powers.active', { s: p.seconds }) }}</template>
            <template v-else>{{ $t('powers.cooldown', { s: p.seconds }) }}</template>
          </span>
        </span>
        <kbd v-if="keys[i]" class="power-key" aria-hidden="true">{{ keys[i] }}</kbd>
      </button>
    </div>
    <p v-if="!enabled" class="power-hint">{{ $t('powers.onlyDuringWave') }}</p>
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
    enabled: { type: Boolean, default: false },
    aiming: { type: String, default: null },
    keys: { type: Array, default: () => ['Q', 'W', 'E', 'R', 'T'] },
  },
  emits: ['activate'],
  data() {
    return { circumference: 2 * Math.PI * 19 };
  },
};
</script>
