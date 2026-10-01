<template>
  <section class="panel tower-panel" aria-labelledby="tower-panel-title">
    <div class="tower-panel-head">
      <span class="tower-swatch" :data-type="info.type" :style="{ '--c': info.color }" aria-hidden="true"></span>
      <div>
        <h2 id="tower-panel-title" class="panel-title">{{ $t('towers.' + info.type + '.name') }}</h2>
        <p class="tower-level">
          {{ $t('tower.level', { n: info.level }) }}
          <span class="pips" aria-hidden="true">
            <span v-for="n in info.maxLevel" :key="n" :class="{ on: n <= info.level }"></span>
          </span>
        </p>
      </div>
      <button type="button" class="icon-btn icon-btn--sm" :aria-label="$t('tower.deselect')" @click="$emit('close')">✕</button>
    </div>

    <dl class="stats">
      <div><dt>{{ $t('tower.damage') }}</dt><dd>{{ info.damage }}</dd></div>
      <div><dt>{{ $t('tower.range') }}</dt><dd>{{ info.range }}</dd></div>
      <div><dt>{{ $t('tower.rate') }}</dt><dd>{{ info.rate }}/s</dd></div>
      <div><dt>{{ $t('tower.kills') }}</dt><dd>{{ info.kills }}</dd></div>
    </dl>

    <fieldset class="segmented segmented--compact segmented--small">
      <legend>{{ $t('tower.targeting') }}</legend>
      <div class="segmented-track">
        <label v-for="id in targetings" :key="id" class="segmented-option" :class="{ 'is-active': info.targeting === id }">
          <input type="radio" :name="'targeting-' + info.id" :value="id" :checked="info.targeting === id" @change="$emit('targeting', id)" />
          <span>{{ $t('tower.targets.' + id) }}</span>
        </label>
      </div>
    </fieldset>

    <div class="tower-actions">
      <button
        v-if="info.canUpgrade"
        type="button"
        class="btn btn-primary"
        :disabled="!info.affordable"
        @click="$emit('upgrade')"
        @mouseenter="$emit('preview', true)"
        @mouseleave="$emit('preview', false)"
        @focus="$emit('preview', true)"
        @blur="$emit('preview', false)"
      >
        {{ $t('tower.upgrade', { cost: info.upgradePrice }) }}
      </button>
      <span v-else class="badge">{{ $t('tower.max') }}</span>
      <button type="button" class="btn btn-secondary" @click="$emit('sell')">{{ $t('tower.sell', { value: info.sellValue }) }}</button>
    </div>
  </section>
</template>

<script>
/**
 * @file Details of the selected tower: stats, targeting, upgrade, sell.
 */
export default {
  name: 'TowerPanel',
  props: { info: { type: Object, required: true } },
  emits: ['upgrade', 'sell', 'targeting', 'close', 'preview'],
  data() {
    return { targetings: ['first', 'strongest', 'closest'] };
  },
};
</script>
