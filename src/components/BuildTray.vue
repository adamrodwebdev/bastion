<template>
  <section class="build-tray" :class="['build-tray--' + placement, { 'is-swipe': items.length > 4 }]" :aria-label="$t('hud.buildMenu')">
    <div class="build-tray-row">
      <button
        v-for="item in items"
        :key="item.type + (shake === item.type ? '-' + shakeKey : '')"
        type="button"
        class="build-card"
        :class="{ 'is-picked': pick === item.type, 'is-poor': !item.affordable, 'is-shaking': shake === item.type }"
        :data-tutorial="'shop-' + item.type"
        :aria-pressed="pick === item.type ? 'true' : 'false'"
        :aria-label="label(item)"
        @click="$emit('pick', item.type)"
      >
        <SpriteIcon :type="item.type" :px="placement === 'side' ? 34 : 42" />
        <span class="build-card-name">{{ $t('towers.' + item.type + '.name') }}</span>
        <span v-if="pick === item.type" class="build-card-confirm"><AppIcon name="check" />{{ item.cost }}</span>
        <span v-else class="build-card-cost"><AppIcon name="coin" class="coin-icon" />{{ item.cost }}</span>
      </button>
    </div>
    <div class="build-tray-foot">
      <p class="build-tray-hint" aria-live="polite">
        <template v-if="pick">
          <strong>{{ $t('towers.' + pick + '.name') }}</strong>
          <span>· {{ $t('towers.' + pick + '.desc') }} {{ $t('shop.confirmHint') }}</span>
        </template>
        <template v-else>{{ $t('shop.pickHint') }}</template>
      </p>
      <button type="button" class="icon-btn icon-btn--sm" :aria-label="$t('tower.deselect')" @click="$emit('close')"><AppIcon name="close" /></button>
    </div>
  </section>
</template>

<script>
/**
 * @file Touch build tray: the towers of the level for the tile the player tapped.
 * A first tap on a tower shows its range on the map, a second one builds it
 * (fingers have no hover, and a tile is only 30 to 45 px wide on a phone).
 * Emits `pick` with the tower type; the game screen decides preview or build.
 */
import SpriteIcon from './SpriteIcon.vue';
import AppIcon from './AppIcon.vue';

export default {
  name: 'BuildTray',
  components: { AppIcon, SpriteIcon },
  props: {
    items: { type: Array, required: true },
    /** Type previewed by the first tap (its card turns into the build button). */
    pick: { type: String, default: null },
    /** 'top' | 'bottom' on the map (portrait), 'side' in the side panel (landscape). */
    placement: { type: String, default: 'bottom' },
    /** Card that shakes (not enough gold); `shakeKey` replays the shake. */
    shake: { type: String, default: null },
    shakeKey: { type: Number, default: 0 },
  },
  emits: ['pick', 'close'],
  methods: {
    label(item) {
      const p = { tower: this.$t('towers.' + item.type + '.name'), n: item.cost };
      return this.pick === item.type ? this.$t('shop.buildAria', p) : this.$t('shop.previewAria', p);
    },
  },
};
</script>
