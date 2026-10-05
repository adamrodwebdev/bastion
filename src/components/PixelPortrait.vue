<template>
  <canvas
    ref="canvas"
    class="pixel-portrait"
    :class="{ 'pixel-portrait--flip': flip }"
    :style="{ height }"
    :role="decorative ? undefined : 'img'"
    :aria-hidden="decorative ? 'true' : undefined"
    :aria-label="decorative ? undefined : $t('characters.' + id + '.name')"
    width="1"
    height="1"
  ></canvas>
</template>

<script>
/**
 * @file Pixel-art portrait of a character, drawn by code in a <canvas>.
 * The portrait data is only loaded with the first portrait shown.
 */
export default {
  name: 'PixelPortrait',
  props: {
    /** ysolde | aubert | gontran | mordrac */
    id: { type: String, required: true },
    /** CSS height; the width follows the proportions. */
    height: { type: String, default: '8rem' },
    /** Mirror the drawing. */
    flip: { type: Boolean, default: false },
    /** Decorative image (the name is already written next to it). */
    decorative: { type: Boolean, default: false },
  },
  watch: {
    id() {
      this.paint();
    },
  },
  mounted() {
    this.paint();
  },
  methods: {
    async paint() {
      const { paintPortrait } = await import('../core/story/Portraits.js');
      if (this.$refs.canvas) paintPortrait(this.$refs.canvas, this.id);
    },
  },
};
</script>
