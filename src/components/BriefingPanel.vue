<template>
  <div class="modal" role="dialog" aria-modal="true" aria-labelledby="brief-title" @keydown.esc="$actions.closeBriefing()">
    <div class="modal-card briefing" :class="'theme-' + level.theme">
      <header class="modal-head">
        <div>
          <p class="eyebrow">{{ $t('campaign.chapter', { n: level.chapter }) }} · {{ $t('chapters.c' + level.chapter + '.name') }}</p>
          <h2 id="brief-title" class="modal-title">
            {{ $t('briefing.level', { n: level.number }) }}
            <span v-if="level.boss" class="badge badge-danger"><AppIcon name="skull" /> {{ $t('briefing.boss') }}</span>
          </h2>
        </div>
        <button ref="close" type="button" class="icon-btn" :aria-label="$t('app.close')" @click="$actions.closeBriefing()">
          <AppIcon name="close" />
        </button>
      </header>

      <div v-if="storyOn" class="speech">
        <PixelPortrait :id="speaker" height="5.5rem" decorative />
        <div class="speech-body">
          <p class="speech-name">{{ $t('characters.' + speaker + '.name') }}</p>
          <p class="speech-text">« {{ $t('story.lines.l' + level.number) }} »</p>
        </div>
      </div>

      <section v-if="news.length" class="brief-section">
        <h3 class="brief-h">{{ $t('briefing.new') }}</h3>
        <ul class="news" role="list">
          <li v-for="n in news" :key="n.kind + n.id" class="news-item">
            <span v-if="n.kind === 'enemy'" class="enemy-swatch" :data-type="n.id" :style="{ '--c': n.color }" aria-hidden="true"></span>
            <span v-else class="tower-swatch" :data-type="n.id" :style="{ '--c': n.color }" aria-hidden="true"></span>
            <span>
              <strong>{{ n.kind === 'enemy' ? $t('enemies.' + n.id + '.name') : $t('towers.' + n.id + '.name') }}</strong>
              <span class="news-desc">{{ n.kind === 'enemy' ? $t('enemies.' + n.id + '.desc') : $t('towers.' + n.id + '.desc') }}</span>
            </span>
          </li>
        </ul>
      </section>

      <section class="brief-section">
        <h3 class="brief-h">{{ $t('briefing.enemies') }}</h3>
        <ul class="chips" role="list">
          <li v-for="e in enemies" :key="e.type" class="chip" :title="$t('enemies.' + e.type + '.desc')">
            <span class="enemy-swatch enemy-swatch--sm" :data-type="e.type" :style="{ '--c': e.color }" aria-hidden="true"></span>
            {{ $t('enemies.' + e.type + '.name') }}
            <AppIcon v-if="e.flying" name="wing" />
            <AppIcon v-if="e.stealth" name="eye" />
          </li>
        </ul>
        <p class="brief-meta">
          {{ $t('briefing.meta', { waves: level.waveCount, roads: level.roads }) }}
        </p>
      </section>

      <section class="brief-section">
        <h3 class="brief-h">{{ $t('briefing.challenges') }}</h3>
        <ul class="challenges" role="list">
          <li v-for="c in challenges" :key="c.id" class="challenge" :class="{ 'is-done': c.done }">
            <AppIcon :name="c.done ? 'check' : c.icon" />
            <span>
              <span class="challenge-family">{{ $t('achievements.families.' + c.family) }}</span>
              <strong>{{ $t('achievements.list.' + c.id + '.name') }}</strong>
              <span class="challenge-desc">{{ $t('achievements.list.' + c.id + '.desc', c.params) }}</span>
            </span>
          </li>
        </ul>
      </section>

      <section v-if="unlockedPowers.length" class="brief-section">
        <h3 class="brief-h">{{ $t('briefing.powers', { n: loadout.length, max: slots }) }}</h3>
        <div class="loadout">
          <button
            v-for="p in unlockedPowers"
            :key="p.id"
            type="button"
            class="loadout-item"
            :class="{ 'is-on': loadout.includes(p.id) }"
            :aria-pressed="loadout.includes(p.id) ? 'true' : 'false'"
            :title="$t('powers.' + p.id + '.desc')"
            @click="togglePower(p.id)"
          >
            <span class="power-glyph" aria-hidden="true">{{ p.icon }}</span>
            <span>{{ $t('powers.' + p.id + '.name') }}</span>
          </button>
        </div>
      </section>

      <footer class="modal-foot">
        <DifficultyPicker compact />
        <div class="record">
          <StarRow :value="bestStars" />
        </div>
        <button type="button" class="btn btn-primary btn-lg" @click="start">
          <AppIcon name="play" /> {{ $store.track === 'coop' ? $t('briefing.startCoop') : $t('briefing.start') }}
        </button>
      </footer>
    </div>
  </div>
