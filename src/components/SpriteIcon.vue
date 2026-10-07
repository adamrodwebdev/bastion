<template>
  <img class="sprite-icon" :class="'sprite-icon--' + kind" :src="src" alt="" aria-hidden="true" :width="px" :height="px" draggable="false" />
</template>

<script>
/**
 * @file Picture of a tower or an enemy, painted by the board's own drawings.
 */
import { towerIcon, unitIcon } from '../core/rendering/Icons.js';
import { TowerFactory, EnemyFactory } from '../core/index.js';

export default {
  name: 'SpriteIcon',
  props: {
    /** 'tower' | 'enemy' */
    kind: { type: String, default: 'tower' },
    type: { type: String, required: true },
    level: { type: Number, default: 1 },
    elite: { type: Boolean, default: false },
    /** CSS pixels (the image is painted at twice that for sharp screens). */
    px: { type: Number, default: 32 },
  },
  computed: {
    src() {
      const size = Math.round(this.px * 2.5);
      if (this.kind === 'tower') {
        const T = TowerFactory.get(this.type);
        return towerIcon(this.type, { level: this.level, elite: this.elite, color: T ? T.color : '#888', size });
      }
      const E = EnemyFactory.get(this.type);
      return unitIcon(this.type, E ? E.stats.radius : 0.26, size);
    },
  },
};
</script>
