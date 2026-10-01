<template>
  <div class="toast-stack" role="status" aria-live="polite" aria-atomic="false">
    <TransitionGroup name="toast">
      <div v-for="toast in $store.toasts" :key="toast.id" class="toast" :class="`toast--${toast.kind}`">
        {{ toast.message }}
      </div>
    </TransitionGroup>
  </div>
</template>

<script>
/**
 * @file Short notification messages, announced to screen readers.
 */
export default {
  name: 'ToastStack',
};
</script>
