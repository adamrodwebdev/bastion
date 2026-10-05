<template>
  <div class="screen-head">
    <button type="button" class="btn btn-ghost btn-back" @click="back">
      <AppIcon name="back" /> {{ $t('app.back') }}
    </button>
    <h1 class="screen-title">{{ title }}</h1>
    <div class="screen-head-extra"><slot /></div>
  </div>
</template>

<script>
/**
 * @file Title bar of a screen with a back button.
 */
import AppIcon from './AppIcon.vue';

export default {
  name: 'ScreenHeader',
  components: { AppIcon },
  props: {
    title: { type: String, required: true },
    /** View to go back to. */
    to: { type: String, default: 'home' },
  },
  methods: {
    back() {
      this.$actions.go(this.to);
    },
  },
};
</script>
