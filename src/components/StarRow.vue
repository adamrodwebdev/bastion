<template>
  <span class="star-row" :class="{ 'star-row--lg': large }" role="img" :aria-label="$t('common.stars', { count: value })">
    <svg v-for="s in 3" :key="s" class="star" :class="s <= value ? 'star-on' : 'star-off'" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path :fill="s <= value ? `url(#${gradient})` : undefined" :d="STAR" />
    </svg>
    <svg class="star-defs" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient :id="gradient" class="star-gilt" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" />
          <stop offset="0.5" />
          <stop offset="1" />
        </linearGradient>
      </defs>
    </svg>
  </span>
</template>

<script>
/**
 * @file Three stars, filled up to `value`: drawn in gilt with an ink edge, so they
 * read on any material (the star of a font differs from one device to another).
 */
const STAR = 'M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8L12 2.5Z';

/** Each row has its own gradient id: several rows may show at once. */
let rows = 0;

export default {
  name: 'StarRow',
  props: {
    value: { type: Number, default: 0 },
    large: { type: Boolean, default: false },
  },
  data() {
    rows += 1;
    return { STAR, gradient: `star-gilt-${rows}` };
  },
};
</script>
