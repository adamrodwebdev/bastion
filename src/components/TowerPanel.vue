<template>
  <section class="panel tower-panel" :class="{ 'tower-panel--compact': compact }" :aria-label="$t('towers.' + info.type + '.name')">
    <div class="tower-panel-head">
      <span :key="info.id + '-' + info.level" class="tower-sprite"><SpriteIcon :type="info.type" :level="Math.min(info.level, 3)" :elite="info.elite" :px="48" /></span>
      <div>
        <h2 class="panel-title">{{ $t('towers.' + info.type + '.name') }}</h2>
        <p class="tower-level">
          <template v-if="info.elite">{{ $t('tower.elite') }} · {{ $t('towers.' + info.type + '.elite') }}</template>
          <template v-else>{{ $t('tower.level', { n: info.level }) }}</template>
          <span class="pips" aria-hidden="true">
            <span v-for="n in info.maxLevel" :key="n" :class="{ on: n <= info.level, elite: n === 4 }"></span>
          </span>
        </p>
      </div>
      <button type="button" class="btn-close btn-close--sm" :aria-label="$t('tower.deselect')" @click="$emit('close')"><AppIcon name="close" /></button>
    </div>

    <dl class="stats">
      <div v-for="s in info.stats" :key="s.key"><dt>{{ $t('tower.stats.' + s.key) }}</dt><dd>{{ s.value }}</dd></div>
    </dl>

    <p v-if="!info.mine" class="notice">{{ $t('tower.notYours') }}</p>

    <fieldset v-if="!compact && info.canTarget && info.mine" class="segmented segmented--compact segmented--small" data-tutorial="targeting">
      <legend>{{ $t('tower.targeting') }}</legend>
      <div class="segmented-track">
        <label v-for="id in targetings" :key="id" class="segmented-option" :class="{ 'is-active': info.targeting === id }">
          <input type="radio" :name="'targeting-' + info.id" :value="id" :checked="info.targeting === id" @change="$emit('targeting', id)" />
          <span>{{ $t('tower.targets.' + id) }}</span>
        </label>
      </div>
    </fieldset>

    <div v-if="info.mine" class="tower-actions">
      <button
        v-if="info.canUpgrade"
        type="button"
        class="btn btn-primary"
        :disabled="!info.affordable"
        data-tutorial="upgrade"
        @click="$emit('upgrade')"
        @mouseenter="$emit('preview', true)"
        @mouseleave="$emit('preview', false)"
        @focus="$emit('preview', true)"
        @blur="$emit('preview', false)"
      >
        <span class="btn-stack">
          <span>{{ info.nextElite ? $t('tower.master') : $t('tower.upgrade') }}</span>
          <small><AppIcon name="coin" class="coin-icon" />{{ info.upgradePrice }}</small>
        </span>
      </button>
      <span v-else class="badge">{{ info.eliteLocked ? $t('tower.eliteLocked') : $t('tower.max') }}</span>
      <button
        v-if="compact && info.canTarget"
        type="button"
        class="btn btn-secondary btn-target"
        data-tutorial="targeting"
        :aria-label="$t('tower.targetCycle', { target: $t('tower.targets.' + info.targeting) })"
        @click="cycleTarget"
      >
        <AppIcon name="target" />
        <span>{{ $t('tower.targets.' + info.targeting) }}</span>
      </button>
      <button type="button" class="btn btn-secondary btn-sell" :class="{ 'is-confirm': confirmSell }" @click="onSell">
        <span class="btn-stack">
          <span>{{ confirmSell ? $t('tower.confirmSell') : $t('tower.sell') }}</span>
          <small>+{{ info.sellValue }}</small>
        </span>
      </button>
    </div>
  </section>
</template>

<script>
/**
 * @file Details of the selected tower: stats, targeting, upgrade, sell.
 * Compact (phones): one row of actions, the target changes at each tap, and
 * selling asks for a second tap (it cannot be undone).
 */
import SpriteIcon from './SpriteIcon.vue';
import AppIcon from './AppIcon.vue';

export default {
  name: 'TowerPanel',
  components: { AppIcon, SpriteIcon },
  props: {
    info: { type: Object, required: true },
    compact: { type: Boolean, default: false },
  },
  emits: ['upgrade', 'sell', 'targeting', 'close', 'preview'],
  data() {
    return { targetings: ['first', 'strongest', 'closest'], confirmSell: false };
  },
  watch: {
    'info.id'() {
      this.confirmSell = false;
    },
  },
  methods: {
    onSell() {
      if (this.compact && !this.confirmSell) {
        this.confirmSell = true;
        return;
      }
      this.confirmSell = false;
      this.$emit('sell');
    },
    cycleTarget() {
      const i = this.targetings.indexOf(this.info.targeting);
      this.confirmSell = false;
      this.$emit('targeting', this.targetings[(i + 1) % this.targetings.length]);
    },
  },
};
</script>
