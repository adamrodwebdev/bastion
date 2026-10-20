<template>
  <section class="panel shop" :aria-label="$t('shop.title')">
    <div class="sheet-head">
      <h2 class="panel-title">{{ $t('shop.title') }}</h2>
      <button type="button" class="btn-close btn-close--sm" :aria-label="$t('tower.deselect')" @click="$emit('close')"><AppIcon name="close" /></button>
    </div>
    <div class="shop-grid">
      <button
        v-for="item in items"
        :key="item.type"
        type="button"
        class="shop-item"
        :class="{ 'is-armed': armedType === item.type, 'is-poor': !item.affordable }"
        :aria-pressed="armedType === item.type ? 'true' : 'false'"
        :disabled="disabled"
        :title="$t('towers.' + item.type + '.desc')"
        :data-tutorial="'shop-' + item.type"
        @click="$emit('pick', item.type)"
      >
        <SpriteIcon :type="item.type" :px="34" />
        <span class="shop-name">{{ $t('towers.' + item.type + '.name') }}</span>
        <span class="shop-cost"><AppIcon name="coin" class="coin-icon" />{{ item.cost }}<span class="sr-only"> {{ $t('hud.gold') }}</span></span>
        <span class="shop-tags" aria-hidden="true">
          <AppIcon v-if="item.targets === 'both'" name="wing" />
          <AppIcon v-if="item.dtype === 'magic'" name="bolt" />
          <AppIcon v-if="item.dtype === 'fire'" name="flame" />
        </span>
        <kbd v-if="item.key" class="shop-key" aria-hidden="true">{{ item.key }}</kbd>
      </button>
    </div>
    <p class="shop-hint" aria-live="polite">{{ hint }}</p>
  </section>
</template>

<script>
/**
 * @file Shop of the towers available in the level. Emits `pick` with the tower type.
 */
import SpriteIcon from './SpriteIcon.vue';
import AppIcon from './AppIcon.vue';

export default {
  name: 'TowerShop',
  components: { AppIcon, SpriteIcon },
  props: {
    items: { type: Array, required: true },
    armedType: { type: String, default: null },
    cellState: { type: String, default: 'none' }, // 'none' | 'buildable' | 'blocked'
    disabled: { type: Boolean, default: false },
  },
  emits: ['pick', 'close'],
  computed: {
    hint() {
      if (this.armedType) return this.$t('shop.armed', { tower: this.$t('towers.' + this.armedType + '.name') });
      if (this.cellState === 'blocked') return this.$t('shop.notBuildable');
      if (this.cellState === 'buildable') return this.$t('shop.buildHere');
      return this.$t('shop.selectCell');
    },
  },
};
</script>
