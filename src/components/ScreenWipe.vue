<template>
  <div ref="wipe" class="screen-wipe" aria-hidden="true">
    <div class="screen-wipe-hem"></div>
    <div class="screen-wipe-cloth cloth">
      <CrestEmblem class="screen-wipe-crest" />
    </div>
  </div>
</template>

<script>
/**
 * @file The woad banner that drops over the screen while the next one is put in
 * place, then lifts off it. It never takes a tap, and a new drop starts from
 * wherever the banner is, so quick changes of screen never make it jump.
 */
import CrestEmblem from './CrestEmblem.vue';

const DOWN = { duration: 240, easing: 'cubic-bezier(0.55, 0, 0.75, 0.2)' };
const UP = { duration: 330, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' };
const HIDDEN = 'translateY(-104%)';
const GONE = 'translateY(-106%) rotate(-1.5deg)';

export default {
  name: 'ScreenWipe',
  components: { CrestEmblem },
  created() {
    // Not reactive: the animation in flight, and the promise of the screen covered.
    this.anim = null;
    this.covering = null;
  },
  beforeUnmount() {
    if (this.anim) this.anim.cancel();
  },
  methods: {
    /** Drops the banner. @returns {Promise<void>} resolved once it covers the screen */
    cover() {
      if (this.covering) return this.covering;
      const el = this.$refs.wipe;
      if (!el || typeof el.animate !== 'function') return Promise.resolve();
      const from = this.anim ? getComputedStyle(el).transform : HIDDEN;
      if (this.anim) this.anim.cancel();
      el.classList.add('is-on');
      const anim = el.animate([{ transform: from }, { transform: 'none' }], { ...DOWN, fill: 'forwards' });
      this.anim = anim;
      this.covering = anim.finished
        .catch(() => {})
        .then(() => {
          this.covering = null;
        });
      return this.covering;
    },

    /** Lifts the banner off the new screen, which answers taps at once. */
    reveal() {
      const el = this.$refs.wipe;
      if (!el || typeof el.animate !== 'function' || !el.classList.contains('is-on')) return;
      const previous = this.anim;
      const anim = el.animate([{ transform: 'none' }, { transform: GONE }], UP);
      this.anim = anim;
      if (previous) previous.cancel();
      anim.finished
        .then(() => {
          if (this.anim !== anim) return;
          el.classList.remove('is-on');
          this.anim = null;
        })
        .catch(() => {});
    },
  },
};
</script>
