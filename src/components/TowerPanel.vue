<template>
  <section class="panel tower-panel" :aria-label="$t('towers.' + info.type + '.name')">
    <div class="tower-panel-head">
      <span class="tower-swatch" :data-type="info.type" :style="{ '--c': info.color }" aria-hidden="true"></span>
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
      <button type="button" class="icon-btn icon-btn--sm" :aria-label="$t('tower.deselect')" @click="$emit('close')"><AppIcon name="close" /></button>
    </div>

    <dl class="stats">
      <div v-for="s in info.stats" :key="s.key"><dt>{{ $t('tower.stats.' + s.key) }}</dt><dd>{{ s.value }}</dd></div>
    </dl>

    <p v-if="!info.mine" class="notice">{{ $t('tower.notYours') }}</p>

    <fieldset v-if="info.canTarget && info.mine" class="segmented segmented--compact segmented--small">
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
      <button type="button" class="btn btn-secondary" @click="$emit('sell')">
        <span class="btn-stack">
          <span>{{ $t('tower.sell') }}</span>
          <small>+{{ info.sellValue }}</small>
        </span>
      </button>
    </div>
  </section>
</template>

<script>
/**
 * @file Details of the selected tower: stats, targeting, upgrade, sell.
 */
import AppIcon from './AppIcon.vue';

export default {
  name: 'TowerPanel',
  components: { AppIcon },
  props: { info: { type: Object, required: true } },
  emits: ['upgrade', 'sell', 'targeting', 'close', 'preview'],
  data() {
    return { targetings: ['first', 'strongest', 'closest'] };
  },
};
</script>
