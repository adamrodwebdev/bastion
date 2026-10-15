<template>
  <canvas ref="canvas" class="level-map" :width="level.cols * 10" :height="level.rows * 10" aria-hidden="true"></canvas>
</template>

<script>
/**
 * @file Painted picture of a level (the real map, as in game), for menus. Repaints on theme change and resize.
 */
import { Renderer } from '../core/index.js';

export default {
  name: 'LevelMap',
  props: {
    level: { type: Object, required: true },
    showcase: { type: Boolean, default: false },
  },
  watch: {
    '$store.theme': 'paint',
  },
  mounted() {
    this.paint();
    if (typeof ResizeObserver === 'function') {
      this._ro = new ResizeObserver(() => this.paint());
      this._ro.observe(this.$refs.canvas);
    }
  },
  beforeUnmount() {
    if (this._ro) this._ro.disconnect();
  },
  methods: {
    paint() {
      const canvas = this.$refs.canvas;
      if (!canvas || !canvas.getContext) return;
      const width = canvas.clientWidth || 240;
      if (this._width === width && this._mode === this.$store.theme) return;
      this._width = width;
      this._mode = this.$store.theme;
      Renderer.paintThumbnail(canvas, this.level, this.$store.theme, width, this.showcase);
    },
  },
};
</script>
