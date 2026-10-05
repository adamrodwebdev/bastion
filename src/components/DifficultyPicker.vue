<template>
  <fieldset class="segmented" :class="{ 'segmented--compact': compact }">
    <legend :class="{ 'sr-only': compact }">{{ $t('difficulty.label') }}</legend>
    <div class="segmented-track">
      <label v-for="d in difficulties" :key="d" class="segmented-option" :class="{ 'is-active': $store.difficulty === d }" :title="$t('difficulty.' + d + 'Desc')">
        <input type="radio" :name="name" :value="d" :checked="$store.difficulty === d" @change="$actions.setDifficulty(d)" />
        <span>{{ $t('difficulty.' + d) }}</span>
      </label>
    </div>
    <p v-if="!compact" class="segmented-hint">{{ $t('difficulty.' + $store.difficulty + 'Desc') }}</p>
  </fieldset>
</template>

<script>
/**
 * @file Easy / normal / hard selector, saved in the settings.
 */
let uid = 0;

export default {
  name: 'DifficultyPicker',
  props: { compact: { type: Boolean, default: false } },
  data() {
    uid += 1;
    return { difficulties: ['easy', 'normal', 'hard'], name: `difficulty-${uid}` };
  },
};
</script>
