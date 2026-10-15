<template>
  <canvas ref="canvas" class="tower-icon" :class="'tower-icon--' + type" width="64" height="64" aria-hidden="true"></canvas>
</template>

<script>
/**
 * @file Tower portrait for the shop and the tower panel: the same procedural sprite as on the board.
 */
import { Sprites } from '../core/index.js';

export default {
  name: 'TowerIcon',
  props: {
    type: { type: String, required: true },
    level: { type: Number, default: 1 },
  },
  watch: {
    type: 'draw',
    level: 'draw',
  },
  mounted() {
    this.draw();
  },
  methods: {
    draw() {
      const canvas = this.$refs.canvas;
      if (!canvas || !canvas.getContext) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = canvas.height = Math.round(48 * dpr);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const s = canvas.width;
      ctx.clearRect(0, 0, s, s);
      // One tile = 70 % of the icon; the sprite rises above its tile, so draw it a bit lower.
      ctx.setTransform(s * 0.7, 0, 0, s * 0.7, s / 2, s * 0.6);
      Sprites.tower(ctx, { type: this.type, level: this.level, recoil: 0, id: 0 }, -Math.PI / 4, 0);
    },
  },
};
</script>
