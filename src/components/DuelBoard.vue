<template>
  <section class="duel-board" :class="['duel-board--p' + player, { 'is-out': out }]" :aria-label="name">
    <header class="duel-hud">
      <span class="player-dot" :class="'player-dot--' + player" aria-hidden="true"></span>
      <strong class="duel-name">{{ name }}</strong>
      <span class="stat stat--sm"><AppIcon name="heart" class="stat-icon--lives" />{{ hud.lives }}</span>
      <span class="stat stat--sm"><AppIcon name="coin" class="coin-icon" />{{ hud.gold }}</span>
      <span class="stat stat--sm" :title="$t('duel.income')"><AppIcon name="crown" />+{{ hud.income }}</span>
    </header>

    <div ref="wrap" class="duel-canvas-wrap">
      <canvas
        ref="canvas"
        class="board"
        :aria-label="$t('duel.board', { name })"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerleave="hover = null"
      ></canvas>
    </div>

    <div class="duel-controls">
      <div v-if="selectedTower" class="duel-tower">
        <span>{{ $t('towers.' + selectedTower.type + '.name') }} · {{ $t('tower.level', { n: selectedTower.level }) }}</span>
        <button v-if="selectedTower.canUpgrade" type="button" class="btn btn-primary btn-sm" :disabled="hud.gold < selectedTower.upgradePrice" @click="upgrade">
          {{ $t('tower.upgrade') }} · {{ selectedTower.upgradePrice }}
        </button>
        <button type="button" class="btn btn-secondary btn-sm" @click="sell">{{ $t('tower.sell') }}</button>
        <button type="button" class="icon-btn icon-btn--sm" :aria-label="$t('tower.deselect')" @click="clear"><AppIcon name="close" /></button>
      </div>
      <div v-else class="duel-shop" role="group" :aria-label="$t('shop.title')">
        <button
          v-for="(t, i) in shop"
          :key="t.type"
          type="button"
          class="duel-shop-item"
          :class="{ 'is-armed': armed === t.type, 'is-poor': hud.gold < t.cost }"
          :aria-pressed="armed === t.type ? 'true' : 'false'"
          :title="$t('towers.' + t.type + '.name') + ' · ' + t.cost"
          @click="pick(t.type)"
        >
          <span class="tower-swatch" :data-type="t.type" :style="{ '--c': t.color }" aria-hidden="true"></span>
          <span class="duel-cost">{{ t.cost }}</span>
          <kbd v-if="keys.build[i]" aria-hidden="true">{{ keys.build[i] }}</kbd>
        </button>
      </div>

      <div class="duel-send" role="group" :aria-label="$t('duel.send')">
        <span class="duel-send-label"><AppIcon name="send" /> {{ $t('duel.send') }}</span>
        <button
          v-for="(s, i) in sendable"
          :key="s.type"
          type="button"
          class="duel-send-item"
          :disabled="!s.can"
          :title="$t('duel.sendTitle', { n: s.count, enemy: $t('enemies.' + s.type + '.name'), cost: s.cost, income: s.income })"
          @click="$emit('send', s.type)"
        >
          <span class="enemy-swatch enemy-swatch--sm" :data-type="s.type" :style="{ '--c': s.color }" aria-hidden="true"></span>
          <span>{{ s.count }}×</span>
          <span class="duel-cost">{{ s.cost }}</span>
          <kbd v-if="keys.send[i]" aria-hidden="true">{{ keys.send[i] }}</kbd>
        </button>
      </div>
    </div>
  </section>
</template>

<script>
/**
 * @file One player's board in a duel: canvas, gold, tower shop, troops to send.
 * The parent (DuelScreen) owns the match and the loop; this component draws
 * its game and turns taps and keys into actions for its player.
 */
import { markRaw } from 'vue';
import { Renderer, TowerFactory, EnemyFactory } from '../core/index.js';
import { SENDABLE } from '../core/modes/DuelMatch.js';
import AppIcon from './AppIcon.vue';

