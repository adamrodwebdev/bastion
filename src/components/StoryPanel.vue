<template>
  <div class="story" role="dialog" aria-modal="true" aria-labelledby="story-title" @keydown="onKey">
    <div class="story-card">
      <header class="story-head">
        <p class="eyebrow">{{ beat.id === 'epilogue' ? $t('story.epilogueLabel') : $t('campaign.chapter', { n: beat.chapter }) }}</p>
        <h2 id="story-title" class="story-title">{{ $t('story.' + beat.id + '.title') }}</h2>
      </header>
      <div class="story-stage" :class="{ 'is-narrator': !page.speaker }">
        <PixelPortrait
          v-for="(c, i) in page.cast"
          :key="c + i"
          :id="c"
          class="story-portrait"
          :class="{ 'is-speaking': c === page.speaker, 'is-left': i === 0 && page.cast.length > 1, 'is-right': i === 1 }"
          :flip="flipFor(c, i)"
          height="min(30vh, 11rem)"
          decorative
        />
      </div>
      <div class="story-text">
        <p v-if="page.speaker" class="story-speaker">{{ $t('characters.' + page.speaker + '.name') }}</p>
        <p class="story-line" aria-live="polite">{{ $t('story.' + beat.id + '.p' + (index + 1)) }}</p>
      </div>
      <footer class="story-foot">
        <span class="story-count">{{ $t('story.page', { n: index + 1, total: beat.pages.length }) }}</span>
        <button v-if="index > 0" type="button" class="btn btn-ghost" @click="index--">{{ $t('story.previous') }}</button>
        <button type="button" class="btn btn-ghost" @click="$actions.closeStory()">{{ $t('story.skip') }}</button>
        <button ref="next" type="button" class="btn btn-primary" @click="next">{{ last ? $t('story.close') : $t('story.next') }}</button>
      </footer>
    </div>
  </div>
</template>

<script>
/**
 * @file Reads an episode of the Chronicle, page by page, with the characters on stage.
 */
import PixelPortrait from './PixelPortrait.vue';
import { StoryRepository } from '../core/story/StoryRepository.js';
import { CHARACTERS } from '../core/story/Portraits.js';

export default {
  name: 'StoryPanel',
  components: { PixelPortrait },
  props: { beatId: { type: String, required: true } },
  data() {
    return { index: 0 };
  },
  computed: {
    beat() {
      return StoryRepository.beat(this.beatId);
    },
    page() {
      return this.beat.pages[this.index];
    },
    last() {
      return this.index >= this.beat.pages.length - 1;
    },
  },
  mounted() {
    this.$nextTick(() => this.$refs.next && this.$refs.next.focus());
  },
  methods: {
    next() {
      if (this.last) this.$actions.closeStory();
      else this.index += 1;
    },
    onKey(e) {
      if (e.key === 'Escape') this.$actions.closeStory();
      else if (e.key === 'ArrowRight') this.next();
      else if (e.key === 'ArrowLeft' && this.index > 0) this.index -= 1;
    },
    /** Portraits look towards the centre of the stage. */
    flipFor(id, i) {
      const facing = CHARACTERS[id].facing;
      if (facing === 'front') return false;
      const wantRight = this.page.cast.length > 1 ? i === 0 : true;
      return (facing === 'right') !== wantRight;
    },
  },
};
</script>
