<template>
  <section class="learn" aria-labelledby="learn-title">
    <ScreenHeader :title="$t('learn.title')">
      <span class="chip"><AppIcon name="check" /> {{ doneCount }} / {{ lessons.length }}</span>
    </ScreenHeader>

    <div class="speech speech--inline">
      <PixelPortrait id="gontran" height="4.5rem" decorative />
      <p class="speech-text">« {{ $t('learn.intro') }} »</p>
    </div>

    <!-- Interactive lessons ------------------------------------------------ -->
    <section aria-labelledby="learn-lessons">
      <h2 id="learn-lessons" class="section-title">{{ $t('learn.lessons') }}</h2>
      <ol class="lesson-grid" role="list">
        <li v-for="(l, i) in lessons" :key="l.id" class="lesson-card card" :class="{ 'is-done': l.done, 'is-next': l.next }">
          <div class="lesson-head">
            <span class="lesson-num" aria-hidden="true">{{ i + 1 }}</span>
            <AppIcon :name="l.icon" class="lesson-icon" />
            <h3 class="lesson-title">{{ $t('training.lessons.' + l.id + '.title') }}</h3>
          </div>
          <p class="lesson-desc">{{ $t('training.lessons.' + l.id + '.desc') }}</p>
          <p class="lesson-meta">
            <span v-if="l.done" class="badge badge-success"><AppIcon name="check" /> {{ $t('learn.done') }}</span>
            <span v-else class="badge badge-gold"><AppIcon name="crown" /> +{{ reward }}</span>
            <span class="lesson-time"><AppIcon name="clock" /> {{ $t('learn.minutes', { n: 2 + Math.floor(i / 2) }) }}</span>
          </p>
          <button type="button" class="btn" :class="l.next ? 'btn-primary' : 'btn-secondary'" @click="$actions.startTraining(l.id)">
            <AppIcon name="play" /> {{ l.done ? $t('learn.replay') : $t('learn.start') }}
          </button>
        </li>
      </ol>
    </section>

    <!-- Reference guide ---------------------------------------------------- -->
    <section class="guide" aria-labelledby="learn-guide">
      <h2 id="learn-guide" class="section-title">{{ $t('learn.guide') }}</h2>
      <div class="guide-tabs segmented" role="tablist" :aria-label="$t('learn.guide')">
        <div class="segmented-track">
          <button
            v-for="tab in tabs"
            :id="'tab-' + tab"
            :key="tab"
            type="button"
            role="tab"
            class="segmented-option"
            :class="{ 'is-active': current === tab }"
            :aria-selected="current === tab ? 'true' : 'false'"
            :aria-controls="'panel-' + tab"
            @click="current = tab"
          >
            {{ $t('learn.tabs.' + tab) }}
          </button>
        </div>
      </div>

      <!-- Basics -->
      <div v-if="current === 'basics'" id="panel-basics" role="tabpanel" aria-labelledby="tab-basics" class="guide-panel">
        <ol class="rule-list" role="list">
          <li v-for="(r, i) in rules" :key="r.key" class="rule card">
            <span class="rule-icon"><AppIcon :name="r.icon" /></span>
            <div>
              <h3 class="rule-title">{{ i + 1 }}. {{ $t('learn.rules.' + r.key + '.title') }}</h3>
              <p>{{ $t('learn.rules.' + r.key + '.text') }}</p>
            </div>
          </li>
        </ol>
        <h3 class="guide-sub">{{ $t('learn.damage.title') }}</h3>
        <ul class="damage-grid" role="list">
          <li v-for="d in damageTypes" :key="d" class="damage-card card" :class="'damage--' + d">
            <strong>{{ $t('learn.damage.' + d + '.name') }}</strong>
            <span>{{ $t('learn.damage.' + d + '.text') }}</span>
          </li>
        </ul>
      </div>

      <!-- Towers -->
      <div v-else-if="current === 'towers'" id="panel-towers" role="tabpanel" aria-labelledby="tab-towers" class="guide-panel">
        <ul class="codex-grid" role="list">
          <li v-for="t in towers" :key="t.type" class="codex-card card" :class="{ 'is-locked': t.locked }">
            <SpriteIcon :type="t.type" :level="3" :px="56" />
            <div class="codex-body">
              <h3 class="codex-name">{{ $t('towers.' + t.type + '.name') }}</h3>
              <p class="codex-desc">{{ $t('towers.' + t.type + '.desc') }}</p>
              <p class="codex-tags">
                <span class="chip chip-sm"><AppIcon name="coin" /> {{ t.cost }}</span>
                <span v-if="t.dtype && t.targets !== 'none'" class="chip chip-sm">{{ $t('learn.damage.' + t.dtype + '.name') }}</span>
                <span v-if="t.targets === 'both'" class="chip chip-sm"><AppIcon name="wing" /> {{ $t('learn.hitsAir') }}</span>
                <span v-else-if="t.targets === 'ground'" class="chip chip-sm chip-muted">{{ $t('learn.groundOnly') }}</span>
                <span class="chip chip-sm chip-muted"><AppIcon name="lock" v-if="t.locked" /> {{ $t('learn.fromLevel', { n: t.unlock }) }}</span>
              </p>
            </div>
          </li>
        </ul>
      </div>

      <!-- Enemies -->
      <div v-else-if="current === 'enemies'" id="panel-enemies" role="tabpanel" aria-labelledby="tab-enemies" class="guide-panel">
        <ul class="codex-grid" role="list">
          <li v-for="e in enemies" :key="e.type" class="codex-card card" :class="{ 'is-locked': e.locked }">
            <SpriteIcon kind="enemy" :type="e.type" :px="56" />
            <div class="codex-body">
              <h3 class="codex-name">{{ $t('enemies.' + e.type + '.name') }}</h3>
              <p class="codex-desc">{{ $t('enemies.' + e.type + '.desc') }}</p>
              <p class="codex-tags">
                <span v-for="tr in e.traits" :key="tr" class="chip chip-sm" :class="'trait--' + tr">{{ $t('learn.traits.' + tr) }}</span>
                <span class="chip chip-sm chip-muted">{{ $t('learn.fromLevel', { n: e.intro }) }}</span>
              </p>
              <p v-if="e.tip" class="codex-tip"><AppIcon name="target" /> {{ $t('learn.tips.' + e.tip) }}</p>
            </div>
          </li>
        </ul>
      </div>

      <!-- Powers -->
      <div v-else-if="current === 'powers'" id="panel-powers" role="tabpanel" aria-labelledby="tab-powers" class="guide-panel">
        <p class="guide-lead">{{ $t('learn.powersLead') }}</p>
        <ul class="codex-grid" role="list">
          <li v-for="p in powers" :key="p.id" class="codex-card card" :class="{ 'is-locked': p.locked }">
            <span class="power-glyph power-glyph--lg" aria-hidden="true">{{ p.icon }}</span>
            <div class="codex-body">
              <h3 class="codex-name">{{ $t('powers.' + p.id + '.name') }}</h3>
              <p class="codex-desc">{{ $t('powers.' + p.id + '.desc') }}</p>
              <p class="codex-tags">
                <span class="chip chip-sm"><AppIcon name="clock" /> {{ $t('learn.cooldown', { s: p.cooldown }) }}</span>
                <span v-if="p.targeted" class="chip chip-sm"><AppIcon name="target" /> {{ $t('learn.targeted') }}</span>
                <span class="chip chip-sm chip-muted">{{ $t('learn.afterLevel', { n: p.unlockAfterLevel }) }}</span>
              </p>
            </div>
          </li>
        </ul>
      </div>

      <!-- Two players -->
      <div v-else id="panel-two" role="tabpanel" aria-labelledby="tab-two" class="guide-panel">
        <div class="two-grid">
          <article class="card two-card">
            <h3 class="codex-name"><AppIcon name="users" /> {{ $t('multiplayer.coop') }}</h3>
            <p>{{ $t('multiplayer.coopDesc') }}</p>
            <p>{{ $t('multiplayer.coopP1') }}</p>
            <p>{{ $t('multiplayer.coopP2') }}</p>
          </article>
          <article class="card two-card">
            <h3 class="codex-name"><AppIcon name="swords" /> {{ $t('multiplayer.duel') }}</h3>
            <p>{{ $t('multiplayer.duelDesc') }}</p>
            <p>{{ $t('duel.keysP1') }}</p>
            <p>{{ $t('duel.keysP2') }}</p>
          </article>
        </div>
        <h3 class="guide-sub">{{ $t('settings.keys') }}</h3>
        <dl class="key-list">
          <template v-for="k in keyList" :key="k">
            <dt><kbd class="kbd-inline">{{ $t('settings.keyList.' + k + '.keys') }}</kbd></dt>
            <dd>{{ $t('settings.keyList.' + k + '.what') }}</dd>
          </template>
        </dl>
      </div>
    </section>
  </section>
