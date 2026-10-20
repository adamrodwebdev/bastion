<template>
  <svg class="crest" viewBox="0 0 120 140" focusable="false" aria-hidden="true">
    <path class="crest-gilt" d="M60 6l48 18v40c0 32-21 56-48 70C33 120 12 96 12 64V24z" stroke-width="5" />
    <path class="crest-field" d="M60 18l36 13v32c0 25-16 44-36 55C40 107 24 88 24 63V31z" stroke-width="2" />
    <path class="crest-gilt" d="M38 92V56h10v8h8v-8h8v8h8v-8h10v36z" stroke-width="3" stroke-linejoin="round" />
    <path class="crest-field" d="M55 92V78a5 5 0 0 1 10 0v14" stroke-width="2.5" />
  </svg>
</template>

<script>
/**
 * @file The kingdom's crest: a gilt shield with a woad field and the castle.
 * Used on the banner between screens and on the main button of the home screen.
 */
export default {
  name: 'CrestEmblem',
};
</script>
