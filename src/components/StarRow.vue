<template>
  <span class="star-row" :class="{ 'star-row--lg': large }" role="img" :aria-label="$t('common.stars', { count: value })">
    <span v-for="s in 3" :key="s" :class="s <= value ? 'star-on' : 'star-off'" aria-hidden="true">★</span>
  </span>
</template>

<script>
/**
 * @file Three stars, filled up to `value`.
 */
export default {
  name: 'StarRow',
  props: {
    value: { type: Number, default: 0 },
    large: { type: Boolean, default: false },
  },
};
</script>
