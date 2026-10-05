<template>
  <div class="coach" role="note" aria-live="polite">
    <PixelPortrait id="gontran" height="3.4rem" decorative />
    <div class="coach-body">
      <p class="coach-name">{{ $t('characters.gontran.name') }}</p>
      <p class="coach-text">{{ text }}</p>
    </div>
    <button type="button" class="icon-btn icon-btn--sm" :aria-label="$t('tutorial.dismiss')" @click="$emit('dismiss')"><AppIcon name="close" /></button>
  </div>
</template>

<script>
/**
 * @file Gontran's tutorial bubble, shown above the board.
 */
import AppIcon from './AppIcon.vue';
import PixelPortrait from './PixelPortrait.vue';

export default {
  name: 'CoachBubble',
  components: { AppIcon, PixelPortrait },
  props: { text: { type: String, required: true } },
  emits: ['dismiss'],
};
</script>
