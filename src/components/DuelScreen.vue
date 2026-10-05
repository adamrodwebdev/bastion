<template>
  <section class="duel" :class="{ 'is-paused': paused }" aria-labelledby="duel-title">
    <header class="duel-top">
      <h1 id="duel-title" class="duel-title"><AppIcon name="swords" /> {{ $t('duel.title') }}</h1>
      <p class="duel-status" aria-live="polite">
        <template v-if="prepare > 0">{{ $t('duel.prepare', { s: prepare }) }}</template>
        <template v-else>{{ $t('duel.wave', { n: wave }) }}</template>
      </p>
      <div class="hud-controls">
        <button type="button" class="icon-btn" :aria-label="paused ? $t('hud.resume') : $t('hud.pause')" :disabled="!!result" @click="togglePause">
          <AppIcon :name="paused ? 'play' : 'pause'" />
        </button>
        <button type="button" class="icon-btn" :aria-label="$t('hud.menu')" @click="quit"><AppIcon name="close" /></button>
      </div>
    </header>

    <div class="duel-boards">
      <DuelBoard ref="b1" :match="match" :player="1" :name="names[0]" :tick="tick" :keys="keys[0]" @send="send(1, $event)" />
      <DuelBoard ref="b2" :match="match" :player="2" :name="names[1]" :tick="tick" :keys="keys[1]" @send="send(2, $event)" />
    </div>

    <details class="card duel-help">
      <summary>{{ $t('duel.howTo') }}</summary>
      <p>{{ $t('duel.rules') }}</p>
      <p>{{ $t('duel.keysP1') }}</p>
      <p>{{ $t('duel.keysP2') }}</p>
    </details>

    <div v-if="result" class="modal" role="dialog" aria-modal="true" aria-labelledby="duel-end">
      <div class="modal-card end-card">
        <h2 id="duel-end" class="end-title is-won">{{ $t('duel.winner', { name: names[result.winner - 1] }) }}</h2>
        <p>{{ $t('duel.summary', { waves: result.waves }) }}</p>
        <div class="end-actions">
          <button ref="again" type="button" class="btn btn-primary" @click="again">{{ $t('duel.again') }}</button>
          <button type="button" class="btn btn-ghost" @click="quit">{{ $t('hud.menu') }}</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
/**
 * @file Duel screen: two boards side by side (stacked on phones), one shared loop.
 *
 * Controls: each player taps or clicks on his own board. On a keyboard,
 * player 1 uses W A S D, 1-5, R, F and Z X C; player 2 the arrows,
 * 6-0, L, K and B N M (or the numeric keypad).
 */
import { markRaw } from 'vue';
import { GameLoop } from '../core/index.js';
import { DuelMatch, SENDABLE } from '../core/modes/DuelMatch.js';
import { services } from '../services/index.js';
import AppIcon from './AppIcon.vue';
import DuelBoard from './DuelBoard.vue';

const SEND_TYPES = Object.keys(SENDABLE);