</template>

<script>
/**
 * @file "Learn" screen: four guided training lessons and the defender's guide
 * (rules, damage types, every tower, enemy and power, two-player controls).
 */
import AppIcon from './AppIcon.vue';
import ScreenHeader from './ScreenHeader.vue';
import PixelPortrait from './PixelPortrait.vue';
import SpriteIcon from './SpriteIcon.vue';
import { services } from '../services/index.js';
import { TowerFactory, EnemyFactory, PowerManager, TOWER_UNLOCK, ENEMY_INTRO } from '../core/index.js';
import { LESSONS, TRAINING_REWARD } from '../core/tutorial/Training.js';

/** Enemy → the trick that beats it (key under learn.tips). */
const TIPS = {
  crow: 'air', wyvern: 'air', sapper: 'stealth', shield: 'armor', knight: 'armor', golem: 'golem',
  priest: 'healer', warlock: 'warlock', ram: 'ram', siege: 'siege', necromancer: 'necro', runner: 'fast', wolf: 'fast',
  berserker: 'berserker', champion: 'boss', mordrac: 'boss',
};

export default {
  name: 'LearnScreen',
  components: { AppIcon, ScreenHeader, PixelPortrait, SpriteIcon },
  data() {
    return {
      current: 'basics',
      tabs: ['basics', 'towers', 'enemies', 'powers', 'two'],
      reward: TRAINING_REWARD,
      damageTypes: ['physical', 'fire', 'magic', 'true'],
      rules: [
        { key: 'goal', icon: 'heart' },
        { key: 'build', icon: 'tower' },
        { key: 'gold', icon: 'coin' },
        { key: 'waves', icon: 'wave' },
        { key: 'upgrade', icon: 'level' },
        { key: 'powers', icon: 'power' },
        { key: 'stars', icon: 'star' },
        { key: 'workshop', icon: 'hammer' },
      ],
      keyList: ['build', 'move', 'select', 'upgrade', 'wave', 'powers', 'pause'],
    };
  },
  computed: {
    saves() {
      // eslint-disable-next-line no-unused-expressions
      this.$store.progressTick;
      return services.saves;
    },
    reached() {
      return this.saves.campaign('solo').completed + 1;
    },
    lessons() {
      const done = this.saves.training;
      const firstTodo = LESSONS.find((l) => !done.includes(l.id));
      return LESSONS.map((l) => ({ id: l.id, icon: l.icon, done: done.includes(l.id), next: firstTodo === l }));
    },
    doneCount() {
      return this.lessons.filter((l) => l.done).length;
    },
    towers() {
      return TowerFactory.catalogue().map((t) => ({ ...t, unlock: TOWER_UNLOCK[t.type], locked: TOWER_UNLOCK[t.type] > this.reached }));
    },
    enemies() {
      return Object.entries(ENEMY_INTRO)
        .sort((a, b) => a[1] - b[1])
        .map(([type, intro]) => {
          const s = EnemyFactory.get(type).stats;
          const traits = [];
          if (s.boss) traits.push('boss');
          if (s.flying) traits.push('flying');
          if (s.stealth) traits.push('stealth');
          if (s.armor >= 0.3) traits.push('armored');
          if (s.resist >= 0.3) traits.push('resistant');
          if (s.immuneSlow) traits.push('unslowable');
          if (!s.blockable) traits.push('unblockable');
          if (s.speed >= 1.8) traits.push('fast');
          return { type, intro, traits, tip: TIPS[type] || null, locked: intro > this.reached };
        });
    },
    powers() {
      return PowerManager.catalogue().map((p) => ({ ...p, locked: p.unlockAfterLevel >= this.reached }));
    },
  },
};
</script>
