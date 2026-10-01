<template>
  <section class="panel shop" aria-labelledby="shop-title">
    <h2 id="shop-title" class="panel-title">{{ $t('shop.title') }}</h2>
    <div class="shop-grid">
      <button
        v-for="(item, i) in items"
        :key="item.type"
        type="button"
        class="shop-item"
        :class="{ 'is-armed': armedType === item.type, 'is-poor': !item.affordable }"
        :aria-pressed="armedType === item.type ? 'true' : 'false'"
        :disabled="!item.affordable || disabled"
        :title="$t('towers.' + item.type + '.desc')"
        @click="$emit('pick', item.type)"
      >
        <span class="tower-swatch" :data-type="item.type" :style="{ '--c': item.color }" aria-hidden="true"></span>
        <span class="shop-name">{{ $t('towers.' + item.type + '.name') }}</span>
        <span class="shop-cost">
          <span class="coin" aria-hidden="true"></span>{{ item.cost }}<span class="sr-only"> {{ $t('hud.gold') }}</span>
        </span>
        <span class="shop-desc">{{ $t('towers.' + item.type + '.desc') }}</span>
        <kbd class="shop-key" aria-hidden="true">{{ i + 1 }}</kbd>
      </button>
    </div>
    <p class="shop-hint" aria-live="polite">{{ hint }}</p>
  </section>
</template>

<script>
/**
 * @file Shop listing the buildable towers. Emits `pick` with the tower type.
 */
export default {
  name: 'TowerShop',
  props: {
    items: { type: Array, required: true },
    armedType: { type: String, default: null },
    cellState: { type: String, default: 'none' }, // 'none' | 'buildable' | 'blocked'
    disabled: { type: Boolean, default: false },
  },
  emits: ['pick'],
  computed: {
    hint() {
      if (this.cellState === 'blocked') return this.$t('shop.notBuildable');
      if (this.cellState === 'buildable') return this.$t('shop.buildHere');
      return this.$t('hud.selectCell');
    },
  },
};
</script>