export default {
  name: 'DuelBoard',
  components: { AppIcon },
  props: {
    match: { type: Object, required: true },
    player: { type: Number, required: true },
    name: { type: String, required: true },
    tick: { type: Number, default: 0 },
    keys: { type: Object, required: true },
  },
  emits: ['send'],
  data() {
    return { armed: null, cell: null, towerId: null, hover: null, cursor: { col: 7, row: 4 } };
  },
  computed: {
    game() {
      return this.match.games[this.player - 1];
    },
    hud() {
      // eslint-disable-next-line no-unused-expressions
      this.tick;
      return { lives: this.game.lives, gold: this.game.gold, income: this.match.income[this.player - 1] };
    },
    out() {
      // eslint-disable-next-line no-unused-expressions
      this.tick;
      return this.game.state === 'lost';
    },
    shop() {
      return TowerFactory.catalogue().filter((c) => this.game.isTowerAllowed(c.type));
    },
    sendable() {
      // eslint-disable-next-line no-unused-expressions
      this.tick;
      return Object.entries(SENDABLE).map(([type, s]) => ({ type, ...s, color: EnemyFactory.get(type).stats.color, can: this.match.canSend(this.player, type) }));
    },
    selectedTower() {
      // eslint-disable-next-line no-unused-expressions
      this.tick;
      return this.towerId ? this.game.towers.find((t) => t.id === this.towerId) || null : null;
    },
  },
  created() {
    this.r = null;
  },
  mounted() {
    const r = new Renderer(this.$refs.canvas, this.game.level);
    r.showAirLanes = true;
    r.setMode(this.$store.theme);
    r.reducedMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.r = markRaw(r);
    this.resize();
  },
  watch: {
    '$store.theme'(mode) {
      this.r?.setMode(mode);
    },
  },
  methods: {
    resize(maxHeight) {
      const wrap = this.$refs.wrap;
      if (!wrap || !this.r) return;
      const h = maxHeight || Math.max(160, window.innerHeight * (window.innerHeight > window.innerWidth ? 0.28 : 0.55));
      this.r.resize(wrap.clientWidth, h, false);
    },
    draw() {
      if (!this.r) return;
      this.r.render(this.game, {
        selectedCell: this.cell,
        selectedTower: this.selectedTower,
        hoverCell: this.hover,
        previewType: this.armed ? TowerFactory.get(this.armed) : null,
        cursors: this.keys.cursor ? [{ ...this.cursor, player: this.player }] : [],
      });
    },
    onPointerDown(evt) {
      if (this.out || this.match.over) return;
      this.selectCell(this.r.cellFromEvent(evt));
    },
    onPointerMove(evt) {
      if (evt.pointerType === 'mouse') this.hover = this.r.cellFromEvent(evt);
    },
    selectCell({ col, row }) {
      const g = this.game;
      if (!g.map.inBounds(col, row)) return;
      this.cursor = { col, row };
      const t = g.map.towerAt(col, row);
      if (t) {
        this.towerId = t.id;
        this.cell = null;
        this.armed = null;
        return;
      }
      this.towerId = null;
      this.cell = { col, row };
      if (this.armed) this.build(this.armed);
    },
    pick(type) {
      if (this.cell && this.game.map.isBuildable(this.cell.col, this.cell.row)) this.build(type);
      else this.armed = this.armed === type ? null : type;
    },
    build(type) {
      const c = this.cell || this.cursor;
      if (this.game.buildTower(type, c.col, c.row, 1)) {
        if (!this.game.canAfford(type)) this.armed = null;
        this.cell = null;
      }
    },
    upgrade() {
      if (this.selectedTower) this.game.upgradeTower(this.selectedTower, 1);
    },
    sell() {
      if (this.selectedTower && this.game.sellTower(this.selectedTower, 1)) this.clear();
    },
    clear() {
      this.armed = null;
      this.cell = null;
      this.towerId = null;
    },
    /** Keyboard: moves this player's cursor. */
    move(dc, dr) {
      const g = this.game;
      this.cursor = { col: Math.min(g.map.cols - 1, Math.max(0, this.cursor.col + dc)), row: Math.min(g.map.rows - 1, Math.max(0, this.cursor.row + dr)) };
      const t = g.map.towerAt(this.cursor.col, this.cursor.row);
      this.towerId = t ? t.id : null;
      this.cell = t ? null : { ...this.cursor };
    },
    /** Keyboard: builds the i-th tower of the shop at the cursor. */
    buildAtCursor(i) {
      const t = this.shop[i];
      if (!t) return;
      this.cell = { ...this.cursor };
      this.build(t.type);
    },
  },
};
</script>
