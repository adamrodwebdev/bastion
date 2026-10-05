<template>
  <section class="chronicle" aria-labelledby="chr-title">
    <ScreenHeader :title="$t('story.chronicle')" />
    <p class="lead">{{ $t('story.chronicleIntro') }}</p>
    <ol class="episodes" role="list">
      <li v-for="b in beats" :key="b.id">
        <button type="button" class="episode card" :disabled="!b.seen" @click="$actions.showStory(b.id)">
          <PixelPortrait v-if="b.seen" :id="b.face" height="3.5rem" decorative />
          <AppIcon v-else name="lock" class="episode-lock" />
          <span class="episode-text">
            <span class="eyebrow">{{ b.id === 'epilogue' ? $t('story.epilogueLabel') : $t('campaign.chapter', { n: b.chapter }) }}</span>
            <strong>{{ b.seen ? $t('story.' + b.id + '.title') : $t('story.locked') }}</strong>
          </span>
        </button>
      </li>
    </ol>
  </section>
</template>

<script>
/**
 * @file The Chronicle: re-read the episodes already discovered.
 */
import AppIcon from './AppIcon.vue';
import ScreenHeader from './ScreenHeader.vue';
import PixelPortrait from './PixelPortrait.vue';
import { services } from '../services/index.js';
import { StoryRepository } from '../core/story/StoryRepository.js';

export default {
  name: 'ChronicleScreen',
  components: { AppIcon, ScreenHeader, PixelPortrait },
  computed: {
    beats() {
      // eslint-disable-next-line no-unused-expressions
      this.$store.progressTick;
      return StoryRepository.all().map((b) => ({
        id: b.id,
        chapter: b.chapter,
        seen: services.saves.hasSeen('episodes', b.id),
        face: b.pages.find((p) => p.speaker)?.speaker || b.pages[0].cast[0] || 'ysolde',
      }));
    },
  },
};
</script>
