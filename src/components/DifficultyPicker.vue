<template>
  <fieldset class="segmented" :class="{ 'segmented--compact': compact }">
    <legend :class="{ 'sr-only': compact }">{{ $t('menu.difficulty') }}</legend>
    <div class="segmented-track">
      <label v-for="d in difficulties" :key="d" class="segmented-option" :class="{ 'is-active': $store.difficulty === d }">
        <input
          type="radio"
          name="difficulty"
          :value="d"
          :checked="$store.difficulty === d"
          @change="$actions.setDifficulty(d)"
        />
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
export default {
  name: 'DifficultyPicker',
  props: { compact: { type: Boolean, default: false } },
  data() {
    return { difficulties: ['easy', 'normal', 'hard'] };
  },
};
</script>