export default {
  name: 'DuelScreen',
  components: { AppIcon, DuelBoard },
  data() {
    return {
      tick: 0,
      paused: false,
      result: null,
      prepare: DuelMatch.PREPARE,
      wave: 0,
      keys: [
        { cursor: true, build: ['1', '2', '3', '4', '5'], send: ['Z', 'X', 'C'] },
        { cursor: true, build: ['6', '7', '8', '9', '0'], send: ['B', 'N', 'M'] },
      ],
    };
  },
  computed: {
    names() {
      const n = services.saves.settings.names;
      return [n[0] || this.$t('coop.player', { n: 1 }), n[1] || this.$t('coop.player', { n: 2 })];
    },
  },
  created() {
    this.match = markRaw(new DuelMatch({ arena: this.$store.duel.arena }));
    this.match.on('over', (r) => {
      this.result = r;
      services.saves.recordDuel(r.winner);
      services.audio.sfx('victory');
      services.ads?.gameplayStop();
      this.$nextTick(() => this.$refs.again && this.$refs.again.focus());
    });
    this.match.on('send', ({ player, type, count }) => {
      services.audio.sfx('horn');
      this.$actions.toast(this.$t('duel.sent', { name: this.names[player - 1], n: count, enemy: this.$t('enemies.' + type + '.name') }));
    });
    this.match.on('start', () => services.audio.sfx('horn'));
  },
  mounted() {
    this.loop = markRaw(
      new GameLoop(
        (dt) => this.match.update(dt),
        () => this.frame(),
      ),
    );
    this.loop.start();
    this._onKey = (e) => this.onKey(e);
    this._onResize = () => this.resize();
    window.addEventListener('keydown', this._onKey);
    window.addEventListener('resize', this._onResize, { passive: true });
    this.$nextTick(() => this.resize());
    services.ads?.gameplayStart();
    services.audio.music('battle', { chapter: 7 });
    services.audio.intensity(2);
  },
  beforeUnmount() {
    this.loop?.stop();
    this.match.removeAllListeners();
    for (const g of this.match.games) g.removeAllListeners();
    window.removeEventListener('keydown', this._onKey);
    window.removeEventListener('resize', this._onResize);
    services.ads?.gameplayStop();
    services.audio.music('menu');
  },
  methods: {
    frame() {
      this.$refs.b1?.draw();
      this.$refs.b2?.draw();
      const now = performance.now();
      if (!this._last || now - this._last > 100) {
        this._last = now;
        this.tick++;
        this.prepare = Math.max(0, Math.ceil(this.match.prepare));
        this.wave = Math.max(...this.match.games.map((g) => g.waves.current));
      }
    },
    resize() {
      const side = window.innerWidth >= 900 && window.innerWidth > window.innerHeight;
      const h = side ? window.innerHeight - 260 : window.innerHeight * 0.3;
      this.$refs.b1?.resize(h);
      this.$refs.b2?.resize(h);
    },
    send(player, type) {
      if (!this.match.send(player, type)) services.audio.sfx('error');
    },
    togglePause() {
      this.paused = !this.paused;
      this.match.paused = this.paused;
    },
    onKey(e) {
      if (this.result || e.target?.tagName === 'INPUT') return;
      const k = e.key;
      const low = k.toLowerCase();
      if (k === 'Escape' || low === 'p') {
        this.togglePause();
        return;
      }
      if (this.paused) return;
      const b1 = this.$refs.b1;
      const b2 = this.$refs.b2;
      const moves1 = { w: [0, -1], a: [-1, 0], s: [0, 1], d: [1, 0] };
      const moves2 = { ArrowUp: [0, -1], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowRight: [1, 0] };
      if (moves1[low]) b1.move(...moves1[low]);
      else if (moves2[k]) {
        e.preventDefault();
        b2.move(...moves2[k]);
      } else if (['1', '2', '3', '4', '5'].includes(k)) b1.buildAtCursor(Number(k) - 1);
      else if (['6', '7', '8', '9', '0'].includes(k)) b2.buildAtCursor(k === '0' ? 4 : Number(k) - 6);
      else if (e.code && /^Numpad[1-5]$/.test(e.code)) b2.buildAtCursor(Number(e.code.slice(-1)) - 1);
      else if (low === 'r') b1.upgrade();
      else if (low === 'f') b1.sell();
      else if (low === 'l' || e.code === 'NumpadAdd') b2.upgrade();
      else if (low === 'k' || e.code === 'NumpadSubtract') b2.sell();
      else if (['z', 'x', 'c'].includes(low)) this.send(1, SEND_TYPES[['z', 'x', 'c'].indexOf(low)]);
      else if (['b', 'n', 'm'].includes(low)) this.send(2, SEND_TYPES[['b', 'n', 'm'].indexOf(low)]);
      else if (e.code && /^Numpad[7-9]$/.test(e.code)) this.send(2, SEND_TYPES[Number(e.code.slice(-1)) - 7]);
    },
    async again() {
      await this.$actions.betweenLevels();
      this.$actions.startDuel(this.$store.duel.arena);
    },
    quit() {
      this.$actions.go('multiplayer');
    },
  },
};
</script>
