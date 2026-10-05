<template>
  <section class="multiplayer" aria-labelledby="mp-title">
    <ScreenHeader :title="$t('multiplayer.title')" />
    <p class="lead">{{ $t('multiplayer.intro') }}</p>

    <div class="mp-modes">
      <article class="mp-card card">
        <AppIcon name="users" class="mp-icon" />
        <h2 class="section-title">{{ $t('multiplayer.coop') }}</h2>
        <p>{{ $t('multiplayer.coopDesc') }}</p>
        <ul class="mp-list">
          <li>{{ $t('multiplayer.coopP1') }}</li>
          <li>{{ $t('multiplayer.coopP2') }}</li>
        </ul>
        <p class="mp-progress">{{ $t('multiplayer.coopProgress', { n: coopDone }) }}</p>
        <button type="button" class="btn btn-primary btn-lg" @click="$actions.openCampaign('coop')"><AppIcon name="map" /> {{ $t('multiplayer.coopPlay') }}</button>
      </article>

      <article class="mp-card card">
        <AppIcon name="swords" class="mp-icon" />
        <h2 class="section-title">{{ $t('multiplayer.duel') }}</h2>
        <p>{{ $t('multiplayer.duelDesc') }}</p>
        <fieldset class="arena-pick">
          <legend>{{ $t('multiplayer.arena') }}</legend>
          <div class="arena-grid">
            <label v-for="a in arenas" :key="a.number" class="arena" :class="{ 'is-active': arena === a.number }">
              <input type="radio" name="arena" :value="a.number" :checked="arena === a.number" @change="arena = a.number" />
              <svg viewBox="0 0 16 9" aria-hidden="true" :class="'theme-' + a.theme">
                <rect width="16" height="9" class="lp-ground" />
                <polyline v-for="(p, i) in a.paths" :key="i" :points="p" class="lp-road" />
              </svg>
              <span>{{ $t('chapters.c' + a.chapter + '.name') }}</span>
            </label>
          </div>
        </fieldset>
        <p class="mp-progress">{{ $t('multiplayer.duelRecord', { played: duel.played, a: duel.wins[0], b: duel.wins[1] }) }}</p>
        <button type="button" class="btn btn-primary btn-lg" @click="$actions.startDuel(arena)"><AppIcon name="swords" /> {{ $t('multiplayer.duelPlay') }}</button>
      </article>
    </div>

    <p class="notice">{{ $t('multiplayer.names') }} <button type="button" class="link-btn" @click="$actions.go('settings')">{{ $t('settings.title') }}</button></p>
  </section>
</template>

<script>
/**
 * @file Two players on one device: cooperation campaign or duel.
 */
import AppIcon from './AppIcon.vue';
import ScreenHeader from './ScreenHeader.vue';
import { services } from '../services/index.js';
import { LevelCatalog } from '../core/index.js';
import { ARENAS } from '../core/modes/DuelMatch.js';

export default {
  name: 'MultiplayerScreen',
  components: { AppIcon, ScreenHeader },
  data() {
    return { arena: this.$store.duel.arena || ARENAS[0] };
  },
  computed: {
    saves() {
      // eslint-disable-next-line no-unused-expressions
      this.$store.progressTick;
      return services.saves;
    },
    coopDone() {
      return this.saves.campaign('coop').completed;
    },
    duel() {
      return this.saves.progress.duel;
    },
    arenas() {
      return ARENAS.map((n) => {
        const l = LevelCatalog.byNumber(n);
        return { number: n, chapter: l.chapter, theme: l.theme, paths: l.paths.map((wp) => wp.map(([c, r]) => `${c + 0.5},${r + 0.5}`).join(' ')) };
      });
    },
  },
};
</script>
