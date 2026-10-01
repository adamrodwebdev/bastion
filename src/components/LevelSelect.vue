<template>
  <section class="levels" aria-labelledby="levels-title">
    <div class="page-head">
      <button type="button" class="btn btn-ghost btn-back" @click="$actions.go('menu')">
        <span aria-hidden="true">←</span> {{ $t('app.back') }}
      </button>
      <h2 id="levels-title" class="page-title">{{ $t('levels.title') }}</h2>
    </div>

    <DifficultyPicker />

    <ul class="level-grid" role="list">
      <li v-for="level in levels" :key="level.id">
        <button
          type="button"
          class="level-card card"
          :class="{ 'is-locked': !level.unlocked }"
          :disabled="!level.unlocked"
          :aria-describedby="'lvl-desc-' + level.id"
          @click="$actions.startLevel(level.index)"
        >
          <svg class="level-preview" :viewBox="'0 0 ' + level.cols + ' ' + level.rows" aria-hidden="true" :data-theme-level="level.theme">
            <rect width="100%" height="100%" class="lp-ground" />
            <polyline :points="level.polyline" class="lp-road-edge" />
            <polyline :points="level.polyline" class="lp-road" />
          </svg>
          <span class="level-info">
            <span class="level-number">{{ $t('levels.level', { n: level.number }) }}</span>
            <span class="level-name">{{ $t('levels.names.' + level.id) }}</span>
            <span :id="'lvl-desc-' + level.id" class="level-meta">
              <template v-if="level.unlocked">
                <span class="level-stars" :aria-label="$t('menu.stars', { count: level.stars })">
                  <span v-for="s in 3" :key="s" :class="s <= level.stars ? 'star-on' : 'star-off'" aria-hidden="true">★</span>
                </span>
                <span>{{ $t('levels.waves', { count: level.waveCount }) }}</span>
                <span v-if="level.best">{{ $t('levels.best', { score: level.best }) }}</span>
              </template>
              <span v-else class="level-lock">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V7a5 5 0 0 1 10 0v3h1a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V11a1 1 0 0 1 1-1zm2 0h6V7a3 3 0 0 0-6 0z" fill="currentColor" /></svg>
                {{ $t('levels.locked', { n: level.number - 1 }) }}
              </span>
            </span>
            <span v-if="level.reward" class="level-reward">
              {{ level.reward.icon }} {{ $t('levels.unlocks', { power: $t('powers.' + level.reward.id + '.name') }) }}
            </span>
          </span>
        </button>
      </li>
    </ul>

    <section class="card powers-info" aria-labelledby="powers-title">
      <h3 id="powers-title">{{ $t('levels.powersTitle') }}</h3>
      <ul class="powers-list" role="list">
        <li v-for="p in powers" :key="p.id" class="power-row" :class="{ 'is-locked': !p.unlocked }">
          <span class="power-icon" aria-hidden="true">{{ p.icon }}</span>
          <span class="power-text">
            <strong>{{ $t('powers.' + p.id + '.name') }}</strong>
            <span>{{ $t('powers.' + p.id + '.desc') }}</span>
            <small>{{ $t('levels.powerTiming', { duration: p.duration, cooldown: p.cooldown }) }}</small>
          </span>
          <span class="power-status">{{ p.unlocked ? '✓' : $t('levels.powerLocked', { n: p.unlockAfterLevel }) }}</span>
        </li>
      </ul>
    </section>
  </section>
</template>

<script>
/**
 * @file Level picker with stars, locks, rewards and the list of powers.
 */
import DifficultyPicker from './DifficultyPicker.vue';
import { LevelCatalog, PowerManager } from '../core/index.js';

export default {
  name: 'LevelSelect',
  components: { DifficultyPicker },
  computed: {
    levels() {
      const progress = this.$store.progress;
      const powers = PowerManager.catalogue();
      return LevelCatalog.all().map((level) => {
        const stars = progress.stars[level.id] || {};
        return {
          id: level.id,
          index: level.index,
          number: level.number,
          theme: level.theme,
          cols: level.cols,
          rows: level.rows,
          waveCount: level.waveCount,
          unlocked: level.index <= progress.completed,
          stars: stars[this.$store.difficulty] || 0,
          best: progress.best[level.id] || 0,
          reward: powers.find((p) => p.unlockAfterLevel === level.number) || null,
          polyline: level.waypoints.map(([c, r]) => `${c + 0.5},${r + 0.5}`).join(' '),
        };
      });
    },
    powers() {
      const completed = this.$store.progress.completed;
      return PowerManager.catalogue().map((p) => ({ ...p, unlocked: completed >= p.unlockAfterLevel }));
    },
  },
};
</script>