</template>

<script>
/**
 * @file Level briefing: the character's line, newcomers, enemies, the three
 * challenges and the powers to take into the level.
 */
import AppIcon from './AppIcon.vue';
import StarRow from './StarRow.vue';
import PixelPortrait from './PixelPortrait.vue';
import DifficultyPicker from './DifficultyPicker.vue';
import { services } from '../services/index.js';
import { LevelCatalog, EnemyFactory, TowerFactory, PowerManager } from '../core/index.js';
import { achievementsFor, achievementParams, ACHIEVEMENTS } from '../core/progression/Achievements.js';
import { StoryRepository } from '../core/story/StoryRepository.js';

export default {
  name: 'BriefingPanel',
  components: { AppIcon, StarRow, PixelPortrait, DifficultyPicker },
  props: { number: { type: Number, required: true } },
  data() {
    return { loadout: services.saves.loadout(this.$store.track) };
  },
  computed: {
    level() {
      return LevelCatalog.byNumber(this.number);
    },
    storyOn() {
      // eslint-disable-next-line no-unused-expressions
      this.$store.progressTick;
      return services.saves.settings.story;
    },
    speaker() {
      return StoryRepository.speakerOf(this.number);
    },
    news() {
      const out = [];
      for (const id of this.level.newTowers) out.push({ kind: 'tower', id, color: TowerFactory.get(id).color });
      for (const id of this.level.newEnemies) out.push({ kind: 'enemy', id, color: EnemyFactory.get(id).stats.color });
      return out;
    },
    enemies() {
      return this.level.enemyTypes.map((type) => {
        const s = EnemyFactory.get(type).stats;
        return { type, color: s.color, flying: s.flying, stealth: s.stealth };
      });
    },
    challenges() {
      const mask = services.saves.achievementsFor(this.number, this.$store.track);
      return achievementsFor(this.level).map((id, i) => ({
        id,
        family: ACHIEVEMENTS[id].family,
        icon: ACHIEVEMENTS[id].icon,
        params: achievementParams(id, this.level),
        done: Boolean(mask & (1 << i)),
      }));
    },
    unlockedPowers() {
      const ids = services.saves.unlockedPowers(this.$store.track);
      return PowerManager.catalogue().filter((p) => ids.includes(p.id));
    },
    slots() {
      return services.saves.powerSlots;
    },
    bestStars() {
      // eslint-disable-next-line no-unused-expressions
      this.$store.progressTick;
      return services.saves.starsFor(this.number, this.$store.difficulty, this.$store.track);
    },
  },
  mounted() {
    this.$nextTick(() => this.$refs.close && this.$refs.close.focus());
  },
  methods: {
    togglePower(id) {
      const i = this.loadout.indexOf(id);
      if (i >= 0) this.loadout.splice(i, 1);
      else if (this.loadout.length < this.slots) this.loadout.push(id);
      else this.$actions.toast(this.$t('briefing.slotsFull', { n: this.slots }), 'warn');
    },
    start() {
      services.saves.setLoadout(this.loadout);
      this.$actions.startLevel(this.number, { track: this.$store.track, loadout: [...this.loadout] });
    },
  },
};
</script>
